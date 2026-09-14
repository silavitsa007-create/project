import { supabase } from '../../lib/supabase.js';
import { requireAdminAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  try {
    const admin = await requireAdminAuth(req, res);
    if (!admin) return;
    const currentAdminId = admin.user_id;

    if (req.method === 'POST') {
      const body = req.body || {};
      const action = body.action;
      const userId = body.user_id;

      if (!userId) return res.status(400).json({ error: 'ไม่พบสมาชิกที่ต้องการจัดการ' });

      if (action === 'update') {
        const { username, full_name, email, phone, address, role, status } = body;
        if (!username || !full_name || !email) {
          return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้ ชื่อ-นามสกุล และอีเมล' });
        }
        if (userId === currentAdminId && (role !== 'admin' || status !== 'active')) {
          return res.status(400).json({ error: 'ไม่สามารถลดสิทธิ์หรือระงับบัญชีของตัวเองได้' });
        }

        const { data: dupUsername } = await supabase.from('users').select('user_id').eq('username', username).neq('user_id', userId);
        if (dupUsername && dupUsername.length > 0) {
          return res.status(400).json({ error: 'ชื่อผู้ใช้นี้ถูกใช้งานโดยบัญชีอื่นแล้ว' });
        }
        const { data: dupEmail } = await supabase.from('users').select('user_id').eq('email', email).neq('user_id', userId);
        if (dupEmail && dupEmail.length > 0) {
          return res.status(400).json({ error: 'อีเมลนี้ถูกใช้งานโดยบัญชีอื่นแล้ว' });
        }

        const { error } = await supabase
          .from('users')
          .update({
            username, full_name, email,
            phone: phone || null, address: address || null,
            role: ['user', 'admin'].includes(role) ? role : 'user',
            status: ['active', 'suspended'].includes(status) ? status : 'active',
          })
          .eq('user_id', userId);

        if (error) return res.status(500).json({ error: 'Update error: ' + error.message });
        return res.status(200).json({ message: `แก้ไขข้อมูล "${full_name}" สำเร็จ` });
      }

      if (action === 'toggle_status') {
        if (userId === currentAdminId) return res.status(400).json({ error: 'ไม่สามารถระงับบัญชีของตัวเองได้' });
        const { data: u } = await supabase.from('users').select('status, full_name').eq('user_id', userId).single();
        if (!u) return res.status(404).json({ error: 'ไม่พบสมาชิกนี้' });
        const newStatus = u.status === 'active' ? 'suspended' : 'active';
        await supabase.from('users').update({ status: newStatus }).eq('user_id', userId);
        return res.status(200).json({ message: `${newStatus === 'suspended' ? 'ระงับ' : 'ปลดระงับ'}บัญชี "${u.full_name}" สำเร็จ` });
      }

      if (action === 'toggle_role') {
        if (userId === currentAdminId) return res.status(400).json({ error: 'ไม่สามารถลดสิทธิ์ของตัวเองได้' });
        const { data: u } = await supabase.from('users').select('role, full_name').eq('user_id', userId).single();
        if (!u) return res.status(404).json({ error: 'ไม่พบสมาชิกนี้' });
        const newRole = u.role === 'admin' ? 'user' : 'admin';
        await supabase.from('users').update({ role: newRole }).eq('user_id', userId);
        return res.status(200).json({ message: `เปลี่ยนสิทธิ์ "${u.full_name}" เป็น ${newRole === 'admin' ? 'Admin' : 'User'} สำเร็จ` });
      }

      if (action === 'delete') {
        if (userId === currentAdminId) return res.status(400).json({ error: 'ไม่สามารถลบบัญชีของตัวเองได้' });
        const { count } = await supabase.from('borrow_transactions').select('*', { count: 'exact', head: true }).eq('user_id', userId);
        if (count > 0) {
          return res.status(400).json({ error: 'ไม่สามารถลบได้ เพราะสมาชิกคนนี้มีประวัติการยืมอยู่ในระบบ (แนะนำให้ระงับบัญชีแทน)' });
        }
        const { error } = await supabase.from('users').delete().eq('user_id', userId);
        if (error) return res.status(500).json({ error: 'Delete error: ' + error.message });
        return res.status(200).json({ message: 'ลบสมาชิกเรียบร้อยแล้ว' });
      }

      return res.status(400).json({ error: 'action ไม่ถูกต้อง' });
    }

    // ----- GET: รายชื่อสมาชิกทั้งหมด -----
    const { data: users, error } = await supabase.from('users').select('*').order('role', { ascending: false }).order('full_name');
    if (error) return res.status(500).json({ error: 'Query error: ' + error.message });

    const usersWithCount = await Promise.all(
      (users || []).map(async (u) => {
        const { count } = await supabase.from('borrow_transactions').select('*', { count: 'exact', head: true }).eq('user_id', u.user_id);
        return { ...u, borrow_count: count || 0 };
      })
    );

    return res.status(200).json({ users: usersWithCount, current_admin_id: currentAdminId });
  } catch (err) {
    return res.status(500).json({ error: 'Server crash: ' + err.message });
  }
}
