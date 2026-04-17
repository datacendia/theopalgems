const fs = require('fs');

console.log('=== COMPREHENSIVE IMAGE TEST ===\n');

// Test inventory images
const inventory = JSON.parse(fs.readFileSync('public/inventory.json', 'utf8'));
const firstItem = inventory[0];
console.log('1. INVENTORY IMAGES:');
console.log(`   First product: ${firstItem.NAME}`);
console.log(`   Image path: ${firstItem['PRODUCT IMAGE']}`);
console.log(`   Is local: ${firstItem['PRODUCT IMAGE'].startsWith('/assets/')}`);
console.log(`   File exists: ${fs.existsSync('public' + firstItem['PRODUCT IMAGE'])}`);

// Test location images
const locations = JSON.parse(fs.readFileSync('src/App.jsx', 'utf8'))
  .match(/const locations = \[([\s\S]*?)\];/)[1]
  .match(/image: '([^']+)'/g);

console.log('\n2. LOCATION IMAGES:');
locations.forEach((loc, i) => {
  const imagePath = loc.match(/'([^']+)'/)[1];
  console.log(`   Location ${i+1}: ${imagePath}`);
  console.log(`   File exists: ${fs.existsSync('public' + imagePath)}`);
});

// Test category images
const categoryImages = [
  '/assets/category-necklaces.PNG',
  '/assets/category-rings.PNG',
  '/assets/category-earrings.PNG',
  '/assets/category-bracelets.PNG',
  '/assets/category-watches.PNG'
];

console.log('\n3. CATEGORY IMAGES:');
categoryImages.forEach((img, i) => {
  console.log(`   ${i+1}. ${img}`);
  console.log(`   File exists: ${fs.existsSync('public' + img)}`);
});

console.log('\n=== TEST COMPLETE ===');
