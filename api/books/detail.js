import { supabase } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;

  const { data: book, error } = await supabase
    .from('books')
    .select('*, categories(category_name)')
    .eq('book_id', id)
    .single();

  if (error || !book) {
    return res.status(404).json({ error: 'ไม่พบหนังสือเล่มนี้' });
  }

  const { count: reserveCount } = await supabase
    .from('reservations')
    .select('*', { count: 'exact', head: true })
    .eq('book_id', id)
    .eq('status', 'waiting');

  const { data: myBorrow } = await supabase
    .from('borrow_transactions')
    .select('status')
    .eq('book_id', id)
    .eq('user_id', user.user_id)
    .in('status', ['pending', 'borrowed'])
    .limit(1)
    .maybeSingle();

  return res.status(200).json({
    book: {
      book_id: book.book_id,
      book_code: book.book_code,
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      isbn: book.isbn,
      description: book.description,
      available_copies: book.available_copies,
      total_copies: book.total_copies,
      cover_image: book.cover_image,
      category_name: book.categories?.category_name || '',
      reserve_count: reserveCount || 0,
      my_status: myBorrow?.status || null,
    },
  });
}
