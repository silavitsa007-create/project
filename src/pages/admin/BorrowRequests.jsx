import { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { api } from '../../api';
import { formatThaiDate } from '../../utils';

export default function BorrowRequests() {
  const [requests, setRequests] = useState([]);
  const [flash, setFlash] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const data = await api.adminBorrowRequests();
      setRequests(data.requests);
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

  async function handleDecide(borrowId, action) {
    const confirmMsg = action === 'approve' ? 'อนุมัติคำขอยืมนี้?' : 'ปฏิเสธคำขอยืมนี้?';
    if (!confirm(confirmMsg)) return;

    try {
      const res = await api.adminDecideBorrow(borrowId, action);
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
          <div className="icon">📝</div>
          <div>
            <h1>คำขอยืมหนังสือที่รออนุมัติ</h1>
            <p>ตรวจสอบคำขอจากสมาชิก แล้วกดอนุมัติหรือปฏิเสธได้เลย</p>
          </div>
        </div>


        {flash && (
          <div className={`alert alert-${flash.type === 'error' ? 'error' : 'success'}`}>
            {flash.message}
          </div>
        )}

        {loading ? (
          <div className="empty-state">กำลังโหลด...</div>
        ) : requests.length === 0 ? (
          <div className="empty-state">ไม่มีคำขอยืมที่รออนุมัติในขณะนี้ 🎉</div>
        ) : (
          <table className="book-table">
            <thead>
              <tr>
                <th>ลำดับ</th>
                <th>วันที่ขอ</th>
                <th>สมาชิก</th>
                <th>รหัสหนังสือ</th>
                <th>ชื่อหนังสือ</th>
                <th>ผู้แต่ง</th>
                <th>ระยะเวลายืม</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r, index) => (
                <tr key={r.borrow_id}>
                  <td>{index + 1}</td>
                  <td>{formatThaiDate(r.request_date)}</td>
                  <td>
                    {r.full_name}<br />
                    <small style={{ color: '#888' }}>{r.phone || '-'}</small>
                  </td>
                  <td>{r.book_code}</td>
                  <td>{r.title}</td>
                  <td>{r.author}</td>
                  <td><span className="badge badge-available">{r.requested_days ?? 14} วัน</span></td>
                  <td>
                    <div className="action-group">
                      <button className="btn-sm btn-approve" onClick={() => handleDecide(r.borrow_id, 'approve')}>
                        อนุมัติ
                      </button>
                      <button className="btn-sm btn-reject" onClick={() => handleDecide(r.borrow_id, 'reject')}>
                        ปฏิเสธ
                      </button>
                    </div>
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
