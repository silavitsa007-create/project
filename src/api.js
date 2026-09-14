// เรียก API ผ่าน path เดียวกับที่เว็บรันอยู่ (Node.js Serverless Function
// อยู่ในโปรเจกต์ Vercel เดียวกันเลย ไม่ต้องข้ามโดเมน ไม่มีปัญหา CORS)
const API_BASE = '/api';

// ที่อยู่ไฟล์รูปภาพ (โลโก้/ปกหนังสือ) เก็บอยู่ใน Supabase Storage bucket ชื่อ "uploads"
// เปลี่ยนตัวเลข/ชื่อโปรเจกต์ให้ตรงกับของคุณถ้าย้าย Supabase project ในอนาคต
export const ASSET_BASE = 'https://kvvtsjylohwjmdznlrke.supabase.co/storage/v1/object/public/uploads';

/**
 * เรียก API กลาง แนบ token อัตโนมัติถ้ามี (เก็บไว้ใน localStorage)
 */
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (networkErr) {
    throw new Error('Network error: ' + networkErr.message);
  }

  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      throw new Error(`ไม่ใช่ JSON (status ${res.status}): ${text.slice(0, 300)}`);
    }
  }

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status} error (ไม่มีข้อความ error จากเซิร์ฟเวอร์)`);
  }
  return data;
}

/**
 * เรียก API แบบส่งไฟล์ (multipart/form-data) — ไม่ตั้ง Content-Type เอง
 * เพราะเบราว์เซอร์ต้องเป็นคนกำหนด boundary ให้อัตโนมัติ
 */
async function apiFetchForm(path, formData) {
  const token = localStorage.getItem('token');

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'เกิดข้อผิดพลาด');
  }
  return data;
}

export const api = {
  register: (payload) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  login: (payload) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),

  logout: () => apiFetch('/auth/logout', { method: 'POST' }),

  me: () => apiFetch('/auth/me'),

  getBooks: (keyword = '', categoryId = '') => {
    const params = new URLSearchParams();
    if (keyword) params.set('keyword', keyword);
    if (categoryId) params.set('category_id', categoryId);
    return apiFetch(`/books/list?${params.toString()}`);
  },

  getBookDetail: (bookId) => apiFetch(`/books/detail?id=${bookId}`),

  requestBorrow: (bookId, requestedDays) =>
    apiFetch('/borrow/request', {
      method: 'POST',
      body: JSON.stringify({ book_id: bookId, requested_days: requestedDays }),
    }),

  myBorrows: () => apiFetch('/borrow/my'),

  getProfile: () => apiFetch('/profile'),

  updateProfile: (payload) =>
    apiFetch('/profile', { method: 'POST', body: JSON.stringify(payload) }),

  adminDashboard: () => apiFetch('/admin/dashboard'),

  adminBorrowRequests: () => apiFetch('/admin/borrow-requests'),

  adminDecideBorrow: (borrowId, action) =>
    apiFetch('/admin/borrow-requests', {
      method: 'POST',
      body: JSON.stringify({ borrow_id: borrowId, action }),
    }),

  adminReturns: () => apiFetch('/admin/returns'),

  adminMarkReturned: (borrowId) =>
    apiFetch('/admin/returns', { method: 'POST', body: JSON.stringify({ borrow_id: borrowId }) }),

  adminGetBooks: () => apiFetch('/admin/books'),

  adminAddBook: (payload) =>
    apiFetch('/admin/books', { method: 'POST', body: JSON.stringify({ action: 'create', ...payload }) }),

  adminUpdateBook: (payload) =>
    apiFetch('/admin/books', { method: 'POST', body: JSON.stringify({ action: 'update', ...payload }) }),

  adminDeleteBook: (bookId) =>
    apiFetch('/admin/books', { method: 'POST', body: JSON.stringify({ action: 'delete', book_id: bookId }) }),

  adminGetCategories: () => apiFetch('/admin/categories'),

  adminAddCategory: (categoryName) =>
    apiFetch('/admin/categories', { method: 'POST', body: JSON.stringify({ category_name: categoryName }) }),

  adminDeleteCategory: (categoryId) =>
    apiFetch('/admin/categories', { method: 'DELETE', body: JSON.stringify({ category_id: categoryId }) }),

  adminUploadCover: (bookId, file) => {
    const formData = new FormData();
    formData.append('book_id', bookId);
    formData.append('cover_image', file);
    return apiFetchForm('/admin/upload-cover', formData);
  },

  adminGetUsers: () => apiFetch('/admin/users'),

  adminUpdateUser: (payload) =>
    apiFetch('/admin/users', { method: 'POST', body: JSON.stringify({ action: 'update', ...payload }) }),

  adminToggleUserStatus: (userId) =>
    apiFetch('/admin/users', { method: 'POST', body: JSON.stringify({ action: 'toggle_status', user_id: userId }) }),

  adminToggleUserRole: (userId) =>
    apiFetch('/admin/users', { method: 'POST', body: JSON.stringify({ action: 'toggle_role', user_id: userId }) }),

  adminDeleteUser: (userId) =>
    apiFetch('/admin/users', { method: 'POST', body: JSON.stringify({ action: 'delete', user_id: userId }) }),
};
