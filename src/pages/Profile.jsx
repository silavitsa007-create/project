import { useEffect, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { api } from '../api';
import { PasswordInput } from '../components/PasswordInput';

const emptyForm = { full_name: '', email: '', phone: '', address: '', new_password: '', confirm_password: '' };

export default function Profile() {
  const [username, setUsername] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProfile().then((data) => {
      setUsername(data.user.username);
      setForm({
        full_name: data.user.full_name || '',
        email: data.user.email || '',
        phone: data.user.phone || '',
        address: data.user.address || '',
        new_password: '',
        confirm_password: '',
      });
    }).finally(() => setLoading(false));
  }, []);

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    try {
      await api.updateProfile(form);
      setSuccess(true);
      setForm({ ...form, new_password: '', confirm_password: '' });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="app">
      <Navbar />
      <div className="container">
        <div className="page-intro">
          <div className="icon">👤</div>
          <div>
            <h1>ข้อมูลส่วนตัว</h1>
            <p>แก้ไขข้อมูลบัญชีและเปลี่ยนรหัสผ่านของคุณได้ที่นี่</p>
          </div>
        </div>

        <div className="auth-box" style={{ margin: '0 auto' }}>
          {success && <div className="alert alert-success">บันทึกข้อมูลสำเร็จแล้ว</div>}
          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div className="empty-state">กำลังโหลด...</div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>ชื่อผู้ใช้ (Username)</label>
                <input type="text" value={username} disabled style={{ background: '#f1f5f9', color: '#888' }} />
              </div>
              <div className="form-group">
                <label>ชื่อ-นามสกุล</label>
                <input type="text" value={form.full_name} onChange={update('full_name')}
                       placeholder="เช่น สมชาย ใจดี" required />
              </div>
              <div className="form-group">
                <label>อีเมล</label>
                <input type="email" value={form.email} onChange={update('email')}
                       placeholder="example@email.com" required />
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
                <input type="text" value={form.address} onChange={update('address')} placeholder="ที่อยู่ปัจจุบันของคุณ" />
              </div>

              <hr style={{ margin: '18px 0', border: 'none', borderTop: '1px solid #eee' }} />
              <p style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>
                เปลี่ยนรหัสผ่าน (เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)
              </p>

              <div className="form-group">
                <label>รหัสผ่านใหม่</label>
                <PasswordInput value={form.new_password} onChange={update('new_password')} placeholder="เว้นว่างถ้าไม่ต้องการเปลี่ยน" />
              </div>
              <div className="form-group">
                <label>ยืนยันรหัสผ่านใหม่</label>
                <PasswordInput value={form.confirm_password} onChange={update('confirm_password')} placeholder="กรอกรหัสผ่านใหม่อีกครั้ง" />
              </div>

              <button type="submit" className="btn">บันทึกการเปลี่ยนแปลง</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
