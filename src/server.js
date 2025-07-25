const express = require('express');
const cors = require('cors');
const path = require('path');
const sequelize = require('./config/database');
const routes = require('./routes');
const errorMiddleware = require('./middleware/errorMiddleware');
const logger = require('./utils/logger');
const dotenv = require('dotenv');

// Import models và associations
require('./models/associations');

// Create upload directories
const fs = require('fs');
const createUploadDirs = () => {
	const uploadDirs = [
		path.join(__dirname, '../uploads'),
		path.join(__dirname, '../uploads/avatars'),
		path.join(__dirname, '../uploads/campaigns'),
		path.join(__dirname, '../uploads/documents'),
		path.join(__dirname, '../uploads/reports'),
	];

	uploadDirs.forEach((dir) => {
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
			logger.info(`Created upload directory: ${dir}`);
		}
	});
};

// Swagger setup
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

dotenv.config();

const requiredEnvVars = [
	'DB_HOST',
	'DB_USER',
	'DB_NAME',
	'DB_PORT',
	'JWT_SECRET',
	'PORT',
	// Optional env vars - không require
	// 'DB_PASSWORD', // MySQL có thể không cần password
	// 'GOOGLE_CLIENT_ID',
	// 'GOOGLE_CLIENT_SECRET',
	// 'EMAIL_USER',
	// 'EMAIL_PASS',
	// 'EMAIL_VERIFICATION_URL',
];

const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingEnvVars.length > 0) {
	logger.error(`Thiếu các biến môi trường: ${missingEnvVars.join(', ')}`);
	process.exit(1);
}

const app = express();

