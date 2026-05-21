const fs = require('fs');
const path = require('path');

const techCatalogFile = path.join(__dirname, '..', 'src', 'data', 'techCatalog.ts');

try {
  const content = fs.readFileSync(techCatalogFile, 'utf8');
  
  // Let's parse the technology blocks.
  // Each block has a title and a faq list:
  // title: "...",
  // faq: [ { q: "...", a: "..." }, ... ]
  
  const blocks = [];
  const lines = content.split('\n');
  let currentTech = '';
  let currentFaq = [];
  
  lines.forEach((line, idx) => {
    const titleMatch = line.match(/title:\s*["']([^"']+)["']/);
    if (titleMatch && !line.includes('shortTitle') && !line.includes('imageTitle')) {
      currentTech = titleMatch[1];
    }
    
    const qMatch = line.match(/q:\s*["']([^"']+)["']/);
    if (qMatch) {
      currentFaq.push({ tech: currentTech, q: qMatch[1], line: idx + 1 });
    }
  });

  console.log(`=== Extracted FAQs from techCatalog.ts (Found ${currentFaq.length} questions) ===`);
  
  // Group by technology
  const grouped = {};
  currentFaq.forEach(f => {
    if (!grouped[f.tech]) grouped[f.tech] = [];
    grouped[f.tech].push(f);
  });
  
  Object.keys(grouped).forEach(tech => {
    console.log(`\nTechnology: "${tech}"`);
    grouped[tech].forEach((f, idx) => {
      console.log(`  ${idx + 1}. [Line ${f.line}] "${f.q}"`);
    });
  });
  
  // Find any duplicates across the entire catalog
  console.log("\n=== Checking for Duplicate FAQs ===");
  const qCounts = {};
  currentFaq.forEach(f => {
    const key = f.q.toLowerCase().trim();
    if (!qCounts[key]) qCounts[key] = [];
    qCounts[key].push(f);
  });
  
  let duplicateCount = 0;
  Object.keys(qCounts).forEach(q => {
    if (qCounts[q].length > 1) {
      duplicateCount++;
      console.log(`\nDuplicate Question: "${qCounts[q][0].q}"`);
      qCounts[q].forEach(f => {
        console.log(`  Technology: "${f.tech}" at Line ${f.line}`);
      });
    }
  });
  
  if (duplicateCount === 0) {
    console.log("\nZero duplicate FAQs found! The catalog is completely unique.");
  } else {
    console.log(`\nFound ${duplicateCount} duplicate questions.`);
  }

} catch (err) {
  console.error("Error checking techCatalog.ts:", err.message);
}
