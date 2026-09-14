import { supabase } from '../../lib/supabase.js';
import { requireAdminAuth } from '../../lib/auth.js';

const BORROW_DAYS = 14;

export default async function handler(req, res) {
  try {
    const admin = await requireAdminAuth(req, res);
    if (!admin) return;

    if (req.method === 'POST') {
      const { borrow_id, action } = req.body || {};
      if (!borrow_id || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'คำขอไม่ถูกต้อง' });
      }

      const { data: request, error: fetchError } = await supabase
        .from('borrow_transactions')
        .select('*, books(title, book_id)')
        .eq('borrow_id', borrow_id)
        .single();

      if (fetchError || !request) {
        return res.status(404).json({ error: 'ไม่พบคำขอยืมนี้ในระบบ' });
      }
      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'คำขอนี้ถูกดำเนินการไปแล้ว' });
      }

      const today = new Date().toISOString().slice(0, 10);

      if (action === 'approve') {
        const days = request.requested_days || BORROW_DAYS;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + days);

        const { error } = await supabase
          .from('borrow_transactions')
          .update({
            status: 'borrowed',
            approve_date: today,
            due_date: dueDate.toISOString().slice(0, 10),
            processed_by: admin.user_id,
          })
          .eq('borrow_id', borrow_id);

        if (error) return res.status(500).json({ error: 'Update error: ' + error.message });

        return res.status(200).json({
          message: `อนุมัติคำขอยืม "${request.books.title}" (${days} วัน) เรียบร้อยแล้ว`,
        });
      } else {
        const { error } = await supabase
          .from('borrow_transactions')
          .update({ status: 'rejected', approve_date: today, processed_by: admin.user_id })
          .eq('borrow_id', borrow_id);

        if (error) return res.status(500).json({ error: 'Update error: ' + error.message });

        const { data: book } = await supabase
          .from('books')
          .select('available_copies')
          .eq('book_id', request.books.book_id)
          .single();

        await supabase
          .from('books')
          .update({ available_copies: (book?.available_copies || 0) + 1 })
          .eq('book_id', request.books.book_id);

        return res.status(200).json({
          message: `ปฏิเสธคำขอยืม "${request.books.title}" เรียบร้อยแล้ว`,
        });
      }
    }

    // ----- GET: รายการคำขอที่รออนุมัติทั้งหมด -----
    const { data, error } = await supabase
      .from('borrow_transactions')
      .select('borrow_id, request_date, requested_days, users(full_name, phone), books(book_code, title, author)')
      .eq('status', 'pending')
      .order('request_date', { ascending: true });

    if (error) return res.status(500).json({ error: 'Query error: ' + error.message });

    const requests = (data || []).map((r) => ({
      borrow_id: r.borrow_id,
      request_date: r.request_date,
      requested_days: r.requested_days,
      full_name: r.users?.full_name,
      phone: r.users?.phone,
      book_code: r.books?.book_code,
      title: r.books?.title,
      author: r.books?.author,
    }));

    return res.status(200).json({ requests });
  } catch (err) {
    return res.status(500).json({ error: 'Server crash: ' + err.message });
  }
}
