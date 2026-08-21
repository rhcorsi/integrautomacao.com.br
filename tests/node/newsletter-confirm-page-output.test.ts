import {
  access,
  lstat,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  unlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "astro";
import { describe, expect, it, vi } from "vitest";
import { inspectSeoOutput } from "../../scripts/verifySeoOutput.mjs";

const NETWORK_BLOCK_MESSAGE = "B6_NODE_BUILD_NETWORK_BLOCKED";
const CONFIRMATION_RELATIVE_PATH = join(
  "integra-acao",
  "newsletter",
  "confirmar",
  "index.html",
);
const CONFIRMATION_URL =
  "https://integrautomacao.com.br/integra-acao/newsletter/confirmar/";

function attribute(tag: string, name: string) {
  const match = tag.match(
    new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "iu"),
  );
  return match?.[2] ?? null;
}

function hasAttribute(tag: string, name: string) {
  return new RegExp(`\\s${name}(?:\\s*=|\\s|>)`, "iu").test(tag);
}

function tags(html: string, tagName: string) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, "giu"))].map(
    (match) => match[0],
  );
}

async function fileExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function findFiles(root: string, current = root): Promise<string[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) files.push(...(await findFiles(root, path)));
    if (entry.isFile()) files.push(relative(root, path).replaceAll("\\", "/"));
  }
  return files.sort();
}

async function safelyRemoveBuildDirectory(path: string) {
  const resolvedTemporaryRoot = resolve(tmpdir());
  const resolvedTarget = resolve(path);
  const expectedPrefix = `${resolvedTemporaryRoot}${sep}`;
  if (
    !resolvedTarget.startsWith(expectedPrefix) ||
    !basename(resolvedTarget).startsWith("newsletter-confirm-page-")
  ) {
    throw new Error("refusing to remove a path outside the B6 temporary build root");
  }
  await rm(resolvedTarget, { force: true, recursive: true });
}

