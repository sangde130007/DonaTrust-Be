// src/utils/cloudinaryUpload.js
const { cloudinary } = require('../config/cloudinary'); // <- destructure instance
const streamifier = require('streamifier');
const fs = require('fs');

const uploadToCloudinary = (input, folder = 'campaign-updates') => {
  return new Promise((resolve, reject) => {
    if (!cloudinary || !cloudinary.uploader) {
      return reject(new Error('Cloudinary uploader không được khởi tạo. Kiểm tra config export và env vars.'));
    }

    // Normalize input:
    // - Buffer (multer memoryStorage -> req.file.buffer)
    // - req.file object with .buffer
    // - file path string
    // - url string or dataURI
    if (!input) {
      return reject(new Error('No input provided to uploadToCloudinary'));
    }

    // If Buffer directly or req.file with .buffer:
    if (Buffer.isBuffer(input) || (input && typeof input === 'object' && Buffer.isBuffer(input.buffer))) {
      const buffer = Buffer.isBuffer(input) ? input : input.buffer;
      try {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder, resource_type: 'image', transformation: [{ quality: 'auto' }, { fetch_format: 'auto' }] },
          (err, result) => {
            if (err) return reject(err);
            return resolve(result.secure_url || result.url || result.public_id);
          }
        );
        streamifier.createReadStream(buffer).pipe(uploadStream);
      } catch (err) {
        return reject(err);
      }
      return;
    }

    // If string:
    if (typeof input === 'string') {
      // dataURI (base64)
      if (input.startsWith('data:')) {
        return cloudinary.uploader.upload(input, { folder, resource_type: 'image' })
          .then(r => resolve(r.secure_url || r.url || r.public_id))
          .catch(reject);
      }

      // local filepath
      if (fs.existsSync(input)) {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder, resource_type: 'image' },
          (err, result) => {
            if (err) return reject(err);
            return resolve(result.secure_url || result.url || result.public_id);
          }
        );
        fs.createReadStream(input).pipe(uploadStream);
        return;
      }

      // remote URL
      return cloudinary.uploader.upload(input, { folder, resource_type: 'image' })
        .then(r => resolve(r.secure_url || r.url || r.public_id))
        .catch(reject);
    }

    return reject(new Error('Unsupported input type for uploadToCloudinary'));
  });
};

const deleteFromCloudinary = async (imageUrlOrPublicId) => {
  try {
    if (!imageUrlOrPublicId) return;
    // Nếu truyền public_id trực tiếp thì dùng luôn
    if (!/^https?:\/\//i.test(imageUrlOrPublicId)) {
      return await cloudinary.uploader.destroy(imageUrlOrPublicId);
    }
    // Nếu truyền URL -> try extract public_id (heuristic)
    const urlObj = new URL(imageUrlOrPublicId);
    const parts = urlObj.pathname.split('/').filter(Boolean); // loại bỏ empty
    // tìm vị trí folder root (ví dụ 'donatrust')
    const idx = parts.findIndex(p => p === 'donatrust');
    const publicParts = idx >= 0 ? parts.slice(idx) : parts.slice(3); // bỏ phần /image/upload/v123
    let publicId = publicParts.join('/');
    publicId = publicId.replace(/\.[^/.]+$/, ''); // bỏ ext
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Lỗi xóa ảnh Cloudinary:', error);
    throw error;
  }
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };
