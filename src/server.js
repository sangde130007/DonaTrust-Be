
     const express = require('express');
     const cors = require('cors');
     const sequelize = require('./config/database');
     const routes = require('./routes');
     const errorMiddleware = require('./middleware/errorMiddleware');
     const logger = require('./utils/logger');
     const dotenv = require('dotenv');

     dotenv.config();

     const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT', 'JWT_SECRET', 'PORT', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_VERIFICATION_URL'];
     const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);
     if (missingEnvVars.length > 0) {
       logger.error(`Thiếu các biến môi trường: ${missingEnvVars.join(', ')}`);
       process.exit(1);
     }

     const app = express();

     app.use(cors({
       origin: ['http://localhost:3001'],
       methods: ['GET', 'POST', 'PUT', 'DELETE'],
       allowedHeaders: ['Content-Type', 'Authorization'],
     }));
     app.use(express.json());

     app.get('/', (req, res) => {
       res.json({ message: 'Donatrust API is running' });
     });

     app.use('/api', routes);
     app.use(errorMiddleware);

     sequelize.authenticate()
       .then(() => {
         logger.info('Kết nối cơ sở dữ liệu thành công');
         return sequelize.sync({ force: false });
       })
       .then(() => {
         app.listen(process.env.PORT, () => {
           logger.info(`Server đang chạy trên cổng ${process.env.PORT}`);
         });
       })
       .catch((err) => {
         logger.error('Lỗi khởi động server:', err);
         process.exit(1);
       });
