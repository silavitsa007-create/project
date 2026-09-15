import { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { api } from '../../api';

const emptyForm = {
  user_id: null,
  username: '',
  full_name: '',
  email: '',
  phone: '',
  address: '',
  role: 'user',
  status: 'active',
};

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [currentAdminId, setCurrentAdminId] = useState(null);
  const [form, setForm] = useState(null); // null = ไม่ได้เปิดฟอร์มแก้ไข
  const [flash, setFlash] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const data = await api.adminGetUsers();
      setUsers(data.users);
      setCurrentAdminId(data.current_admin_id);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 15000);
    return () => clearInterval(interval);
  }, []);

  function startEdit(u) {
    setForm({
      user_id: u.user_id,
      username: u.username,
      full_name: u.full_name,
      email: u.email,
      phone: u.phone || '',
      address: u.address || '',
      role: u.role,
      status: u.status,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setForm(null);
  }

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFlash(null);
    try {
      const res = await api.adminUpdateUser(form);
      setFlash({ type: 'success', message: res.message });
      setForm(null);
      load();
    } catch (err) {
      setFlash({ type: 'error', message: err.message });
    }
  }

  async function handleToggleStatus(userId) {
    if (!confirm('ยืนยันเปลี่ยนสถานะบัญชีนี้?')) return;
    try {
      const res = await api.adminToggleUserStatus(userId);
      setFlash({ type: 'success', message: res.message });
      load();
    } catch (err) {
      setFlash({ type: 'error', message: err.message });
    }
  }

  async function handleToggleRole(userId) {
    if (!confirm('ยืนยันเปลี่ยนสิทธิ์ของสมาชิกนี้?')) return;
    try {
      const res = await api.adminToggleUserRole(userId);
      setFlash({ type: 'success', message: res.message });
      load();
    } catch (err) {
      setFlash({ type: 'error', message: err.message });
    }
  }

  async function handleDelete(userId) {
    if (!confirm('ยืนยันลบสมาชิกนี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;
    try {
      const res = await api.adminDeleteUser(userId);
      setFlash({ type: 'success', message: res.message });
      load();
    } catch (err) {
      setFlash({ type: 'error', message: err.message });
    }
  }

  return (
    <div className="app">
      <Navbar />
      <div className="container">
        <div className="page-intro">
          <div className="icon">👥</div>
          <div>
            <h1>จัดการสมาชิก</h1>
            <p>แก้ไขข้อมูล ระงับบัญชี หรือกำหนดสิทธิ์ผู้ดูแลระบบให้สมาชิก</p>
          </div>
        </div>

        {flash && (
          <div className={`alert alert-${flash.type === 'error' ? 'error' : 'success'}`}>
            {flash.message}
          </div>
        )}

        {form && (
          <>
            <h2 className="section-title" style={{ marginTop: 0 }}>แก้ไขข้อมูล: {form.full_name}</h2>
            <div className="auth-box" style={{ margin: '0 auto 24px auto', width: '100%', maxWidth: 700 }}>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>ชื่อผู้ใช้ (Username)</label>
                  <input type="text" value={form.username} onChange={update('username')} minLength={4} required />
                </div>
                <div className="form-group">
                  <label>ชื่อ-นามสกุล</label>
                  <input type="text" value={form.full_name} onChange={update('full_name')} required />
                </div>
                <div className="form-group">
                  <label>อีเมล</label>
                  <input type="email" value={form.email} onChange={update('email')} required />
                </div>
                <div className="form-group">
                  <label>เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    value={form.phone}
                    maxLength={10}
                    inputMode="numeric"
                    placeholder="0812345678"
                    onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9]/g, '') })}
                  />
                </div>
                <div className="form-group">
                  <label>ที่อยู่</label>
                  <input type="text" value={form.address} onChange={update('address')} placeholder="ที่อยู่ปัจจุบันของสมาชิก" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>สิทธิ์การใช้งาน</label>
                    <select value={form.role} onChange={update('role')} disabled={form.user_id === currentAdminId}>
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>สถานะบัญชี</label>
                    <select value={form.status} onChange={update('status')} disabled={form.user_id === currentAdminId}>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
                {form.user_id === currentAdminId && (
                  <small style={{ color: '#888' }}>* ไม่สามารถเปลี่ยนสิทธิ์/สถานะของบัญชีตัวเองได้</small>
                )}

                <button type="submit" className="btn" style={{ marginTop: 12 }}>บันทึกการแก้ไข</button>
                <button type="button" className="btn" style={{ background: '#94a3b8', marginTop: 8 }} onClick={cancelEdit}>
                  ยกเลิก
                </button>
              </form>
            </div>
          </>
        )}

        <h2 className="section-title" style={form ? {} : { marginTop: 0 }}>
          รายชื่อสมาชิกทั้งหมด ({users.length} คน)
        </h2>

        {loading ? (
          <div className="empty-state">กำลังโหลด...</div>
        ) : users.length === 0 ? (
          <div className="empty-state">ยังไม่มีสมาชิกในระบบ</div>
        ) : (
          <table className="book-table">
            <thead>
              <tr>
                <th>ชื่อ-นามสกุล</th>
                <th>ชื่อผู้ใช้</th>
                <th>อีเมล / เบอร์โทร</th>
                <th>สิทธิ์</th>
                <th>สถานะ</th>
                <th>ประวัติยืม</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.user_id === currentAdminId;
                return (
                  <tr key={u.user_id}>
                    <td>{u.full_name} {isSelf && <small style={{ color: '#888' }}>(คุณ)</small>}</td>
                    <td>{u.username}</td>
                    <td>
                      {u.email}<br />
                      <small style={{ color: '#888' }}>{u.phone || '-'}</small>
                    </td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-available' : 'badge-unavailable'}`}>
                        {u.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.status === 'active' ? 'badge-available' : 'badge-unavailable'}`}>
                        {u.status === 'active' ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td>{u.borrow_count} ครั้ง</td>
                    <td>
                      <div className="action-group" style={{ flexWrap: 'wrap' }}>
                        <button className="btn-sm" style={{ background: '#2563eb' }} onClick={() => startEdit(u)}>
                          แก้ไข
                        </button>
                        {!isSelf && (
                          <>
                            <button
                              className={`btn-sm ${u.status === 'active' ? 'btn-reject' : 'btn-approve'}`}
                              onClick={() => handleToggleStatus(u.user_id)}
                            >
                              {u.status === 'active' ? 'ระงับ' : 'ปลดระงับ'}
                            </button>
                            <button className="btn-sm" style={{ background: '#7c3aed' }} onClick={() => handleToggleRole(u.user_id)}>
                              {u.role === 'admin' ? 'ลดเป็น User' : 'ตั้งเป็น Admin'}
                            </button>
                            <button className="btn-sm btn-reject" onClick={() => handleDelete(u.user_id)}>
                              ลบ
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
