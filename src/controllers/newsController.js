const { Op } = require('sequelize');
const News = require('../models/News');
const { AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/* ================================
   TTL view cache (in-memory)
   Key: news_id|viewerKey  -> expiresAt (ms)
   TTL mặc định: 24h
================================== */
const VIEW_TTL_MS = 24 * 60 * 60 * 1000;
const viewCache = new Map();

// Dọn rác định kỳ mỗi 10 phút
setInterval(() => {
  const now = Date.now();
  for (const [k, expiresAt] of viewCache.entries()) {
    if (expiresAt <= now) viewCache.delete(k);
  }
}, 10 * 60 * 1000);

// Chuẩn hoá IP (tách x-forwarded-for)
function getClientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (xf) return xf.split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

// Tạo viewer key: ưu tiên user_id, fallback IP+UA
function getViewerKey(req) {
  if (req.user?.user_id) return `u:${req.user.user_id}`;
  const ip = getClientIp(req);
  const ua = req.headers['user-agent'] || 'ua';
  return `g:${ip}|${ua}`;
}

// Kiểm tra đã tính view trong TTL chưa
function hasCounted(newsId, viewerKey) {
  const key = `${newsId}|${viewerKey}`;
  const expiresAt = viewCache.get(key);
  return expiresAt && expiresAt > Date.now();
}

// Đánh dấu đã tính view
function markCounted(newsId, viewerKey, ttl = VIEW_TTL_MS) {
  const key = `${newsId}|${viewerKey}`;
  viewCache.set(key, Date.now() + ttl);
}

/* ================================
   Controllers
================================== */

// GET /news
exports.getPublishedNews = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      tag,
      date_from,
      date_to,
      sort = 'published_at_desc',
    } = req.query;

    const where = { status: 'published' };

    if (category) where.category = category;
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
        { summary: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (tag) {
      // tags: ARRAY(TEXT) -> dùng @> để chứa phần tử
      where.tags = { [Op.contains]: [tag] };
    }
    if (date_from || date_to) {
      where.published_at = {};
      if (date_from) where.published_at[Op.gte] = new Date(date_from);
      if (date_to) where.published_at[Op.lte] = new Date(date_to);
    }

    // Sắp xếp
    const sortMap = {
      'published_at_desc': ['published_at', 'DESC'],
      'published_at_asc': ['published_at', 'ASC'],
      'views_desc': ['views', 'DESC'],
      'views_asc': ['views', 'ASC'],
      'title_asc': ['title', 'ASC'],
      'title_desc': ['title', 'DESC'],
      'priority_desc': ['priority', 'DESC'],
      'priority_asc': ['priority', 'ASC'],
    };
    const order = [sortMap[sort] || ['published_at', 'DESC']];

    const offset = (Number(page) - 1) * Number(limit);

    const { rows, count } = await News.findAndCountAll({
      where,
      order: [order],
      limit: Number(limit),
      offset: Number(offset),
    });

    res.json({
      news: rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        totalPages: Math.ceil(count / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /news/featured
exports.getFeaturedNews = async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;
    const rows = await News.findAll({
      where: { status: 'published', featured: true },
      order: [['published_at', 'DESC']],
      limit: Number(limit),
    });
    res.json({ news: rows });
  } catch (err) {
    next(err);
  }
};

// GET /news/categories
exports.getNewsCategories = async (_req, res, next) => {
  try {
    // Nếu muốn lấy động từ DB có thể dùng raw query DISTINCT.
    res.json([
      'announcement',
      'update',
      'campaign',
      'charity',
      'system',
    ]);
  } catch (err) {
    next(err);
  }
};

// GET /news/:id
exports.getNewsById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await News.findOne({
      where: { news_id: id, status: 'published' },
    });
    if (!item) throw new AppError('Không tìm thấy tin tức', 404);

    res.json(item);
  } catch (err) {
    next(err);
  }
};

// POST/PUT /news/:id/view
exports.incrementNewsViews = async (req, res, next) => {
  try {
    const { id } = req.params;

    // tồn tại?
    const item = await News.findByPk(id);
    if (!item || item.status !== 'published') {
      throw new AppError('Không tìm thấy tin tức', 404);
    }

    const viewerKey = getViewerKey(req);

    // Nếu đã đếm trong 24h -> trả về views hiện tại
    if (hasCounted(id, viewerKey)) {
      return res.json({ views: item.views });
    }

    // Tăng view an toàn
    await News.increment('views', { where: { news_id: id } });

    // Đánh dấu đã đếm
    markCounted(id, viewerKey);

    // Lấy lại số view mới
    const updated = await News.findByPk(id, { attributes: ['news_id', 'views'] });
    res.json({ views: updated.views });
  } catch (err) {
    next(err);
  }
};
