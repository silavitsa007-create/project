import { supabase } from '../../lib/supabase.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { username, password, full_name, email, phone, address } = req.body || {};
    const errors = [];

    if (!username || !password || !full_name || !email) {
      errors.push('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
    }
    if (username && username.length < 4) {
      errors.push('ชื่อผู้ใช้ต้องมีอย่างน้อย 4 ตัวอักษร');
    }
    if (password && password.length < 6) {
      errors.push('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('รูปแบบอีเมลไม่ถูกต้อง');
    }

    if (errors.length === 0) {
      const { data: existing, error: checkError } = await supabase
        .from('users')
        .select('user_id')
        .or(`username.eq.${username},email.eq.${email}`);

      if (checkError) {
        return res.status(500).json({ error: 'DB check error: ' + checkError.message });
      }
      if (existing && existing.length > 0) {
        errors.push('ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้ว');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { error } = await supabase.from('users').insert({
      username,
      password: hashedPassword,
      full_name,
      email,
      phone: phone || null,
      address: address || null,
      role: 'user',
      status: 'active',
    });

    if (error) {
      return res.status(500).json({ error: 'Insert error: ' + error.message });
    }

    return res.status(200).json({ message: 'สมัครสมาชิกสำเร็จ' });
  } catch (err) {
    return res.status(500).json({ error: 'Server crash: ' + err.message });
  }
}
