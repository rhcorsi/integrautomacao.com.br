import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { verifyDeploymentPolicy } from "../../scripts/verifyDeploymentPolicy.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SCRIPT_PATH = join(
  REPOSITORY_ROOT,
  "scripts",
  "verifyDeploymentPolicy.mjs",
);

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

const LEGACY_ROUTES = {
  version: 1,
  include: ["/*"],
  exclude: LEGACY_EXCLUDE,
};

const STATIC_ROUTES = {
  version: 1,
  include: ["/api/*"],
  exclude: [],
};

const LEGACY_MIDDLEWARE = `import { resolveLegacyRedirect } from "../shared/legacy-redirects";

const CANONICAL_ORIGIN = "https://integrautomacao.com.br";
const ALTERNATE_PRODUCTION_HOSTS = new Set(["www.integrautomacao.com.br"]);
const PRODUCTION_HOSTNAMES = new Set([
  "integrautomacao.com.br",
  ...ALTERNATE_PRODUCTION_HOSTS,
]);

const API_SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000",
  "Cache-Control": "no-store",
};

function resolvePublicRedirect(request: Request, url: URL): URL | null {
  const legacyTarget = resolveLegacyRedirect(url);
  if (!PRODUCTION_HOSTNAMES.has(url.hostname) || legacyTarget) {
    return new URL(legacyTarget ?? url.pathname, CANONICAL_ORIGIN);
  }
  return null;
}

function permanentRedirect(target: URL): Response {
  return new Response(null, {
    status: 301,
    headers: {
      Location: target.toString(),
      "Strict-Transport-Security": "max-age=31536000",
    },
  });
}

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const target = resolvePublicRedirect(context.request, url);
  if (target) return permanentRedirect(target);

  const response = await context.next();
  if (url.pathname.startsWith("/api/")) {
    const hardened = new Response(response.body, response);
    for (const [name, value] of Object.entries(API_SECURITY_HEADERS)) {
      hardened.headers.set(name, value);
    }
    return hardened;
  }
  return response;
};
`;

const STATIC_MIDDLEWARE = `const API_SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store",
};

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const response = await context.next();
  if (!url.pathname.startsWith("/api/")) return response;

  const hardened = new Response(response.body, response);
  for (const [name, value] of Object.entries(API_SECURITY_HEADERS)) {
    hardened.headers.set(name, value);
  }
  return hardened;
};
`;

const LEGACY_HEADERS = `/*
  Strict-Transport-Security: max-age=31536000
  X-Content-Type-Options: nosniff
  ! Access-Control-Allow-Origin

/_astro/*
  Cache-Control: public, max-age=31536000, immutable, s-maxage=31536000
  Vary: Accept-Encoding

/images/*
  Cache-Control: public, max-age=2592000, s-maxage=31536000

/api/*
  Cache-Control: no-store
`;

const STATIC_HEADERS = `/*
  X-Content-Type-Options: nosniff

/_astro/*
  Cache-Control: public, max-age=31536000, immutable
`;

const temporaryRoots: string[] = [];

async function writeFixture(
  root: string,
  relativePath: string,
  content: string,
): Promise<void> {
  const target = join(root, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

async function writeJson(
  root: string,
  relativePath: string,
  value: unknown,
): Promise<void> {
  await writeFixture(root, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function createPolicyFixture(
  routingMode: "legacy-bridge" | "static-first",
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "deployment-policy-"));
  temporaryRoots.push(root);
  await writeJson(root, "config/deployment-phase.json", {
    schemaVersion: 1,
    routingMode,
  });
  await writeJson(
    root,
    "public/_routes.json",
    routingMode === "legacy-bridge" ? LEGACY_ROUTES : STATIC_ROUTES,
  );
  await writeFixture(
    root,
    "functions/_middleware.ts",
    routingMode === "legacy-bridge"
      ? LEGACY_MIDDLEWARE
      : STATIC_MIDDLEWARE,
  );
  await writeFixture(
    root,
    "public/_headers",
    routingMode === "legacy-bridge" ? LEGACY_HEADERS : STATIC_HEADERS,
  );
  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) =>
      rm(root, { recursive: true, force: true }),
    ),
  );
});

