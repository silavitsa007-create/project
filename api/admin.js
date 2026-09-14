import { supabase } from '../lib/supabase.js';
import { requireAdminAuth } from '../lib/auth.js';
import { IncomingForm } from 'formidable';

export const config = {
  api: { bodyParser: false },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function readJsonBody(req) {
  const raw = await readRawBody(req);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

// ===================== Dashboard =====================
async function handleDashboard(req, res) {
  const { count: totalBooks } = await supabase.from('books').select('*', { count: 'exact', head: true });
  const { count: totalMembers } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'user');
  const { count: pendingCount } = await supabase.from('borrow_transactions').select('*', { count: 'exact', head: true }).eq('status', 'pending');
  const { count: borrowedCount } = await supabase.from('borrow_transactions').select('*', { count: 'exact', head: true }).eq('status', 'borrowed');

  const today = new Date().toISOString().slice(0, 10);
  const { count: overdueCount } = await supabase
    .from('borrow_transactions').select('*', { count: 'exact', head: true })
    .eq('status', 'borrowed').lt('due_date', today);

  const { data: books } = await supabase.from('books').select('total_copies, available_copies');
  const totalCopies = (books || []).reduce((sum, b) => sum + b.total_copies, 0);
  const availCopies = (books || []).reduce((sum, b) => sum + b.available_copies, 0);
  const borrowRatePct = totalCopies > 0 ? Math.round(((totalCopies - availCopies) / totalCopies) * 100) : 0;

  const { count: totalTransactions } = await supabase.from('borrow_transactions').select('*', { count: 'exact', head: true });
  const pendingPct = totalTransactions > 0 ? Math.round((pendingCount / totalTransactions) * 100) : 0;
  const borrowedPct = totalTransactions > 0 ? Math.round((borrowedCount / totalTransactions) * 100) : 0;
  const overduePct = totalTransactions > 0 ? Math.round((overdueCount / totalTransactions) * 100) : 0;

  const { data: allBorrows } = await supabase.from('borrow_transactions').select('book_id, books(title)');
  const countMap = {};
  (allBorrows || []).forEach((b) => {
    const title = b.books?.title || 'ไม่พบชื่อ';
    countMap[title] = (countMap[title] || 0) + 1;
  });
  const popularBooks = Object.entries(countMap).map(([title, cnt]) => ({ title, cnt })).sort((a, b) => b.cnt - a.cnt).slice(0, 5);

  const statusMeta = {
    pending: { label: 'รออนุมัติ', color: '#f59e0b' },
    borrowed: { label: 'กำลังยืม', color: '#2563eb' },
    returned: { label: 'คืนแล้ว', color: '#1e8449' },
    overdue: { label: 'เกินกำหนด', color: '#dc2626' },
    rejected: { label: 'ถูกปฏิเสธ', color: '#94a3b8' },
  };
  const { data: statusRows } = await supabase.from('borrow_transactions').select('status');
  const statusCounts = {};
  (statusRows || []).forEach((r) => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });
  const statusBreakdown = Object.entries(statusMeta)
    .map(([key, meta]) => {
      const cnt = statusCounts[key] || 0;
      return cnt > 0 ? { label: meta.label, color: meta.color, count: cnt, pct: totalTransactions > 0 ? (cnt / totalTransactions) * 100 : 0 } : null;
    })
    .filter(Boolean);

  const { data: recentRaw } = await supabase
    .from('borrow_transactions')
    .select('borrow_id, request_date, users(full_name), books(title)')
    .eq('status', 'pending').order('created_at', { ascending: false }).limit(5);
  const recent = (recentRaw || []).map((r) => ({
    borrow_id: r.borrow_id, request_date: r.request_date, full_name: r.users?.full_name, title: r.books?.title,
  }));

  return res.status(200).json({
    stats: {
      total_books: totalBooks || 0, total_members: totalMembers || 0, pending_count: pendingCount || 0,
      borrowed_count: borrowedCount || 0, overdue_count: overdueCount || 0, borrow_rate_pct: borrowRatePct,
      total_copies: totalCopies, avail_copies: availCopies, pending_pct: pendingPct,
      borrowed_pct: borrowedPct, overdue_pct: overduePct,
    },
    popular_books: popularBooks, status_breakdown: statusBreakdown, recent_requests: recent,
  });
}

