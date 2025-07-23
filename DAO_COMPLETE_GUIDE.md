# DAO Registration System - Complete Implementation Guide

## 🎯 Overview

Hệ thống đăng ký thành viên DAO (Decentralized Autonomous Organization) cho phép người dùng nộp đơn xin trở thành thành viên DAO và admin có thể phê duyệt/từ chối đơn.

## 🔧 Backend Implementation

### Database Schema

```sql
-- DaoApplications table
CREATE TABLE DaoApplications (
  application_id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  introduction TEXT NOT NULL,
  experience TEXT NOT NULL,
  areas_of_interest JSON NOT NULL,
  certificate_files JSON DEFAULT '[]',
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  reviewed_by VARCHAR(255) NULL,
  reviewed_at DATETIME NULL,
  rejection_reason TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### API Endpoints

#### User Endpoints

1. **POST /api/dao/register** - Đăng ký DAO member

    - Body: multipart/form-data
    - Fields: fullName, email, introduction, experience, areasOfInterest (JSON), certificates (files)
    - Auth: Required
    - Response: 201 Created

2. **GET /api/dao/my-application** - Xem đơn đăng ký của tôi
    - Auth: Required
    - Response: 200 OK hoặc 404 Not Found

#### Admin Endpoints

3. **GET /api/dao/applications** - Danh sách tất cả đơn đăng ký

    - Query params: page, limit, status
    - Auth: Admin only
    - Response: Paginated list

4. **GET /api/dao/applications/:id** - Chi tiết đơn đăng ký

    - Auth: Admin only
    - Response: Application details

5. **POST /api/dao/applications/:id/approve** - Phê duyệt đơn

    - Auth: Admin only
    - Effect: User role → dao_member

6. **POST /api/dao/applications/:id/reject** - Từ chối đơn
    - Body: { rejectionReason }
    - Auth: Admin only

### File Upload

-   Thư mục: `/uploads/certificates/`
-   Định dạng: PDF, DOC, DOCX, JPG, PNG, GIF
