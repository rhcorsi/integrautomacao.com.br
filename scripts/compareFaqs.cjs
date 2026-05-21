const fs = require('fs');
const path = require('path');

const solucoesDir = path.join(__dirname, '..', 'src', 'pages', 'solucoes');

function inspectFaq(file, keyword) {
  const content = fs.readFileSync(path.join(solucoesDir, file), 'utf8');
  // Find all FAQ objects
  // An FAQ object in these files usually looks like:
  // {
  //   q: "...",
  //   a: "..."
  // }
  
  const faqs = [];
  const lines = content.split('\n');
  let currentFaq = null;
  let captureA = false;
  
  lines.forEach((line, idx) => {
    const qMatch = line.match(/q:\s*["']([^"']+)["']/);
    if (qMatch) {
      if (currentFaq) faqs.push(currentFaq);
      currentFaq = { q: qMatch[1], a: '', startLine: idx + 1 };
      captureA = true;
      return;
    }
    
    if (captureA && currentFaq) {
      const aMatch = line.match(/a:\s*["']([^"']+)["']/);
      if (aMatch) {
        currentFaq.a = aMatch[1];
        captureA = false;
      } else if (line.trim().startsWith('"') || line.trim().startsWith("'")) {
        // Multi-line or other
        currentFaq.a += ' ' + line.trim().replace(/^["']|["']\s*,?\s*$/g, '');
      } else if (line.includes('}') && !line.includes('faq:')) {
        captureA = false;
      } else {
        // Accumulate text
        currentFaq.a += ' ' + line.trim().replace(/["']/g, '');
      }
    }
  });
  if (currentFaq) faqs.push(currentFaq);
  
  return faqs.filter(faq => faq.q.toLowerCase().includes(keyword.toLowerCase()));
}

console.log("=== Comparing PI System / AVEVA FAQs ===");
const ftFaqs = inspectFaq('factorytalk.astro', 'PI System');
const ppFaqs = inspectFaq('plantpax.astro', 'PI System');

console.log("\n--- FactoryTalk.astro ---");
ftFaqs.forEach(f => {
  console.log(`Line ${f.startLine} Q: "${f.q}"`);
  console.log(`A: "${f.a.trim()}"`);
});

console.log("\n--- PlantPAx.astro ---");
ppFaqs.forEach(f => {
  console.log(`Line ${f.startLine} Q: "${f.q}"`);
  console.log(`A: "${f.a.trim()}"`);
});
