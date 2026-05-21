const fs = require('fs');
const path = require('path');

const solucoesDir = path.join(__dirname, '..', 'src', 'pages', 'solucoes');
const files = fs.readdirSync(solucoesDir).filter(f => f.endsWith('.astro') && f !== 'index.astro');

console.log("=== Extracted FAQs from Solution Pages ===");

files.forEach(file => {
  const content = fs.readFileSync(path.join(solucoesDir, file), 'utf8');
  
  // Extract FAQ section or elements
  // We can look for { q: "...", a: "..." } or similar structures, or search for text lines with q: or matching regex
  const qRegex = /q:\s*["']([^"']+)["']/g;
  const questions = [];
  let match;
  while ((match = qRegex.exec(content)) !== null) {
    questions.push(match[1]);
  }
  
  console.log(`\nFile: ${file} (Found ${questions.length} questions)`);
  questions.forEach((q, idx) => {
    console.log(`  ${idx + 1}. "${q}"`);
  });
});
