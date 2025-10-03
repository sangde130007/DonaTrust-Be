const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'DonaTrust API',
			version: '1.0.0',
			description: 'API documentation for DonaTrust charity donation management system',
			contact: {
				name: 'DonaTrust Team',
				email: 'support@donatrust.com',
			},
		},
		servers: [
			{
				url:
					process.env.NODE_ENV === 'production'
						? 'https://api.donastrust.com'
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
						user_id: { type: 'string', example: 'user_123456789' },
						full_name: { type: 'string', example: 'Nguyễn Văn A' },
						email: { type: 'string', format: 'email', example: 'user@example.com' },
						phone: { type: 'string', example: '0901234567' },
						role: {
							type: 'string',
							enum: ['donor', 'charity', 'admin', 'dao_member'],
							example: 'donor',
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
				Error: {
					type: 'object',
					properties: {
						error: { type: 'string', example: 'Error message' },
						details: { type: 'string', example: 'Detailed error information' },
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
	apis: ['./src/routes/*.js', './src/controllers/*.js'], // Paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

module.exports = {
	specs,
	swaggerUi,
};