// ===================== Borrow Requests =====================
async function handleBorrowRequests(req, res, admin, body) {
  if (req.method === 'POST') {
    const { borrow_id, action } = body;
    if (!borrow_id || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'คำขอไม่ถูกต้อง' });
    }

    const { data: request, error: fetchError } = await supabase
      .from('borrow_transactions').select('*, books(title, book_id)').eq('borrow_id', borrow_id).single();
    if (fetchError || !request) return res.status(404).json({ error: 'ไม่พบคำขอยืมนี้ในระบบ' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'คำขอนี้ถูกดำเนินการไปแล้ว' });

    const today = new Date().toISOString().slice(0, 10);

    if (action === 'approve') {
      const days = request.requested_days || 14;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + days);

      const { error } = await supabase.from('borrow_transactions').update({
        status: 'borrowed', approve_date: today, due_date: dueDate.toISOString().slice(0, 10), processed_by: admin.user_id,
      }).eq('borrow_id', borrow_id);
      if (error) return res.status(500).json({ error: 'Update error: ' + error.message });

      return res.status(200).json({ message: `อนุมัติคำขอยืม "${request.books.title}" (${days} วัน) เรียบร้อยแล้ว` });
    } else {
      const { error } = await supabase.from('borrow_transactions').update({
        status: 'rejected', approve_date: today, processed_by: admin.user_id,
      }).eq('borrow_id', borrow_id);
      if (error) return res.status(500).json({ error: 'Update error: ' + error.message });

      const { data: book } = await supabase.from('books').select('available_copies').eq('book_id', request.books.book_id).single();
      await supabase.from('books').update({ available_copies: (book?.available_copies || 0) + 1 }).eq('book_id', request.books.book_id);

      return res.status(200).json({ message: `ปฏิเสธคำขอยืม "${request.books.title}" เรียบร้อยแล้ว` });
    }
  }

  const { data, error } = await supabase
    .from('borrow_transactions')
    .select('borrow_id, request_date, requested_days, users(full_name, phone), books(book_code, title, author)')
    .eq('status', 'pending').order('request_date', { ascending: true });
  if (error) return res.status(500).json({ error: 'Query error: ' + error.message });

  const requests = (data || []).map((r) => ({
    borrow_id: r.borrow_id, request_date: r.request_date, requested_days: r.requested_days,
    full_name: r.users?.full_name, phone: r.users?.phone,
    book_code: r.books?.book_code, title: r.books?.title, author: r.books?.author,
  }));
  return res.status(200).json({ requests });
}

