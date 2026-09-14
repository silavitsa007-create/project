import { supabase } from '../../lib/supabase.js';
import { requireAdminAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  try {
    const admin = await requireAdminAuth(req, res);
    if (!admin) return;

    if (req.method === 'POST') {
      const { borrow_id } = req.body || {};
      if (!borrow_id) {
        return res.status(400).json({ error: 'คำขอไม่ถูกต้อง' });
      }

      const { data: record, error: fetchError } = await supabase
        .from('borrow_transactions')
        .select('*, books(title, book_id)')
        .eq('borrow_id', borrow_id)
        .single();

      if (fetchError || !record) {
        return res.status(404).json({ error: 'ไม่พบรายการยืมนี้ในระบบ' });
      }
      if (!['borrowed', 'overdue'].includes(record.status)) {
        return res.status(400).json({ error: 'รายการนี้ไม่ได้อยู่ในสถานะกำลังยืม' });
      }

      const today = new Date().toISOString().slice(0, 10);

      const { error } = await supabase
        .from('borrow_transactions')
        .update({ status: 'returned', return_date: today, processed_by: admin.user_id })
        .eq('borrow_id', borrow_id);

      if (error) return res.status(500).json({ error: 'Update error: ' + error.message });

      const { data: book } = await supabase
        .from('books')
        .select('available_copies')
        .eq('book_id', record.books.book_id)
        .single();

      await supabase
        .from('books')
        .update({ available_copies: (book?.available_copies || 0) + 1 })
        .eq('book_id', record.books.book_id);

      return res.status(200).json({
        message: `บันทึกการคืนหนังสือ "${record.books.title}" เรียบร้อยแล้ว`,
      });
    }

    // ----- GET: รายการหนังสือที่กำลังถูกยืมอยู่ -----
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('borrow_transactions')
      .select('borrow_id, approve_date, due_date, users(full_name, phone), books(book_code, title)')
      .in('status', ['borrowed', 'overdue'])
      .order('due_date', { ascending: true });

    if (error) return res.status(500).json({ error: 'Query error: ' + error.message });

    const borrows = (data || []).map((r) => {
      const dueDate = new Date(r.due_date);
      const todayDate = new Date(today);
      const daysOverdue = Math.floor((todayDate - dueDate) / (1000 * 60 * 60 * 24));

      return {
        borrow_id: r.borrow_id,
        approve_date: r.approve_date,
        due_date: r.due_date,
        full_name: r.users?.full_name,
        phone: r.users?.phone,
        book_code: r.books?.book_code,
        title: r.books?.title,
        days_overdue: daysOverdue > 0 ? daysOverdue : 0,
      };
    });

    return res.status(200).json({ borrows });
  } catch (err) {
    return res.status(500).json({ error: 'Server crash: ' + err.message });
  }
}