describe("verifyDeploymentPolicy phase declaration", () => {
  it("accepts a complete legacy-bridge fixture", async () => {
    const root = await createPolicyFixture("legacy-bridge");

    expect(await verifyDeploymentPolicy(root)).toEqual([]);
  });

  it("accepts a complete static-first fixture", async () => {
    const root = await createPolicyFixture("static-first");

    expect(await verifyDeploymentPolicy(root)).toEqual([]);
  });

  it("fails closed when the phase file is absent", async () => {
    const root = await createPolicyFixture("legacy-bridge");
    await rm(join(root, "config/deployment-phase.json"));

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "config/deployment-phase.json: required file is missing",
    ]);
  });

  it("rejects invalid phase JSON", async () => {
    const root = await createPolicyFixture("legacy-bridge");
    await writeFixture(root, "config/deployment-phase.json", "{invalid\n");

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "config/deployment-phase.json: invalid JSON",
    ]);
  });

  it("rejects a schema version other than integer 1", async () => {
    const root = await createPolicyFixture("legacy-bridge");
    await writeJson(root, "config/deployment-phase.json", {
      schemaVersion: 2,
      routingMode: "legacy-bridge",
    });

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "config/deployment-phase.json: schemaVersion must equal integer 1",
    ]);
  });

  it("rejects a missing schemaVersion key", async () => {
    const root = await createPolicyFixture("legacy-bridge");
    await writeJson(root, "config/deployment-phase.json", {
      routingMode: "legacy-bridge",
    });

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "config/deployment-phase.json: schemaVersion must equal integer 1",
    ]);
  });

  it.each(["STATIC-FIRST", "legacy_bridge", "future"])(
    "rejects unknown or alternatively cased routing mode %s",
    async (routingMode) => {
      const root = await createPolicyFixture("legacy-bridge");
      await writeJson(root, "config/deployment-phase.json", {
        schemaVersion: 1,
        routingMode,
      });

      expect(await verifyDeploymentPolicy(root)).toEqual([
        "config/deployment-phase.json: routingMode must be legacy-bridge or static-first",
      ]);
    },
  );

  it("rejects a missing routingMode key", async () => {
    const root = await createPolicyFixture("legacy-bridge");
    await writeJson(root, "config/deployment-phase.json", {
      schemaVersion: 1,
    });

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "config/deployment-phase.json: routingMode must be legacy-bridge or static-first",
    ]);
  });

  it("rejects alternatively cased phase keys", async () => {
    const root = await createPolicyFixture("legacy-bridge");
    await writeJson(root, "config/deployment-phase.json", {
      schemaVersion: 1,
      RoutingMode: "legacy-bridge",
    });

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "config/deployment-phase.json: routingMode must be legacy-bridge or static-first",
      "config/deployment-phase.json: unexpected keys: RoutingMode",
    ]);
  });

  it("rejects an extra phase key", async () => {
    const root = await createPolicyFixture("legacy-bridge");
    await writeJson(root, "config/deployment-phase.json", {
      schemaVersion: 1,
      routingMode: "legacy-bridge",
      approved: true,
    });

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "config/deployment-phase.json: unexpected keys: approved",
    ]);
  });

  it.each([null, [], "legacy-bridge"])(
    "rejects non-object phase value %j",
    async (phase) => {
      const root = await createPolicyFixture("legacy-bridge");
      await writeJson(root, "config/deployment-phase.json", phase);

      expect(await verifyDeploymentPolicy(root)).toEqual([
        "config/deployment-phase.json: must be an object",
      ]);
    },
  );
});

