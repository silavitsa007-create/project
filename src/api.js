// เรียก API ผ่าน path เดียวกับที่เว็บรันอยู่ (Node.js Serverless Function
// อยู่ในโปรเจกต์ Vercel เดียวกันเลย ไม่ต้องข้ามโดเมน ไม่มีปัญหา CORS)
const API_BASE = '/api';

// ที่อยู่ไฟล์รูปภาพ (โลโก้/ปกหนังสือ) เก็บอยู่ใน Supabase Storage bucket ชื่อ "uploads"
// เปลี่ยนตัวเลข/ชื่อโปรเจกต์ให้ตรงกับของคุณถ้าย้าย Supabase project ในอนาคต
export const ASSET_BASE = 'https://kvvtsjylohwjmdznlrke.supabase.co/storage/v1/object/public/books';

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
    apiFetch('/auth', { method: 'POST', body: JSON.stringify({ action: 'register', ...payload }) }),

  login: (payload) =>
    apiFetch('/auth', { method: 'POST', body: JSON.stringify({ action: 'login', ...payload }) }),

  logout: () => apiFetch('/auth', { method: 'POST', body: JSON.stringify({ action: 'logout' }) }),

  me: () => apiFetch('/auth?action=me'),

  getBooks: (keyword = '', categoryId = '') => {
    const params = new URLSearchParams();
    params.set('action', 'list');
    if (keyword) params.set('keyword', keyword);
    if (categoryId) params.set('category_id', categoryId);
    return apiFetch(`/books?${params.toString()}`);
  },

  getBookDetail: (bookId) => apiFetch(`/books?action=detail&id=${bookId}`),

  requestBorrow: (bookId, requestedDays) =>
    apiFetch('/borrow', {
      method: 'POST',
      body: JSON.stringify({ action: 'request', book_id: bookId, requested_days: requestedDays }),
    }),

  myBorrows: () => apiFetch('/borrow?action=my'),

  getProfile: () => apiFetch('/profile'),

  updateProfile: (payload) =>
    apiFetch('/profile', { method: 'POST', body: JSON.stringify(payload) }),

  adminDashboard: () => apiFetch('/admin?resource=dashboard'),

  adminBorrowRequests: () => apiFetch('/admin?resource=borrow-requests'),

  adminDecideBorrow: (borrowId, action) =>
    apiFetch('/admin', {
      method: 'POST',
      body: JSON.stringify({ resource: 'borrow-requests', borrow_id: borrowId, action }),
    }),

  adminReturns: () => apiFetch('/admin?resource=returns'),

  adminMarkReturned: (borrowId) =>
    apiFetch('/admin', { method: 'POST', body: JSON.stringify({ resource: 'returns', borrow_id: borrowId }) }),

  adminGetBooks: () => apiFetch('/admin?resource=books'),

  adminAddBook: (payload) =>
    apiFetch('/admin', { method: 'POST', body: JSON.stringify({ resource: 'books', action: 'create', ...payload }) }),

  adminUpdateBook: (payload) =>
    apiFetch('/admin', { method: 'POST', body: JSON.stringify({ resource: 'books', action: 'update', ...payload }) }),

  adminDeleteBook: (bookId) =>
    apiFetch('/admin', { method: 'POST', body: JSON.stringify({ resource: 'books', action: 'delete', book_id: bookId }) }),

  adminGetCategories: () => apiFetch('/admin?resource=categories'),

  adminAddCategory: (categoryName) =>
    apiFetch('/admin', { method: 'POST', body: JSON.stringify({ resource: 'categories', category_name: categoryName }) }),

  adminDeleteCategory: (categoryId) =>
    apiFetch('/admin', { method: 'DELETE', body: JSON.stringify({ resource: 'categories', category_id: categoryId }) }),

  adminUploadCover: (bookId, file) => {
    const formData = new FormData();
    formData.append('book_id', bookId);
    formData.append('cover_image', file);
    return apiFetchForm('/admin', formData);
  },

  adminGetUsers: () => apiFetch('/admin?resource=users'),

  adminUpdateUser: (payload) =>
    apiFetch('/admin', { method: 'POST', body: JSON.stringify({ resource: 'users', action: 'update', ...payload }) }),

  adminToggleUserStatus: (userId) =>
    apiFetch('/admin', { method: 'POST', body: JSON.stringify({ resource: 'users', action: 'toggle_status', user_id: userId }) }),

  adminToggleUserRole: (userId) =>
    apiFetch('/admin', { method: 'POST', body: JSON.stringify({ resource: 'users', action: 'toggle_role', user_id: userId }) }),

  adminDeleteUser: (userId) =>
    apiFetch('/admin', { method: 'POST', body: JSON.stringify({ resource: 'users', action: 'delete', user_id: userId }) }),
};