// Swagger configuration
const swaggerOptions = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'DonaTrust API',
			version: '1.0.0',
			description: `
				API documentation for DonaTrust charity donation management system
				
				## Authentication
				Most endpoints require authentication using JWT tokens.
				Include the token in the Authorization header: \`Bearer <token>\`
				
				## Roles
				- **donor**: Người dùng cá nhân có thể donate
				- **charity**: Tổ chức từ thiện có thể tạo campaigns và quản lý
				- **admin**: Quản trị viên có thể quản lý toàn bộ hệ thống
				- **dao_member**: Thành viên DAO có quyền vote
			`,
			contact: {
				name: 'DonaTrust Team',
				email: 'support@donatrust.com',
			},
		},
		servers: [
			{
				url:
					process.env.NODE_ENV === 'production'
						? 'https://api.donatrust.com'
						: `http://localhost:${process.env.PORT || 3000}`,
				description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
			},
		],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT',
				},
			},
			schemas: {
				User: {
					type: 'object',
					properties: {
						user_id: {
							type: 'string',
							example: 'user_lkj3h2g1h2k3',
							description: 'ID tự động sinh, duy nhất cho mỗi user',
						},
						full_name: { type: 'string', example: 'Nguyễn Văn A' },
						email: { type: 'string', format: 'email', example: 'user@example.com' },
						phone: { type: 'string', example: '0901234567' },
						role: {
							type: 'string',
							enum: ['donor', 'charity', 'admin', 'dao_member'],
							example: 'donor',
							description: 'Mặc định là donor (người dùng cá nhân)',
						},
						status: {
							type: 'string',
							enum: ['active', 'inactive', 'banned'],
							example: 'active',
						},
						profile_image: { type: 'string', example: 'https://example.com/image.jpg' },
						district: { type: 'string', example: 'Quận 1' },
						ward: { type: 'string', example: 'Phường Bến Nghé' },
						address: { type: 'string', example: '123 Đường ABC' },
						date_of_birth: { type: 'string', format: 'date', example: '1990-01-01' },
						gender: { type: 'string', enum: ['male', 'female', 'other'], example: 'male' },
						bio: { type: 'string', example: 'Mô tả về bản thân' },
						email_verified: { type: 'boolean', example: true },
						phone_verified: { type: 'boolean', example: false },
						created_at: { type: 'string', format: 'date-time' },
						updated_at: { type: 'string', format: 'date-time' },
					},
				},
				Charity: {
					type: 'object',
					properties: {
						charity_id: { type: 'string', format: 'uuid' },
						name: { type: 'string', example: 'Quỹ từ thiện ABC' },
						description: { type: 'string' },
						mission: { type: 'string' },
						license_number: { type: 'string' },
						address: { type: 'string' },
						city: { type: 'string' },
						phone: { type: 'string' },
						email: { type: 'string', format: 'email' },
						website_url: { type: 'string', format: 'uri' },
						verification_status: {
							type: 'string',
							enum: ['pending', 'verified', 'rejected'],
						},
						total_received: { type: 'number' },
						active_campaigns: { type: 'integer' },
						rating: { type: 'number', minimum: 0, maximum: 5 },
					},
				},
				Campaign: {
					type: 'object',
					properties: {
						campaign_id: { type: 'string', format: 'uuid' },
						title: { type: 'string', example: 'Chiến dịch hỗ trợ trẻ em' },
						description: { type: 'string' },
						goal_amount: { type: 'number', example: 100000000 },
						current_amount: { type: 'number', example: 50000000 },
						start_date: { type: 'string', format: 'date' },
						end_date: { type: 'string', format: 'date' },
						category: { type: 'string', example: 'education' },
						status: {
							type: 'string',
							enum: ['active', 'completed', 'pending', 'paused', 'cancelled'],
						},
						approval_status: {
							type: 'string',
							enum: ['pending', 'approved', 'rejected'],
						},
						charity: {
							type: 'object',
							properties: {
								name: { type: 'string' },
								logo_url: { type: 'string' },
							},
						},
					},
				},
				Error: {
					type: 'object',
					properties: {
						status: { type: 'string', example: 'error' },
						message: { type: 'string', example: 'Error message' },
						details: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									field: { type: 'string', example: 'email' },
									message: { type: 'string', example: 'Email không hợp lệ' },
									value: { type: 'string', example: 'invalid-email' },
								},
							},
						},
					},
				},
			},
		},
		security: [
			{
				bearerAuth: [],
			},
		],
	},
	apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const specs = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(
	cors({
		origin: '*', // Mở toàn bộ CORS
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		credentials: true,
	})
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Documentation
app.use(
	'/api-docs',
	swaggerUi.serve,
	swaggerUi.setup(specs, {
		explorer: true,
		customCss: `
			.swagger-ui .topbar { display: none }
			.swagger-ui .info { margin: 20px 0; }
			.swagger-ui .info .title { color: #2c5aa0; }
		`,
		customSiteTitle: 'DonaTrust API Documentation',
		customfavIcon: '/favicon.ico',
	})
);

// Health check
app.get('/', (req, res) => {
	res.json({
		message: 'DonaTrust API is running',
		version: '1.0.0',
		documentation: `/api-docs`,
		timestamp: new Date().toISOString(),
		environment: process.env.NODE_ENV || 'development',
	});
});

// API routes
app.use('/api', routes);

// Error handling middleware
app.use(errorMiddleware);

// Database connection and server start
sequelize
	.authenticate()
	.then(async () => {
		logger.info('Kết nối cơ sở dữ liệu thành công');

		// Create upload directories
		createUploadDirs();

		// Sync database - chỉ tạo tables nếu chưa tồn tại
		await sequelize.sync({ force: false, alter: false });

		// Update schema with new fields (development mode)
		if (process.env.NODE_ENV === 'development') {
			try {
				const { updateDatabaseSchema } = require('./utils/updateSchema');
				await updateDatabaseSchema();
			} catch (error) {
				logger.warn('Schema update failed (this may be normal if already updated):', error.message);
			}
		}
	})
	.then(async () => {
		const PORT = process.env.PORT || 3000;
		app.listen(PORT, () => {
			logger.info(`Server đang chạy trên cổng ${PORT}`);
			logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
			logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
		});

		// Tạo sample data nếu là development và chưa có dữ liệu
		if (process.env.NODE_ENV === 'development') {
			const { createSampleData } = require('./utils/seeders');
			const User = require('./models/User');
			const userCount = await User.count();
			if (userCount === 0) {
				logger.info('Tạo dữ liệu mẫu...');
				createSampleData();
			} else {
				logger.info('Dữ liệu đã tồn tại, bỏ qua tạo dữ liệu mẫu');
			}
		}
	})
	.catch((err) => {
		logger.error('Lỗi khởi động server:', err);
		process.exit(1);
	});

// Graceful shutdown
process.on('SIGTERM', () => {
	logger.info('Đang tắt server...');
	sequelize.close().then(() => {
		logger.info('Đã đóng kết nối database');
		process.exit(0);
	});
});

process.on('uncaughtException', (err) => {
	logger.error('Uncaught Exception:', err);
	process.exit(1);
});

process.on('unhandledRejection', (err) => {
	logger.error('Unhandled Rejection:', err);
	process.exit(1);
});
