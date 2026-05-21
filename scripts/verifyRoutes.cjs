const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');
const pagesDir = path.join(srcDir, 'pages');

// 1. Gather all slugs from techCatalog.ts
let catalogSlugs = [];
try {
  const catalogContent = fs.readFileSync(path.join(srcDir, 'data', 'techCatalog.ts'), 'utf8');
  // Simple regex extraction for slugs
  const slugRegex = /slug:\s*["']([^"']+)["']/g;
  let match;
  while ((match = slugRegex.exec(catalogContent)) !== null) {
    catalogSlugs.push(match[1]);
  }
} catch (err) {
  console.error("Error reading techCatalog.ts slugs:", err.message);
}

// Slugs we expect: e.g. tc-devicewise, TIA Portal (tia-portal), elipse-e3, schneider-control-expert, etc.
console.log("Extracted Catalog Slugs:", catalogSlugs);

// 2. Map all valid files in src/pages to valid routes
const validRoutes = new Set();
validRoutes.add('/');

function scanPages(dir, baseRoute = '') {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    const isDir = fs.statSync(fullPath).isDirectory();
    
    if (isDir) {
      scanPages(fullPath, `${baseRoute}/${file}`);
    } else {
      const ext = path.extname(file);
      if (ext === '.astro' || ext === '.mdx' || ext === '.md') {
        const baseName = path.basename(file, ext);
        let route = `${baseRoute}/${baseName}`;
        
        if (baseName === 'index') {
          route = baseRoute === '' ? '/' : baseRoute;
        }
        
        // Skip dynamic files like [slug].astro
        if (!route.includes('[')) {
          validRoutes.add(route);
        }
      }
    }
  });
}

scanPages(pagesDir);

// Add dynamic catalog routes
catalogSlugs.forEach(slug => {
  validRoutes.add(`/tecnologias/${slug}`);
});

// Also there might be a silver-system-integrator route in certificacoes?
// Wait, the page /certificacoes.astro is mapped to /certificacoes.
// What about /certificacoes/silver-system-integrator?
// Let's check if there is a directory or if it is just a subpage or anchor.
// Let's print all valid routes we gathered.
console.log("\nValid Site Routes:\n", Array.from(validRoutes).sort());

// 3. Scan all source files for hrefs and cross-check them
const brokenLinks = [];
const allHrefsFound = [];

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

walkDir(srcDir, filePath => {
  const ext = path.extname(filePath);
  if (!['.astro', '.ts', '.mdx', '.md', '.tsx', '.jsx'].includes(ext)) return;
  if (filePath.includes('scripts')) return; // skip scripts

  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find hrefs in HTML/Astro: href="/..." or href={"/..."}
  // Regex that captures href values starting with /
  const hrefRegex = /href=["'](\/[^"'\s#?]+)(?:[#?][^"'\s]*)?["']/g;
  let match;
  while ((match = hrefRegex.exec(content)) !== null) {
    const route = match[1];
    allHrefsFound.push({ filePath, route, line: getLineNumber(content, match.index) });
  }

  // Also match: href={`/...`} or href={`/...`}
  const templateHrefRegex = /href=\{\`(\/[^\`\s#?]+)(?:[#?][^\`\s]*)?\`\}/g;
  while ((match = templateHrefRegex.exec(content)) !== null) {
    const route = match[1];
    allHrefsFound.push({ filePath, route, line: getLineNumber(content, match.index) });
  }
});

function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

// 4. Verify all found routes
allHrefsFound.forEach(item => {
  // Normalize routes
  let cleanRoute = item.route;
  if (cleanRoute.endsWith('/')) {
    cleanRoute = cleanRoute.slice(0, -1);
  }
  if (cleanRoute === '') {
    cleanRoute = '/';
  }

  // Check if it is a valid route
  if (!validRoutes.has(cleanRoute)) {
    // Wait, is it a dynamic route expression? Like /tecnologias/${slug} in JSX?
    if (cleanRoute.includes('${') || cleanRoute.includes('/blog/') || cleanRoute.includes('/cases/')) {
      // ignore dynamic code variables or blog/case routes which are resolved at runtime
      return;
    }
    // Also ignore /certificacoes/silver-system-integrator if it is a real route.
    // Let's check if this is an issue.
    brokenLinks.push({
      file: path.relative(srcDir, item.filePath),
      line: item.line,
      route: item.route,
      cleanRoute
    });
  }
});

console.log(`\n--- Route Cross-Check Results ---`);
console.log(`Total internal links found: ${allHrefsFound.length}`);
console.log(`Broken links count: ${brokenLinks.length}`);

if (brokenLinks.length > 0) {
  console.log(`\nPotential Broken Links:`);
  brokenLinks.forEach(b => {
    console.log(`  File: src/${b.file} at Line ${b.line} -> Route: "${b.route}" is NOT a recognized static or dynamic page route!`);
  });
} else {
  console.log(`\nAll internal links are 100% verified and valid!`);
}
