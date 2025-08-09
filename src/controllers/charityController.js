const { check } = require('express-validator');
const charityService = require('../services/charityService');
const campaignService = require('../services/campaignService');
const financialReportService = require('../services/financialReportService');
const validate = require('../middleware/validationMiddleware');
const { requireCharityOwnership, requireCharity } = require('../middleware/roleMiddleware');
const { uploadQrImage, uploadDocument, handleMulterError } = require('../middleware/uploadMiddleware');
exports.create = [
	check('user_id').notEmpty().withMessage('ID người dùng là bắt buộc'),
	check('name').notEmpty().withMessage('Tên tổ chức là bắt buộc'),
	validate,
	async (req, res, next) => {
		try {
			const charity = await charityService.create(req.body);
			res.status(201).json(charity);
		} catch (error) {
			next(error);
		}
	},
];

exports.getAll = async (req, res, next) => {
	try {
		const charities = await charityService.getAll();
		res.json(charities);
	} catch (error) {
		next(error);
	}
};

exports.getById = async (req, res, next) => {
	try {
		const charity = await charityService.getById(req.params.id);
		res.json(charity);
	} catch (error) {
		next(error);
	}
};

exports.update = [
	check('name').optional().notEmpty().withMessage('Tên tổ chức không được để trống'),
	validate,
	async (req, res, next) => {
		try {
			const charity = await charityService.update(req.params.id, req.body);
			res.json(charity);
		} catch (error) {
			next(error);
		}
	},
];

exports.delete = async (req, res, next) => {
	try {
		await charityService.delete(req.params.id);
		res.json({ message: 'Đã xóa tổ chức từ thiện' });
	} catch (error) {
		next(error);
	}
};

/**
 * @swagger
 * tags:
 *   name: Charity Management
 *   description: API quản lý tổ chức từ thiện
 */

/**
 * @swagger
 * /api/charities/register:
 *   post:
 *     summary: Đăng ký tổ chức từ thiện
 *     tags: [Charity Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - mission
 *               - license_number
 *               - license_document
 *               - address
 *               - city
 *               - phone
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Quỹ từ thiện ABC"
 *               description:
 *                 type: string
 *                 example: "Mô tả về tổ chức"
 *               mission:
 *                 type: string
 *                 example: "Sứ mệnh của tổ chức"
 *               license_number:
 *                 type: string
 *                 example: "123456789"
 *               license_document:
 *                 type: string
 *                 example: "https://example.com/license.pdf"
 *               address:
 *                 type: string
 *                 example: "123 Đường ABC, Quận 1"
 *               city:
 *                 type: string
 *                 example: "TP.HCM"
 *               phone:
 *                 type: string
 *                 example: "0901234567"
 *               email:
 *                 type: string
 *                 example: "contact@charity.org"
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       403:
 *         description: Không có quyền truy cập
 */
