const fs = require('fs');

// Load the files
const inventory = JSON.parse(fs.readFileSync('public/inventory.json', 'utf8'));
const humanDescriptions = JSON.parse(fs.readFileSync('public/assets/kira/product_descriptions.json', 'utf8'));

console.log('=== FIXING PRODUCT DESCRIPTIONS ===\n');

// Update inventory with human descriptions
let updatedCount = 0;
inventory.forEach(item => {
  if (item.SKU && humanDescriptions[item.SKU]) {
    item.humanDescription = humanDescriptions[item.SKU];
    updatedCount++;
  }
});

// Save updated inventory
fs.writeFileSync('public/inventory.json', JSON.stringify(inventory, null, 2));

console.log(`✅ Updated ${updatedCount} items with human descriptions`);

// Show some examples
const examples = inventory.filter(item => item.humanDescription).slice(0, 10);
console.log('\n📝 Examples of updated descriptions:');
examples.forEach((item, i) => {
  console.log(`${i+1}. ${item.NAME}`);
  console.log(`   SKU: ${item.SKU}`);
  console.log(`   Description: ${item.humanDescription}`);
  console.log('');
});

console.log(`💾 Saved to public/inventory.json`);
