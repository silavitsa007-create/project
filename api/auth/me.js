import { requireAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return; // requireAuth ส่ง response error ไปแล้ว

  return res.status(200).json({
    user_id: user.user_id,
    username: user.username,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
  });
}
