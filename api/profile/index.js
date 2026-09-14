import { supabase } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/auth.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    return res.status(200).json({
      user: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        address: user.address,
      },
    });
  }

  if (req.method === 'POST') {
    const { full_name, email, phone, address, new_password, confirm_password } = req.body || {};
    const errors = [];

    if (!full_name || !email) {
      errors.push('กรุณากรอกชื่อ-นามสกุลและอีเมล');
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('รูปแบบอีเมลไม่ถูกต้อง');
    }
    if (phone && !/^[0-9]{10}$/.test(phone)) {
      errors.push('เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลักเท่านั้น');
    }

    let updatePassword = false;
    if (new_password || confirm_password) {
      if (!new_password || new_password.length < 6) {
        errors.push('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      } else if (new_password !== confirm_password) {
        errors.push('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
      } else {
        updatePassword = true;
      }
    }

    if (errors.length === 0 && email) {
      const { data: dup } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', email)
        .neq('user_id', user.user_id);
      if (dup && dup.length > 0) {
        errors.push('อีเมลนี้ถูกใช้งานโดยบัญชีอื่นแล้ว');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    const updateData = {
      full_name,
      email,
      phone: phone || null,
      address: address || null,
    };
    if (updatePassword) {
      updateData.password = await bcrypt.hash(new_password, 10);
    }

    const { error } = await supabase.from('users').update(updateData).eq('user_id', user.user_id);
    if (error) {
      return res.status(500).json({ error: 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่' });
    }

    return res.status(200).json({ message: 'บันทึกข้อมูลสำเร็จแล้ว' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
