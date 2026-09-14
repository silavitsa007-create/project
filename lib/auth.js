import { supabase } from './supabase.js';

/**
 * อ่าน token จาก header "Authorization: Bearer xxxxx"
 */
export function getBearerToken(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  const match = /Bearer\s+(\S+)/.exec(authHeader);
  return match ? match[1] : null;
}

/**
 * ตรวจสอบ token แล้วคืนข้อมูล user ที่ login อยู่
 * ถ้าไม่ถูกต้อง/หมดอายุ จะส่ง response 401 แล้วคืนค่า null (endpoint ที่เรียกต้อง return ทันทีถ้าได้ null)
 */
export async function requireAuth(req, res) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ (ไม่พบ token)' });
    return null;
  }

  const { data, error } = await supabase
    .from('auth_tokens')
    .select('user_id, expires_at, users(*)')
    .eq('token', token)
    .single();

  if (error || !data || new Date(data.expires_at) < new Date()) {
    res.status(401).json({ error: 'session หมดอายุ กรุณาเข้าสู่ระบบใหม่' });
    return null;
  }

  return data.users;
}

/**
 * ตรวจสอบว่าเป็น admin เท่านั้น ไม่งั้นส่ง 403
 */
export async function requireAdminAuth(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return null; // requireAuth ส่ง response ไปแล้ว

  if (user.role !== 'admin') {
    res.status(403).json({ error: 'ต้องเป็นผู้ดูแลระบบเท่านั้น' });
    return null;
  }
  return user;
}
