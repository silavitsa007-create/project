import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PasswordInput } from '../components/PasswordInput';
import logo from '../assets/logo.png';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const user = await login(username, password);
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="auth-box">
      <img src={logo} alt="โลโก้" className="auth-logo" />
      <h2>เข้าสู่ระบบ</h2>
      <p className="auth-subtitle">การยืม-คืนหนังสือภายในวิทยาลัยเทคโนโลยีอุดมศึกษาพณิชยการ</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>ชื่อผู้ใช้ (Username)</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                 placeholder="กรอกชื่อผู้ใช้ของคุณ" required />
        </div>
        <div className="form-group">
          <label>รหัสผ่าน</label>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="กรอกรหัสผ่านของคุณ" required />
        </div>
        <button type="submit" className="btn">เข้าสู่ระบบ</button>
      </form>

      <div className="switch-link">
        ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link>
      </div>
    </div>
  );
}
