#!/usr/bin/env node

/**
 * Test script for Cloudinary integration
 * 
 * This script tests:
 * 1. Cloudinary configuration
 * 2. Upload functionality
 * 3. Image transformations
 * 4. URL generation
 * 5. Error handling
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import Cloudinary utilities
const { 
  cloudinary, 
  uploadBase64Image, 
  deleteCloudinaryImage, 
  getCloudinaryUrl 
} = require('./src/config/cloudinary');

const { 
  extractPublicId, 
  deleteImageByUrl, 
  getOptimizedUrl, 
  getThumbnailUrl,
  getResponsiveUrls,
  cleanupOldImage,
  isCloudinaryUrl 
} = require('./src/utils/cloudinaryHelper');

// Test configuration
const TEST_CONFIG = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
  testFolder: 'donatrust/test'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  test: (msg) => console.log(`${colors.cyan}🧪${colors.reset} ${msg}`)
};

// Test functions
async function testCloudinaryConfig() {
  log.test('Testing Cloudinary configuration...');
  
  try {
    // Check environment variables
    if (!TEST_CONFIG.cloudName) {
      throw new Error('CLOUDINARY_CLOUD_NAME not set');
    }
    if (!TEST_CONFIG.apiKey) {
      throw new Error('CLOUDINARY_API_KEY not set');
    }
    if (!TEST_CONFIG.apiSecret) {
      throw new Error('CLOUDINARY_API_SECRET not set');
    }
    
    log.success('Environment variables configured');
    
    // Test Cloudinary connection
    const result = await cloudinary.api.ping();
    log.success(`Cloudinary connection successful: ${result.status}`);
    
    return true;
  } catch (error) {
    log.error(`Configuration test failed: ${error.message}`);
    return false;
  }
}

async function testImageUpload() {
  log.test('Testing image upload...');
  
  try {
    // Create a simple test image (1x1 pixel PNG)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const dataUrl = `data:image/png;base64,${testImageBase64}`;
    
    const result = await uploadBase64Image(dataUrl, TEST_CONFIG.testFolder);
    
    if (result && result.url) {
      log.success(`Image uploaded successfully: ${result.url}`);
      return result;
    } else {
      throw new Error('Upload failed - no URL returned');
    }
  } catch (error) {
    log.error(`Upload test failed: ${error.message}`);
    return null;
  }
}

async function testImageTransformations(uploadResult) {
  log.test('Testing image transformations...');
  
  if (!uploadResult) {
    log.warning('Skipping transformation test - no upload result');
    return false;
  }
  
  try {
    const publicId = uploadResult.public_id;
    
    // Test different transformations
    const transformations = [
      { width: 100, height: 100, crop: 'fill' },
      { width: 200, height: 200, crop: 'fill', gravity: 'face' },
      { width: 300, height: 200, crop: 'fill', quality: 'auto' }
    ];
    
    for (const transform of transformations) {
      const url = getCloudinaryUrl(publicId, transform);
      log.info(`Generated URL: ${url}`);
    }
    
    log.success('Image transformations working');
    return true;
  } catch (error) {
    log.error(`Transformation test failed: ${error.message}`);
    return false;
  }
}

async function testHelperFunctions(uploadResult) {
  log.test('Testing helper functions...');
  
  if (!uploadResult) {
    log.warning('Skipping helper test - no upload result');
    return false;
  }
  
  try {
    const url = uploadResult.url;
    
    // Test isCloudinaryUrl
    const isCloudinary = isCloudinaryUrl(url);
    log.info(`isCloudinaryUrl: ${isCloudinary}`);
    
    // Test extractPublicId
    const publicId = extractPublicId(url);
    log.info(`extractPublicId: ${publicId}`);
    
    // Test getOptimizedUrl
    const optimizedUrl = getOptimizedUrl(url, { width: 150, height: 150, crop: 'fill' });
    log.info(`getOptimizedUrl: ${optimizedUrl}`);
    
    // Test getThumbnailUrl
    const thumbnailUrl = getThumbnailUrl(url, 100, 100);
    log.info(`getThumbnailUrl: ${thumbnailUrl}`);
    
    // Test getResponsiveUrls
    const responsiveUrls = getResponsiveUrls(url);
    log.info(`getResponsiveUrls: ${Object.keys(responsiveUrls).length} sizes generated`);
    
    log.success('Helper functions working');
    return true;
  } catch (error) {
    log.error(`Helper test failed: ${error.message}`);
    return false;
  }
}

async function testImageDeletion(uploadResult) {
  log.test('Testing image deletion...');
  
  if (!uploadResult) {
    log.warning('Skipping deletion test - no upload result');
    return false;
  }
  
  try {
    const publicId = uploadResult.public_id;
    
    // Test deleteCloudinaryImage
    const deleteResult = await deleteCloudinaryImage(publicId);
    log.info(`Delete result: ${deleteResult.result}`);
    
    if (deleteResult.result === 'ok') {
      log.success('Image deleted successfully');
      return true;
    } else {
      throw new Error(`Delete failed: ${deleteResult.result}`);
    }
  } catch (error) {
    log.error(`Deletion test failed: ${error.message}`);
    return false;
  }
}

async function testErrorHandling() {
  log.test('Testing error handling...');
  
  try {
    // Test with invalid public ID
    const invalidResult = await deleteCloudinaryImage('invalid_public_id');
    log.info(`Invalid delete result: ${invalidResult.result}`);
    
    // Test with invalid URL
    const invalidUrl = 'https://example.com/invalid.jpg';
    const isCloudinary = isCloudinaryUrl(invalidUrl);
    log.info(`Invalid URL check: ${isCloudinary}`);
    
    // Test extractPublicId with invalid URL
    const publicId = extractPublicId(invalidUrl);
    log.info(`Invalid URL public ID: ${publicId}`);
    
    log.success('Error handling working');
    return true;
  } catch (error) {
    log.error(`Error handling test failed: ${error.message}`);
    return false;
  }
}

async function testUploadMiddleware() {
  log.test('Testing upload middleware...');
  
  try {
    const { 
      uploadAvatar,
      uploadCampaign,
      uploadCertificate,
      uploadDocument 
    } = require('./src/config/cloudinary');
    
    // Check if middleware functions exist
    if (typeof uploadAvatar.single === 'function') {
      log.success('Avatar upload middleware available');
    } else {
      throw new Error('Avatar upload middleware not available');
    }
    
    if (typeof uploadCampaign.array === 'function') {
      log.success('Campaign upload middleware available');
    } else {
      throw new Error('Campaign upload middleware not available');
    }
    
    if (typeof uploadCertificate.array === 'function') {
      log.success('Certificate upload middleware available');
    } else {
      throw new Error('Certificate upload middleware not available');
    }
    
    if (typeof uploadDocument.single === 'function') {
      log.success('Document upload middleware available');
    } else {
      throw new Error('Document upload middleware not available');
    }
    
    log.success('Upload middleware working');
    return true;
  } catch (error) {
    log.error(`Upload middleware test failed: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log(`${colors.bright}${colors.cyan}🚀 Starting Cloudinary Integration Tests${colors.reset}\n`);
  
  const results = {
    config: false,
    upload: false,
    transformations: false,
    helpers: false,
    deletion: false,
    errorHandling: false,
    middleware: false
  };
  
  // Run tests
  results.config = await testCloudinaryConfig();
  
  if (results.config) {
    const uploadResult = await testImageUpload();
    results.upload = !!uploadResult;
    
    if (uploadResult) {
      results.transformations = await testImageTransformations(uploadResult);
      results.helpers = await testHelperFunctions(uploadResult);
      results.deletion = await testImageDeletion(uploadResult);
    }
  }
  
  results.errorHandling = await testErrorHandling();
  results.middleware = await testUploadMiddleware();
  
  // Print results
  console.log(`\n${colors.bright}📊 Test Results:${colors.reset}`);
  console.log('='.repeat(50));
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
    console.log(`${test.padEnd(20)} ${status}`);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log('='.repeat(50));
  console.log(`Total: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log(`\n${colors.green}🎉 All tests passed! Cloudinary integration is working correctly.${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}❌ Some tests failed. Please check the configuration and try again.${colors.reset}`);
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  log.error(`Unhandled rejection: ${error.message}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

// Run tests
if (require.main === module) {
  runTests().catch((error) => {
    log.error(`Test runner failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testCloudinaryConfig,
  testImageUpload,
  testImageTransformations,
  testHelperFunctions,
  testImageDeletion,
  testErrorHandling,
  testUploadMiddleware
};

