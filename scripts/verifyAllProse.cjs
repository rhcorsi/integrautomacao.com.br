const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

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

const doubleSpaceIssues = [];
const lowercaseStartIssues = [];

walkDir(srcDir, filePath => {
  const ext = path.extname(filePath);
  if (!['.astro', '.ts', '.mdx', '.md'].includes(ext)) return;
  if (filePath.includes('scripts')) return; // skip scripts

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let activeCatalogProseArray = null;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (filePath.endsWith('techCatalog.ts')) {
      const fieldStart = trimmed.match(/^(useCases|howIntegraActs|deliverables):\s*\[$/);
      if (fieldStart) {
        activeCatalogProseArray = fieldStart[1];
      } else if (activeCatalogProseArray && /^\],?$/.test(trimmed)) {
        activeCatalogProseArray = null;
      }
    }
    
    // Ignore lines that are code blocks, imports, css rules, etc.
    if (trimmed.startsWith('import ') || trimmed.startsWith('export ') || trimmed.startsWith('const ') || trimmed.startsWith('let ') || trimmed.startsWith('var ')) return;
    if (trimmed.startsWith('<svg') || trimmed.startsWith('</svg>') || trimmed.startsWith('<path') || trimmed.startsWith('class=')) return;
    if (trimmed.includes('widths=') || trimmed.includes('sizes=') || trimmed.includes('loading=')) return;

    // 1. Double space checker within prose text (excluding indentation at the start)
    // Matches 2 or more spaces in the middle of a string that is not code indentation
    // Let's check only if it contains alphanumeric characters
    if (/[a-zA-ZÀ-ÿ]/.test(trimmed)) {
      const doubleSpaceMatch = trimmed.match(/[a-zA-ZÀ-ÿ\d,.;:]\s{2,}[a-zA-ZÀ-ÿ\d]/);
      if (doubleSpaceMatch) {
        doubleSpaceIssues.push({
          file: path.relative(srcDir, filePath),
          lineNum: idx + 1,
          text: trimmed,
          match: doubleSpaceMatch[0]
        });
      }
    }

    // 2. Check only catalog prose arrays (never object keys or ledgers).
    if (activeCatalogProseArray) {
      const stringItemMatch = trimmed.match(/^["'](\p{Ll})(.*)["'],?$/u);
      if (stringItemMatch) {
        lowercaseStartIssues.push({
          file: path.relative(srcDir, filePath),
          lineNum: idx + 1,
          text: trimmed,
          found: stringItemMatch[1]
        });
      }
    }
  });
});

console.log("=== Prose Quality Control Audit ===");
console.log(`Double space issues: ${doubleSpaceIssues.length}`);
console.log(`Lowercase catalog starts: ${lowercaseStartIssues.length}`);

if (doubleSpaceIssues.length > 0) {
  console.log("\n--- Double Space Issues ---");
  doubleSpaceIssues.slice(0, 15).forEach(issue => {
    console.log(`File: src/${issue.file} at Line ${issue.lineNum}`);
    console.log(`  Context: "${issue.text}"`);
  });
  if (doubleSpaceIssues.length > 15) {
    console.log(`... and ${doubleSpaceIssues.length - 15} more double space issues.`);
  }
}

if (lowercaseStartIssues.length > 0) {
  console.log("\n--- Lowercase Catalog Starts ---");
  lowercaseStartIssues.slice(0, 15).forEach(issue => {
    console.log(`File: src/${issue.file} at Line ${issue.lineNum}`);
    console.log(`  Context: "${issue.text}"`);
  });
}

if (doubleSpaceIssues.length > 0 || lowercaseStartIssues.length > 0) {
  process.exitCode = 1;
}
