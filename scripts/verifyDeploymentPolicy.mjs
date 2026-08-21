import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const PHASE_PATH = "config/deployment-phase.json";
const ROUTES_PATH = "public/_routes.json";
const MIDDLEWARE_PATH = "functions/_middleware.ts";
const HEADERS_PATH = "public/_headers";

const LEGACY_EXCLUDE = [
  "/_astro/*",
  "/downloads/*",
  "/images/*",
  "/og/*",
  "/favicon.png",
  "/favicon.svg",
  "/logo.png",
  "/rss.xsl",
];

const ROUTE_CONTRACTS = {
  "legacy-bridge": {
    include: ["/*"],
    exclude: LEGACY_EXCLUDE,
  },
  "static-first": {
    include: ["/api/*"],
    exclude: [],
  },
};

const STATIC_ASTRO_CACHE = "public, max-age=31536000, immutable";
const HEADER_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const INVALID_JSON = Symbol("invalid-json");

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function arraysEqual(left, right) {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function sortedUnique(values) {
  return [...new Set(values)].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
}

async function readRequiredText(rootDir, relativePath, violations) {
  try {
    return await readFile(resolve(rootDir, relativePath), "utf8");
  } catch (error) {
    const description =
      error && typeof error === "object" && error.code === "ENOENT"
        ? "required file is missing"
        : "unable to read required file";
    violations.push(`${relativePath}: ${description}`);
    return null;
  }
}

function parseJson(text, relativePath, violations) {
  try {
    return JSON.parse(text);
  } catch {
    violations.push(`${relativePath}: invalid JSON`);
    return INVALID_JSON;
  }
}

function validatePhase(text, violations) {
  const phase = parseJson(text, PHASE_PATH, violations);
  if (phase === INVALID_JSON) return null;

  if (!isObject(phase)) {
    violations.push(`${PHASE_PATH}: must be an object`);
    return null;
  }

  const allowedKeys = new Set(["schemaVersion", "routingMode"]);
  const unexpectedKeys = Object.keys(phase)
    .filter((key) => !allowedKeys.has(key))
    .sort();
  if (unexpectedKeys.length > 0) {
    violations.push(
      `${PHASE_PATH}: unexpected keys: ${unexpectedKeys.join(", ")}`,
    );
  }

  if (!Number.isInteger(phase.schemaVersion) || phase.schemaVersion !== 1) {
    violations.push(`${PHASE_PATH}: schemaVersion must equal integer 1`);
  }

  if (
    phase.routingMode !== "legacy-bridge" &&
    phase.routingMode !== "static-first"
  ) {
    violations.push(
      `${PHASE_PATH}: routingMode must be legacy-bridge or static-first`,
    );
    return null;
  }

  return phase.routingMode;
}

function validateRoutes(text, routingMode, violations) {
  const routes = parseJson(text, ROUTES_PATH, violations);
  if (routes === INVALID_JSON) return;

  if (!isObject(routes)) {
    violations.push(`${ROUTES_PATH}: must be an object`);
    return;
  }

  const allowedKeys = new Set(["version", "include", "exclude"]);
  const unexpectedKeys = Object.keys(routes)
    .filter((key) => !allowedKeys.has(key))
    .sort();
  if (unexpectedKeys.length > 0) {
    violations.push(
      `${ROUTES_PATH}: unexpected keys: ${unexpectedKeys.join(", ")}`,
    );
  }

  if (!Number.isInteger(routes.version) || routes.version !== 1) {
    violations.push(`${ROUTES_PATH}: version must equal integer 1`);
  }

  if (!routingMode) return;
  const contract = ROUTE_CONTRACTS[routingMode];
  if (!arraysEqual(routes.include, contract.include)) {
    violations.push(
      `${ROUTES_PATH}: ${routingMode} include must equal ${JSON.stringify(contract.include)}`,
    );
  }
  if (!arraysEqual(routes.exclude, contract.exclude)) {
    violations.push(
      `${ROUTES_PATH}: ${routingMode} exclude must equal ${JSON.stringify(contract.exclude)}`,
    );
  }
}

function parseHeaders(text, violations) {
  const blocks = [];
  let currentBlock = null;
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const lineNumber = index + 1;
    const trimmed = rawLine.trim();

    if (trimmed === "" || trimmed.startsWith("#")) continue;

    if (!/^[ \t]/.test(rawLine)) {
      currentBlock = {
        path: trimmed,
        line: lineNumber,
        headers: [],
        firstLineByName: new Map(),
      };
      blocks.push(currentBlock);
      continue;
    }

    const blockLabel = currentBlock ? currentBlock.path : "<none>";
    if (!currentBlock) {
      violations.push(
        `${HEADERS_PATH} line ${lineNumber} (block ${blockLabel}): malformed header directive`,
      );
      continue;
    }

    let name;
    let value = null;
    let removal = false;

    if (trimmed.startsWith("!")) {
      removal = true;
      name = trimmed.slice(1).trim();
      if (!HEADER_NAME_PATTERN.test(name)) name = null;
    } else {
      const separator = trimmed.indexOf(":");
      if (separator > 0) {
        name = trimmed.slice(0, separator).trim();
        value = trimmed.slice(separator + 1).trim();
        if (!HEADER_NAME_PATTERN.test(name)) name = null;
      }
    }

    if (!name) {
      violations.push(
        `${HEADERS_PATH} line ${lineNumber} (block ${blockLabel}): malformed header directive`,
      );
      continue;
    }

    const normalizedName = name.toLowerCase();
    const firstLine = currentBlock.firstLineByName.get(normalizedName);
    if (firstLine !== undefined) {
      violations.push(
        `${HEADERS_PATH} ${currentBlock.path}: duplicate header ${normalizedName} on lines ${firstLine} and ${lineNumber}`,
      );
    } else {
      currentBlock.firstLineByName.set(normalizedName, lineNumber);
    }

    currentBlock.headers.push({
      name: normalizedName,
      value,
      removal,
      line: lineNumber,
    });
  }

  return blocks;
}

