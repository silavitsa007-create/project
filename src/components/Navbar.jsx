import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  if (!user) return null;
  const isAdmin = user.role === 'admin';

  return (
    <div className="navbar">
      <div className="brand">
        <img src={logo} alt="โลโก้" className="navbar-logo" /> ระบบยืม-คืนหนังสือ ภายในวิทยาลัยอุดมศึกษาพณิชยการ {isAdmin && <span className="admin-badge">ADMIN</span>}
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
        <a href="#" onClick={handleLogout}>ออกจากระบบ</a>
      </div>
    </div>
  );
}
