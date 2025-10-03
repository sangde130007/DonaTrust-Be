# 🚀 Quick Start - Cloudinary Integration

## ⚡ Cài Đặt Nhanh

### 1. Cài đặt dependencies
```bash
cd DonaTrust-Be
npm install cloudinary multer-storage-cloudinary
```

### 2. Cấu hình Environment Variables
Thêm vào file `.env`:
```bash
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### 3. Test tích hợp
```bash
node test-cloudinary-integration.js
```

## 🔧 Sử Dụng

### Backend - Upload Avatar
```javascript
// Controller đã được cập nhật tự động
// Chỉ cần sử dụng middleware như bình thường
app.post('/api/users/upload-avatar', uploadAvatar, userController.uploadAvatar);
```

### Frontend - Hiển thị ảnh
```javascript
import CloudinaryImage, { AvatarImage, CampaignImage } from './components/ui/CloudinaryImage';

// Sử dụng component tối ưu
<AvatarImage src={user.profile_image} size={100} />
<CampaignImage src={campaign.image_url} alt={campaign.title} />
```

### Utility Functions
```javascript
import { getThumbnailUrl, getResponsiveUrls } from './utils/cloudinaryHelper';

// Lấy thumbnail
const thumbnail = getThumbnailUrl(originalUrl, 150, 150);

// Lấy responsive URLs
const responsive = getResponsiveUrls(originalUrl);
```

## 📁 Các File Đã Được Cập Nhật

### Backend
- ✅ `src/config/cloudinary.js` - Cấu hình Cloudinary
- ✅ `src/middleware/uploadMiddleware.js` - Upload middleware
- ✅ `src/utils/cloudinaryHelper.js` - Utility functions
- ✅ `src/controllers/userController.js` - User controller
- ✅ `src/controllers/charityController.js` - Charity controller
- ✅ `src/services/userService.js` - User service

### Frontend
- ✅ `src/utils/fileLink.js` - File link utilities
- ✅ `src/utils/cloudinaryHelper.js` - Cloudinary utilities
- ✅ `src/components/ui/CloudinaryImage.jsx` - Image component

## 🧪 Test

### 1. Test Backend
```bash
# Test tích hợp Cloudinary
node test-cloudinary-integration.js

# Test upload avatar
curl -X POST http://localhost:5000/api/users/upload-avatar \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "avatar=@test-image.jpg"
```

### 2. Test Frontend
```javascript
// Test component
import CloudinaryImage from './components/ui/CloudinaryImage';

<CloudinaryImage 
  src="https://res.cloudinary.com/your_cloud/image/upload/v1234567890/donatrust/avatars/avatar_123456_abc123.jpg"
  alt="Test Image"
  width={200}
  height={200}
/>
```

## 🔄 Migration từ Local Storage

### 1. Backup dữ liệu hiện tại
```bash
cp -r uploads/ uploads_backup/
```

### 2. Upload ảnh cũ lên Cloudinary (tùy chọn)
```javascript
// Script migration
const { uploadBase64Image } = require('./src/config/cloudinary');
const fs = require('fs');

async function migrateImages() {
  const images = fs.readdirSync('./uploads/avatars');
  
  for (const image of images) {
    const imagePath = `./uploads/avatars/${image}`;
    const base64 = fs.readFileSync(imagePath, 'base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    
    const result = await uploadBase64Image(dataUrl, 'donatrust/avatars');
    console.log(`Migrated: ${image} -> ${result.url}`);
  }
}
```

## 🚨 Troubleshooting

### Lỗi "Invalid Cloud Name"
```bash
# Kiểm tra .env file
echo $CLOUDINARY_CLOUD_NAME
```

### Lỗi "Unauthorized"
```bash
# Kiểm tra API credentials
echo $CLOUDINARY_API_KEY
echo $CLOUDINARY_API_SECRET
```

### Lỗi Upload
- Kiểm tra file size (max 5MB cho avatar)
- Kiểm tra file format (JPG, PNG, GIF, WebP)
- Kiểm tra network connection

## 📊 Monitoring

### Cloudinary Dashboard
- Truy cập [cloudinary.com/console](https://cloudinary.com/console)
- Theo dõi usage và storage
- Xem analytics

### Server Logs
```bash
# Xem logs
tail -f logs/combined.log
```

## 🎯 Next Steps

1. **Cấu hình Cloudinary** với thông tin API của bạn
2. **Test tích hợp** bằng script test
3. **Deploy** và test trên production
4. **Monitor** usage trên Cloudinary Dashboard

---

**🎉 Chúc mừng! Bạn đã tích hợp thành công Cloudinary vào DonaTrust!**