function sanitizeJavaScript(source, stripStrings) {
  let output = "";
  let state = "code";
  let quote = "";

  const append = (character, blank) => {
    output += blank && character !== "\n" && character !== "\r" ? " " : character;
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (state === "line-comment") {
      append(character, character !== "\n" && character !== "\r");
      if (character === "\n" || character === "\r") state = "code";
      continue;
    }

    if (state === "block-comment") {
      if (character === "*" && next === "/") {
        append(character, true);
        index += 1;
        append(next, true);
        state = "code";
      } else {
        append(character, character !== "\n" && character !== "\r");
      }
      continue;
    }

    if (state === "string") {
      append(character, stripStrings);
      if (character === "\\" && next !== undefined) {
        index += 1;
        append(next, stripStrings);
      } else if (character === quote) {
        state = "code";
      }
      continue;
    }

    if (character === "/" && next === "/") {
      append(character, true);
      index += 1;
      append(next, true);
      state = "line-comment";
      continue;
    }
    if (character === "/" && next === "*") {
      append(character, true);
      index += 1;
      append(next, true);
      state = "block-comment";
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      state = "string";
      append(character, stripStrings);
      continue;
    }

    append(character, false);
  }

  return output;
}

function analyzeJavaScript(source) {
  return {
    code: sanitizeJavaScript(source, false),
    tokens: sanitizeJavaScript(source, true),
  };
}

function balancedBraceRange(tokens, openBrace) {
  if (openBrace < 0 || tokens[openBrace] !== "{") return null;
  let depth = 0;
  for (let index = openBrace; index < tokens.length; index += 1) {
    if (tokens[index] === "{") depth += 1;
    if (tokens[index] === "}") {
      depth -= 1;
      if (depth === 0) return { start: openBrace + 1, end: index };
    }
  }
  return null;
}

function namedFunctionBody(tokens, name) {
  const declaration = new RegExp(`\\bfunction\\s+${name}\\s*\\(`).exec(tokens);
  if (!declaration) return null;
  const openBrace = tokens.indexOf("{", declaration.index + declaration[0].length);
  return balancedBraceRange(tokens, openBrace);
}

