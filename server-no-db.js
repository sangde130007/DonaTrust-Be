const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./src/routes');
const errorMiddleware = require('./src/middleware/errorMiddleware');
const logger = require('./src/utils/logger');
const dotenv = require('dotenv');

// Swagger setup
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

dotenv.config();

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
				
				⚠️ **DEMO MODE**: Running without database connection
				
				## Authentication
				Most endpoints require authentication using JWT tokens.
				Include the token in the Authorization header: \`Bearer <token>\`
				
				## Available Features
				- API structure and routing
				- Swagger documentation
				- Basic endpoint testing
				- Static file serving
			`,
			contact: {
				name: 'DonaTrust Team',
				email: 'support@donatrust.com',
			},
		},
		servers: [
			{
				url: `http://localhost:${process.env.PORT || 3000}`,
				description: 'Demo server (no database)',
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
		origin: '*',
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		credentials: true,
	})
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
		customSiteTitle: 'DonaTrust API Documentation (Demo Mode)',
		customfavIcon: '/favicon.ico',
	})
);

// Health check
app.get('/', (req, res) => {
	res.json({
		message: 'DonaTrust API is running (Demo Mode - No Database)',
		version: '1.0.0',
		documentation: `/api-docs`,
		timestamp: new Date().toISOString(),
		environment: 'demo',
		features: {
			database: false,
			authentication: false,
			fileUpload: true,
			swagger: true,
			routing: true,
		},
		setup_instructions: [
			'This is a demo mode without database connection',
			'To enable full functionality:',
			'1. Install PostgreSQL',
			'2. Update .env with correct database credentials',
			'3. Run: node setup-database.js',
			'4. Start with: npm run dev',
		],
	});
});

// Mock data for demo endpoints
app.get('/api/campaigns', (req, res) => {
	res.json({
		campaigns: [],
		total: 0,
		message: 'Demo mode - no database connection. Please setup PostgreSQL to see real data.',
	});
});

app.get('/api/campaigns/categories', (req, res) => {
	res.json([
		{ id: 'education', name: 'Giáo dục', icon: '🎓' },
		{ id: 'health', name: 'Y tế', icon: '🏥' },
		{ id: 'environment', name: 'Môi trường', icon: '🌱' },
		{ id: 'poverty', name: 'Xóa đói giảm nghèo', icon: '🍚' },
		{ id: 'disaster', name: 'Cứu trợ thiên tai', icon: '🆘' },
	]);
});

app.get('/api/charities', (req, res) => {
	res.json({
		charities: [],
		total: 0,
		message: 'Demo mode - no database connection',
	});
});

// Catch all API routes that require database
app.use('/api', (req, res, next) => {
	if (req.method === 'GET' && req.path.includes('/api-docs')) {
		return next();
	}

	res.status(503).json({
		status: 'error',
		message: 'Database not available in demo mode',
		endpoint: req.path,
		method: req.method,
		setup_required: 'Please run: node setup-database.js to enable full functionality',
	});
});

// Error handling middleware
app.use(errorMiddleware);

// Server start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log('\n🚀 DonaTrust API Demo Server Started');
	console.log('=====================================');
	console.log(`📡 Server running on: http://localhost:${PORT}`);
	console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
	console.log(`⚠️  Demo Mode: No database connection`);
	console.log('\n🔧 To enable full functionality:');
	console.log('1. Install PostgreSQL');
	console.log('2. Update .env with correct credentials');
	console.log('3. Run: node setup-database.js');
	console.log('4. Start with: npm run dev\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
	console.log('🛑 Shutting down demo server...');
	process.exit(0);
});

process.on('uncaughtException', (err) => {
	console.error('💥 Uncaught Exception:', err);
	process.exit(1);
});

process.on('unhandledRejection', (err) => {
	console.error('💥 Unhandled Rejection:', err);
	process.exit(1);
});
