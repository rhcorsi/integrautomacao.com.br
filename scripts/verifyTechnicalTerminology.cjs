const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "dist");

if (!fs.existsSync(distDir)) {
  console.error("dist/ não encontrado. Execute `npm run build` antes desta auditoria.");
  process.exit(2);
}

const terms = [
  { regex: /\b(?:Control\s+Logix|Control-Logix|controllogix)\b/gi, correct: "ControlLogix" },
  { regex: /\b(?:Plant\s+PAX|PlantPax|Plant-PAx|plantpax)\b/gi, correct: "PlantPAx" },
  { regex: /\b(?:Factory\s+Talk|Factorytalk|factorytalk)\b/gi, correct: "FactoryTalk" },
  { regex: /\b(?:Ethernet\/IP|Ethernet\s+IP|EtherNet\s+IP|ethernet\/ip)\b/g, correct: "EtherNet/IP" },
  { regex: /\b(?:devicewise|DeviceWise|DeviceWISE)\b/gi, correct: "deviceWISE" },
  { regex: /\b(?:thinmanager|Thinmanager|Thin\s+Manager)\b/gi, correct: "ThinManager" },
  { regex: /\b(?:assetcentre|Assetcentre|Asset\s+Centre)\b/gi, correct: "AssetCentre" },
  { regex: /\b(?:datamosaix|Datamosaix|Data\s+Mosaix)\b/gi, correct: "DataMosaix" },
  { regex: /\b(?:PLC5|PLC\s+5)\b/g, correct: "PLC-5" },
  { regex: /\b(?:SLC500|SLC-500)\b/g, correct: "SLC 500" },
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(entryPath, files);
    else if (entry.name.endsWith(".html")) files.push(entryPath);
  }
  return files;
}

function visibleText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

const issues = [];

for (const file of walk(distDir)) {
  const text = visibleText(fs.readFileSync(file, "utf8"));
  for (const term of terms) {
    term.regex.lastIndex = 0;
    let match;
    while ((match = term.regex.exec(text)) !== null) {
      if (match[0] === term.correct) continue;
      issues.push({
        page: path.relative(distDir, file),
        found: match[0],
        expected: term.correct,
        context: text.slice(Math.max(0, match.index - 55), match.index + match[0].length + 55),
      });
    }
  }
}

console.log("--- Auditoria de terminologia no texto visível ---");
console.log(`Total de ocorrências: ${issues.length}`);

for (const issue of issues) {
  console.log(`Página: ${issue.page}`);
  console.log(`  Encontrado: "${issue.found}" → esperado: "${issue.expected}"`);
  console.log(`  Contexto: "${issue.context}"`);
}

if (issues.length > 0) process.exitCode = 1;
