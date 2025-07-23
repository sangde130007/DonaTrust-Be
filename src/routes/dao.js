const express = require('express');
const router = express.Router();
const daoController = require('../controllers/daoController');
const { uploadCertificates, handleMulterError } = require('../middleware/uploadMiddleware');

/**
 * @swagger
 * tags:
 *   name: DAO Management
 *   description: API quản lý DAO member applications
 */

// DAO application routes
router.post('/register', uploadCertificates, handleMulterError, daoController.registerDao);
router.get('/my-application', daoController.getMyApplication);

// Admin routes for managing DAO applications
router.get('/applications', daoController.getAllApplications);
router.get('/applications/:id', daoController.getApplicationById);
router.post('/applications/:id/approve', daoController.approveApplication);
router.post('/applications/:id/reject', daoController.rejectApplication);

module.exports = router; 