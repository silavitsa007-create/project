import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSavedTheme, applyTheme } from '../theme';
import logo from '../assets/logo.png';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showQR, setShowQR] = useState(false);
  const [isDark, setIsDark] = useState(getSavedTheme() === 'dark');

  function toggleTheme() {
    const next = isDark ? 'light' : 'dark';
    applyTheme(next);
    setIsDark(!isDark);
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  if (!user) return null;
  const isAdmin = user.role === 'admin';

  const siteUrl = window.location.origin;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(siteUrl)}`;

  return (
    <>
      <div className="navbar">
        <div className="brand">
          <img src={logo} alt="โลโก้" className="navbar-logo" /> ระบบยืม-คืนหนังสือ ภายในวิทยาลัยเทคโนโลยีอุดมศึกษาพณิชยการ {isAdmin && <span className="admin-badge">ADMIN</span>}
        </div>
        <div className="nav-links">
          <span>สวัสดี, {user.full_name}</span>
          {isAdmin ? (
            <>
              <Link to="/admin/dashboard">แดชบอร์ด</Link>
              <Link to="/admin/borrow-requests">คำขอยืมหนังสือ</Link>
              <Link to="/admin/returns">รับคืนหนังสือ</Link>
              <Link to="/admin/manage-books">จัดการหนังสือ</Link>
              <Link to="/admin/manage-users">จัดการสมาชิก</Link>
            </>
          ) : (
            <>
              <Link to="/">ค้นหาหนังสือ</Link>
              <Link to="/my-borrows">ประวัติการยืมของฉัน</Link>
              <Link to="/profile">ข้อมูลส่วนตัว</Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setShowQR(true)}
            style={{
              background: 'none',
              border: '1px solid #475569',
              color: '#cbd5e1',
              borderRadius: 6,
              padding: '5px 12px',
              fontSize: 14,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginLeft: 18,
            }}
          >
            📱 QR Code
          </button>
          <button type="button" onClick={toggleTheme} className="theme-toggle-btn" title="สลับโหมดสว่าง/มืด">
            {isDark ? '☀️ โหมดสว่าง' : '🌙 โหมดมืด'}
          </button>
          <a href="#" onClick={handleLogout}>ออกจากระบบ</a>
        </div>
      </div>

      {showQR && (
        <div
          onClick={() => setShowQR(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: '28px 32px',
              textAlign: 'center',
              boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
              maxWidth: 340,
            }}
          >
            <h3 style={{ margin: '0 0 4px 0', color: '#1e293b' }}>สแกนเพื่อเข้าเว็บไซต์</h3>
            <p style={{ margin: '0 0 18px 0', fontSize: 13, color: '#64748b' }}>
              ให้คนอื่นสแกน QR นี้เพื่อเปิดเว็บระบบยืม-คืนหนังสือ
            </p>
            <img
              src={qrImageUrl}
              alt="QR Code เข้าเว็บไซต์"
              style={{ width: 220, height: 220, borderRadius: 8, border: '1px solid #e5e9f0' }}
            />
            <div style={{ marginTop: 14, fontSize: 13, color: '#2563eb', wordBreak: 'break-all' }}>
              {siteUrl}
            </div>
            <button
              type="button"
              onClick={() => setShowQR(false)}
              style={{
                marginTop: 18,
                background: '#1e293b',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '9px 24px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </>
  );
}
