#!/usr/bin/env node

// Simple script to prepare for deployment
const fs = require('fs');
const path = require('path');

console.log('🚀 Preparing Wavelength Game for Deployment...\n');

// Check if required files exist
const requiredFiles = [
  'package.json',
  'server.cjs', 
  'netlify.toml',
  'railway.json',
  'src/config.ts'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
    allFilesExist = false;
  }
});

console.log('\n📋 Deployment Checklist:');
console.log('1. Push code to GitHub repository');
console.log('2. Create Railway account and deploy server');
console.log('3. Create Netlify account and deploy frontend');
console.log('4. Update src/config.ts with your Railway server URL');
console.log('5. Update server.cjs CORS origins with your Netlify URL');
console.log('6. Test the deployed app');
console.log('7. Share the Netlify URL with friends!');

console.log('\n📚 Resources:');
console.log('- Railway: https://railway.app');
console.log('- Netlify: https://netlify.com');
console.log('- Detailed guide: See DEPLOYMENT.md');

if (allFilesExist) {
  console.log('\n🎉 All required files present! Ready for deployment.');
} else {
  console.log('\n⚠️  Some files are missing. Please check the setup.');
}

// Check package.json scripts
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const hasStartScript = pkg.scripts && pkg.scripts.start;
  const hasBuildScript = pkg.scripts && pkg.scripts.build;
  
  console.log('\n📦 Package.json Scripts:');
  console.log(`- start: ${hasStartScript ? '✅' : '❌'} ${pkg.scripts?.start || 'missing'}`);
  console.log(`- build: ${hasBuildScript ? '✅' : '❌'} ${pkg.scripts?.build || 'missing'}`);
} catch (error) {
  console.log('\n❌ Error reading package.json');
}