exports.registerCharity = [
	requireCharity,
	check('name').isLength({ min: 2, max: 200 }).withMessage('Tên tổ chức phải từ 2-200 ký tự'),
	check('description').notEmpty().withMessage('Mô tả không được để trống'),
	check('mission').notEmpty().withMessage('Sứ mệnh không được để trống'),
	check('license_number').notEmpty().withMessage('Số giấy phép không được để trống'),
	check('license_document').isURL().withMessage('Link giấy phép không hợp lệ'),
	check('address').notEmpty().withMessage('Địa chỉ không được để trống'),
	check('city').notEmpty().withMessage('Thành phố không được để trống'),
	check('phone')
		.matches(/^[0-9]{10,11}$/)
		.withMessage('Số điện thoại phải là 10-11 số'),
	check('email').isEmail().withMessage('Email không hợp lệ'),
	validate,
	async (req, res, next) => {
		try {
			const charity = await charityService.registerCharity(req.user.user_id, req.body);
			res.status(201).json({
				message: 'Đăng ký tổ chức từ thiện thành công, đang chờ xác minh',
				charity,
			});
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/charities/my-charity:
 *   get:
 *     summary: Lấy thông tin tổ chức từ thiện của tôi
 *     tags: [Charity Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin tổ chức từ thiện
 *       404:
 *         description: Chưa đăng ký tổ chức từ thiện
 */
exports.getMyCharity = [
	requireCharity,
	async (req, res, next) => {
		try {
			const charity = await charityService.getMyCharity(req.user.user_id);
			res.json(charity);
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/charities/my-charity:
 *   put:
 *     summary: Cập nhật thông tin tổ chức từ thiện
 *     tags: [Charity Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               mission:
 *                 type: string
 *               vision:
 *                 type: string
 *               website_url:
 *                 type: string
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy tổ chức từ thiện
 */
exports.updateMyCharity = [
	requireCharityOwnership,
	check('name').optional().isLength({ min: 2, max: 200 }).withMessage('Tên tổ chức phải từ 2-200 ký tự'),
	check('email').optional().isEmail().withMessage('Email không hợp lệ'),
	check('phone')
		.optional()
		.matches(/^[0-9]{10,11}$/)
		.withMessage('Số điện thoại phải là 10-11 số'),
	check('website_url').optional().isURL().withMessage('Website URL không hợp lệ'),
	validate,
	async (req, res, next) => {
		try {
			const charity = await charityService.updateMyCharity(req.user.user_id, req.body);
			res.json({
				message: 'Cập nhật thông tin tổ chức thành công',
				charity,
			});
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/charities/stats:
 *   get:
 *     summary: Lấy thống kê tổ chức từ thiện
 *     tags: [Charity Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thống kê tổ chức từ thiện
 */
exports.getCharityStats = [
	requireCharityOwnership,
	async (req, res, next) => {
		try {
			const stats = await charityService.getCharityStats(req.user.user_id);
			res.json(stats);
		} catch (error) {
			next(error);
		}
	},
];

// ============== CAMPAIGN MANAGEMENT ==============

/**
 * @swagger
 * /api/charities/campaigns:
 *   post:
 *     summary: Tạo chiến dịch mới
 *     tags: [Charity Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - goal_amount
 *               - start_date
 *               - end_date
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Chiến dịch hỗ trợ trẻ em nghèo"
 *               description:
 *                 type: string
 *                 example: "Mô tả chi tiết về chiến dịch"
 *               detailed_description:
 *                 type: string
 *                 example: "Câu chuyện đầy đủ..."
 *               goal_amount:
 *                 type: number
 *                 example: 100000000
 *               start_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-08-10"
 *               end_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-12-31"
 *               category:
 *                 type: string
 *                 example: "education"
 *               qr_image:
 *                 type: string
 *                 format: binary
 *                 description: Ảnh QR (tùy chọn). Nếu truyền file này, server sẽ lưu và set qr_code_url.
 *               qr_code_url:
 *                 type: string
 *                 example: "https://example.com/qr.png"
 *                 description: Tùy chọn. Nếu không upload file, có thể truyền URL ảnh QR (không khuyến nghị do bị chặn hotlink).
 *     responses:
 *       201:
 *         description: Tạo chiến dịch thành công
 */
// const upload = require('../middleware/upload');  // cũ

exports.createCampaign = [
  requireCharityOwnership,
  uploadQrImage,            // ⬅️ nhận file 'qr_image'
  handleMulterError,        // ⬅️ (khuyến nghị) bắt lỗi upload sớm

  check('title').isLength({ min: 5, max: 200 }).withMessage('Tiêu đề phải từ 5-200 ký tự'),
  check('description').notEmpty().withMessage('Mô tả không được để trống'),
  check('goal_amount').isFloat({ min: 100000 }).withMessage('Số tiền mục tiêu tối thiểu 100,000 VND'),
  check('start_date').isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
  check('end_date').isISO8601().withMessage('Ngày kết thúc không hợp lệ'),
  check('category').notEmpty().withMessage('Danh mục không được để trống'),
  validate,

  async (req, res, next) => {
    try {
      const campaign = await campaignService.createCampaign(
        req.user.user_id,
        req.body,
        req.file               
      );
      res.status(201).json({ message: 'Tạo chiến dịch thành công, đang chờ duyệt', campaign });
    } catch (error) {
      next(error);
    }
  },
];

/**
 * @swagger
 * /api/charities/campaigns:
 *   get:
 *     summary: Lấy tất cả chiến dịch của tôi
 *     tags: [Charity Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách chiến dịch
 */
exports.getMyCampaigns = [
	requireCharityOwnership,
	async (req, res, next) => {
		try {
			const campaigns = await campaignService.getMyCampaigns(req.user.user_id, req.query);
			res.json(campaigns);
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/charities/campaigns/{id}:
 *   get:
 *     summary: Lấy chi tiết chiến dịch của tôi
 *     tags: [Charity Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID chiến dịch
 *     responses:
 *       200:
 *         description: Chi tiết chiến dịch
 *       404:
 *         description: Không tìm thấy chiến dịch
 */
exports.getMyCampaignById = [
	requireCharityOwnership,
	async (req, res, next) => {
		try {
			const campaign = await campaignService.getMyCampaignById(req.user.user_id, req.params.id);
			res.json(campaign);
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/charities/campaigns/{id}:
 *   put:
 *     summary: Cập nhật chiến dịch
 *     tags: [Charity Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               goal_amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
exports.updateMyCampaign = [
	requireCharityOwnership,
	check('title').optional().isLength({ min: 5, max: 200 }).withMessage('Tiêu đề phải từ 5-200 ký tự'),
	check('goal_amount').optional().isFloat({ min: 100000 }).withMessage('Số tiền mục tiêu tối thiểu 100,000 VND'),
	validate,
	async (req, res, next) => {
		try {
			const campaign = await campaignService.updateMyCampaign(req.user.user_id, req.params.id, req.body);
			res.json({
				message: 'Cập nhật chiến dịch thành công',
				campaign,
			});
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/charities/campaigns/{id}:
 *   delete:
 *     summary: Xóa chiến dịch
 *     tags: [Charity Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
exports.deleteMyCampaign = [
	requireCharityOwnership,
	async (req, res, next) => {
		try {
			const result = await campaignService.deleteMyCampaign(req.user.user_id, req.params.id);
			res.json(result);
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/charities/campaigns/{id}/progress:
 *   post:
 *     summary: Thêm cập nhật tiến độ chiến dịch
 *     tags: [Charity Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Cập nhật tiến độ tháng 1"
 *               content:
 *                 type: string
 *                 example: "Nội dung cập nhật chi tiết"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Thêm cập nhật thành công
 */
exports.addProgressUpdate = [
	requireCharityOwnership,
	check('title').notEmpty().withMessage('Tiêu đề cập nhật không được để trống'),
	check('content').notEmpty().withMessage('Nội dung cập nhật không được để trống'),
	validate,
	async (req, res, next) => {
		try {
			const campaign = await campaignService.addProgressUpdate(req.user.user_id, req.params.id, req.body);
			res.json({
				message: 'Thêm cập nhật tiến độ thành công',
				campaign,
			});
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/charities/campaigns/{id}/stats:
 *   get:
 *     summary: Lấy thống kê chiến dịch
 *     tags: [Charity Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thống kê chiến dịch
 */
exports.getCampaignStats = [
	requireCharityOwnership,
	async (req, res, next) => {
		try {
			const stats = await campaignService.getCampaignStats(req.user.user_id, req.params.id);
			res.json(stats);
		} catch (error) {
			next(error);
		}
	},
];

// ============== FINANCIAL REPORTS ==============

/**
 * @swagger
 * /api/charities/financial-reports:
 *   post:
 *     summary: Tạo báo cáo tài chính
 *     tags: [Charity Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - report_type
 *               - period_start
 *               - period_end
 *             properties:
 *               report_type:
 *                 type: string
 *                 enum: [monthly, quarterly, yearly, campaign, custom]
 *                 example: "monthly"
 *               period_start:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-01"
 *               period_end:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-31"
 *               campaign_id:
 *                 type: string
 *                 description: "Bắt buộc nếu report_type là campaign"
 *     responses:
 *       201:
 *         description: Tạo báo cáo thành công
 */
exports.createFinancialReport = [
	requireCharityOwnership,
	check('report_type')
		.isIn(['monthly', 'quarterly', 'yearly', 'campaign', 'custom'])
		.withMessage('Loại báo cáo không hợp lệ'),
	check('period_start').isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
	check('period_end').isISO8601().withMessage('Ngày kết thúc không hợp lệ'),
	validate,
	async (req, res, next) => {
		try {
			const report = await financialReportService.createFinancialReport(req.user.user_id, req.body);
			res.status(201).json({
				message: 'Tạo báo cáo tài chính thành công',
				report,
			});
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/charities/financial-reports:
 *   get:
 *     summary: Lấy tất cả báo cáo tài chính
 *     tags: [Charity Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: report_type
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Danh sách báo cáo tài chính
 */
exports.getMyFinancialReports = [
	requireCharityOwnership,
	async (req, res, next) => {
		try {
			const reports = await financialReportService.getMyFinancialReports(req.user.user_id, req.query);
			res.json(reports);
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/charities/financial-reports/{id}:
 *   get:
 *     summary: Lấy chi tiết báo cáo tài chính
 *     tags: [Charity Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chi tiết báo cáo tài chính
 */
exports.getMyFinancialReportById = [
	requireCharityOwnership,
	async (req, res, next) => {
		try {
			const report = await financialReportService.getMyFinancialReportById(req.user.user_id, req.params.id);
			res.json(report);
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/charities/financial-reports/{id}:
 *   put:
 *     summary: Cập nhật báo cáo tài chính
 *     tags: [Charity Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               total_expenses:
 *                 type: number
 *               administrative_costs:
 *                 type: number
 *               program_costs:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
exports.updateMyFinancialReport = [
	requireCharityOwnership,
	async (req, res, next) => {
		try {
			const report = await financialReportService.updateMyFinancialReport(
				req.user.user_id,
				req.params.id,
				req.body
			);
			res.json({
				message: 'Cập nhật báo cáo tài chính thành công',
				report,
			});
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/charities/financial-reports/{id}:
 *   delete:
 *     summary: Xóa báo cáo tài chính
 *     tags: [Charity Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
exports.deleteMyFinancialReport = [
	requireCharityOwnership,
	async (req, res, next) => {
		try {
			const result = await financialReportService.deleteMyFinancialReport(req.user.user_id, req.params.id);
			res.json(result);
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/charities/financial-reports/generate:
 *   post:
 *     summary: Tự động tạo báo cáo từ dữ liệu
 *     tags: [Charity Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - report_type
 *               - period_start
 *               - period_end
 *             properties:
 *               report_type:
 *                 type: string
 *                 enum: [monthly, quarterly, yearly, campaign]
 *               period_start:
 *                 type: string
 *                 format: date
 *               period_end:
 *                 type: string
 *                 format: date
 *               campaign_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo báo cáo tự động thành công
 */
exports.generateAutoReport = [
	requireCharityOwnership,
	check('report_type').isIn(['monthly', 'quarterly', 'yearly', 'campaign']).withMessage('Loại báo cáo không hợp lệ'),
	check('period_start').isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
	check('period_end').isISO8601().withMessage('Ngày kết thúc không hợp lệ'),
	validate,
	async (req, res, next) => {
		try {
			const { report_type, period_start, period_end, campaign_id } = req.body;
			const report = await financialReportService.generateAutoReport(
				req.user.user_id,
				report_type,
				period_start,
				period_end,
				campaign_id
			);
			res.status(201).json({
				message: 'Tạo báo cáo tự động thành công',
				report,
			});
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/charities/financial-reports/{id}/submit:
 *   post:
 *     summary: Submit báo cáo để duyệt
 *     tags: [Charity Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Submit báo cáo thành công
 */
exports.submitFinancialReport = [
	requireCharityOwnership,
	async (req, res, next) => {
		try {
			const report = await financialReportService.submitFinancialReport(req.user.user_id, req.params.id);
			res.json({
				message: 'Submit báo cáo tài chính thành công',
				report,
			});
		} catch (error) {
			next(error);
		}
	},
];

/**
 * @swagger
 * /api/charities/financial-overview:
 *   get:
 *     summary: Lấy tổng quan tài chính
 *     tags: [Charity Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Năm cần xem (mặc định là năm hiện tại)
 *     responses:
 *       200:
 *         description: Tổng quan tài chính
 */
exports.getFinancialOverview = [
	requireCharityOwnership,
	async (req, res, next) => {
		try {
			const { year } = req.query;
			const overview = await financialReportService.getFinancialOverview(req.user.user_id, year);
			res.json(overview);
		} catch (error) {
			next(error);
		}
	},
];

// ============== PUBLIC ENDPOINTS ==============

/**
 * @swagger
 * /api/charities:
 *   get:
 *     summary: Lấy danh sách tất cả tổ chức từ thiện (public)
 *     tags: [Charity Management]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách tổ chức từ thiện
 */
exports.getAllCharities = async (req, res, next) => {
	try {
		const charities = await charityService.getAllCharities(req.query);
		res.json(charities);
	} catch (error) {
		next(error);
	}
};

/**
 * @swagger
 * /api/charities/{id}:
 *   get:
 *     summary: Lấy thông tin tổ chức từ thiện theo ID (public)
 *     tags: [Charity Management]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông tin tổ chức từ thiện
 *       404:
 *         description: Không tìm thấy tổ chức từ thiện
 */
exports.getCharityById = async (req, res, next) => {
	try {
		const charity = await charityService.getCharityById(req.params.id);
		res.json(charity);
	} catch (error) {
		next(error);
	}
};

// ============== DOCUMENT UPLOAD ==============

/**
 * @swagger
 * /api/charities/upload-document:
 *   post:
 *     summary: Upload tài liệu cho tổ chức từ thiện
 *     tags: [Charity Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: File tài liệu (PDF, DOC, DOCX, hoặc ảnh, tối đa 20MB)
 *               document_type:
 *                 type: string
 *                 enum: [license, certificate, financial_report, other]
 *                 description: Loại tài liệu
 *               description:
 *                 type: string
 *                 description: Mô tả tài liệu
 *     responses:
 *       200:
 *         description: Upload tài liệu thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 document_url:
 *                   type: string
 *                 charity:
 *                   type: object
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy tổ chức từ thiện
 */

exports.uploadDocument = [
  requireCharityOwnership,
  uploadDocument,              // ✅ middleware sẵn có từ upload.js
  handleMulterError,           // ✅ nên kẹp để bắt lỗi Multer gọn
  async (req, res, next) => {
    try {
      const result = await charityService.uploadDocument(req.user.user_id, req.file, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
];