describe("verifyDeploymentPolicy legacy-bridge mode", () => {
  it.each([
    [
      "a non-integer version",
      { ...LEGACY_ROUTES, version: 2 },
      ["public/_routes.json: version must equal integer 1"],
    ],
    [
      "an extra key",
      { ...LEGACY_ROUTES, owner: "legacy" },
      ["public/_routes.json: unexpected keys: owner"],
    ],
    [
      "a missing include key",
      { version: 1, exclude: LEGACY_EXCLUDE },
      ['public/_routes.json: legacy-bridge include must equal ["/*"]'],
    ],
    ["a non-object value", [], ["public/_routes.json: must be an object"]],
  ])("rejects %s in routes", async (_label, routes, expected) => {
    const root = await createPolicyFixture("legacy-bridge");
    await writeJson(root, "public/_routes.json", routes);

    expect(await verifyDeploymentPolicy(root)).toEqual(expected);
  });

  it("rejects API-only routes while the legacy bridge is declared", async () => {
    const root = await createPolicyFixture("legacy-bridge");
    await writeJson(root, "public/_routes.json", STATIC_ROUTES);

    expect(await verifyDeploymentPolicy(root)).toEqual([
      `public/_routes.json: legacy-bridge exclude must equal ${JSON.stringify(LEGACY_EXCLUDE)}`,
      'public/_routes.json: legacy-bridge include must equal ["/*"]',
    ]);
  });

  it("rejects removal of the legacy redirect import and resolver use", async () => {
    const root = await createPolicyFixture("legacy-bridge");
    const withoutBridge = LEGACY_MIDDLEWARE
      .replace(
        'import { resolveLegacyRedirect } from "../shared/legacy-redirects";\n',
        "",
      )
      .replace(
        "  const legacyTarget = resolveLegacyRedirect(url);",
        "  const legacyTarget = null;",
      );
    await writeFixture(root, "functions/_middleware.ts", withoutBridge);

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "functions/_middleware.ts: legacy-bridge must own public redirects",
    ]);
  });

  it("does not count commented-out bridge markers as active ownership", async () => {
    const root = await createPolicyFixture("legacy-bridge");
    const commentedBridge = LEGACY_MIDDLEWARE.replace(
      'import { resolveLegacyRedirect } from "../shared/legacy-redirects";',
      '// import { resolveLegacyRedirect } from "../shared/legacy-redirects";',
    ).replace(
      "  const legacyTarget = resolveLegacyRedirect(url);",
      "  // const legacyTarget = resolveLegacyRedirect(url);\n  const legacyTarget = null;",
    );
    await writeFixture(root, "functions/_middleware.ts", commentedBridge);

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "functions/_middleware.ts: legacy-bridge must own public redirects",
    ]);
  });

  it("rejects removal of application HSTS from headers and middleware", async () => {
    const root = await createPolicyFixture("legacy-bridge");
    await writeFixture(
      root,
      "public/_headers",
      LEGACY_HEADERS.replace(
        "  Strict-Transport-Security: max-age=31536000\n",
        "",
      ),
    );
    await writeFixture(
      root,
      "functions/_middleware.ts",
      LEGACY_MIDDLEWARE.replaceAll(
        '"Strict-Transport-Security": "max-age=31536000",\n',
        "",
      ),
    );

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "functions/_middleware.ts: legacy-bridge must retain application HSTS",
      "public/_headers /*: legacy-bridge must retain Strict-Transport-Security max-age=31536000",
    ]);
  });

  it("requires API no-store hardening while the bridge remains active", async () => {
    const root = await createPolicyFixture("legacy-bridge");
    await writeFixture(
      root,
      "functions/_middleware.ts",
      LEGACY_MIDDLEWARE.replace(
        '"Cache-Control": "no-store"',
        '"Cache-Control": "public"',
      ),
    );

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "functions/_middleware.ts: API hardening must preserve status/body and set Cache-Control to no-store",
    ]);
  });
});

