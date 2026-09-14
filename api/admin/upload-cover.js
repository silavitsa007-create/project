import { supabase } from '../../lib/supabase.js';
import { requireAdminAuth } from '../../lib/auth.js';
import { IncomingForm } from 'formidable';

// ปิด body parser อัตโนมัติของ Vercel เพราะเราต้องอ่าน multipart/form-data เอง
export const config = {
  api: { bodyParser: false },
};

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  try {
    const admin = await requireAdminAuth(req, res);
    if (!admin) return;

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { fields, files } = await parseForm(req);
    const bookId = Array.isArray(fields.book_id) ? fields.book_id[0] : fields.book_id;
    const file = Array.isArray(files.cover_image) ? files.cover_image[0] : files.cover_image;

    if (!bookId) return res.status(400).json({ error: 'ไม่พบหนังสือที่ต้องการอัปเดตรูป' });
    if (!file) return res.status(400).json({ error: 'กรุณาเลือกไฟล์รูปภาพ' });

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: 'รองรับเฉพาะไฟล์รูปภาพ JPG, PNG หรือ WEBP เท่านั้น' });
    }
    if (file.size > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'ขนาดไฟล์รูปต้องไม่เกิน 2MB' });
    }

    const fs = await import('fs');
    const buffer = fs.readFileSync(file.filepath);
    const ext = file.originalFilename.split('.').pop();
    const filename = `books/book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filename, buffer, { contentType: file.mimetype, upsert: true });

    if (uploadError) {
      return res.status(500).json({ error: 'Upload error: ' + uploadError.message });
    }

    const { error: dbError } = await supabase
      .from('books')
      .update({ cover_image: filename })
      .eq('book_id', bookId);

    if (dbError) return res.status(500).json({ error: 'DB update error: ' + dbError.message });

    return res.status(200).json({ message: 'อัปโหลดรูปปกสำเร็จ', cover_image: filename });
  } catch (err) {
    return res.status(500).json({ error: 'Server crash: ' + err.message });
  }
}
