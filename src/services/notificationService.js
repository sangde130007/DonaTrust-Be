// src/services/notificationService.js
const { Op } = require('sequelize');
const Notification = require('../models/Notification');
const { AppError } = require('../utils/errorHandler');

/* ===================== Helpers ===================== */
function buildFilters({ search, type, is_read }) {
  const where = {};
  if (type) where.type = type;
  if (typeof is_read === 'boolean') where.is_read = is_read;
  if (search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { content: { [Op.iLike]: `%${search}%` } },
    ];
  }
  return where;
}

function buildPaging({ page = 1, limit = 20 }) {
  const p = Math.max(parseInt(page, 10) || 1, 1);
  const l = Math.max(parseInt(limit, 10) || 20, 1);
  return { offset: (p - 1) * l, limit: l, page: p };
}

/* ===================== Create ===================== */
exports.create = async (data, options = {}) => {
  // data: { user_id, title, content, type, campaign_id, created_at, is_read }
  // options: { transaction }
  return await Notification.create(data, options);
};

/* ===================== Admin – getAll ===================== */
exports.getAll = async (opts = {}) => {
  const { page, limit } = buildPaging(opts);
  const where = buildFilters(opts);

  const { rows, count } = await Notification.findAndCountAll({
    where,
    offset: (page - 1) * limit,
    limit,
    order: [['created_at', 'DESC']],
  });

  return {
    items: rows,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  };
};

/* ===================== By User ===================== */
exports.getForUser = async (userId, opts = {}) => {
  const { page, limit } = buildPaging(opts);
  const where = { user_id: userId, ...buildFilters(opts) };
  const order = opts.order === 'oldest' ? 'ASC' : 'DESC';

  const { rows, count } = await Notification.findAndCountAll({
    where,
    offset: (page - 1) * limit,
    limit,
    order: [['created_at', order]],
  });

  return {
    items: rows,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  };
};

exports.getById = async (id) => {
  const n = await Notification.findByPk(id);
  if (!n) throw new AppError('Không tìm thấy thông báo', 404);
  return n;
};

exports.getByIdOwned = async (id, userId) => {
  return await Notification.findOne({ where: { noti_id: id, user_id: userId } });
};

exports.update = async (id, data) => {
  const n = await Notification.findByPk(id);
  if (!n) throw new AppError('Không tìm thấy thông báo', 404);
  await n.update(data);
  return n;
};

exports.updateOwned = async (id, userId, data) => {
  const n = await Notification.findOne({ where: { noti_id: id, user_id: userId } });
  if (!n) throw new AppError('Không tìm thấy thông báo', 404);
  await n.update(data);
  return n;
};

exports.delete = async (id) => {
  const n = await Notification.findByPk(id);
  if (!n) throw new AppError('Không tìm thấy thông báo', 404);
  await n.destroy();
  return true;
};

exports.deleteOwned = async (id, userId) => {
  const n = await Notification.findOne({ where: { noti_id: id, user_id: userId } });
  if (!n) return false;
  await n.destroy();
  return true;
};

exports.markRead = async (id, userId) => {
  const n = await Notification.findOne({ where: { noti_id: id, user_id: userId } });
  if (!n) return null;
  if (!n.is_read) await n.update({ is_read: true });
  return n;
};

exports.markAllRead = async (userId) => {
  const [affected] = await Notification.update(
    { is_read: true },
    { where: { user_id: userId, is_read: false } }
  );
  return affected;
};

exports.countUnread = async (userId) => {
  return await Notification.count({ where: { user_id: userId, is_read: false } });
};
