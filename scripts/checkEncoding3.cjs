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

const filesWithIssues = [];

walkDir(srcDir, filePath => {
  const ext = path.extname(filePath);
  if (!['.astro', '.ts', '.mdx', '.md'].includes(ext)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  
  const lines = content.split('\n');
  const fileIssues = [];

  lines.forEach((line, idx) => {
    // Search specifically for:
    // 1. \uFFFD (which is )
    // 2. The character 'ǜ' (which is \u01DC)
    // 3. Any character sequence that has U+FFFD or is a raw corrupted character
    
    if (line.includes('\uFFFD')) {
      fileIssues.push({ lineNum: idx + 1, text: line.trim(), reason: 'Contains replacement character (U+FFFD)' });
    }
    
    if (line.includes('\u01DC')) {
      fileIssues.push({ lineNum: idx + 1, text: line.trim(), reason: 'Contains ǜ (U+01DC)' });
    }

    // Let's also check for typical garbled representations of Portuguese characters.
    // For example:
    // ""
    // Let's do a regex check for characters that are in the range of extended Latin but are typical corruptions,
    // or let's search for the raw character code U+FFFD.
  });

  if (fileIssues.length > 0) {
    filesWithIssues.push({ filePath, issues: fileIssues });
  }
});

// Write output in a clean format that shows only the file and the number of issues, and the first 3 issues
filesWithIssues.forEach(item => {
  console.log(`File: ${item.filePath}`);
  console.log(`Total issues: ${item.issues.length}`);
  item.issues.slice(0, 5).forEach(issue => {
    console.log(`  Line ${issue.lineNum}: [${issue.reason}] ${issue.text}`);
  });
  console.log('--------------------------------------------------');
});
