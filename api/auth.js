import { supabase } from '../lib/supabase.js';
import { requireAuth, getBearerToken } from '../lib/auth.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

async function handleRegister(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password, full_name, email, phone, address } = req.body || {};
  const errors = [];

  if (!username || !password || !full_name || !email) {
    errors.push('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
  }
  if (username && username.length < 4) errors.push('ชื่อผู้ใช้ต้องมีอย่างน้อย 4 ตัวอักษร');
  if (password && password.length < 6) errors.push('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('รูปแบบอีเมลไม่ถูกต้อง');

  if (errors.length === 0) {
    const { data: existingUsername, error: checkError1 } = await supabase
      .from('users').select('user_id').eq('username', username);
    const { data: existingEmail, error: checkError2 } = await supabase
      .from('users').select('user_id').eq('email', email);
    if (checkError1 || checkError2) {
      return res.status(500).json({ error: 'DB check error: ' + (checkError1 || checkError2).message });
    }
    if ((existingUsername && existingUsername.length > 0) || (existingEmail && existingEmail.length > 0)) {
      errors.push('ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้ว');
    }
  }

  if (errors.length > 0) return res.status(400).json({ error: errors.join(', ') });

  const hashedPassword = await bcrypt.hash(password, 10);
  const { error } = await supabase.from('users').insert({
    username, password: hashedPassword, full_name, email,
    phone: phone || null, address: address || null, role: 'user', status: 'active',
  });
  if (error) return res.status(500).json({ error: 'Insert error: ' + error.message });

  return res.status(200).json({ message: 'สมัครสมาชิกสำเร็จ' });
}

async function handleLogin(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });

  const { data: user, error } = await supabase.from('users').select('*').eq('username', username).single();
  if (error || !user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  }
  if (user.status === 'suspended') return res.status(403).json({ error: 'บัญชีนี้ถูกระงับการใช้งาน' });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: tokenError } = await supabase.from('auth_tokens').insert({
    user_id: user.user_id, token, expires_at: expiresAt,
  });
  if (tokenError) return res.status(500).json({ error: 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่' });

  return res.status(200).json({
    token,
    user: { user_id: user.user_id, username: user.username, full_name: user.full_name, role: user.role },
  });
}

async function handleLogout(req, res) {
  const token = getBearerToken(req);
  if (token) await supabase.from('auth_tokens').delete().eq('token', token);
  return res.status(200).json({ message: 'ออกจากระบบแล้ว' });
}

async function handleMe(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;
  return res.status(200).json({
    user_id: user.user_id, username: user.username, full_name: user.full_name,
    email: user.email, role: user.role,
  });
}

export default async function handler(req, res) {
  try {
    const action = req.method === 'GET' ? req.query.action : req.body?.action;

    if (action === 'register') return await handleRegister(req, res);
    if (action === 'login') return await handleLogin(req, res);
    if (action === 'logout') return await handleLogout(req, res);
    if (action === 'me') return await handleMe(req, res);

    return res.status(404).json({ error: 'ไม่พบ action นี้: ' + action });
  } catch (err) {
    return res.status(500).json({ error: 'Server crash: ' + err.message });
  }
}
