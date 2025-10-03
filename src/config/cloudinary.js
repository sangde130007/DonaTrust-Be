const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config();

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Tạo storage cho avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'donatrust/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 300, height: 300, crop: 'fill', gravity: 'face' },
      { quality: 'auto' }
    ],
    public_id: (req, file) => {
      // Tạo unique ID cho avatar
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      return `avatar_${timestamp}_${randomString}`;
    }
  }
});

// Tạo storage cho campaign images
const campaignStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'donatrust/campaigns',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 800, height: 600, crop: 'fill', gravity: 'auto' },
      { quality: 'auto' }
    ],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      return `campaign_${timestamp}_${randomString}`;
    }
  }
});

// Tạo storage cho certificates
const certificateStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'donatrust/certificates',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
    transformation: [
      { quality: 'auto' }
    ],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      return `cert_${timestamp}_${randomString}`;
    }
  }
});

// Tạo storage cho documents
const documentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'donatrust/documents',
    allowed_formats: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
    transformation: [
      { quality: 'auto' }
    ],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      return `doc_${timestamp}_${randomString}`;
    }
  }
});

// Tạo storage cho reports
const reportStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'donatrust/reports',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    transformation: [
      { quality: 'auto' }
    ],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      return `report_${timestamp}_${randomString}`;
    }
  }
});

// Tạo storage cho updates
const updateStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: (req) => `donatrust/campaigns/${req.params.id}/updates`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 600, height: 400, crop: 'fill', gravity: 'auto' },
      { quality: 'auto' }
    ],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      return `update_${timestamp}_${randomString}`;
    }
  }
});

// Tạo multer uploaders
const uploadAvatar = multer({ storage: avatarStorage });
const uploadCampaign = multer({ storage: campaignStorage });
const uploadCertificate = multer({ storage: certificateStorage });
const uploadDocument = multer({ storage: documentStorage });
const uploadReport = multer({ storage: reportStorage });
const uploadUpdate = multer({ storage: updateStorage });

// Utility functions
const deleteCloudinaryImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

const getCloudinaryUrl = (publicId, options = {}) => {
  return cloudinary.url(publicId, options);
};

const uploadBase64Image = async (base64String, folder = 'donatrust/misc') => {
  try {
    const result = await cloudinary.uploader.upload(base64String, {
      folder: folder,
      quality: 'auto',
      transformation: [
        { quality: 'auto' }
      ]
    });
    return result;
  } catch (error) {
    console.error('Error uploading base64 image to Cloudinary:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadAvatar,
  uploadCampaign,
  uploadCertificate,
  uploadDocument,
  uploadReport,
  uploadUpdate,
  deleteCloudinaryImage,
  getCloudinaryUrl,
  uploadBase64Image
};