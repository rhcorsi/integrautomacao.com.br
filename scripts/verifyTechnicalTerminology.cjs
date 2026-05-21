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

const termsToCheck = [
  {
    regex: /\b(Control\s+Logix|controllogix|Control-Logix)\b/g,
    correct: "ControlLogix"
  },
  {
    regex: /\b(Plant\s+PAX|plantpax|PlantPax|Plant-PAx)\b/gi,
    correct: "PlantPAx",
    exceptions: ["plantpax-5x", "plantpax-library", "plantpax.astro", "plantpax-redundant", "plantpax-reference", "plantpax-passc", "plantpax-medium"] // ignore slug/filenames in lowercase
  },
  {
    regex: /\b(Factory\s+Talk|factorytalk|Factorytalk)\b/gi,
    correct: "FactoryTalk",
    exceptions: ["factorytalk.astro", "factorytalk-view-se", "factorytalk-optix", "factorytalk-batch", "factorytalk-assetcentre", "factorytalk-historian", "factorytalk-datamosaix", "factorytalk-security", "factorytalk-reference", "factorytalk-services", "factorytalk-analytics"]
  },
  {
    regex: /\b(Ethernet\/IP|ethernet\/ip|Ethernet\s+IP|EtherNet\s+IP)\b/g, // standard is EtherNet/IP
    correct: "EtherNet/IP"
  },
  {
    regex: /\b(devicewise|DeviceWise|DeviceWISE)\b/gi,
    correct: "deviceWISE",
    exceptions: ["devicewise-eletronor"]
  },
  {
    regex: /\b(thinmanager|Thinmanager|Thin\s+Manager)\b/gi,
    correct: "ThinManager",
    exceptions: ["thinmanager"]
  },
  {
    regex: /\b(assetcentre|Assetcentre|Asset\s+Centre)\b/gi,
    correct: "AssetCentre",
    exceptions: ["assetcentre"]
  },
  {
    regex: /\b(datamosaix|Datamosaix|Data\s+Mosaix)\b/gi,
    correct: "DataMosaix",
    exceptions: ["datamosaix"]
  }
];

const terminologyIssues = [];

walkDir(srcDir, filePath => {
  const ext = path.extname(filePath);
  if (!['.astro', '.ts', '.mdx', '.md'].includes(ext)) return;
  if (filePath.includes('scripts')) return; // skip scripts

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    termsToCheck.forEach(term => {
      let match;
      // Reset regex index
      term.regex.lastIndex = 0;
      while ((match = term.regex.exec(line)) !== null) {
        const foundWord = match[0];
        
        // Skip if matches correct casing
        if (foundWord === term.correct) continue;
        
        // Check exceptions
        const isException = term.exceptions && term.exceptions.some(exp => {
          // If the line contains the exception or is a file name exception, ignore it
          return line.toLowerCase().includes(exp.toLowerCase()) || path.basename(filePath).toLowerCase().includes(exp.toLowerCase());
        });
        
        if (isException) continue;

        // Skip import statements and URLs
        if (line.includes('import ') || line.includes('from "') || line.includes('from \'') || line.includes('href=') || line.includes('@/assets')) {
          continue;
        }

        terminologyIssues.push({
          file: path.relative(srcDir, filePath),
          lineNum: idx + 1,
          found: foundWord,
          expected: term.correct,
          text: line.trim()
        });
      }
    });
  });
});

console.log(`--- Technical Terminology Inconsistencies ---`);
console.log(`Total issues found: ${terminologyIssues.length}`);

if (terminologyIssues.length > 0) {
  terminologyIssues.forEach(issue => {
    console.log(`File: src/${issue.file} at Line ${issue.lineNum}`);
    console.log(`  Found: "${issue.found}" -> Expected: "${issue.expected}"`);
    console.log(`  Context: "${issue.text}"`);
    console.log('--------------------------------------------------');
  });
} else {
  console.log("All technical terms are perfectly consistent and match official branding standards!");
}