async function removeTemporaryDependencyLink(path: string) {
  try {
    const metadata = await lstat(path);
    if (!metadata.isSymbolicLink()) {
      throw new Error("temporary node_modules path is not a symbolic link");
    }
    await unlink(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function referencedAsset(
  outputRoot: string,
  src: string,
): Promise<string | null> {
  if (!src.startsWith("/")) return null;
  const assetPath = resolve(outputRoot, src.slice(1));
  const relativeAsset = relative(resolve(outputRoot), assetPath);
  if (relativeAsset.startsWith("..") || relativeAsset === "") return null;
  return (await fileExists(assetPath)) ? readFile(assetPath, "utf8") : null;
}

describe("generated newsletter confirmation page", () => {
  it(
    "builds fresh output with the privacy, SEO, accessibility, and copy contracts",
    async () => {
      const repositoryRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
      const outputRoot = await mkdtemp(join(tmpdir(), "newsletter-confirm-page-"));
      const dependencyLink = join(outputRoot, "node_modules");
      const originalFetch = globalThis.fetch;
      const originalWorkingDirectory = process.cwd();
      const originalTelemetrySetting = process.env.ASTRO_TELEMETRY_DISABLED;
      const blockedFetch = vi.fn(async () => {
        throw new Error(NETWORK_BLOCK_MESSAGE);
      });

      try {
        process.env.ASTRO_TELEMETRY_DISABLED = "1";
        await symlink(
          join(repositoryRoot, "node_modules"),
          dependencyLink,
          process.platform === "win32" ? "junction" : "dir",
        );
        process.chdir(outputRoot);
        globalThis.fetch = blockedFetch as typeof fetch;
        await build({
          root: repositoryRoot,
          outDir: outputRoot,
          cacheDir: join(outputRoot, ".astro-cache"),
          logLevel: "silent",
          vite: { build: { emptyOutDir: false } },
        });
        expect(blockedFetch).not.toHaveBeenCalled();
        await removeTemporaryDependencyLink(dependencyLink);

        const confirmationPath = join(outputRoot, CONFIRMATION_RELATIVE_PATH);
        expect(
          await fileExists(confirmationPath),
          `fresh Astro output must contain ${CONFIRMATION_RELATIVE_PATH}`,
        ).toBe(true);

        const [confirmationHtml, newsletterHtml, confirmationSource, controllerSource, formSource, newsletterSource] =
          await Promise.all([
            readFile(confirmationPath, "utf8"),
            readFile(join(outputRoot, "integra-acao", "newsletter", "index.html"), "utf8"),
            readFile(
              join(
                repositoryRoot,
                "src",
                "pages",
                "integra-acao",
                "newsletter",
                "confirmar.astro",
              ),
              "utf8",
            ),
            readFile(
              join(repositoryRoot, "src", "scripts", "newsletterConfirmation.ts"),
              "utf8",
            ),
            readFile(
              join(repositoryRoot, "src", "components", "NewsletterForm.astro"),
              "utf8",
            ),
            readFile(
              join(repositoryRoot, "src", "pages", "integra-acao", "newsletter.astro"),
              "utf8",
            ),
          ]);

        expect(await inspectSeoOutput(outputRoot)).toEqual([]);

        const titleText = confirmationHtml.match(
          /<title\b[^>]*>([\s\S]*?)<\/title>/iu,
        )?.[1];
        expect(titleText).toBe("Confirme sua inscrição | Integra");
        const descriptions = tags(confirmationHtml, "meta").filter(
          (tag) => attribute(tag, "name")?.toLowerCase() === "description",
        );
        expect(descriptions).toHaveLength(1);
        expect(attribute(descriptions[0]!, "content")).toBe(
          "Confirme explicitamente seu endereço de e-mail para concluir a inscrição na newsletter Integra Ação.",
        );
        expect(confirmationSource).toContain('title="Confirme sua inscrição"');
        expect(confirmationSource).toContain(
          'description="Confirme explicitamente seu endereço de e-mail para concluir a inscrição na newsletter Integra Ação."',
        );

        const robots = tags(confirmationHtml, "meta").filter(
          (tag) => attribute(tag, "name")?.toLowerCase() === "robots",
        );
        expect(robots).toHaveLength(1);
        expect(attribute(robots[0]!, "content")).toBe("noindex,nofollow");

        const canonicalTags = tags(confirmationHtml, "link").filter(
          (tag) => attribute(tag, "rel")?.toLowerCase() === "canonical",
        );
        expect(canonicalTags).toHaveLength(1);
        expect(attribute(canonicalTags[0]!, "href")).toBe(CONFIRMATION_URL);

        const outputFiles = await findFiles(outputRoot);
        const sitemapFiles = outputFiles.filter((file) =>
          /(?:^|\/)sitemap(?:-.*)?\.xml$/u.test(file),
        );
        expect(sitemapFiles.length).toBeGreaterThan(0);
        for (const sitemapFile of sitemapFiles) {
          const sitemap = await readFile(join(outputRoot, sitemapFile), "utf8");
          expect(sitemap).not.toContain(CONFIRMATION_URL);
          expect(sitemap).not.toContain("/integra-acao/newsletter/confirmar/");
        }

        const head = confirmationHtml.match(/<head\b[^>]*>([\s\S]*?)<\/head>/iu)?.[1];
        expect(head).toBeDefined();
        const headScripts = tags(head ?? "", "script").filter(
          (tag) => attribute(tag, "type")?.toLowerCase() !== "application/ld+json",
        );
        expect(headScripts.length).toBeGreaterThan(0);
        expect(headScripts.every((tag) => Boolean(attribute(tag, "src")))).toBe(true);
        const headAssets = await Promise.all(
          headScripts.map((tag) => referencedAsset(outputRoot, attribute(tag, "src") ?? "")),
        );
        expect(
          headAssets.some(
            (source) =>
              source?.includes("/api/newsletter/confirm") &&
              source.includes("replaceState"),
          ),
        ).toBe(true);

        const executableScripts = [...confirmationHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/giu)]
          .filter((match) => attribute(match[0], "type")?.toLowerCase() !== "application/ld+json");
        expect(executableScripts.length).toBeGreaterThan(0);
        for (const script of executableScripts) {
          expect(attribute(script[0], "src")).not.toBeNull();
          expect(script[2]?.trim()).toBe("");
        }
        const executableAssets = await Promise.all(
          executableScripts.map(async (script) => ({
            index: script.index ?? -1,
            source: await referencedAsset(
              outputRoot,
              attribute(script[0], "src") ?? "",
            ),
          })),
        );
        const confirmationAsset = executableAssets.find(
          (asset) =>
            asset.source?.includes("/api/newsletter/confirm") &&
            asset.source.includes("replaceState"),
        );
        const contactContextAsset = executableAssets.find(
          (asset) =>
            asset.source?.includes("integra:contact-context") &&
            asset.source.includes("location.hash"),
        );
        expect(confirmationAsset).toBeDefined();
        expect(contactContextAsset).toBeDefined();
        expect(confirmationAsset!.index).toBeLessThan(contactContextAsset!.index);

        const buttons = tags(confirmationHtml, "button").filter(
          (tag) =>
            attribute(tag, "type") === "button" &&
            hasAttribute(tag, "data-confirmation-button"),
        );
        expect(buttons).toHaveLength(1);
        expect(buttons[0]).toMatch(/\sdisabled(?:\s|>|=)/iu);
        expect(confirmationHtml).toContain("Confirmar inscrição");

        const statusRegions = tags(confirmationHtml, "p").filter(
          (tag) => hasAttribute(tag, "data-confirmation-status"),
        );
        expect(statusRegions).toHaveLength(1);
        expect(attribute(statusRegions[0]!, "role")).toBe("status");
        expect(attribute(statusRegions[0]!, "aria-live")).toBe("polite");
        expect(attribute(statusRegions[0]!, "aria-atomic")).toBe("true");

        expect(confirmationHtml).toMatch(/data-pagefind-ignore(?:\s|>|=)/iu);
        expect(confirmationHtml).toContain(
          'href="/integra-acao/newsletter/"',
        );
        const recovery = tags(confirmationHtml, "p").find((tag) =>
          hasAttribute(tag, "data-confirmation-recovery"),
        );
        expect(recovery).toBeDefined();
        expect(hasAttribute(recovery!, "hidden")).toBe(false);
        expect(confirmationHtml).toContain("Abrir este link não confirma nada");
        expect(confirmationHtml).toContain("<noscript>");
        expect(confirmationHtml).not.toMatch(/http-equiv=["']refresh["']/iu);
        expect(confirmationHtml).not.toContain("?token=");

        const landingAndControllerSource = `${confirmationSource}\n${controllerSource}`;
        for (const forbidden of [
          "?token=",
          "innerHTML",
          "outerHTML",
          "insertAdjacentHTML",
          "document.write",
          "localStorage",
          "sessionStorage",
          ".cookie",
          "meta refresh",
        ]) {
          expect(landingAndControllerSource).not.toContain(forbidden);
        }
        expect(confirmationSource).toContain("postNewsletterConfirmation(token, {");
        expect(confirmationSource).toContain("request: (input, init) => fetch(input, init)");
        expect(confirmationSource).toContain(
          "timeoutSignal: (timeoutMs) => AbortSignal.timeout(timeoutMs)",
        );
        expect(confirmationSource).toContain(
          'replaceUrl: (path) => history.replaceState(null, "", path)',
        );
        expect(confirmationSource).toContain(
          "currentPath: () => window.location.pathname",
        );
        expect(confirmationSource).not.toContain("window.location.search");
        expect(confirmationSource.indexOf("if (status && button && recovery)"))
          .toBeLessThan(confirmationSource.indexOf("window.location.hash"));
        expect(confirmationSource).not.toContain("classifyConfirmationHttpResponse");
        expect(confirmationSource).toMatch(/addEventListener\(\s*["']click["']/u);
        expect(confirmationSource).not.toMatch(
          /addEventListener\(\s*["'](?:load|DOMContentLoaded|submit)["']/u,
        );

        expect(controllerSource).toContain('"/api/newsletter/confirm"');
        expect(controllerSource).toContain('method: "POST"');
        expect(controllerSource).toContain('Accept: "application/json"');
        expect(controllerSource).toContain('"Content-Type": "application/json"');
        expect(controllerSource).toContain("JSON.stringify({ token })");
        expect(controllerSource).toContain("timeoutSignal(12_000)");
        expect(controllerSource).toContain('redirect: "error"');
        expect(controllerSource).not.toMatch(/console\s*\./u);

        const neutralCopy =
          "Se o endereço puder receber a newsletter, enviaremos as próximas instruções por e-mail.";
        const removedCopies = [
          "Inscrição registrada.",
          "Inscrição confirmada. Você receberá as próximas edições publicadas.",
        ];
        expect(formSource.match(new RegExp(neutralCopy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gu"))).toHaveLength(1);
        expect(formSource.match(/NEWSLETTER_ACCEPTED_MESSAGE/gu)).toHaveLength(3);
        expect(newsletterHtml).toContain(
          "A inscrição só fica ativa depois que você abre o e-mail e confirma explicitamente o endereço.",
        );
        for (const removed of removedCopies) {
          expect(formSource).not.toContain(removed);
          expect(newsletterHtml).not.toContain(removed);
        }

        const consentCheckbox = tags(newsletterHtml, "input").find(
          (tag) => attribute(tag, "name") === "lgpd",
        );
        expect(consentCheckbox).toBeDefined();
        expect(attribute(consentCheckbox!, "id")).toBe("nl-lgpd");
        expect(attribute(consentCheckbox!, "aria-describedby")).toBe("nl-lgpd-help");
        expect(newsletterHtml).toContain('id="nl-lgpd-help"');

        for (const expectedFaqText of [
          "Confirmar inscrição",
          "e-mail transacional",
          "Resend",
          "Segmento",
          "Tópico",
          "Link expirado",
        ]) {
          expect(newsletterSource).toContain(expectedFaqText);
          expect(newsletterHtml).toContain(expectedFaqText);
        }

        expect(confirmationHtml).not.toMatch(/<form\b/iu);
        expect(confirmationSource).not.toMatch(/\.submit\s*\(/u);
        expect(confirmationSource).not.toMatch(/dispatchEvent/u);
      } finally {
        globalThis.fetch = originalFetch;
        if (originalTelemetrySetting === undefined) {
          delete process.env.ASTRO_TELEMETRY_DISABLED;
        } else {
          process.env.ASTRO_TELEMETRY_DISABLED = originalTelemetrySetting;
        }
        process.chdir(originalWorkingDirectory);
        await removeTemporaryDependencyLink(dependencyLink);
        await safelyRemoveBuildDirectory(outputRoot);
      }
    },
    120_000,
  );
});
