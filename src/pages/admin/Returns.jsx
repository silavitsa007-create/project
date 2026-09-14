import { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { api } from '../../api';
import { formatThaiDate } from '../../utils';

export default function Returns() {
  const [borrows, setBorrows] = useState([]);
  const [flash, setFlash] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const data = await api.adminReturns();
      setBorrows(data.borrows);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load();

    // ----- ดึงข้อมูลใหม่แบบเงียบๆ ทุก 15 วินาที ไม่ต้องกดรีเฟรชเอง -----
    const interval = setInterval(() => load(true), 15000);
    return () => clearInterval(interval);
  }, []);

  async function handleReturn(borrowId) {
    if (!confirm('ยืนยันว่าได้รับคืนหนังสือเล่มนี้แล้ว?')) return;
    try {
      const res = await api.adminMarkReturned(borrowId);
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
          <div className="icon">🔄</div>
          <div>
            <h1>รายการหนังสือที่กำลังถูกยืมอยู่</h1>
            <p>บันทึกการรับคืนหนังสือจากสมาชิก สต็อกจะถูกอัปเดตอัตโนมัติ</p>
          </div>
        </div>


        {flash && (
          <div className={`alert alert-${flash.type === 'error' ? 'error' : 'success'}`}>
            {flash.message}
          </div>
        )}

        {loading ? (
          <div className="empty-state">กำลังโหลด...</div>
        ) : borrows.length === 0 ? (
          <div className="empty-state">ไม่มีหนังสือที่ถูกยืมอยู่ในขณะนี้</div>
        ) : (
          <table className="book-table">
            <thead>
              <tr>
                <th>ลำดับ</th>
                <th>สมาชิก</th>
                <th>รหัสหนังสือ</th>
                <th>ชื่อหนังสือ</th>
                <th>วันที่อนุมัติ</th>
                <th>กำหนดคืน</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {borrows.map((r, index) => (
                <tr key={r.borrow_id}>
                  <td>{index + 1}</td>
                  <td>
                    {r.full_name}<br />
                    <small style={{ color: '#888' }}>{r.phone || '-'}</small>
                  </td>
                  <td>{r.book_code}</td>
                  <td>{r.title}</td>
                  <td>{formatThaiDate(r.approve_date)}</td>
                  <td>{formatThaiDate(r.due_date)}</td>
                  <td>
                    {r.days_overdue > 0 ? (
                      <span className="badge badge-unavailable">เกินกำหนด {r.days_overdue} วัน</span>
                    ) : (
                      <span className="badge badge-available">ปกติ</span>
                    )}
                  </td>
                  <td>
                    <button className="btn-sm btn-approve" onClick={() => handleReturn(r.borrow_id)}>
                      รับคืนแล้ว
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
