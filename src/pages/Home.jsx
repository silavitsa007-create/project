import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { api, ASSET_BASE } from '../api';

export default function Home() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [flash, setFlash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState({}); // { [book_id]: days }

  async function loadBooks(kw = keyword, cat = categoryId, silent = false) {
    if (!silent) setLoading(true);
    try {
      const data = await api.getBooks(kw, cat);
      setBooks(data.books);
      setCategories(data.categories);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadBooks();

    // ----- ดึงข้อมูลใหม่แบบเงียบๆ ทุก 15 วินาที ไม่ต้องกดรีเฟรชเอง -----
    const interval = setInterval(() => loadBooks(keyword, categoryId, true), 15000);
    return () => clearInterval(interval);
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    loadBooks();
  }

  function getDays(bookId) {
    return selectedDays[bookId] ?? 7;
  }

  async function handleBorrow(bookId) {
    if (!confirm('ยืนยันขอยืมหนังสือเล่มนี้?')) return;
    try {
      const res = await api.requestBorrow(bookId, getDays(bookId));
      setFlash({ type: 'success', message: res.message });
      loadBooks();
    } catch (err) {
      setFlash({ type: 'error', message: err.message });
    }
  }

  return (
    <div className="app">
      <Navbar />
      <div className="container">
        <div className="page-intro">
          <div className="icon">🔍</div>
          <div>
            <h1>ค้นหาหนังสือ</h1>
            <p>เลือกหนังสือที่สนใจแล้วกดขอยืมได้เลย ระบบจะแจ้งเตือน Admin ให้อนุมัติต่อไป</p>
          </div>
        </div>
        {flash && (
          <div className={`alert alert-${flash.type === 'error' ? 'error' : 'success'}`}>
            {flash.message}
          </div>
        )}

        <form className="search-box" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="ค้นหาจากชื่อหนังสือ / รหัส / ผู้แต่ง"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">-- ทุกหมวดหมู่ --</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.category_name}
              </option>
            ))}
          </select>
          <button type="submit">ค้นหา</button>
        </form>

        {loading ? (
          <div className="empty-state">กำลังโหลด...</div>
        ) : books.length === 0 ? (
          <div className="empty-state">ไม่พบหนังสือที่ตรงกับเงื่อนไขการค้นหา</div>
        ) : (
          <table className="book-table">
            <thead>
              <tr>
                <th>ปก</th>
                <th>รหัสหนังสือ</th>
                <th>ชื่อหนังสือ</th>
                <th>ผู้แต่ง</th>
                <th>หมวดหมู่</th>
                <th>สถานะ</th>
                <th>คงเหลือ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book.book_id}>
                  <td>
                    <Link to={`/books/${book.book_id}`}>
                      {book.cover_image ? (
                        <img
                          src={`${ASSET_BASE}/${book.cover_image}`}
                          alt="ปกหนังสือ"
                          style={{ width: 40, height: 55, objectFit: 'cover', borderRadius: 4, border: '1px solid #eee' }}
                        />
                      ) : (
                        <div style={{ width: 40, height: 55, background: '#f1f5f9', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                          📕
                        </div>
                      )}
                    </Link>
                  </td>
                  <td>{book.book_code}</td>
                  <td>
                    <Link to={`/books/${book.book_id}`} className="book-title-link">
                      {book.title}
                    </Link>
                  </td>
                  <td>{book.author}</td>
                  <td>{book.category_name}</td>
                  <td>
                    {book.available_copies > 0 ? (
                      <span className="badge badge-available">ว่าง ให้ยืมได้</span>
                    ) : book.reserve_count > 0 ? (
                      <span className="badge badge-unavailable">มีคิวจอง {book.reserve_count} คน</span>
                    ) : (
                      <span className="badge badge-unavailable">ถูกยืมทั้งหมด</span>
                    )}
                  </td>
                  <td>{book.available_copies} / {book.total_copies}</td>
                  <td>
                    {book.my_status === 'pending' ? (
                      <span className="badge badge-unavailable">รอ Admin อนุมัติ</span>
                    ) : book.my_status === 'borrowed' ? (
                      <span className="badge badge-available">คุณกำลังยืมอยู่</span>
                    ) : book.available_copies > 0 ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          type="number"
                          min={1}
                          max={7}
                          value={getDays(book.book_id)}
                          onChange={(e) => {
                            const val = Math.min(7, Math.max(1, Number(e.target.value) || 1));
                            setSelectedDays({ ...selectedDays, [book.book_id]: val });
                          }}
                          style={{ width: 55, padding: '5px 6px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13 }}
                        />
                        <span style={{ fontSize: 12, color: '#888' }}>วัน</span>
                        <button className="btn-sm btn-approve" onClick={() => handleBorrow(book.book_id)}>
                          ขอยืม
                        </button>
                      </div>
                    ) : (
                      <button className="btn-sm" style={{ background: '#94a3b8', cursor: 'not-allowed' }} disabled>
                        ไม่ว่าง
                      </button>
                    )}
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
