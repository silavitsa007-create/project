import { useEffect, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { api } from '../api';
import { formatThaiDate } from '../utils';

function statusLabel(status, dueDate) {
  if (status === 'borrowed' && dueDate && new Date(dueDate) < new Date(new Date().toDateString())) {
    return ['เกินกำหนดคืน', 'badge-unavailable'];
  }
  switch (status) {
    case 'pending': return ['รอ Admin อนุมัติ', 'badge-unavailable'];
    case 'borrowed': return ['กำลังยืม', 'badge-available'];
    case 'returned': return ['คืนแล้ว', 'badge-available'];
    case 'overdue': return ['เกินกำหนดคืน', 'badge-unavailable'];
    case 'rejected': return ['คำขอถูกปฏิเสธ', 'badge-unavailable'];
    default: return [status, 'badge-unavailable'];
  }
}

export default function MyBorrows() {
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);

  function load(silent = false) {
    return api.myBorrows().then((data) => setBorrows(data.borrows)).finally(() => {
      if (!silent) setLoading(false);
    });
  }

  useEffect(() => {
    load();

    // ----- ดึงข้อมูลใหม่แบบเงียบๆ ทุก 15 วินาที ไม่ต้องกดรีเฟรชเอง -----
    const interval = setInterval(() => load(true), 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app">
      <Navbar />
      <div className="container">
        <div className="page-intro">
          <div className="icon">📖</div>
          <div>
            <h1>ประวัติการยืม-คืนของฉัน</h1>
            <p>ตรวจสอบสถานะการยืมและกำหนดวันคืนของคุณได้ที่นี่</p>
          </div>
        </div>


        {loading ? (
          <div className="empty-state">กำลังโหลด...</div>
        ) : borrows.length === 0 ? (
          <div className="empty-state">คุณยังไม่มีประวัติการยืมหนังสือ</div>
        ) : (
          <table className="book-table">
            <thead>
              <tr>
                <th>รหัสหนังสือ</th>
                <th>ชื่อหนังสือ</th>
                <th>วันที่ขอยืม</th>
                <th>กำหนดคืน</th>
                <th>วันที่คืนจริง</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {borrows.map((b) => {
                const [label, badgeClass] = statusLabel(b.status, b.due_date);
                return (
                  <tr key={b.borrow_id}>
                    <td>{b.book_code}</td>
                    <td>{b.title}</td>
                    <td>{formatThaiDate(b.request_date)}</td>
                    <td>{formatThaiDate(b.due_date)}</td>
                    <td>{formatThaiDate(b.return_date)}</td>
                    <td><span className={`badge ${badgeClass}`}>{label}</span></td>
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
