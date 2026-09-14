import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { PasswordInput } from '../components/PasswordInput';

const emptyForm = { username: '', full_name: '', email: '', phone: '', address: '', password: '', confirm_password: '' };

export default function Register() {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm_password) {
      setError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    try {
      await api.register(form);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="auth-box">
      <h2>สมัครสมาชิก</h2>

      {success && (
        <div className="alert alert-success">สมัครสมาชิกสำเร็จแล้ว! กำลังพาไปหน้าเข้าสู่ระบบ...</div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      {!success && (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>ชื่อผู้ใช้ (Username)</label>
            <input type="text" value={form.username} onChange={update('username')}
                   placeholder="ตั้งชื่อผู้ใช้ อย่างน้อย 4 ตัวอักษร" required />
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
          <div className="form-group">
            <label>รหัสผ่าน</label>
            <PasswordInput value={form.password} onChange={update('password')} placeholder="อย่างน้อย 6 ตัวอักษร" required />
          </div>
          <div className="form-group">
            <label>ยืนยันรหัสผ่าน</label>
            <PasswordInput value={form.confirm_password} onChange={update('confirm_password')} placeholder="กรอกรหัสผ่านอีกครั้ง" required />
          </div>
          <button type="submit" className="btn">สมัครสมาชิก</button>
        </form>
      )}

      <div className="switch-link">
        มีบัญชีอยู่แล้ว? <Link to="/login">เข้าสู่ระบบ</Link>
      </div>
    </div>
  );
}
