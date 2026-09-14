import { supabase } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/auth.js';

async function handleList(req, res, user) {
  const { keyword = '', category_id = '' } = req.query;

  let query = supabase.from('books').select('*, categories(category_name)').order('title');
  if (keyword) {
    query = query.or(`title.ilike.%${keyword}%,book_code.ilike.%${keyword}%,author.ilike.%${keyword}%`);
  }
  if (category_id) query = query.eq('category_id', category_id);

  const { data: booksRaw, error } = await query;
  if (error) return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการค้นหาหนังสือ' });

  const books = await Promise.all(
    booksRaw.map(async (b) => {
      const { count: reserveCount } = await supabase
        .from('reservations').select('*', { count: 'exact', head: true })
        .eq('book_id', b.book_id).eq('status', 'waiting');

      const { data: myBorrow } = await supabase
        .from('borrow_transactions').select('status')
        .eq('book_id', b.book_id).eq('user_id', user.user_id)
        .in('status', ['pending', 'borrowed']).limit(1).maybeSingle();

      return {
        book_id: b.book_id, book_code: b.book_code, title: b.title, author: b.author,
        available_copies: b.available_copies, total_copies: b.total_copies, cover_image: b.cover_image,
        category_name: b.categories?.category_name || '',
        reserve_count: reserveCount || 0, my_status: myBorrow?.status || null,
      };
    })
  );

  const { data: categories } = await supabase.from('categories').select('*').order('category_name');
  return res.status(200).json({ books, categories: categories || [] });
}

async function handleDetail(req, res, user) {
  const { id } = req.query;

  const { data: book, error } = await supabase
    .from('books').select('*, categories(category_name)').eq('book_id', id).single();
  if (error || !book) return res.status(404).json({ error: 'ไม่พบหนังสือเล่มนี้' });

  const { count: reserveCount } = await supabase
    .from('reservations').select('*', { count: 'exact', head: true })
    .eq('book_id', id).eq('status', 'waiting');

  const { data: myBorrow } = await supabase
    .from('borrow_transactions').select('status')
    .eq('book_id', id).eq('user_id', user.user_id)
    .in('status', ['pending', 'borrowed']).limit(1).maybeSingle();

  return res.status(200).json({
    book: {
      book_id: book.book_id, book_code: book.book_code, title: book.title, author: book.author,
      publisher: book.publisher, isbn: book.isbn, description: book.description,
      available_copies: book.available_copies, total_copies: book.total_copies, cover_image: book.cover_image,
      category_name: book.categories?.category_name || '',
      reserve_count: reserveCount || 0, my_status: myBorrow?.status || null,
    },
  });
}

export default async function handler(req, res) {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const slug = req.query.slug || [];
    const route = slug[0];

    if (route === 'list') return await handleList(req, res, user);
    if (route === 'detail') return await handleDetail(req, res, user);

    return res.status(404).json({ error: 'ไม่พบ route นี้' });
  } catch (err) {
    return res.status(500).json({ error: 'Server crash: ' + err.message });
  }
}