describe("verifyDeploymentPolicy static-first mode", () => {
  it("rejects catch-all routes after static-first is declared", async () => {
    const root = await createPolicyFixture("static-first");
    await writeJson(root, "public/_routes.json", LEGACY_ROUTES);

    expect(await verifyDeploymentPolicy(root)).toEqual([
      'public/_routes.json: static-first exclude must equal []',
      'public/_routes.json: static-first include must equal ["/api/*"]',
    ]);
  });

  it.each([
    "const resolveLegacyRedirect = () => null;",
    'const CANONICAL_ORIGIN = "https://integrautomacao.com.br";',
    "const ALTERNATE_PRODUCTION_HOSTS = new Set();",
    "function resolvePublicRedirect() {}",
    "function permanentRedirect() {}",
    "const redirectResponse = { status: 301 };",
    'const redirectHeaders = { Location: "/" };',
    'const redirectResponse = Response.redirect("/moved", 308);',
  ])("rejects public redirect marker %s", async (marker) => {
    const root = await createPolicyFixture("static-first");
    await writeFixture(
      root,
      "functions/_middleware.ts",
      `${STATIC_MIDDLEWARE}\n${marker}\n`,
    );

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "functions/_middleware.ts: static-first must not own public redirects",
    ]);
  });

  it("rejects HSTS in static headers", async () => {
    const root = await createPolicyFixture("static-first");
    await writeFixture(
      root,
      "public/_headers",
      STATIC_HEADERS.replace(
        "  X-Content-Type-Options: nosniff",
        "  Strict-Transport-Security: max-age=31536000\n  X-Content-Type-Options: nosniff",
      ),
    );

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "public/_headers /*: HSTS belongs to the zone in static-first mode",
    ]);
  });

  it("rejects HSTS in static-first middleware", async () => {
    const root = await createPolicyFixture("static-first");
    await writeFixture(
      root,
      "functions/_middleware.ts",
      STATIC_MIDDLEWARE.replace(
        '"X-Content-Type-Options": "nosniff",',
        '"Strict-Transport-Security": "max-age=31536000",\n  "X-Content-Type-Options": "nosniff",',
      ),
    );

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "functions/_middleware.ts: HSTS belongs to the zone in static-first mode",
    ]);
  });

  it("requires API hardening to preserve the response and force no-store", async () => {
    const root = await createPolicyFixture("static-first");
    await writeFixture(
      root,
      "functions/_middleware.ts",
      STATIC_MIDDLEWARE.replace(
        '"Cache-Control": "no-store"',
        '"Cache-Control": "public"',
      ),
    );

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "functions/_middleware.ts: API hardening must preserve status/body and set Cache-Control to no-store",
    ]);
  });

  it("requires returning the hardened API response", async () => {
    const root = await createPolicyFixture("static-first");
    await writeFixture(
      root,
      "functions/_middleware.ts",
      STATIC_MIDDLEWARE.replace("  return hardened;", "  return response;"),
    );

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "functions/_middleware.ts: API hardening must preserve status/body and set Cache-Control to no-store",
    ]);
  });

  it("does not count an unrelated headers.set call as API hardening", async () => {
    const root = await createPolicyFixture("static-first");
    const unappliedApiHeaders = `${STATIC_MIDDLEWARE.replace(
      "    hardened.headers.set(name, value);",
      "    void name;\n    void value;",
    )}\nconst unrelated = { headers: new Headers() };\nunrelated.headers.set("X-Test", "1");\n`;
    await writeFixture(
      root,
      "functions/_middleware.ts",
      unappliedApiHeaders,
    );

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "functions/_middleware.ts: API hardening must preserve status/body and set Cache-Control to no-store",
    ]);
  });

  it("requires the API loop to apply its captured header name and value", async () => {
    const root = await createPolicyFixture("static-first");
    await writeFixture(
      root,
      "functions/_middleware.ts",
      STATIC_MIDDLEWARE.replace(
        "hardened.headers.set(name, value);",
        'hardened.headers.set("X-Test", "1");',
      ),
    );

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "functions/_middleware.ts: API hardening must preserve status/body and set Cache-Control to no-store",
    ]);
  });

  it("requires onRequest to remain exported", async () => {
    const root = await createPolicyFixture("static-first");
    await writeFixture(
      root,
      "functions/_middleware.ts",
      STATIC_MIDDLEWARE.replace(
        "export const onRequest",
        "const onRequest",
      ),
    );

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "functions/_middleware.ts: API hardening must preserve status/body and set Cache-Control to no-store",
    ]);
  });

  it("does not borrow a later helper block for an expression-bodied handler", async () => {
    const root = await createPolicyFixture("static-first");
    const expressionBodyWithHelper = `const API_SECURITY_HEADERS = {
  "Cache-Control": "no-store",
};

export const onRequest: PagesFunction = async (context) => context.next();

const helper = async (context) => {
  const url = new URL(context.request.url);
  const response = await context.next();
  if (!url.pathname.startsWith("/api/")) return response;
  const hardened = new Response(response.body, response);
  for (const [name, value] of Object.entries(API_SECURITY_HEADERS)) {
    hardened.headers.set(name, value);
  }
  return hardened;
};
`;
    await writeFixture(
      root,
      "functions/_middleware.ts",
      expressionBodyWithHelper,
    );

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "functions/_middleware.ts: API hardening must preserve status/body and set Cache-Control to no-store",
    ]);
  });

  it("rejects an API block in static headers", async () => {
    const root = await createPolicyFixture("static-first");
    await writeFixture(
      root,
      "public/_headers",
      `${STATIC_HEADERS}\n/api/*\n  Cache-Control: no-store\n`,
    );

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "public/_headers /api/*: API headers belong to functions/_middleware.ts",
    ]);
  });

  it("rejects immutable caching outside fingerprinted Astro assets", async () => {
    const root = await createPolicyFixture("static-first");
    await writeFixture(
      root,
      "public/_headers",
      `${STATIC_HEADERS}\n/images/*\n  Cache-Control: public, max-age=31536000, immutable\n`,
    );

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "public/_headers /images/*: immutable is allowed only in /_astro/*",
      "public/_headers /images/*: long-lived Cache-Control is allowed only in /_astro/*",
    ]);
  });

  it.each(["public, max-age=31535999", 'public, max-age="31536000"'])(
    "rejects long-lived non-fingerprinted cache value %s",
    async (cacheControl) => {
      const root = await createPolicyFixture("static-first");
      await writeFixture(
        root,
        "public/_headers",
        `${STATIC_HEADERS}\n/images/*\n  Cache-Control: ${cacheControl}\n`,
      );

      expect(await verifyDeploymentPolicy(root)).toEqual([
        "public/_headers /images/*: long-lived Cache-Control is allowed only in /_astro/*",
      ]);
    },
  );

  it("rejects every s-maxage directive", async () => {
    const root = await createPolicyFixture("static-first");
    await writeFixture(
      root,
      "public/_headers",
      `${STATIC_HEADERS}\n/sitemap-*.xml\n  Cache-Control: public, max-age=300, s-maxage=3600\n`,
    );

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "public/_headers /sitemap-*.xml: s-maxage is forbidden in static-first mode",
    ]);
  });

  it("rejects explicit Accept-Encoding variance", async () => {
    const root = await createPolicyFixture("static-first");
    await writeFixture(
      root,
      "public/_headers",
      `${STATIC_HEADERS}\n/images/*\n  Vary: Accept-Encoding\n`,
    );

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "public/_headers /images/*: Vary: Accept-Encoding is platform-owned in static-first mode",
    ]);
  });

  it("rejects duplicate header names case-insensitively", async () => {
    const root = await createPolicyFixture("static-first");
    await writeFixture(
      root,
      "public/_headers",
      `${STATIC_HEADERS}\n/images/*\n  Cache-Control: max-age=0\n  cache-control: no-store\n`,
    );

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "public/_headers /images/*: duplicate header cache-control on lines 8 and 9",
    ]);
  });

  it("counts a removal directive when detecting duplicate header ownership", async () => {
    const root = await createPolicyFixture("static-first");
    await writeFixture(
      root,
      "public/_headers",
      `${STATIC_HEADERS}\n/images/*\n  Cache-Control: max-age=0\n  ! cache-control\n`,
    );

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "public/_headers /images/*: duplicate header cache-control on lines 8 and 9",
    ]);
  });

  it("requires the exact immutable Astro cache value", async () => {
    const root = await createPolicyFixture("static-first");
    await writeFixture(
      root,
      "public/_headers",
      STATIC_HEADERS.replace(
        "public, max-age=31536000, immutable",
        "public, max-age=86400, immutable",
      ),
    );

    expect(await verifyDeploymentPolicy(root)).toEqual([
      'public/_headers /_astro/*: Cache-Control must equal "public, max-age=31536000, immutable"',
    ]);
  });

  it("rejects cache ownership in the sitewide static block", async () => {
    const root = await createPolicyFixture("static-first");
    await writeFixture(
      root,
      "public/_headers",
      STATIC_HEADERS.replace(
        "  X-Content-Type-Options: nosniff",
        "  X-Content-Type-Options: nosniff\n  Cache-Control: no-store",
      ),
    );

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "public/_headers /*: Cache-Control is forbidden in the sitewide static block",
    ]);
  });
});

