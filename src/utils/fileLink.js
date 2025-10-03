// utils/fileLink.js
const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'http://localhost:5000';

export const toAbsoluteFileUrl = (u) => {
  if (!u) return '';
  let s = String(u).trim().replace(/\\/g, '/');
  
  // Full URL (including Cloudinary URLs)
  if (/^https?:\/\//i.test(s)) return s;
  
  // Legacy local paths (for backward compatibility)
  if (s.startsWith('/uploads/')) return `${API_ORIGIN}${s}`;
  
  // Relative paths - assume they need API origin
  if (!s.startsWith('/')) s = `/uploads/${s}`;
  
  return `${API_ORIGIN}${s}`;
};

export const getExt = (url) => {
  const clean = url.split('?')[0].split('#')[0];
  const m = clean.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : '';
};

export const isImageExt = (ext) => ['png','jpg','jpeg','gif','webp','svg'].includes(ext);
export const isWordExt  = (ext) => ['doc','docx'].includes(ext);
