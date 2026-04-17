const fs = require('fs');
const path = require('path');

// Load inventory and get actual Kira files
const inventory = JSON.parse(fs.readFileSync('public/inventory.json', 'utf8'));
const kiraFolder = 'public/assets/kira';

// Get all actual Kira image files
const kiraFiles = fs.readdirSync(kiraFolder);
console.log(`Found ${kiraFiles.length} Kira image files`);

// Create SKU to filename mapping
const skuToImage = {};
kiraFiles.forEach(file => {
  const sku = file.split('_')[0]; // Remove _2, _3 suffixes
  if (!skuToImage[sku]) {
    skuToImage[sku] = `/assets/kira/${file}`;
  }
});

console.log(`Mapped ${Object.keys(skuToImage).length} unique SKUs to images`);

// Update inventory with correct image paths
let fixedCount = 0;
const updatedInventory = inventory.map(item => {
  if (item.SKU && item.SKU.startsWith('KJ')) {
    const baseSku = item.SKU.split('.')[0]; // KJ0010P
    if (skuToImage[baseSku]) {
      fixedCount++;
      return { ...item, 'PRODUCT IMAGE': skuToImage[baseSku] };
    }
  }
  return item;
});

// Save updated inventory
fs.writeFileSync('public/inventory.json', JSON.stringify(updatedInventory, null, 2));

console.log(`Fixed ${fixedCount} Kira products with correct image paths`);

// Test first few
console.log('\n=== FIRST 5 PRODUCTS AFTER FIX ===');
updatedInventory.slice(0, 5).forEach((item, i) => {
  console.log(`${i+1}. ${item.NAME}`);
  console.log(`   Image: ${item['PRODUCT IMAGE']}`);
  console.log(`   Local: ${item['PRODUCT IMAGE'].startsWith('/assets/')}`);
  console.log('');
});