// ===================== Returns =====================
async function handleReturns(req, res, admin, body) {
  if (req.method === 'POST') {
    const { borrow_id } = body;
    if (!borrow_id) return res.status(400).json({ error: 'คำขอไม่ถูกต้อง' });

    const { data: record, error: fetchError } = await supabase
      .from('borrow_transactions').select('*, books(title, book_id)').eq('borrow_id', borrow_id).single();
    if (fetchError || !record) return res.status(404).json({ error: 'ไม่พบรายการยืมนี้ในระบบ' });
    if (!['borrowed', 'overdue'].includes(record.status)) {
      return res.status(400).json({ error: 'รายการนี้ไม่ได้อยู่ในสถานะกำลังยืม' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('borrow_transactions').update({
      status: 'returned', return_date: today, processed_by: admin.user_id,
    }).eq('borrow_id', borrow_id);
    if (error) return res.status(500).json({ error: 'Update error: ' + error.message });

    const { data: book } = await supabase.from('books').select('available_copies').eq('book_id', record.books.book_id).single();
    await supabase.from('books').update({ available_copies: (book?.available_copies || 0) + 1 }).eq('book_id', record.books.book_id);

    return res.status(200).json({ message: `บันทึกการคืนหนังสือ "${record.books.title}" เรียบร้อยแล้ว` });
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('borrow_transactions')
    .select('borrow_id, approve_date, due_date, users(full_name, phone), books(book_code, title)')
    .in('status', ['borrowed', 'overdue']).order('due_date', { ascending: true });
  if (error) return res.status(500).json({ error: 'Query error: ' + error.message });

  const borrows = (data || []).map((r) => {
    const dueDate = new Date(r.due_date);
    const todayDate = new Date(today);
    const daysOverdue = Math.floor((todayDate - dueDate) / (1000 * 60 * 60 * 24));
    return {
      borrow_id: r.borrow_id, approve_date: r.approve_date, due_date: r.due_date,
      full_name: r.users?.full_name, phone: r.users?.phone,
      book_code: r.books?.book_code, title: r.books?.title, days_overdue: daysOverdue > 0 ? daysOverdue : 0,
    };
  });
  return res.status(200).json({ borrows });
}

// ===================== Books =====================
async function handleBooks(req, res, body) {
  if (req.method === 'POST') {
    const action = body.action;

    if (action === 'create' || action === 'update') {
      const { book_code, title, author, category_id, publisher, isbn, description, total_copies } = body;
      if (!book_code || !title || !author || !category_id) {
        return res.status(400).json({ error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
      }
      const totalCopies = Math.max(1, parseInt(total_copies, 10) || 1);

      if (action === 'create') {
        const { data: dup } = await supabase.from('books').select('book_id').eq('book_code', book_code);
        if (dup && dup.length > 0) return res.status(400).json({ error: 'รหัสหนังสือนี้ถูกใช้งานแล้ว' });

        const { data: inserted, error } = await supabase.from('books').insert({
          book_code, title, author, category_id: Number(category_id),
          publisher: publisher || null, isbn: isbn || null, description: description || null,
          total_copies: totalCopies, available_copies: totalCopies,
        }).select('book_id').single();
        if (error) return res.status(500).json({ error: 'Insert error: ' + error.message });
        return res.status(200).json({ message: `เพิ่มหนังสือ "${title}" สำเร็จ`, book_id: inserted.book_id });
      } else {
        const { book_id } = body;
        const { data: dup } = await supabase.from('books').select('book_id').eq('book_code', book_code).neq('book_id', book_id);
        if (dup && dup.length > 0) return res.status(400).json({ error: 'รหัสหนังสือนี้ถูกใช้งานโดยเล่มอื่นแล้ว' });

        const { data: old } = await supabase.from('books').select('total_copies, available_copies').eq('book_id', book_id).single();
        if (!old) return res.status(404).json({ error: 'ไม่พบหนังสือเล่มนี้' });

        const diff = totalCopies - old.total_copies;
        const newAvailable = Math.max(0, old.available_copies + diff);

        const { error } = await supabase.from('books').update({
          book_code, title, author, category_id: Number(category_id),
          publisher: publisher || null, isbn: isbn || null, description: description || null,
          total_copies: totalCopies, available_copies: newAvailable,
        }).eq('book_id', book_id);
        if (error) return res.status(500).json({ error: 'Update error: ' + error.message });
        return res.status(200).json({ message: `แก้ไขหนังสือ "${title}" สำเร็จ` });
      }
    }

    if (action === 'delete') {
      const { book_id } = body;
      const { count } = await supabase.from('borrow_transactions').select('*', { count: 'exact', head: true }).eq('book_id', book_id);
      if (count > 0) return res.status(400).json({ error: 'ไม่สามารถลบได้ เพราะหนังสือเล่มนี้มีประวัติการยืมอยู่ในระบบ' });
      const { error } = await supabase.from('books').delete().eq('book_id', book_id);
      if (error) return res.status(500).json({ error: 'Delete error: ' + error.message });
      return res.status(200).json({ message: 'ลบหนังสือเรียบร้อยแล้ว' });
    }

    return res.status(400).json({ error: 'action ไม่ถูกต้อง' });
  }

  const { data: books, error: booksError } = await supabase.from('books').select('*, categories(category_name)').order('title');
  if (booksError) return res.status(500).json({ error: 'Query error: ' + booksError.message });
  const { data: categories } = await supabase.from('categories').select('*').order('category_name');
  const booksOut = (books || []).map((b) => ({ ...b, category_name: b.categories?.category_name }));
  return res.status(200).json({ books: booksOut, categories: categories || [] });
}

// ===================== Categories =====================
async function handleCategories(req, res, body) {
  if (req.method === 'POST') {
    const { category_name } = body;
    if (!category_name) return res.status(400).json({ error: 'กรุณากรอกชื่อหมวดหมู่' });
    const { error } = await supabase.from('categories').insert({ category_name });
    if (error) return res.status(500).json({ error: 'Insert error: ' + error.message });
    return res.status(200).json({ message: `เพิ่มหมวดหมู่ "${category_name}" สำเร็จ` });
  }

  if (req.method === 'DELETE') {
    const { category_id } = body;
    const { count } = await supabase.from('books').select('*', { count: 'exact', head: true }).eq('category_id', category_id);
    if (count > 0) return res.status(400).json({ error: 'ไม่สามารถลบได้ เพราะมีหนังสือใช้หมวดหมู่นี้อยู่' });
    const { error } = await supabase.from('categories').delete().eq('category_id', category_id);
    if (error) return res.status(500).json({ error: 'Delete error: ' + error.message });
    return res.status(200).json({ message: 'ลบหมวดหมู่เรียบร้อยแล้ว' });
  }

  const { data, error } = await supabase.from('categories').select('*').order('category_name');
  if (error) return res.status(500).json({ error: 'Query error: ' + error.message });
  return res.status(200).json({ categories: data || [] });
}

// ===================== Users =====================
async function handleUsers(req, res, admin, body) {
  const currentAdminId = admin.user_id;

  if (req.method === 'POST') {
    const action = body.action;
    const userId = body.user_id;
    if (!userId) return res.status(400).json({ error: 'ไม่พบสมาชิกที่ต้องการจัดการ' });

    if (action === 'update') {
      const { username, full_name, email, phone, address, role, status } = body;
      if (!username || !full_name || !email) return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้ ชื่อ-นามสกุล และอีเมล' });
      if (userId === currentAdminId && (role !== 'admin' || status !== 'active')) {
        return res.status(400).json({ error: 'ไม่สามารถลดสิทธิ์หรือระงับบัญชีของตัวเองได้' });
      }
      const { data: dupU } = await supabase.from('users').select('user_id').eq('username', username).neq('user_id', userId);
      if (dupU && dupU.length > 0) return res.status(400).json({ error: 'ชื่อผู้ใช้นี้ถูกใช้งานโดยบัญชีอื่นแล้ว' });
      const { data: dupE } = await supabase.from('users').select('user_id').eq('email', email).neq('user_id', userId);
      if (dupE && dupE.length > 0) return res.status(400).json({ error: 'อีเมลนี้ถูกใช้งานโดยบัญชีอื่นแล้ว' });

      const { error } = await supabase.from('users').update({
        username, full_name, email, phone: phone || null, address: address || null,
        role: ['user', 'admin'].includes(role) ? role : 'user',
        status: ['active', 'suspended'].includes(status) ? status : 'active',
      }).eq('user_id', userId);
      if (error) return res.status(500).json({ error: 'Update error: ' + error.message });
      return res.status(200).json({ message: `แก้ไขข้อมูล "${full_name}" สำเร็จ` });
    }

    if (action === 'toggle_status') {
      if (userId === currentAdminId) return res.status(400).json({ error: 'ไม่สามารถระงับบัญชีของตัวเองได้' });
      const { data: u } = await supabase.from('users').select('status, full_name').eq('user_id', userId).single();
      if (!u) return res.status(404).json({ error: 'ไม่พบสมาชิกนี้' });
      const newStatus = u.status === 'active' ? 'suspended' : 'active';
      await supabase.from('users').update({ status: newStatus }).eq('user_id', userId);
      return res.status(200).json({ message: `${newStatus === 'suspended' ? 'ระงับ' : 'ปลดระงับ'}บัญชี "${u.full_name}" สำเร็จ` });
    }

    if (action === 'toggle_role') {
      if (userId === currentAdminId) return res.status(400).json({ error: 'ไม่สามารถลดสิทธิ์ของตัวเองได้' });
      const { data: u } = await supabase.from('users').select('role, full_name').eq('user_id', userId).single();
      if (!u) return res.status(404).json({ error: 'ไม่พบสมาชิกนี้' });
      const newRole = u.role === 'admin' ? 'user' : 'admin';
      await supabase.from('users').update({ role: newRole }).eq('user_id', userId);
      return res.status(200).json({ message: `เปลี่ยนสิทธิ์ "${u.full_name}" เป็น ${newRole === 'admin' ? 'Admin' : 'User'} สำเร็จ` });
    }

    if (action === 'delete') {
      if (userId === currentAdminId) return res.status(400).json({ error: 'ไม่สามารถลบบัญชีของตัวเองได้' });
      const { count } = await supabase.from('borrow_transactions').select('*', { count: 'exact', head: true }).eq('user_id', userId);
      if (count > 0) return res.status(400).json({ error: 'ไม่สามารถลบได้ เพราะสมาชิกคนนี้มีประวัติการยืมอยู่ในระบบ (แนะนำให้ระงับบัญชีแทน)' });
      const { error } = await supabase.from('users').delete().eq('user_id', userId);
      if (error) return res.status(500).json({ error: 'Delete error: ' + error.message });
      return res.status(200).json({ message: 'ลบสมาชิกเรียบร้อยแล้ว' });
    }

    return res.status(400).json({ error: 'action ไม่ถูกต้อง' });
  }

  const { data: users, error } = await supabase.from('users').select('*').order('role', { ascending: false }).order('full_name');
  if (error) return res.status(500).json({ error: 'Query error: ' + error.message });

  const usersWithCount = await Promise.all(
    (users || []).map(async (u) => {
      const { count } = await supabase.from('borrow_transactions').select('*', { count: 'exact', head: true }).eq('user_id', u.user_id);
      return { ...u, borrow_count: count || 0 };
    })
  );
  return res.status(200).json({ users: usersWithCount, current_admin_id: currentAdminId });
}

// ===================== Upload Cover =====================
async function handleUploadCover(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fields, files } = await parseForm(req);
  const bookId = Array.isArray(fields.book_id) ? fields.book_id[0] : fields.book_id;
  const file = Array.isArray(files.cover_image) ? files.cover_image[0] : files.cover_image;

  if (!bookId) return res.status(400).json({ error: 'ไม่พบหนังสือที่ต้องการอัปเดตรูป' });
  if (!file) return res.status(400).json({ error: 'กรุณาเลือกไฟล์รูปภาพ' });

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({ error: 'รองรับเฉพาะไฟล์รูปภาพ JPG, PNG หรือ WEBP เท่านั้น' });
  }
  if (file.size > 2 * 1024 * 1024) return res.status(400).json({ error: 'ขนาดไฟล์รูปต้องไม่เกิน 2MB' });

  const fs = await import('fs');
  const buffer = fs.readFileSync(file.filepath);
  const ext = file.originalFilename.split('.').pop();
  const filename = `books/book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage.from('uploads').upload(filename, buffer, {
    contentType: file.mimetype, upsert: true,
  });
  if (uploadError) return res.status(500).json({ error: 'Upload error: ' + uploadError.message });

  const { error: dbError } = await supabase.from('books').update({ cover_image: filename }).eq('book_id', bookId);
  if (dbError) return res.status(500).json({ error: 'DB update error: ' + dbError.message });

  return res.status(200).json({ message: 'อัปโหลดรูปปกสำเร็จ', cover_image: filename });
}

// ===================== Router =====================
export default async function handler(req, res) {
  try {
    const admin = await requireAdminAuth(req, res);
    if (!admin) return;

    // ----- upload-cover ตรวจจากประเภทไฟล์ (multipart) ไม่ใช่จาก query/body -----
    const contentType = req.headers['content-type'] || '';
    if (req.method === 'POST' && contentType.includes('multipart/form-data')) {
      return await handleUploadCover(req, res);
    }

    let resource;
    let body = {};
    if (req.method === 'GET') {
      resource = req.query.resource;
    } else {
      body = await readJsonBody(req);
      resource = body.resource;
    }

    if (resource === 'dashboard') return await handleDashboard(req, res);
    if (resource === 'borrow-requests') return await handleBorrowRequests(req, res, admin, body);
    if (resource === 'returns') return await handleReturns(req, res, admin, body);
    if (resource === 'books') return await handleBooks(req, res, body);
    if (resource === 'categories') return await handleCategories(req, res, body);
    if (resource === 'users') return await handleUsers(req, res, admin, body);

    return res.status(404).json({ error: 'ไม่พบ resource นี้: ' + resource });
  } catch (err) {
    return res.status(500).json({ error: 'Server crash: ' + err.message });
  }
}
