/**
 * Compare independently built sites. Never builds, runs page scripts or sends HTTP.
 * node scripts/verifyRebrandingPreservation.mjs snapshot --dist ../baseline/dist --out baseline.json
 * node scripts/verifyRebrandingPreservation.mjs compare --baseline baseline.json --dist dist --out result.json [--allow-assets assets.json]
 * node scripts/verifyRebrandingPreservation.mjs self-test --out /external/path/fixture-result.json
 * Optional --source defaults to parent of dist; --dependency-root locates an existing happy-dom installation.
 * Asset permissions: {"groups":[{"before":["/old-logo.svg"],"after":["/new-logo.svg"]}]}.
 * A group may contain several responsive/contrast variants; before=[] permits explicit additions.
 * Only listed image/icon/schema-image URLs and their file bytes/dimensions may change.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile, mkdtemp, rename } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { gunzipSync } from 'node:zlib';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [command, ...rawArgs] = process.argv.slice(2);
const args = {};
for (let i = 0; i < rawArgs.length; i += 2) {
  if (!rawArgs[i].startsWith('--') || !rawArgs[i + 1] || rawArgs[i + 1].startsWith('--')) throw new Error(`Invalid argument: ${rawArgs[i]}`);
  args[rawArgs[i].slice(2)] = rawArgs[i + 1];
}
const require = createRequire(resolve(args['dependency-root'] ?? repo, 'package.json'));
const { Window } = await import(pathToFileURL(require.resolve('happy-dom')).href);
const SITE = 'https://integrautomacao.com.br';
const sha = value => createHash('sha256').update(value).digest('hex');
const canonicalLines = value => String(value).replace(/\r\n/gu, '\n');
const norm = value => String(value ?? '').replace(/\s+/gu, ' ').trim();
const stable = value => value && typeof value === 'object' ? Array.isArray(value) ? value.map(stable) : Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const json = value => JSON.stringify(stable(value));
const sorted = values => [...values].sort((a, b) => json(a).localeCompare(json(b), 'en'));
const attrs = (element, predicate = () => true) => Object.fromEntries([...element.attributes].filter(a => predicate(a.name)).map(a => [a.name, a.value]));
const isFunctionalAttr = name => !['class', 'style', 'width', 'height'].includes(name) && !name.startsWith('data-astro-');
const isEmptyDecoration = element => ['div', 'span'].includes(element.localName) && element.getAttribute('aria-hidden') === 'true' && !element.children.length && !norm(element.textContent) && [...element.attributes].every(a => ['class', 'style', 'aria-hidden'].includes(a.name) || a.name.startsWith('data-astro-'));
const text = element => {
  if (!element) return '';
  const copy = element.cloneNode(true);
  for (const item of copy.querySelectorAll('script,style')) item.remove();
  return norm(copy.textContent);
};
const route = file => file === 'index.html' ? '/' : file.endsWith('/index.html') ? `/${file.slice(0, -10)}` : `/${file}`;
const limits = [
  'Static artifact comparison; does not prove visibility, contrast, layout, focus, timing, runtime interaction or email delivery.',
  'Exact normalized main text and semantic element order are strict; intentional editorial reordering requires explicit review.',
  'Turnstile/build environment differences are reported, never silently exempted.',
  'Only explicit image URL pairs authorize asset substitutions; approval of legal rights and visual fidelity is external.',
  'Search comparison covers fragment URLs, metadata, filters, anchors and content, not live ranking or query execution.',
];

async function walk(root, current = root) {
  const result = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const file = resolve(current, entry.name);
    if (entry.isDirectory()) result.push(...await walk(root, file));
    else if (entry.isFile()) result.push(relative(root, file).split(sep).join('/'));
  }
  return result.sort();
}
async function maybeRead(file) {
  try { return await readFile(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
function localPath(url, root) {
  const parsed = new URL(url, `${SITE}/`);
  if (parsed.origin !== SITE || url.startsWith('data:')) return null;
  const file = resolve(root, `.${decodeURIComponent(parsed.pathname)}`);
  const rel = relative(root, file);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(`Asset escapes dist: ${url}`);
  return file;
}
function documentFor(html) {
  const win = new Window({ settings: { disableJavaScriptEvaluation: true, disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  const doc = win.document.implementation.createHTMLDocument();
  doc.documentElement.innerHTML = html;
  return { doc, win };
}
async function inspectPage(html, file, dist) {
  const { doc, win } = documentFor(html);
  const all = selector => [...doc.querySelectorAll(selector)];
  const generatedIdNormalizations = [];
  const integrityIssues = [];
  // ManualReference intentionally uses randomUUID per build. Normalize the linked
  // title only after verifying uniqueness and that it belongs to its own dialog.
  for (const [index, dialog] of all('figure[data-manual-reference] dialog[aria-labelledby]').entries()) {
    const id = dialog.getAttribute('aria-labelledby');
    if (!/^figure-[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/iu.test(id)) continue;
    const targets = all('[id]').filter(e => e.id === id);
    if (targets.length !== 1 || !dialog.contains(targets[0])) {
      integrityIssues.push({ type: 'invalidManualDialogLabel', id, targetCount: targets.length, belongsToDialog: !!targets[0] && dialog.contains(targets[0]) });
      continue;
    }
    const replacement = `__manual_dialog_title_${index + 1}__`;
    generatedIdNormalizations.push({ original: id, replacement, title: text(targets[0]) });
    targets[0].id = replacement;
    dialog.setAttribute('aria-labelledby', replacement);
  }
  const main = doc.querySelector('main');
  const scriptEntries = [];
  for (const element of all('script:not([type="application/ld+json"])')) {
    const src = element.getAttribute('src');
    const disk = src ? localPath(src, dist) : null;
    const bytes = disk ? await maybeRead(disk) : null;
    if (disk && !bytes) throw new Error(`${file}: missing script ${src}`);
    const attributes = attrs(element, name => name !== 'src' && !name.startsWith('data-astro-'));
    scriptEntries.push({ attributes, external: src && !disk ? src : null, sha256: sha(bytes ?? element.textContent) });
  }
  const result = {
    file, route: route(file), htmlSha256: sha(html), generatedIdNormalizations, integrityIssues,
    title: doc.title,
    metadata: sorted(all('head meta').map(e => attrs(e)).filter(e => !('charset' in e))),
    canonicals: all('link[rel="canonical"]').map(e => e.getAttribute('href')),
    alternateLinks: sorted(all('head link[rel="alternate"]').map(e => attrs(e))),
    icons: sorted(all('head link[rel*="icon"]').map(e => attrs(e))),
    schemas: sorted(all('script[type="application/ld+json"]').map(e => JSON.parse(e.textContent))),
    headings: all('h1,h2,h3,h4,h5,h6').map(e => ({ tag: e.localName, id: e.id, text: text(e) })),
    mainText: text(main),
    supplementalText: { header: all('header').filter(e => !e.closest('main')).map(text), footer: all('footer').filter(e => !e.closest('main')).map(text) },
    tables: all('main table').map(e => text(e)),
    faqs: all('main details').map(e => ({ id: e.id, summary: text(e.querySelector('summary')), text: text(e) })),
    ids: sorted(all('[id]').map(e => ({ tag: e.localName, id: e.id }))),
    links: sorted(all('a[href],area[href]').map(e => ({ href: e.getAttribute('href'), text: text(e), inMain: !!e.closest('main'), attributes: attrs(e, isFunctionalAttr) }))),
    images: sorted(all('img,source').map(e => ({ tag: e.localName, inMain: !!e.closest('main'), pictureFallbackSrc: e.localName === 'source' && e.parentElement?.localName === 'picture' ? e.parentElement.querySelector('img')?.getAttribute('src') ?? null : null, attributes: attrs(e, name => name !== 'class' && name !== 'style' && !name.startsWith('data-astro-')) }))),
    forms: all('form').map(e => ({ attributes: attrs(e, isFunctionalAttr), fields: [...e.querySelectorAll('input,textarea,select,option,button,label')].map(f => ({ tag: f.localName, attributes: attrs(f, isFunctionalAttr), text: text(f) })) })),
    interactive: sorted(all('button,input,textarea,select,dialog,details,summary,[role],[aria-controls],[data-pagefind-body],[data-pagefind-ignore],[data-site-header],[data-menu-toggle],[data-mega-trigger]').map(e => ({ tag: e.localName, attributes: attrs(e, isFunctionalAttr) }))),
    functionalHooks: sorted(all('*').filter(e => !e.closest('svg[data-icon]') && !isEmptyDecoration(e)).map(e => ({ tag: e.localName, id: e.id, attributes: attrs(e, name => name.startsWith('data-') && !name.startsWith('data-astro-') || name.startsWith('aria-')) })).filter(e => Object.keys(e.attributes).length)),
    functionalScripts: scriptEntries,
  };
  await win.happyDOM.close();
  return result;
}
async function collect(dist, source) {
  dist = resolve(dist);
  source = resolve(source ?? dirname(dist));
  const files = await walk(dist);
  const pages = [];
  for (const file of files.filter(f => f.endsWith('.html'))) pages.push(await inspectPage(await readFile(resolve(dist, file), 'utf8'), file, dist));
  const sitemap = {};
  for (const file of files.filter(f => /(^|\/)sitemap.*\.xml$/u.test(f))) {
    const xml = await readFile(resolve(dist, file), 'utf8');
    sitemap[file] = { sha256: sha(xml), locations: [...xml.matchAll(/<loc>(.*?)<\/loc>/gu)].map(m => m[1]).sort() };
  }
  const supportFiles = {};
  const supportFilesRaw = {};
  for (const file of ['robots.txt', '_redirects', '_headers', 'rss.xml']) {
    const bytes = await maybeRead(resolve(dist, file));
    supportFiles[file] = bytes ? canonicalLines(bytes.toString('utf8')) : null;
    supportFilesRaw[file] = bytes ? sha(bytes) : null;
  }
  const imageFiles = {};
  for (const file of files.filter(f => /\.(svg|png|jpe?g|webp|avif|gif|ico)$/iu.test(f))) imageFiles[`/${file}`] = sha(await readFile(resolve(dist, file)));
  const contracts = {};
  const sourceContractsRaw = {};
  const addContract = (file, bytes) => { contracts[file] = sha(canonicalLines(bytes.toString('utf8'))); sourceContractsRaw[file] = sha(bytes); };
  for (const directory of ['src/scripts', 'functions', 'shared', 'migrations']) {
    try { for (const file of await walk(resolve(source, directory))) addContract(`${directory}/${file}`, await readFile(resolve(source, directory, file))); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  for (const file of ['astro.config.mjs', 'wrangler.jsonc']) {
    const bytes = await maybeRead(resolve(source, file));
    if (bytes) addContract(file, bytes);
  }
  const search = [];
  for (const file of files.filter(f => /^pagefind\/fragment\/.*\.pf_fragment$/u.test(f))) {
    const raw = gunzipSync(await readFile(resolve(dist, file)));
    const start = raw.indexOf(123); // Pagefind gzip has a short binary magic prefix before its JSON object.
    if (start < 0) throw new Error(`No JSON in search fragment ${file}`);
    const parsed = JSON.parse(raw.subarray(start).toString('utf8'));
    search.push(parsed);
  }
  let git = null;
  try { git = { head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() }; } catch { /* Fixtures need no Git checkout. */ }
  return {
    version: 3, collectedAt: new Date().toISOString(), node: process.version, dist, source, git,
    counts: { pages: pages.length, sitemapUrls: Object.values(sitemap).filter(s => !s.locations.some(l => l.endsWith('.xml'))).reduce((n, s) => n + s.locations.length, 0), mainTextChars: pages.reduce((n, p) => n + p.mainText.length, 0), headings: pages.reduce((n, p) => n + p.headings.length, 0), links: pages.reduce((n, p) => n + p.links.length, 0), images: pages.reduce((n, p) => n + p.images.length, 0), imageFiles: Object.keys(imageFiles).length, schemaObjects: pages.reduce((n, p) => n + p.schemas.length, 0), forms: pages.reduce((n, p) => n + p.forms.length, 0), searchPages: search.length, sourceContracts: Object.keys(contracts).length },
    pages, sitemap, supportFiles, supportFilesRaw, imageFiles, sourceContracts: contracts, sourceContractsRaw, search: sorted(search), limits,
  };
}
function assetMapper(pairs, side) {
  const lookup = new Map(pairs.flatMap((p, i) => [p[side]].flat().map(url => [url, `__approved_brand_asset_${i}__`])));
  return value => {
    if (typeof value !== 'string') return value;
    if (lookup.has(value)) return lookup.get(value);
    if (value.startsWith(SITE) && lookup.has(value.slice(SITE.length))) return `${SITE}${lookup.get(value.slice(SITE.length))}`;
    return value;
  };
}
function isApprovedLogoSource(image, pairs, side) {
  if (image.tag !== 'source' || image.attributes.media !== '(max-width: 767px)' || !image.pictureFallbackSrc || Object.keys(image.attributes).some(name => !['media', 'srcset', 'width', 'height'].includes(name))) return false;
  const source = image.attributes.srcset;
  const fallback = image.pictureFallbackSrc;
  // No generic picture/source exemption: both exact URLs must belong to the
  // same explicitly approved corporate-logo replacement group.
  return pairs.some(group => [group[side]].flat().includes(source) && [group[side]].flat().includes(fallback) && source.startsWith('/images/brand/integra-logo-') && fallback.startsWith('/images/brand/integra-logo-'));
}
function normalizeBrand(record, pairs, side) {
  const copy = structuredClone(record);
  const map = assetMapper(pairs, side);
  copy.images = copy.images.filter(image => !isApprovedLogoSource(image, pairs, side));
  for (const image of copy.images) image.pictureFallbackSrc ??= null;
  // Astro Icon symbol IDs are private definitions inside decorative SVG, not page anchors.
  copy.ids = copy.ids.filter(item => !(item.tag === 'symbol' && /^ai:(lucide|tabler):/u.test(item.id)));
  // URL substitutions are deliberately limited to image contexts, never anchors/canonicals/text.
  for (const meta of copy.metadata) if (['og:image', 'twitter:image'].includes(meta.property ?? meta.name)) meta.content = map(meta.content);
  for (const icon of copy.icons) icon.href = map(icon.href);
  for (const image of copy.images) {
    const source = image.attributes.src;
    if (source && map(source) !== source) {
      image.attributes.src = map(source);
      delete image.attributes.width;
      delete image.attributes.height;
      delete image.attributes.srcset;
      delete image.attributes.sizes;
    }
  }
  const schemaImage = (value, inImage = false) => {
    if (Array.isArray(value)) return value.map(v => schemaImage(v, inImage));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, schemaImage(val, ['image', 'logo', 'thumbnailUrl', 'contentUrl'].includes(key) || (inImage && key === 'url'))]));
    return inImage ? map(value) : value;
  };
  copy.schemas = sorted(copy.schemas.map(s => schemaImage(s)));
  copy.images = sorted(copy.images);
  copy.metadata = sorted(copy.metadata);
  copy.icons = sorted(copy.icons);
  delete copy.htmlSha256;
  copy.manualDialogLabels = copy.generatedIdNormalizations.map(({ replacement, title }) => ({ replacement, title }));
  delete copy.generatedIdNormalizations;
  return copy;
}
function excerpt(value) { const encoded = json(value); return encoded.length > 900 ? `${encoded.slice(0, 900)}… [sha256=${sha(encoded)}]` : value; }
function differenceDetail(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    const unmatched = (first, second) => {
      const counts = new Map();
      for (const item of second) counts.set(json(item), (counts.get(json(item)) ?? 0) + 1);
      return first.filter(item => { const key = json(item); const count = counts.get(key) ?? 0; if (!count) return true; counts.set(key, count - 1); return false; });
    };
    return { removed: unmatched(a, b), added: unmatched(b, a), firstDifferentIndex: a.findIndex((item, index) => json(item) !== json(b[index])) };
  }
  if (typeof a === 'string' && typeof b === 'string') {
    let offset = 0;
    while (offset < Math.min(a.length, b.length) && a[offset] === b[offset]) offset++;
    return { firstDifferentOffset: offset, beforeLength: a.length, afterLength: b.length, beforeContext: a.slice(Math.max(0, offset - 80), offset + 180), afterContext: b.slice(Math.max(0, offset - 80), offset + 180) };
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') return Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].filter(key => json(a[key]) !== json(b[key])).map(key => [key, { before: a[key] ?? null, after: b[key] ?? null }]));
  return { before: a ?? null, after: b ?? null };
}
function compare(before, after, pairs = [], sourceChanges = []) {
  const differences = [];
  const check = (scope, field, a, b) => { if (json(a) !== json(b)) differences.push({ scope, field, before: excerpt(a), after: excerpt(b), detail: differenceDetail(a, b) }); };
  check('site', 'htmlRoutes', before.pages.map(p => p.route).sort(), after.pages.map(p => p.route).sort());
  check('site', 'sitemap', before.sitemap, after.sitemap);
  check('site', 'supportFiles', before.supportFiles, after.supportFiles);
  const normalizedSource = structuredClone(after.sourceContracts);
  for (const permission of sourceChanges) {
    if (permission.path !== 'astro.config.mjs') throw new Error('Only an exact Astro icon configuration source change is supported');
    if (before.sourceContracts[permission.path] === permission.beforeSha256 && after.sourceContracts[permission.path] === permission.afterSha256) normalizedSource[permission.path] = permission.beforeSha256;
    else differences.push({ scope: 'source-permission', field: permission.path, reason: 'Exact approved before/after hashes do not match' });
  }
  check('site', 'sourceContracts', before.sourceContracts, normalizedSource);
  const searchNormalize = (search, side) => {
    const map = assetMapper(pairs, side);
    return sorted(search.map(item => {
      const copy = structuredClone(item);
      if (copy.meta?.image) copy.meta.image = map(copy.meta.image);
      return copy;
    }));
  };
  check('site', 'searchFragments', searchNormalize(before.search, 'before'), searchNormalize(after.search, 'after'));
  const beforeByRoute = new Map(before.pages.map(p => [p.route, p]));
  for (const page of after.pages) {
    const original = beforeByRoute.get(page.route);
    if (!original) continue;
    const a = normalizeBrand(original, pairs, 'before');
    const b = normalizeBrand(page, pairs, 'after');
    for (const field of Object.keys(a)) check(page.route, field, a[field], b[field]);
  }
  const allowedBefore = new Set(pairs.flatMap(p => [p.before].flat()));
  const allowedAfter = new Set(pairs.flatMap(p => [p.after].flat()));
  for (const [file, hash] of Object.entries(before.imageFiles)) if (!allowedBefore.has(file)) check('images', file, hash, after.imageFiles[file] ?? null);
  for (const [file, hash] of Object.entries(after.imageFiles)) if (!(file in before.imageFiles) && !allowedAfter.has(file)) differences.push({ scope: 'images', field: 'unapprovedAddition', after: file, sha256: hash });
  for (const pair of pairs) {
    for (const file of [pair.before].flat()) check('allow-assets', `${file}:baselineExists`, true, file in before.imageFiles);
    for (const file of [pair.after].flat()) check('allow-assets', `${file}:candidateExists`, true, file in after.imageFiles);
  }
  for (const page of after.pages) if (page.integrityIssues.length) differences.push({ scope: page.route, field: 'integrityIssues', after: page.integrityIssues });
  const lineEndingChanges = (a, b, rawA, rawB) => Object.keys(a).filter(key => a[key] === b[key] && rawA[key] !== rawB[key]);
  return { status: differences.length ? 'FAIL' : 'PASS', comparedAt: new Date().toISOString(), baselineCollectedAt: before.collectedAt, baselineGit: before.git, candidateGit: after.git, baselineCounts: before.counts, candidateCounts: after.counts, approvedAssetPairs: pairs, approvedSourceChanges: sourceChanges, normalizationEvidence: { sourceLineEndingsOnly: lineEndingChanges(before.sourceContracts, after.sourceContracts, before.sourceContractsRaw, after.sourceContractsRaw), supportLineEndingsOnly: lineEndingChanges(before.supportFiles, after.supportFiles, before.supportFilesRaw, after.supportFilesRaw), baselineGeneratedDialogIds: before.pages.reduce((n, p) => n + p.generatedIdNormalizations.length, 0), candidateGeneratedDialogIds: after.pages.reduce((n, p) => n + p.generatedIdNormalizations.length, 0) }, differences, limits };
}
async function save(file, data, exclusive = false) {
  await mkdir(dirname(resolve(file)), { recursive: true });
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, { flag: exclusive ? 'wx' : 'w' });
}
async function selfTest(out) {
  const fixtureParent = out ? dirname(resolve(out)) : tmpdir();
  await mkdir(fixtureParent, { recursive: true });
  const temp = await mkdtemp(resolve(fixtureParent, 'preservation-fixtures-'));
  const baseline = resolve(temp, 'baseline');
  const candidate = resolve(temp, 'candidate');
  const baselineSource = resolve(temp, 'baseline-source');
  const candidateSource = resolve(temp, 'candidate-source');
  const config = 'export default {\n  include: {lucide: ["*"]},\n  site: "https://integrautomacao.com.br"\n};\n';
  for (const source of [baselineSource, candidateSource]) { await mkdir(source); await writeFile(resolve(source, 'astro.config.mjs'), config); }
  const initial = '<!doctype html><html><head><title>Engineering</title><meta name="description" content="Evidence"><link rel="canonical" href="https://integrautomacao.com.br/"><style>body{color:black}</style></head><body><header><img src="/logo.svg" alt="Integra" width="120" height="40"></header><main id="main"><h1>Engineering</h1><p>Keep the complete technical evidence.</p><a href="/reference/">Reference</a><details><summary>Question?</summary>Answer.</details><form action="/api/contact" method="post"><label for="name">Name</label><input id="name" name="name" required><button type="submit">Send</button></form><div data-dialog-container="true"></div><figure data-manual-reference><dialog aria-labelledby="figure-11111111-1111-4111-8111-111111111111"><p id="figure-11111111-1111-4111-8111-111111111111">Figure title</p></dialog></figure></main><script src="/runtime.js"></script></body></html>';
  for (const dist of [baseline, candidate]) {
    await mkdir(dist, { recursive: true });
    await writeFile(resolve(dist, 'index.html'), initial);
    await writeFile(resolve(dist, 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    await writeFile(resolve(dist, 'manufacturer.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><text>Technical figure</text></svg>');
    await writeFile(resolve(dist, 'runtime.js'), 'document.documentElement.dataset.ready="true";');
    await writeFile(resolve(dist, 'robots.txt'), 'User-agent: *\nAllow: /\n');
    await writeFile(resolve(dist, 'sitemap-0.xml'), '<urlset><url><loc>https://integrautomacao.com.br/</loc></url></urlset>');
  }
  const original = await collect(baseline, baselineSource);
  const cases = [];
  const run = async (name, modified, expected, pairs = [], requiredField, sourceChanges = []) => {
    await writeFile(resolve(candidate, 'index.html'), modified);
    const result = compare(original, await collect(candidate, candidateSource), pairs, sourceChanges);
    const pass = result.status === expected && (!requiredField || result.differences.some(d => d.field === requiredField));
    cases.push({ name, expected, actual: result.status, pass, differences: result.differences });
  };
  await run('unchanged artifact', initial, 'PASS');
  await run('style changes and presentational wrappers', initial.replace('color:black', 'color:red').replace('<p>', '<p class="new-presentation" style="padding:2rem">'), 'PASS');
  await run('empty aria-hidden decorative div addition', initial.replace('</main>', '<div aria-hidden="true" class="decoration"></div></main>'), 'PASS');
  await run('empty aria-hidden decorative span addition', initial.replace('</main>', '<span aria-hidden="true" class="decoration"></span></main>'), 'PASS');
  await run('empty decorative div with runtime hook remains audited', initial.replace('</main>', '<div aria-hidden="true" data-decoration-hook></div></main>'), 'FAIL', [], 'functionalHooks');
  await run('removed technical sentence', initial.replace('Keep the complete technical evidence.', ''), 'FAIL', [], 'mainText');
  await run('changed contextual URL', initial.replace('href="/reference/"', 'href="/lost-reference/"'), 'FAIL', [], 'links');
  await run('changed SEO description', initial.replace('content="Evidence"', 'content="Marketing"'), 'FAIL', [], 'metadata');
  await run('changed title', initial.replace('<title>Engineering</title>', '<title>Other</title>'), 'FAIL', [], 'title');
  await run('removed canonical', initial.replace('<link rel="canonical" href="https://integrautomacao.com.br/">', ''), 'FAIL', [], 'canonicals');
  await run('removed FAQ answer', initial.replace('Answer.', ''), 'FAIL', [], 'faqs');
  await run('changed contact API action', initial.replace('/api/contact', '/api/unexpected'), 'FAIL', [], 'forms');
  await run('removed runtime hook', initial.replace('data-dialog-container="true"', ''), 'FAIL', [], 'functionalHooks');
  await run('generated UUID changes with intact label relation', initial.replaceAll('figure-11111111-1111-4111-8111-111111111111', 'figure-22222222-2222-4222-8222-222222222222'), 'PASS');
  await run('generated UUID broken label relation', initial.replace('aria-labelledby="figure-11111111-1111-4111-8111-111111111111"', 'aria-labelledby="figure-22222222-2222-4222-8222-222222222222"'), 'FAIL', [], 'integrityIssues');
  await run('nominal section anchor renamed', initial.replace('id="main"', 'id="missing-anchor"'), 'FAIL', [], 'ids');
  await writeFile(resolve(candidateSource, 'astro.config.mjs'), config.replaceAll('\n', '\r\n'));
  await writeFile(resolve(candidate, 'robots.txt'), 'User-agent: *\r\nAllow: /\r\n');
  await run('source and robots CRLF LF equivalence', initial, 'PASS');
  const newConfig = config.replace('lucide:', 'tabler:');
  const sourcePermission = [{ path: 'astro.config.mjs', beforeSha256: sha(config), afterSha256: sha(newConfig) }];
  await writeFile(resolve(candidateSource, 'astro.config.mjs'), newConfig);
  await run('exact approved icon config hashes', initial, 'PASS', [], undefined, sourcePermission);
  await writeFile(resolve(candidateSource, 'astro.config.mjs'), newConfig.replace('integrautomacao.com.br', 'unexpected.example'));
  await run('additional config change despite icon permission', initial, 'FAIL', [], 'sourceContracts', sourcePermission);
  await writeFile(resolve(candidateSource, 'astro.config.mjs'), config);
  await writeFile(resolve(candidate, 'manufacturer.svg'), '<svg/>');
  await run('changed manufacturer diagram bytes', initial, 'FAIL', [], '/manufacturer.svg');
  await writeFile(resolve(candidate, 'manufacturer.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><text>Technical figure</text></svg>');
  await rename(resolve(candidate, 'index.html'), resolve(candidate, 'index.fixture'));
  const removedRoute = compare(original, await collect(candidate, candidateSource));
  cases.push({ name: 'removed HTML route', expected: 'FAIL', actual: removedRoute.status, pass: removedRoute.status === 'FAIL' && removedRoute.differences.some(d => d.field === 'htmlRoutes'), differences: removedRoute.differences });
  await rename(resolve(candidate, 'index.fixture'), resolve(candidate, 'index.html'));
  await writeFile(resolve(candidate, 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>');
  await run('changed logo without permission', initial, 'FAIL');
  await writeFile(resolve(candidate, 'new-logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><path d="M1 1"/></svg>');
  await run('explicitly permitted logo URL bytes dimensions', initial.replace('/logo.svg', '/new-logo.svg').replace('width="120" height="40"', 'width="180" height="50"'), 'PASS', [{ before: '/logo.svg', after: '/new-logo.svg' }]);
  const logoFiles = ['/new-logo.svg', '/images/brand/integra-logo-light.svg', '/images/brand/integra-logo-compact-on-light.svg'];
  await mkdir(resolve(candidate, 'images/brand'), { recursive: true });
  for (const file of logoFiles.slice(1)) await writeFile(resolve(candidate, `.${file}`), '<svg/>');
  const logoPolicy = [{ before: ['/logo.svg'], after: logoFiles }];
  const responsive = initial.replace('<img src="/logo.svg" alt="Integra" width="120" height="40">', '<picture><source media="(max-width: 767px)" srcset="/images/brand/integra-logo-compact-on-light.svg" width="1619" height="660"><img src="/images/brand/integra-logo-light.svg" alt="Integra" width="1581" height="613"></picture>');
  await run('explicit corporate picture source and img fallback', responsive, 'PASS', logoPolicy);
  await run('technical source is not exempted as corporate picture', responsive.replace('srcset="/images/brand/integra-logo-compact-on-light.svg"', 'srcset="/manufacturer.svg"'), 'FAIL', logoPolicy, 'images');
  await run('corporate picture alt change remains audited', responsive.replace('alt="Integra"', 'alt="Changed"'), 'FAIL', logoPolicy, 'images');
  await writeFile(resolve(candidate, 'new-logo.svg'), '<svg/>');
  await writeFile(resolve(candidate, 'runtime.js'), 'fetch("https://untrusted.example/");');
  await run('functional script change', initial.replace('/logo.svg', '/new-logo.svg'), 'FAIL', logoPolicy, 'functionalScripts');
  const report = { status: cases.every(c => c.pass) ? 'PASS' : 'FAIL', fixtureDirectory: temp, cases, limits };
  if (out) await save(out, report);
  console.log(JSON.stringify({ status: report.status, cases: cases.length, passed: cases.filter(c => c.pass).length, fixtureDirectory: temp }));
  if (report.status !== 'PASS') process.exitCode = 1;
}
if (command === 'snapshot') {
  if (!args.dist || !args.out) throw new Error('snapshot requires --dist and --out');
  const snapshot = await collect(args.dist, args.source);
  await save(args.out, snapshot, true);
  console.log(JSON.stringify({ status: 'SNAPSHOT_SAVED', out: resolve(args.out), collectedAt: snapshot.collectedAt, git: snapshot.git, counts: snapshot.counts }));
} else if (command === 'compare') {
  if (!args.dist || !args.baseline || !args.out) throw new Error('compare requires --dist, --baseline and --out');
  const baseline = JSON.parse(await readFile(args.baseline, 'utf8'));
  if (baseline.version !== 3) throw new Error('This comparator requires a version 3 baseline; retain older snapshots and collect a new one from the untouched original');
  const policy = args['allow-assets'] ? JSON.parse(await readFile(args['allow-assets'], 'utf8')) : {};
  const pairs = policy.groups ?? policy.pairs ?? [];
  if (!Array.isArray(pairs) || pairs.some(p => !Array.isArray(p.before) && typeof p.before !== 'string' || !Array.isArray(p.after) && typeof p.after !== 'string' || [...[p.before].flat(), ...[p.after].flat()].some(url => typeof url !== 'string' || !/^\/.*\.(svg|png|jpe?g|webp|avif|gif|ico)$/iu.test(url)))) throw new Error('Asset groups must contain explicit local image URLs');
  for (const side of ['before', 'after']) {
    const urls = pairs.flatMap(p => [p[side]].flat());
    if (new Set(urls).size !== urls.length) throw new Error(`Asset URL appears in multiple groups: ${side}`);
  }
  const sourceChanges = policy.sourceChanges ?? [];
  if (!Array.isArray(sourceChanges) || sourceChanges.some(p => p.path !== 'astro.config.mjs' || !/^[a-f0-9]{64}$/u.test(p.beforeSha256) || !/^[a-f0-9]{64}$/u.test(p.afterSha256))) throw new Error('Source permission requires exact canonical SHA-256 hashes for astro.config.mjs');
  const report = compare(baseline, await collect(args.dist, args.source), pairs, sourceChanges);
  await save(args.out, report);
  console.log(JSON.stringify({ status: report.status, differences: report.differences.length, counts: report.candidateCounts, report: resolve(args.out), fields: [...new Set(report.differences.map(d => d.field))] }));
  if (report.status !== 'PASS') process.exitCode = 1;
} else if (command === 'self-test') {
  await selfTest(args.out);
} else {
  throw new Error('Use snapshot, compare or self-test. See script header for usage.');
}
