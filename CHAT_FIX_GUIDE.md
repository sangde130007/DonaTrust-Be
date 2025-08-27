# 🔧 Hướng Dẫn Fix Chat System

## 🚨 Vấn Đề Hiện Tại

Chat system đang gặp lỗi 500 Internal Server Error khi gọi API join chat. Nguyên nhân chính:

1. **Database chưa được setup đúng cách**
2. **Bảng `users` không tồn tại**
3. **Lỗi schema update tự động**
4. **Frontend error handling chưa tốt**
5. **Model associations không sử dụng alias đúng cách**
6. **Socket.IO connection issues (wrong port, timeout)**
7. **Frontend không xử lý fallback mode đúng cách**
8. **Missing functions: chatService.sendMessage, getChatMessages**
9. **Socket authorization errors: "Not authorized for this room"**
10. **Server port mismatch: Backend running on 3000, frontend expecting 5000**

## 🛠️ Các Bước Fix

### Bước 1: Fix Database

```bash
# Chạy script fix database
node fix-database.js
```

Script này sẽ:

-   Tạo database nếu chưa có
-   Sync các bảng cần thiết
-   Tạo sample data

### Bước 2: Kiểm Tra Database

```bash
# Kiểm tra kết nối database
node check-database.js

# Setup database cơ bản
node setup-database.js
```

### Bước 3: Test Associations

```bash
# Test model associations
node test-associations.js
```

### Bước 4: Test Chat API

```bash
# Test chat API
node test-chat-api.js
```

### Bước 5: Khởi Động Server

```bash
# Khởi động server
npm run dev
```

## 📋 Các File Đã Sửa

### Backend

-   `src/server.js` - Tắt auto schema update, sửa port từ 3000 thành 5000
-   `src/controllers/chatController.js` - Cải thiện error handling, associations, và thêm REST API functions
-   `src/routes/chat.js` - Thêm routes cho sendMessage và getChatMessages
-   `update-db-schema.js` - Sửa database name
-   `fix-database.js` - Script fix database mới
-   `test-associations.js` - Script test associations mới

### Frontend

-   `src/services/chatService.js` - Cải thiện error messages, thêm sendMessage và getChatMessages functions
-   `src/services/socketService.js` - Cải thiện error handling cho authorization errors

## 🔍 Kiểm Tra Logs

Xem logs để debug:

```bash
# Xem error logs
tail -f logs/error.log

# Xem combined logs
tail -f logs/combined.log
```

## 🧪 Test Cases

### Test 1: Health Check

```bash
curl http://localhost:5000/
```

### Test 2: Chat Join (với invalid ID)

```bash
curl -X POST http://localhost:5000/api/chat/campaign/invalid-uuid/join \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Test 3: Chat Join (không có auth)

```bash
curl -X POST http://localhost:5000/api/chat/campaign/test-uuid/join \
  -H "Content-Type: application/json"
```

## 🎯 Kết Quả Mong Đợi

1. **Database được tạo và sync thành công**
2. **Chat API trả về lỗi 404 cho invalid ID (thay vì 500)**
3. **Chat API trả về lỗi 401 cho missing auth**
4. **Frontend hiển thị error messages thân thiện**

## 🚀 Sau Khi Fix

1. **Tạo campaign và charity records thật**
2. **Test chat với valid IDs**
3. **Implement real-time chat với Socket.IO**
4. **Test chat functionality end-to-end**

## 📞 Hỗ Trợ

Nếu vẫn gặp vấn đề:

1. Kiểm tra PostgreSQL có đang chạy không
2. Kiểm tra `.env` file có đúng credentials không
3. Xem logs để tìm lỗi cụ thể
4. Chạy `node fix-database.js` để fix database

## 🔄 Rollback

Nếu cần rollback:

```bash
# Comment out các thay đổi trong server.js
# Restart server
npm run dev
```
