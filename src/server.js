const express = require('express');
const sequelize = require('./config/database');
const routes = require('./routes');
const errorMiddleware = require('./middleware/errorMiddleware');
const logger = require('./utils/logger');

const app = express();

app.use(express.json());
app.use('/api', routes);
app.use(errorMiddleware);

sequelize.sync({ force: false }).then(() => {
  app.listen(process.env.PORT, () => {
    logger.info(`Server đang chạy trên cổng ${process.env.PORT}`);
  });
}).catch((err) => {
  logger.error('Lỗi kết nối cơ sở dữ liệu:', err);
});