function onRequestBody(tokens) {
  const declaration = /\bexport\s+const\s+onRequest\b/.exec(tokens);
  if (!declaration) return null;
  const arrow = tokens.indexOf("=>", declaration.index + declaration[0].length);
  if (arrow < 0) return null;
  const bodyStart = /^\s*\{/.exec(tokens.slice(arrow + 2));
  if (!bodyStart) return null;
  const openBrace = arrow + 2 + bodyStart[0].lastIndexOf("{");
  return balancedBraceRange(tokens, openBrace);
}

function assignedObjectBody(tokens, name) {
  const declaration = new RegExp(`\\b(?:const|let)\\s+${name}\\b`).exec(tokens);
  if (!declaration) return null;
  const equals = tokens.indexOf("=", declaration.index + declaration[0].length);
  if (equals < 0) return null;
  return balancedBraceRange(tokens, tokens.indexOf("{", equals + 1));
}

function rangeText(source, range) {
  return range ? source.slice(range.start, range.end) : "";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasApiHardening(analysis) {
  const bodyRange = onRequestBody(analysis.tokens);
  if (!bodyRange) return false;
  const bodyTokens = rangeText(analysis.tokens, bodyRange);
  const bodyCode = rangeText(analysis.code, bodyRange);

  const apiCheck = bodyCode.search(
    /pathname\.startsWith\(\s*["']\/api\/["']\s*\)/,
  );
  const nextCall = bodyTokens.search(/await\s+context\.next\s*\(/);
  const responseMatch =
    /\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+Response\s*\(\s*response\.body\s*,\s*response\s*\)/.exec(
      bodyTokens,
    );
  if (!responseMatch) return false;

  const hardenedName = escapeRegExp(responseMatch[1]);
  const responseIndex = responseMatch.index;
  const returnCall = bodyTokens.search(
    new RegExp(`\\breturn\\s+${hardenedName}\\s*;`),
  );

  if (
    apiCheck < 0 ||
    nextCall < 0 ||
    responseIndex <= nextCall ||
    apiCheck >= responseIndex ||
    returnCall <= responseIndex
  ) {
    return false;
  }

  const directNoStore = new RegExp(
    `\\b${hardenedName}\\s*\\.\\s*headers\\s*\\.\\s*set\\s*\\(\\s*["']Cache-Control["']\\s*,\\s*["']no-store["']`,
    "i",
  ).exec(bodyCode);
  if (directNoStore) {
    return directNoStore.index > responseIndex && returnCall > directNoStore.index;
  }

  const loopMatch =
    /\bfor\s*\(\s*const\s*\[\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)\s*\]\s+of\s+Object\.entries\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*\)\s*\{/.exec(
      bodyTokens,
    );
  if (!loopMatch || loopMatch.index <= responseIndex) return false;

  const loopOpen = loopMatch.index + loopMatch[0].lastIndexOf("{");
  const loopRange = balancedBraceRange(bodyTokens, loopOpen);
  if (!loopRange) return false;
  const loopTokens = rangeText(bodyTokens, loopRange);
  const nameIdentifier = escapeRegExp(loopMatch[1]);
  const valueIdentifier = escapeRegExp(loopMatch[2]);
  const correlatedSet = new RegExp(
    `\\b${hardenedName}\\s*\\.\\s*headers\\s*\\.\\s*set\\s*\\(\\s*${nameIdentifier}\\s*,\\s*${valueIdentifier}\\s*\\)`,
  ).exec(loopTokens);
  if (!correlatedSet) return false;

  const headersObjectRange = assignedObjectBody(
    analysis.tokens,
    loopMatch[3],
  );
  const headersObject = rangeText(analysis.code, headersObjectRange);
  const setCall = loopRange.start + correlatedSet.index;
  return (
    /["']Cache-Control["']\s*:\s*["']no-store["']/i.test(headersObject) &&
    setCall > responseIndex &&
    returnCall > setCall
  );
}

function hasLegacyImport(analysis) {
  const tokenLines = analysis.tokens.split(/\r?\n/);
  const codeLines = analysis.code.split(/\r?\n/);
  return tokenLines.some(
    (line, index) =>
      /^\s*import\s*\{\s*resolveLegacyRedirect\s*\}\s*from\b/.test(line) &&
      /^\s*import\s*\{\s*resolveLegacyRedirect\s*\}\s*from\s*["'][^"']*shared\/legacy-redirects(?:\.ts)?["']\s*;?\s*$/.test(
        codeLines[index],
      ),
  );
}

function hasLegacyRedirectBridge(analysis) {
  const resolverRange = namedFunctionBody(
    analysis.tokens,
    "resolvePublicRedirect",
  );
  const redirectRange = namedFunctionBody(analysis.tokens, "permanentRedirect");
  const requestRange = onRequestBody(analysis.tokens);
  if (!resolverRange || !redirectRange || !requestRange) return false;

  const resolverTokens = rangeText(analysis.tokens, resolverRange);
  const redirectTokens = rangeText(analysis.tokens, redirectRange);
  const redirectCode = rangeText(analysis.code, redirectRange);
  const requestTokens = rangeText(analysis.tokens, requestRange);

  const declarationsPresent = [
    /\bconst\s+CANONICAL_ORIGIN\b/,
    /\bconst\s+ALTERNATE_PRODUCTION_HOSTS\b/,
    /\bconst\s+PRODUCTION_HOSTNAMES\b/,
  ].every((pattern) => pattern.test(analysis.tokens));
  const resolverOwnsRedirect = [
    /\bresolveLegacyRedirect\s*\(\s*url\s*\)/,
    /\bCANONICAL_ORIGIN\b/,
    /\bPRODUCTION_HOSTNAMES\b/,
  ].every((pattern) => pattern.test(resolverTokens));
  const redirectIsPermanent =
    /\bstatus\s*:\s*301\b/.test(redirectTokens) &&
    /(?:["']Location["']|\bLocation)\s*:/.test(redirectCode);

  const redirectCall = requestTokens.search(
    /\bresolvePublicRedirect\s*\(\s*context\.request\b/,
  );
  const redirectResponse = requestTokens.search(
    /\breturn\s+permanentRedirect\s*\(\s*target\s*\)/,
  );
  const nextCall = requestTokens.search(/\bcontext\.next\s*\(/);

  return (
    hasLegacyImport(analysis) &&
    declarationsPresent &&
    resolverOwnsRedirect &&
    redirectIsPermanent &&
    redirectCall >= 0 &&
    redirectResponse > redirectCall &&
    nextCall > redirectResponse
  );
}

function containsStaticForbiddenRedirectMarker(analysis) {
  const tokenPatterns = [
    /\bresolveLegacyRedirect\b/,
    /\bCANONICAL_ORIGIN\b/,
    /\bALTERNATE_PRODUCTION_HOSTS\b/,
    /\bPRODUCTION_HOSTNAMES\b/,
    /\bresolvePublicRedirect\b/,
    /\bpermanentRedirect\b/,
    /\bstatus\s*:\s*301\b/,
    /\bResponse\.redirect\s*\(/,
  ];
  const codePatterns = [
    /(?:["']Location["']|\bLocation)\s*:/i,
    /https?:\/\/(?:www\.)?integrautomacao\.com\.br/i,
    /integrautomacao-com-br\.pages\.dev/i,
  ];
  return (
    tokenPatterns.some((pattern) => pattern.test(analysis.tokens)) ||
    codePatterns.some((pattern) => pattern.test(analysis.code))
  );
}

function validateMiddleware(middleware, routingMode, violations) {
  if (!routingMode) return;
  const analysis = analyzeJavaScript(middleware);

  if (!hasApiHardening(analysis)) {
    violations.push(
      `${MIDDLEWARE_PATH}: API hardening must preserve status/body and set Cache-Control to no-store`,
    );
  }

  if (routingMode === "legacy-bridge") {
    if (!hasLegacyRedirectBridge(analysis)) {
      violations.push(
        `${MIDDLEWARE_PATH}: legacy-bridge must own public redirects`,
      );
    }
    if (!/["']Strict-Transport-Security["']\s*:\s*["']max-age=31536000["']/i.test(analysis.code)) {
      violations.push(
        `${MIDDLEWARE_PATH}: legacy-bridge must retain application HSTS`,
      );
    }
    return;
  }

  if (containsStaticForbiddenRedirectMarker(analysis)) {
    violations.push(
      `${MIDDLEWARE_PATH}: static-first must not own public redirects`,
    );
  }
  if (/strict-transport-security/i.test(analysis.code)) {
    violations.push(
      `${MIDDLEWARE_PATH}: HSTS belongs to the zone in static-first mode`,
    );
  }
}

function cacheHasPositiveMaxAge(value) {
  const matches = value.matchAll(
    /(?:^|,)\s*max-age\s*=\s*(?:"(\d+)"|'(\d+)'|(\d+))/gi,
  );
  for (const match of matches) {
    if (Number(match[1] ?? match[2] ?? match[3]) > 0) return true;
  }
  return false;
}

function validateLegacyHeaders(blocks, violations) {
  const sitewideHsts = blocks
    .filter((block) => block.path === "/*")
    .flatMap((block) => block.headers)
    .some(
      (header) =>
        !header.removal &&
        header.name === "strict-transport-security" &&
        header.value === "max-age=31536000",
    );

  if (!sitewideHsts) {
    violations.push(
      `${HEADERS_PATH} /*: legacy-bridge must retain Strict-Transport-Security max-age=31536000`,
    );
  }
}

function validateStaticHeaders(blocks, violations) {
  const astroCacheHeaders = [];

  for (const block of blocks) {
    if (block.path === "/api/*") {
      violations.push(
        `${HEADERS_PATH} /api/*: API headers belong to functions/_middleware.ts`,
      );
    }

    for (const header of block.headers) {
      if (header.name === "strict-transport-security") {
        violations.push(
          `${HEADERS_PATH} ${block.path}: HSTS belongs to the zone in static-first mode`,
        );
      }

      if (block.path === "/*" && header.name === "cache-control") {
        violations.push(
          `${HEADERS_PATH} /*: Cache-Control is forbidden in the sitewide static block`,
        );
      }

      if (header.name === "cache-control") {
        if (block.path === "/_astro/*") astroCacheHeaders.push(header);
        if (!header.removal && header.value !== null) {
          if (/\bimmutable\b/i.test(header.value) && block.path !== "/_astro/*") {
            violations.push(
              `${HEADERS_PATH} ${block.path}: immutable is allowed only in /_astro/*`,
            );
          }
          const hasSMaxage = /\bs-maxage\s*=/i.test(header.value);
          if (hasSMaxage) {
            violations.push(
              `${HEADERS_PATH} ${block.path}: s-maxage is forbidden in static-first mode`,
            );
          }
          if (
            !hasSMaxage &&
            cacheHasPositiveMaxAge(header.value) &&
            block.path !== "/_astro/*"
          ) {
            violations.push(
              `${HEADERS_PATH} ${block.path}: long-lived Cache-Control is allowed only in /_astro/*`,
            );
          }
        }
      }

      if (
        header.name === "vary" &&
        !header.removal &&
        header.value !== null &&
        header.value
          .split(",")
          .some((value) => value.trim().toLowerCase() === "accept-encoding")
      ) {
        violations.push(
          `${HEADERS_PATH} ${block.path}: Vary: Accept-Encoding is platform-owned in static-first mode`,
        );
      }
    }
  }

  if (
    astroCacheHeaders.length !== 1 ||
    astroCacheHeaders[0].removal ||
    astroCacheHeaders[0].value !== STATIC_ASTRO_CACHE
  ) {
    violations.push(
      `${HEADERS_PATH} /_astro/*: Cache-Control must equal "${STATIC_ASTRO_CACHE}"`,
    );
  }
}

export async function verifyDeploymentPolicy(rootDir) {
  const root = resolve(rootDir);
  const violations = [];
  const [phaseText, routesText, middlewareText, headersText] = await Promise.all([
    readRequiredText(root, PHASE_PATH, violations),
    readRequiredText(root, ROUTES_PATH, violations),
    readRequiredText(root, MIDDLEWARE_PATH, violations),
    readRequiredText(root, HEADERS_PATH, violations),
  ]);

  const routingMode =
    phaseText === null ? null : validatePhase(phaseText, violations);

  if (routesText !== null) {
    validateRoutes(routesText, routingMode, violations);
  }
  if (middlewareText !== null) {
    validateMiddleware(middlewareText, routingMode, violations);
  }
  if (headersText !== null) {
    const blocks = parseHeaders(headersText, violations);
    if (routingMode === "legacy-bridge") {
      validateLegacyHeaders(blocks, violations);
    } else if (routingMode === "static-first") {
      validateStaticHeaders(blocks, violations);
    }
  }

  return sortedUnique(violations);
}

async function runCli() {
  const args = process.argv.slice(2);
  if (args.length > 1) {
    process.stderr.write(
      "Usage: node scripts/verifyDeploymentPolicy.mjs [rootDir]\n",
    );
    process.exitCode = 1;
    return;
  }

  const violations = await verifyDeploymentPolicy(args[0] ?? ".");
  if (violations.length === 0) {
    process.stdout.write("Deployment policy: PASS\n");
    return;
  }

  process.stderr.write(
    ["Deployment policy: FAIL", ...violations.map((item) => `- ${item}`), ""].join(
      "\n",
    ),
  );
  process.exitCode = 1;
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  await runCli();
}
