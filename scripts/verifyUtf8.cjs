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

let totalFiles = 0;
let utf8ValidFiles = 0;
const invalidFiles = [];

walkDir(srcDir, filePath => {
  const ext = path.extname(filePath);
  if (!['.astro', '.ts', '.mdx', '.md', '.json', '.css'].includes(ext)) return;

  totalFiles++;
  
  try {
    const rawBuffer = fs.readFileSync(filePath);
    // Decode with utf-8, but with error detection. 
    // In Node.js, we can use TextDecoder with fatal: true to throw an error on invalid UTF-8 sequences.
    const decoder = new TextDecoder('utf-8', { fatal: true });
    decoder.decode(rawBuffer);
    utf8ValidFiles++;
  } catch (err) {
    invalidFiles.push({ filePath, error: err.message });
  }
});

console.log(`--- UTF-8 Verification Result ---`);
console.log(`Total files checked: ${totalFiles}`);
console.log(`Valid UTF-8 files: ${utf8ValidFiles}`);
console.log(`Invalid files: ${invalidFiles.length}`);
if (invalidFiles.length > 0) {
  console.log(`Invalid files list:`, JSON.stringify(invalidFiles, null, 2));
} else {
  console.log(`All checked files are 100% valid UTF-8!`);
}