describe("verifyDeploymentPolicy parsing and I/O failures", () => {
  it("reports a malformed indented header with its line and block", async () => {
    const root = await createPolicyFixture("static-first");
    await writeFixture(
      root,
      "public/_headers",
      `${STATIC_HEADERS}/images/*\n  malformed directive\n`,
    );

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "public/_headers line 7 (block /images/*): malformed header directive",
    ]);
  });

  it.each([
    ["public/_routes.json", "public/_routes.json: required file is missing"],
    [
      "functions/_middleware.ts",
      "functions/_middleware.ts: required file is missing",
    ],
    ["public/_headers", "public/_headers: required file is missing"],
  ])("returns a violation instead of throwing when %s is absent", async (path, violation) => {
    const root = await createPolicyFixture("legacy-bridge");
    await rm(join(root, path));

    expect(await verifyDeploymentPolicy(root)).toEqual([violation]);
  });

  it("returns a violation instead of throwing for an unreadable required path", async () => {
    const root = await createPolicyFixture("legacy-bridge");
    const target = join(root, "functions/_middleware.ts");
    await rm(target);
    await mkdir(target);

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "functions/_middleware.ts: unable to read required file",
    ]);
  });

  it("rejects invalid routes JSON without leaking a parser exception", async () => {
    const root = await createPolicyFixture("legacy-bridge");
    await writeFixture(root, "public/_routes.json", "not-json\n");

    expect(await verifyDeploymentPolicy(root)).toEqual([
      "public/_routes.json: invalid JSON",
    ]);
  });
});

