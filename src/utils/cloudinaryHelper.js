const { deleteCloudinaryImage, getCloudinaryUrl } = require('../config/cloudinary');

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string|null} - Public ID or null if invalid URL
 */
const extractPublicId = (url) => {
  if (!url || typeof url !== 'string') return null;
  
  // Cloudinary URL pattern: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
  return match ? match[1] : null;
};

/**
 * Delete image from Cloudinary by URL
 * @param {string} url - Cloudinary URL
 * @returns {Promise<Object>} - Deletion result
 */
const deleteImageByUrl = async (url) => {
  const publicId = extractPublicId(url);
  if (!publicId) {
    throw new Error('Invalid Cloudinary URL');
  }
  return await deleteCloudinaryImage(publicId);
};

/**
 * Get optimized Cloudinary URL with transformations
 * @param {string} url - Original Cloudinary URL
 * @param {Object} options - Transformation options
 * @returns {string} - Optimized URL
 */
const getOptimizedUrl = (url, options = {}) => {
  const publicId = extractPublicId(url);
  if (!publicId) return url;
  
  return getCloudinaryUrl(publicId, options);
};

/**
 * Get thumbnail URL for an image
 * @param {string} url - Original Cloudinary URL
 * @param {number} width - Thumbnail width
 * @param {number} height - Thumbnail height
 * @returns {string} - Thumbnail URL
 */
const getThumbnailUrl = (url, width = 150, height = 150) => {
  return getOptimizedUrl(url, {
    width,
    height,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto'
  });
};

/**
 * Get responsive image URLs for different screen sizes
 * @param {string} url - Original Cloudinary URL
 * @returns {Object} - Object with different size URLs
 */
const getResponsiveUrls = (url) => {
  const publicId = extractPublicId(url);
  if (!publicId) return { original: url };
  
  return {
    original: url,
    thumbnail: getCloudinaryUrl(publicId, { width: 150, height: 150, crop: 'fill', quality: 'auto' }),
    small: getCloudinaryUrl(publicId, { width: 400, height: 300, crop: 'fill', quality: 'auto' }),
    medium: getCloudinaryUrl(publicId, { width: 800, height: 600, crop: 'fill', quality: 'auto' }),
    large: getCloudinaryUrl(publicId, { width: 1200, height: 900, crop: 'fill', quality: 'auto' })
  };
};

/**
 * Clean up old images when updating user profile or campaign
 * @param {string} oldUrl - Old image URL
 * @param {string} newUrl - New image URL
 */
const cleanupOldImage = async (oldUrl, newUrl) => {
  if (!oldUrl || oldUrl === newUrl) return;
  
  try {
    await deleteImageByUrl(oldUrl);
    console.log(`✅ Deleted old image: ${oldUrl}`);
  } catch (error) {
    console.error(`❌ Failed to delete old image: ${oldUrl}`, error.message);
  }
};

/**
 * Validate if URL is a Cloudinary URL
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid Cloudinary URL
 */
const isCloudinaryUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
};

/**
 * Convert local file path to Cloudinary URL format
 * @param {string} localPath - Local file path
 * @returns {string} - Cloudinary URL format
 */
const convertLocalPathToCloudinaryUrl = (localPath) => {
  if (!localPath) return null;
  
  // If it's already a Cloudinary URL, return as is
  if (isCloudinaryUrl(localPath)) return localPath;
  
  // If it's a local path, we need to upload it first
  // This is a placeholder - actual implementation would require file upload
  return localPath;
};

module.exports = {
  extractPublicId,
  deleteImageByUrl,
  getOptimizedUrl,
  getThumbnailUrl,
  getResponsiveUrls,
  cleanupOldImage,
  isCloudinaryUrl,
  convertLocalPathToCloudinaryUrl
};

