import { supabase } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const { data, error } = await supabase
    .from('borrow_transactions')
    .select('borrow_id, request_date, approve_date, due_date, return_date, status, books(book_code, title, author)')
    .eq('user_id', user.user_id)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
  }

  const borrows = data.map((b) => ({
    borrow_id: b.borrow_id,
    request_date: b.request_date,
    approve_date: b.approve_date,
    due_date: b.due_date,
    return_date: b.return_date,
    status: b.status,
    book_code: b.books?.book_code,
    title: b.books?.title,
    author: b.books?.author,
  }));

  return res.status(200).json({ borrows });
}