describe("verifyDeploymentPolicy CLI and repository state", () => {
  it.each(["default root", "explicit root"])(
    "prints PASS for a valid fixture using the %s CLI mode",
    async (mode) => {
      const root = await createPolicyFixture("static-first");
      const result = spawnSync(
        process.execPath,
        mode === "explicit root" ? [SCRIPT_PATH, root] : [SCRIPT_PATH],
        {
          cwd: root,
          encoding: "utf8",
        },
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toBe("Deployment policy: PASS\n");
      expect(result.stderr).toBe("");
    },
  );

  it("lists violations and exits 1 in CLI mode", async () => {
    const root = await createPolicyFixture("static-first");
    await writeJson(root, "public/_routes.json", LEGACY_ROUTES);

    const result = spawnSync(process.execPath, [SCRIPT_PATH, root], {
      cwd: REPOSITORY_ROOT,
      encoding: "utf8",
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(
      [
        "Deployment policy: FAIL",
        '- public/_routes.json: static-first exclude must equal []',
        '- public/_routes.json: static-first include must equal ["/api/*"]',
        "",
      ].join("\n"),
    );
  });

  it("rejects more than one root argument", () => {
    const result = spawnSync(process.execPath, [SCRIPT_PATH, ".", "extra"], {
      cwd: REPOSITORY_ROOT,
      encoding: "utf8",
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(
      "Usage: node scripts/verifyDeploymentPolicy.mjs [rootDir]\n",
    );
  });

  it("accepts the real repository in its declared legacy-bridge phase", async () => {
    expect(await verifyDeploymentPolicy(REPOSITORY_ROOT)).toEqual([]);
  });
});
