import { supabase } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/auth.js';

async function handleRequest(req, res, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { book_id } = req.body || {};
  let requestedDays = parseInt(req.body?.requested_days, 10) || 7;
  if (requestedDays < 1 || requestedDays > 7) requestedDays = 7;

  if (!book_id) return res.status(400).json({ error: 'ไม่พบหนังสือที่ต้องการยืม' });

  const { data: book, error: bookError } = await supabase
    .from('books').select('available_copies, title').eq('book_id', book_id).single();
  if (bookError || !book) return res.status(404).json({ error: 'ไม่พบหนังสือเล่มนี้ในระบบ' });
  if (book.available_copies <= 0) return res.status(400).json({ error: 'ขออภัย หนังสือเล่มนี้ถูกยืมหมดแล้ว' });

  const { data: existing } = await supabase
    .from('borrow_transactions').select('borrow_id')
    .eq('user_id', user.user_id).eq('book_id', book_id)
    .in('status', ['pending', 'borrowed']).limit(1);
  if (existing && existing.length > 0) {
    return res.status(400).json({ error: 'คุณมีรายการยืมหรือคำขอยืมหนังสือเล่มนี้ค้างอยู่แล้ว' });
  }

  const today = new Date().toISOString().slice(0, 10);
  const { error: insertError } = await supabase.from('borrow_transactions').insert({
    user_id: user.user_id, book_id, request_date: today, requested_days: requestedDays, status: 'pending',
  });
  if (insertError) return res.status(500).json({ error: 'ส่งคำขอยืมไม่สำเร็จ กรุณาลองใหม่' });

  await supabase.from('books').update({ available_copies: book.available_copies - 1 }).eq('book_id', book_id);

  return res.status(200).json({
    message: `ส่งคำขอยืมหนังสือ "${book.title}" (${requestedDays} วัน) สำเร็จ กรุณารอ Admin อนุมัติ`,
  });
}

async function handleMy(req, res, user) {
  const { data, error } = await supabase
    .from('borrow_transactions')
    .select('borrow_id, request_date, approve_date, due_date, return_date, status, books(book_code, title, author)')
    .eq('user_id', user.user_id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });

  const borrows = data.map((b) => ({
    borrow_id: b.borrow_id, request_date: b.request_date, approve_date: b.approve_date,
    due_date: b.due_date, return_date: b.return_date, status: b.status,
    book_code: b.books?.book_code, title: b.books?.title, author: b.books?.author,
  }));

  return res.status(200).json({ borrows });
}

export default async function handler(req, res) {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const slug = req.query.slug || [];
    const route = slug[0];

    if (route === 'request') return await handleRequest(req, res, user);
    if (route === 'my') return await handleMy(req, res, user);

    return res.status(404).json({ error: 'ไม่พบ route นี้' });
  } catch (err) {
    return res.status(500).json({ error: 'Server crash: ' + err.message });
  }
}
