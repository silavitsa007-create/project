import { supabase } from '../../lib/supabase.js';
import { requireAdminAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  try {
    const admin = await requireAdminAuth(req, res);
    if (!admin) return;

    if (req.method === 'POST') {
      const { category_name } = req.body || {};
      if (!category_name) return res.status(400).json({ error: 'กรุณากรอกชื่อหมวดหมู่' });

      const { error } = await supabase.from('categories').insert({ category_name });
      if (error) return res.status(500).json({ error: 'Insert error: ' + error.message });

      return res.status(200).json({ message: `เพิ่มหมวดหมู่ "${category_name}" สำเร็จ` });
    }

    if (req.method === 'DELETE') {
      const { category_id } = req.body || {};
      const { count } = await supabase.from('books').select('*', { count: 'exact', head: true }).eq('category_id', category_id);
      if (count > 0) {
        return res.status(400).json({ error: 'ไม่สามารถลบได้ เพราะมีหนังสือใช้หมวดหมู่นี้อยู่' });
      }
      const { error } = await supabase.from('categories').delete().eq('category_id', category_id);
      if (error) return res.status(500).json({ error: 'Delete error: ' + error.message });
      return res.status(200).json({ message: 'ลบหมวดหมู่เรียบร้อยแล้ว' });
    }

    const { data, error } = await supabase.from('categories').select('*').order('category_name');
    if (error) return res.status(500).json({ error: 'Query error: ' + error.message });
    return res.status(200).json({ categories: data || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Server crash: ' + err.message });
  }
}
