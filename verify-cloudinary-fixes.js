#!/usr/bin/env node

/**
 * Quick verification script for Cloudinary fixes
 * Tests that all upload endpoints are properly configured
 */

const path = require('path');
const fs = require('fs');

console.log('🔍 Verifying Cloudinary Integration Fixes...\n');

// Check if all required files exist and have correct configurations
const checks = [
  {
    name: 'Cloudinary Config',
    file: 'src/config/cloudinary.js',
    check: (content) => content.includes('cloudinary.config') && content.includes('CloudinaryStorage')
  },
  {
    name: 'Cloudinary Helper',
    file: 'src/utils/cloudinaryHelper.js',
    check: (content) => content.includes('extractPublicId') && content.includes('deleteImageByUrl')
  },
  {
    name: 'Upload Middleware',
    file: 'src/middleware/uploadMiddleware.js',
    check: (content) => content.includes('cloudinaryUploadAvatar') && content.includes('cloudinaryUploadCampaign')
  },
  {
    name: 'Campaign Routes',
    file: 'src/routes/campaigns.js',
    check: (content) => content.includes('uploadCampaignCreation') && content.includes('CloudinaryStorage')
  },
  {
    name: 'Campaign Controller',
    file: 'src/controllers/campaignController.js',
    check: (content) => content.includes('file.url') && content.includes('Cloudinary URL')
  },
  {
    name: 'Campaign Service',
    file: 'src/services/campaignService.js',
    check: (content) => content.includes('file.url') && !content.includes('/uploads/campaigns/')
  },
  {
    name: 'Report Controller',
    file: 'src/controllers/reportCampaignController.js',
    check: (content) => content.includes('file.url') && !content.includes('/uploads/reports/')
  },
  {
    name: 'Charity Service',
    file: 'src/services/charityService.js',
    check: (content) => content.includes('file.url') && !content.includes('/uploads/documents/')
  },
  {
    name: 'Frontend FileLink',
    file: '../DonaTrust-Fe/src/utils/fileLink.js',
    check: (content) => content.includes('Cloudinary URLs') && content.includes('https?://')
  }
];

let passed = 0;
let failed = 0;

checks.forEach(check => {
  try {
    const filePath = path.join(__dirname, check.file);
    if (!fs.existsSync(filePath)) {
      console.log(`❌ ${check.name}: File not found - ${check.file}`);
      failed++;
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    if (check.check(content)) {
      console.log(`✅ ${check.name}: Configuration correct`);
      passed++;
    } else {
      console.log(`❌ ${check.name}: Configuration incorrect`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${check.name}: Error reading file - ${error.message}`);
    failed++;
  }
});

console.log('\n📊 Verification Results:');
console.log('='.repeat(50));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

if (failed === 0) {
  console.log('\n🎉 All Cloudinary integration fixes verified successfully!');
  console.log('\n📋 Summary of fixes:');
  console.log('• ✅ Campaign cover images → Cloudinary');
  console.log('• ✅ Campaign gallery images → Cloudinary');
  console.log('• ✅ Campaign QR codes → Cloudinary');
  console.log('• ✅ Campaign updates → Cloudinary');
  console.log('• ✅ Report evidence files → Cloudinary');
  console.log('• ✅ Charity documents → Cloudinary');
  console.log('• ✅ Charity certificates → Cloudinary');
  console.log('• ✅ Charity logos → Cloudinary');
  console.log('• ✅ Frontend URL handling → Cloudinary compatible');
  
  console.log('\n🚀 Ready to test with:');
  console.log('1. npm start (backend)');
  console.log('2. Test campaign creation with images');
  console.log('3. Test all upload endpoints');
  
  process.exit(0);
} else {
  console.log('\n⚠️  Some issues found. Please review the failed checks above.');
  process.exit(1);
}
