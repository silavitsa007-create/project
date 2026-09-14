import { supabase } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { book_id } = req.body || {};
  let requestedDays = parseInt(req.body?.requested_days, 10) || 7;
  if (requestedDays < 1 || requestedDays > 7) requestedDays = 7;

  if (!book_id) {
    return res.status(400).json({ error: 'ไม่พบหนังสือที่ต้องการยืม' });
  }

  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('available_copies, title')
    .eq('book_id', book_id)
    .single();

  if (bookError || !book) {
    return res.status(404).json({ error: 'ไม่พบหนังสือเล่มนี้ในระบบ' });
  }
  if (book.available_copies <= 0) {
    return res.status(400).json({ error: 'ขออภัย หนังสือเล่มนี้ถูกยืมหมดแล้ว' });
  }

  const { data: existing } = await supabase
    .from('borrow_transactions')
    .select('borrow_id')
    .eq('user_id', user.user_id)
    .eq('book_id', book_id)
    .in('status', ['pending', 'borrowed'])
    .limit(1);

  if (existing && existing.length > 0) {
    return res.status(400).json({ error: 'คุณมีรายการยืมหรือคำขอยืมหนังสือเล่มนี้ค้างอยู่แล้ว' });
  }

  const today = new Date().toISOString().slice(0, 10);

  const { error: insertError } = await supabase.from('borrow_transactions').insert({
    user_id: user.user_id,
    book_id,
    request_date: today,
    requested_days: requestedDays,
    status: 'pending',
  });

  if (insertError) {
    return res.status(500).json({ error: 'ส่งคำขอยืมไม่สำเร็จ กรุณาลองใหม่' });
  }

  await supabase
    .from('books')
    .update({ available_copies: book.available_copies - 1 })
    .eq('book_id', book_id);

  return res.status(200).json({
    message: `ส่งคำขอยืมหนังสือ "${book.title}" (${requestedDays} วัน) สำเร็จ กรุณารอ Admin อนุมัติ`,
  });
}
