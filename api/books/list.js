import { supabase } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const { keyword = '', category_id = '' } = req.query;

  let query = supabase
    .from('books')
    .select('*, categories(category_name)')
    .order('title');

  if (keyword) {
    query = query.or(
      `title.ilike.%${keyword}%,book_code.ilike.%${keyword}%,author.ilike.%${keyword}%`
    );
  }
  if (category_id) {
    query = query.eq('category_id', category_id);
  }

  const { data: booksRaw, error } = await query;
  if (error) {
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการค้นหาหนังสือ' });
  }

  // ----- เติมข้อมูลจำนวนคิวจอง + สถานะการยืมของ user คนนี้ต่อเล่ม -----
  const books = await Promise.all(
    booksRaw.map(async (b) => {
      const { count: reserveCount } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('book_id', b.book_id)
        .eq('status', 'waiting');

      const { data: myBorrow } = await supabase
        .from('borrow_transactions')
        .select('status')
        .eq('book_id', b.book_id)
        .eq('user_id', user.user_id)
        .in('status', ['pending', 'borrowed'])
        .limit(1)
        .maybeSingle();

      return {
        book_id: b.book_id,
        book_code: b.book_code,
        title: b.title,
        author: b.author,
        available_copies: b.available_copies,
        total_copies: b.total_copies,
        cover_image: b.cover_image,
        category_name: b.categories?.category_name || '',
        reserve_count: reserveCount || 0,
        my_status: myBorrow?.status || null,
      };
    })
  );

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('category_name');

  return res.status(200).json({ books, categories: categories || [] });
}
