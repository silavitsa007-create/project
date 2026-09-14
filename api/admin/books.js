import { supabase } from '../../lib/supabase.js';
import { requireAdminAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  try {
    const admin = await requireAdminAuth(req, res);
    if (!admin) return;

    if (req.method === 'POST') {
      const body = req.body || {};
      const action = body.action;

      if (action === 'create' || action === 'update') {
        const {
          book_code, title, author, category_id, publisher, isbn,
          description, total_copies,
        } = body;

        if (!book_code || !title || !author || !category_id) {
          return res.status(400).json({ error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
        }
        const totalCopies = Math.max(1, parseInt(total_copies, 10) || 1);

        if (action === 'create') {
          const { data: dup } = await supabase.from('books').select('book_id').eq('book_code', book_code);
          if (dup && dup.length > 0) {
            return res.status(400).json({ error: 'รหัสหนังสือนี้ถูกใช้งานแล้ว' });
          }

          const { data: inserted, error } = await supabase
            .from('books')
            .insert({
              book_code, title, author, category_id: Number(category_id),
              publisher: publisher || null, isbn: isbn || null, description: description || null,
              total_copies: totalCopies, available_copies: totalCopies,
            })
            .select('book_id')
            .single();

          if (error) return res.status(500).json({ error: 'Insert error: ' + error.message });
          return res.status(200).json({ message: `เพิ่มหนังสือ "${title}" สำเร็จ`, book_id: inserted.book_id });
        } else {
          const { book_id } = body;
          const { data: dup } = await supabase.from('books').select('book_id').eq('book_code', book_code).neq('book_id', book_id);
          if (dup && dup.length > 0) {
            return res.status(400).json({ error: 'รหัสหนังสือนี้ถูกใช้งานโดยเล่มอื่นแล้ว' });
          }

          const { data: old } = await supabase.from('books').select('total_copies, available_copies, cover_image').eq('book_id', book_id).single();
          if (!old) return res.status(404).json({ error: 'ไม่พบหนังสือเล่มนี้' });

          const diff = totalCopies - old.total_copies;
          const newAvailable = Math.max(0, old.available_copies + diff);

          const { error } = await supabase
            .from('books')
            .update({
              book_code, title, author, category_id: Number(category_id),
              publisher: publisher || null, isbn: isbn || null, description: description || null,
              total_copies: totalCopies, available_copies: newAvailable,
            })
            .eq('book_id', book_id);

          if (error) return res.status(500).json({ error: 'Update error: ' + error.message });
          return res.status(200).json({ message: `แก้ไขหนังสือ "${title}" สำเร็จ` });
        }
      }

      if (action === 'delete') {
        const { book_id } = body;
        const { count } = await supabase.from('borrow_transactions').select('*', { count: 'exact', head: true }).eq('book_id', book_id);
        if (count > 0) {
          return res.status(400).json({ error: 'ไม่สามารถลบได้ เพราะหนังสือเล่มนี้มีประวัติการยืมอยู่ในระบบ' });
        }
        const { error } = await supabase.from('books').delete().eq('book_id', book_id);
        if (error) return res.status(500).json({ error: 'Delete error: ' + error.message });
        return res.status(200).json({ message: 'ลบหนังสือเรียบร้อยแล้ว' });
      }

      return res.status(400).json({ error: 'action ไม่ถูกต้อง' });
    }

    // ----- GET: รายการหนังสือ + หมวดหมู่ทั้งหมด -----
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('*, categories(category_name)')
      .order('title');
    if (booksError) return res.status(500).json({ error: 'Query error: ' + booksError.message });

    const { data: categories } = await supabase.from('categories').select('*').order('category_name');

    const booksOut = (books || []).map((b) => ({
      ...b,
      category_name: b.categories?.category_name,
    }));

    return res.status(200).json({ books: booksOut, categories: categories || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Server crash: ' + err.message });
  }
}
