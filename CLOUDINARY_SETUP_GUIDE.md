# 🔧 Hướng Dẫn Tích Hợp Cloudinary

## 📋 Tổng Quan

DonaTrust đã được tích hợp với Cloudinary để lưu trữ và quản lý hình ảnh một cách hiệu quả. Cloudinary cung cấp:

- **CDN toàn cầu** cho tốc độ tải nhanh
- **Tự động tối ưu hóa** hình ảnh
- **Transformations** linh hoạt (resize, crop, quality)
- **Backup và recovery** tự động
- **Analytics** chi tiết

## 🚀 Cài Đặt

### 1. Tạo Tài Khoản Cloudinary

1. Truy cập [cloudinary.com](https://cloudinary.com)
2. Đăng ký tài khoản miễn phí
3. Vào **Dashboard** để lấy thông tin API

### 2. Lấy Thông Tin API

Trong Cloudinary Dashboard, bạn sẽ thấy:

```
Cloud name: your_cloud_name
API Key: 123456789012345
API Secret: your_api_secret_here
```

### 3. Cấu Hình Environment Variables

Thêm vào file `.env`:

```bash
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## 📁 Cấu Trúc Thư Mục Cloudinary

Hệ thống sẽ tự động tạo các thư mục sau:

```
donatrust/
├── avatars/          # Ảnh đại diện người dùng
├── campaigns/        # Ảnh chiến dịch
├── certificates/     # Giấy chứng nhận
├── documents/        # Tài liệu
├── reports/          # Báo cáo
└── updates/          # Ảnh cập nhật tiến độ
```

## 🔧 Các Tính Năng Đã Tích Hợp

### 1. Upload Avatar
- **Endpoint**: `POST /api/users/upload-avatar`
- **Transformations**: 300x300, crop fill, face detection
- **Formats**: JPG, PNG, GIF, WebP
- **Max Size**: 5MB

### 2. Upload Campaign Images
- **Endpoint**: `POST /api/campaigns/:id/upload`
- **Transformations**: 800x600, crop fill, auto gravity
- **Formats**: JPG, PNG, GIF, WebP
- **Max Size**: 10MB

### 3. Upload Certificates
- **Endpoint**: `POST /api/charities/upload-certificate`
- **Transformations**: Auto quality optimization
- **Formats**: JPG, PNG, PDF, DOC, DOCX
- **Max Size**: 15MB

### 4. Upload Documents
- **Endpoint**: `POST /api/charities/upload-document`
- **Transformations**: Auto quality optimization
- **Formats**: PDF, DOC, DOCX, JPG, PNG
- **Max Size**: 20MB

## 🛠️ Utility Functions

### CloudinaryHelper

```javascript
const { 
  extractPublicId, 
  deleteImageByUrl, 
  getOptimizedUrl,
  getThumbnailUrl,
  getResponsiveUrls,
  cleanupOldImage 
} = require('../utils/cloudinaryHelper');

// Lấy thumbnail
const thumbnail = getThumbnailUrl(cloudinaryUrl, 150, 150);

// Lấy responsive URLs
const responsive = getResponsiveUrls(cloudinaryUrl);
// Returns: { original, thumbnail, small, medium, large }

// Xóa ảnh cũ
await cleanupOldImage(oldUrl, newUrl);
```

## 📱 Frontend Integration

### 1. Cập Nhật API Calls

```javascript
// Trước (local upload)
const formData = new FormData();
formData.append('avatar', file);

// Sau (Cloudinary upload) - không thay đổi gì!
const formData = new FormData();
formData.append('avatar', file);
```

### 2. Xử Lý Response

```javascript
// Response từ server
{
  "status": "success",
  "message": "Avatar uploaded successfully",
  "avatar_url": "https://res.cloudinary.com/your_cloud/image/upload/v1234567890/donatrust/avatars/avatar_123456_abc123.jpg",
  "user": {
    "profile_image": "https://res.cloudinary.com/your_cloud/image/upload/v1234567890/donatrust/avatars/avatar_123456_abc123.jpg"
  }
}
```

### 3. Hiển Thị Ảnh

```javascript
// Sử dụng trực tiếp URL từ Cloudinary
<img src={user.profile_image} alt="Avatar" />

// Hoặc sử dụng responsive images
const { getResponsiveUrls } = require('../utils/cloudinaryHelper');
const urls = getResponsiveUrls(user.profile_image);

<img 
  src={urls.medium} 
  srcSet={`${urls.small} 400w, ${urls.medium} 800w, ${urls.large} 1200w`}
  sizes="(max-width: 400px) 400px, (max-width: 800px) 800px, 1200px"
  alt="Campaign Image" 
/>
```

## 🔄 Migration từ Local Storage

### 1. Backup Dữ Liệu Hiện Tại

```bash
# Backup uploads folder
cp -r uploads/ uploads_backup/
```

### 2. Upload Ảnh Cũ Lên Cloudinary

```javascript
// Script migration (tùy chọn)
const { uploadBase64Image } = require('../config/cloudinary');
const fs = require('fs');

async function migrateLocalImages() {
  const localImages = fs.readdirSync('./uploads/avatars');
  
  for (const image of localImages) {
    const imagePath = `./uploads/avatars/${image}`;
    const base64 = fs.readFileSync(imagePath, 'base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    
    const result = await uploadBase64Image(dataUrl, 'donatrust/avatars');
    console.log(`Migrated: ${image} -> ${result.url}`);
  }
}
```

## 🧪 Testing

### 1. Test Upload

```bash
# Test avatar upload
curl -X POST http://localhost:5000/api/users/upload-avatar \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "avatar=@test-image.jpg"
```

### 2. Test Image Transformations

```javascript
// Test thumbnail generation
const thumbnailUrl = getThumbnailUrl(originalUrl, 100, 100);
console.log('Thumbnail URL:', thumbnailUrl);
```

## 🚨 Troubleshooting

### 1. Lỗi "Invalid Cloud Name"

```bash
# Kiểm tra .env file
echo $CLOUDINARY_CLOUD_NAME
```

### 2. Lỗi "Unauthorized"

```bash
# Kiểm tra API credentials
echo $CLOUDINARY_API_KEY
echo $CLOUDINARY_API_SECRET
```

### 3. Lỗi Upload

```javascript
// Kiểm tra file size và format
const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const maxSize = 5 * 1024 * 1024; // 5MB

if (!allowedTypes.includes(file.mimetype)) {
  throw new Error('Invalid file type');
}

if (file.size > maxSize) {
  throw new Error('File too large');
}
```

## 📊 Monitoring

### 1. Cloudinary Dashboard

- **Usage**: Theo dõi bandwidth và storage
- **Transformations**: Xem số lần transform
- **Analytics**: Phân tích hiệu suất

### 2. Logs

```javascript
// Server logs
console.log('📁 Processing avatar upload:', {
  userId,
  filename: file.filename,
  url: file.url, // Cloudinary URL
  size: file.size
});
```

## 💰 Pricing

### Free Tier
- **Storage**: 25GB
- **Bandwidth**: 25GB/tháng
- **Transformations**: 25,000/tháng

### Paid Plans
- **Basic**: $89/tháng
- **Advanced**: $224/tháng
- **Enterprise**: Custom pricing

## 🎯 Best Practices

### 1. Image Optimization

```javascript
// Sử dụng auto quality
transformation: [
  { quality: 'auto' },
  { width: 800, height: 600, crop: 'fill' }
]
```

### 2. Lazy Loading

```javascript
// Frontend lazy loading
<img 
  src={thumbnailUrl} 
  data-src={fullSizeUrl}
  loading="lazy"
  alt="Image" 
/>
```

### 3. Error Handling

```javascript
// Fallback cho ảnh lỗi
<img 
  src={imageUrl} 
  onError={(e) => {
    e.target.src = '/default-image.jpg';
  }}
  alt="Image" 
/>
```

## 🔒 Security

### 1. Upload Restrictions

```javascript
// Chỉ cho phép file types cụ thể
const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Giới hạn file size
const maxSize = 5 * 1024 * 1024; // 5MB
```

### 2. Access Control

```javascript
// Chỉ owner mới có thể xóa ảnh
if (req.user.user_id !== imageOwnerId) {
  throw new AppError('Unauthorized', 403);
}
```

## 📞 Support

Nếu gặp vấn đề:

1. **Cloudinary Docs**: [cloudinary.com/documentation](https://cloudinary.com/documentation)
2. **DonaTrust Issues**: Tạo issue trên GitHub
3. **Community**: Cloudinary Community Forum

---

**🎉 Chúc mừng! Bạn đã tích hợp thành công Cloudinary vào DonaTrust!**

