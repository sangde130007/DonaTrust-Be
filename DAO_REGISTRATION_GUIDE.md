# DAO Registration System Guide

## Overview

This guide explains how to use the DAO (Decentralized Autonomous Organization) member registration system in DonaTrust.

## Backend Implementation

### 1. Database Model

-   **DaoApplication**: Stores DAO member applications
    -   `application_id`: UUID primary key
    -   `user_id`: Reference to User table
    -   `full_name`, `email`: User information
    -   `introduction`: Why they want to join
    -   `experience`: Their charity/DAO experience
    -   `areas_of_interest`: JSON object with selected interests
    -   `certificate_files`: JSON array of uploaded files
    -   `status`: pending/approved/rejected
    -   `reviewed_by`, `reviewed_at`: Admin approval info

### 2. API Endpoints

#### User Endpoints

-   `POST /api/dao/register` - Submit DAO application
-   `GET /api/dao/my-application` - Get my application status

#### Admin Endpoints

-   `GET /api/dao/applications` - List all applications (with pagination/filtering)
-   `GET /api/dao/applications/:id` - Get application details
-   `POST /api/dao/applications/:id/approve` - Approve application
-   `POST /api/dao/applications/:id/reject` - Reject application

### 3. File Upload

-   Supports up to 5 certificate files per application
-   Accepted formats: PDF, DOC, DOCX, JPG, PNG, GIF, WebP
-   Maximum file size: 15MB per file
-   Files stored in `/uploads/certificates/`

### 4. User Role Update

When an application is approved:

-   User's role changes to `dao_member`
-   `dao_approved_at` and `dao_approved_by` fields are updated

## Frontend Implementation

### 1. Registration Form

-   Located at `/dao-registration`
-   Includes all required fields with validation
-   File upload for certificates
-   Real-time character count for text areas

### 2. Form Validation

-   Full name: 2-100 characters, letters and spaces only
-   Email: Valid email format
-   Introduction: Minimum 50 characters
-   Experience: Minimum 50 characters
-   Areas of interest: At least one must be selected
-   Certificate: At least one file required
-   Commitment: Must be checked

### 3. Error Handling

-   Form validation errors shown to user
-   API errors displayed with meaningful messages
-   Loading states during submission

## Testing the System

1. **Start the backend server**

    ```bash
    cd DonaTrust-Be-dev
    npm start
    ```

2. **Create the database table** (if needed)

    ```bash
    node create-dao-table.js
    ```

3. **Test the API endpoints**

    - Register a new DAO application
    - Check application status
    - Admin can approve/reject applications

4. **Frontend testing**
    - Navigate to `/dao-registration`
    - Fill out the form with valid data
    - Submit and verify success message

## Admin Management

Admins can manage DAO applications through:

1. View all pending applications
2. Review application details and uploaded files
3. Approve worthy candidates (upgrades them to DAO member role)
4. Reject applications with reasons

## Security Features

-   Authentication required for all endpoints
-   Role-based access control (admin-only endpoints)
-   File type and size validation
-   Input sanitization and validation
-   Protection against duplicate applications

## Integration Notes

-   The system is fully integrated with existing user management
-   DAO members get special privileges in the application
-   File uploads use the existing upload middleware
-   Follows the same patterns as charity registration system
