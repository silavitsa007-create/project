import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { api, ASSET_BASE } from '../api';

export default function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(null);
  const [days, setDays] = useState(7);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getBookDetail(id);
      setBook(data.book);
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleBorrow() {
    if (!confirm('ยืนยันขอยืมหนังสือเล่มนี้?')) return;
    try {
      const res = await api.requestBorrow(book.book_id, Number(days));
      setFlash({ type: 'success', message: res.message });
      load();
    } catch (err) {
      setFlash({ type: 'error', message: err.message });
    }
  }

  if (loading) {
    return (
      <div className="app">
        <Navbar />
        <div className="container"><div className="empty-state">กำลังโหลด...</div></div>
      </div>
    );
  }

  if (!book) return null;

  return (
    <div className="app">
      <Navbar />
      <div className="container">
        <Link to="/" className="back-link">← กลับไปหน้าค้นหา</Link>

        {flash && (
          <div className={`alert alert-${flash.type === 'error' ? 'error' : 'success'}`}>
            {flash.message}
          </div>
        )}

        <div className="book-detail">
          <div>
            {book.cover_image ? (
              <img src={`${ASSET_BASE}/${book.cover_image}`} alt="ปกหนังสือ" className="book-detail-cover" />
            ) : (
              <div className="book-detail-cover-placeholder">📕</div>
            )}
          </div>

          <div className="book-detail-info">
            <h1>{book.title}</h1>
            <div className="author">โดย {book.author}</div>

            <div className="book-detail-meta">
              <div className="row"><span>รหัสหนังสือ</span>{book.book_code}</div>
              <div className="row"><span>หมวดหมู่</span>{book.category_name}</div>
              {book.publisher && <div className="row"><span>สำนักพิมพ์</span>{book.publisher}</div>}
              {book.isbn && <div className="row"><span>ISBN</span>{book.isbn}</div>}
              <div className="row"><span>จำนวนคงเหลือ</span>{book.available_copies} / {book.total_copies} เล่ม</div>
              <div className="row">
                <span>สถานะ</span>
                {book.available_copies > 0 ? (
                  <span className="badge badge-available">ว่าง ให้ยืมได้</span>
                ) : book.reserve_count > 0 ? (
                  <span className="badge badge-unavailable">มีคิวจอง {book.reserve_count} คน</span>
                ) : (
                  <span className="badge badge-unavailable">ถูกยืมทั้งหมด</span>
                )}
              </div>
            </div>

            {book.description && (
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>รายละเอียดเพิ่มเติม</div>
                <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                  {book.description}
                </div>
              </div>
            )}

            <div className="book-detail-actions">
              {book.my_status === 'pending' ? (
                <span className="badge badge-unavailable">คุณส่งคำขอยืมเล่มนี้แล้ว รอ Admin อนุมัติ</span>
              ) : book.my_status === 'borrowed' ? (
                <span className="badge badge-available">คุณกำลังยืมเล่มนี้อยู่</span>
              ) : book.available_copies > 0 ? (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: 14 }}>
                    ต้องการยืม
                    <input
                      type="number"
                      min={1}
                      max={7}
                      value={days}
                      onChange={(e) => setDays(Math.min(7, Math.max(1, Number(e.target.value) || 1)))}
                      style={{ width: 55, padding: 6, border: '1px solid #ccc', borderRadius: 6, margin: '0 4px' }}
                    />
                    วัน
                  </label>
                  <button className="btn" style={{ width: 'auto', padding: '9px 22px' }} onClick={handleBorrow}>
                    ขอยืมหนังสือเล่มนี้
                  </button>
                </div>
              ) : (
                <span className="badge badge-unavailable">หนังสือเล่มนี้ถูกยืมหมดแล้ว</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
