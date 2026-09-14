import { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { api, ASSET_BASE } from '../../api';

const emptyForm = {
  book_id: null,
  book_code: '',
  title: '',
  author: '',
  category_id: '',
  publisher: '',
  isbn: '',
  description: '',
  total_copies: 1,
  cover_image: null, // path รูปเดิม (ตอนแก้ไข)
};

export default function ManageBooks() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [coverFile, setCoverFile] = useState(null); // ไฟล์รูปใหม่ที่เลือก (ยังไม่อัปโหลด)
  const [newCategory, setNewCategory] = useState('');
  const [flash, setFlash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const isEditing = form.book_id !== null;

  async function load() {
    setLoading(true);
    try {
      const [bookData, catData] = await Promise.all([
        api.adminGetBooks(),
        api.adminGetCategories(),
      ]);
      setBooks(bookData.books);
      setCategories(catData.categories);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  function startEdit(book) {
    setForm({
      book_id: book.book_id,
      book_code: book.book_code,
      title: book.title,
      author: book.author,
      category_id: book.category_id,
      publisher: book.publisher || '',
      isbn: book.isbn || '',
      description: book.description || '',
      total_copies: book.total_copies,
      cover_image: book.cover_image || null,
    });
    setCoverFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setForm(emptyForm);
    setCoverFile(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFlash(null);
    try {
      const payload = { ...form, total_copies: Number(form.total_copies), category_id: Number(form.category_id) };
      const res = isEditing ? await api.adminUpdateBook(payload) : await api.adminAddBook(payload);

      // ถ้ามีการเลือกไฟล์รูปใหม่ ให้อัปโหลดต่อทันที (ใช้ book_id ที่เพิ่งสร้าง/แก้ไข)
      if (coverFile) {
        const bookId = isEditing ? form.book_id : res.book_id;
        setUploading(true);
        await api.adminUploadCover(bookId, coverFile);
        setUploading(false);
      }

      setFlash({ type: 'success', message: res.message });
      setForm(emptyForm);
      setCoverFile(null);
      load();
    } catch (err) {
      setUploading(false);
      setFlash({ type: 'error', message: err.message });
    }
  }

  async function handleDelete(bookId) {
    if (!confirm('ยืนยันลบหนังสือเล่มนี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;
    try {
      const res = await api.adminDeleteBook(bookId);
      setFlash({ type: 'success', message: res.message });
      load();
    } catch (err) {
      setFlash({ type: 'error', message: err.message });
    }
  }

  async function handleAddCategory(e) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    try {
      const res = await api.adminAddCategory(newCategory.trim());
      setFlash({ type: 'success', message: res.message });
      setNewCategory('');
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
          <div className="icon">📚</div>
          <div>
            <h1>จัดการหนังสือ</h1>
            <p>เพิ่ม แก้ไข หรือลบข้อมูลหนังสือและหมวดหมู่ในระบบ</p>
          </div>
        </div>
        {flash && (
          <div className={`alert alert-${flash.type === 'error' ? 'error' : 'success'}`}>
            {flash.message}
          </div>
        )}

        <h2 className="section-title" style={{ marginTop: 0 }}>
          {isEditing ? `แก้ไขหนังสือ: ${form.title}` : 'เพิ่มหนังสือใหม่'}
        </h2>

        <div className="auth-box" style={{ margin: '0 0 24px 0', width: '100%', maxWidth: 700 }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>รูปปกหนังสือ</label>
              {form.cover_image && (
                <div style={{ marginBottom: 8 }}>
                  <img
                    src={`${ASSET_BASE}/${form.cover_image}`}
                    alt="รูปปกเดิม"
                    style={{ width: 80, height: 110, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }}
                  />
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                    รูปปกปัจจุบัน (เลือกไฟล์ใหม่เพื่อเปลี่ยน)
                  </div>
                </div>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setCoverFile(e.target.files[0] || null)}
              />
              <small style={{ color: '#888' }}>รองรับ JPG, PNG, WEBP ขนาดไม่เกิน 2MB</small>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>รหัสหนังสือ</label>
                <input type="text" value={form.book_code} onChange={update('book_code')} required />
              </div>
              <div className="form-group">
                <label>หมวดหมู่</label>
                <select value={form.category_id} onChange={update('category_id')} required>
                  <option value="">-- เลือกหมวดหมู่ --</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>ชื่อหนังสือ</label>
              <input type="text" value={form.title} onChange={update('title')} required />
            </div>
            <div className="form-group">
              <label>ผู้แต่ง</label>
              <input type="text" value={form.author} onChange={update('author')} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>สำนักพิมพ์</label>
                <input type="text" value={form.publisher} onChange={update('publisher')} placeholder="เช่น สำนักพิมพ์แจ่มใส" />
              </div>
              <div className="form-group">
                <label>ISBN</label>
                <input type="text" value={form.isbn} onChange={update('isbn')} placeholder="เช่น 9786160635238" />
              </div>
            </div>

            <div className="form-group">
              <label>รายละเอียดเพิ่มเติม</label>
              <textarea
                value={form.description}
                onChange={update('description')}
                rows={4}
                placeholder="เนื้อเรื่องย่อ คำโปรย หรือรายละเอียดอื่นๆ ของหนังสือ"
                style={{ width: '100%', padding: '9px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            <div className="form-group">
              <label>จำนวนเล่มทั้งหมด</label>
              <input type="number" min="1" value={form.total_copies} onChange={update('total_copies')} required />
            </div>

            <button type="submit" className="btn" disabled={uploading}>
              {uploading ? 'กำลังอัปโหลดรูป...' : isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มหนังสือ'}
            </button>
            {isEditing && (
              <button type="button" className="btn" style={{ background: '#94a3b8', marginTop: 8 }} onClick={cancelEdit}>
                ยกเลิก
              </button>
            )}
          </form>
        </div>

        <details style={{ marginBottom: 24 }}>
          <summary style={{ cursor: 'pointer', color: '#2563eb', fontSize: 14 }}>+ เพิ่มหมวดหมู่ใหม่</summary>
          <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: 10, marginTop: 10, maxWidth: 400 }}>
            <input
              type="text"
              placeholder="ชื่อหมวดหมู่ใหม่"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              required
              style={{ flex: 1, padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6 }}
            />
            <button type="submit" className="btn-sm btn-approve">เพิ่ม</button>
          </form>
        </details>

        <h2 className="section-title">รายการหนังสือทั้งหมด ({books.length} เล่ม)</h2>

        {loading ? (
          <div className="empty-state">กำลังโหลด...</div>
        ) : books.length === 0 ? (
          <div className="empty-state">ยังไม่มีหนังสือในระบบ</div>
        ) : (
          <table className="book-table">
            <thead>
              <tr>
                <th>ปก</th>
                <th>รหัส</th>
                <th>ชื่อหนังสือ</th>
                <th>ผู้แต่ง</th>
                <th>หมวดหมู่</th>
                <th>คงเหลือ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr key={b.book_id}>
                  <td>
                    {b.cover_image ? (
                      <img
                        src={`${ASSET_BASE}/${b.cover_image}`}
                        alt="ปกหนังสือ"
                        style={{ width: 40, height: 55, objectFit: 'cover', borderRadius: 4, border: '1px solid #eee' }}
                      />
                    ) : (
                      <div style={{ width: 40, height: 55, background: '#f1f5f9', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                        📕
                      </div>
                    )}
                  </td>
                  <td>{b.book_code}</td>
                  <td>{b.title}</td>
                  <td>{b.author}</td>
                  <td>{b.category_name}</td>
                  <td>{b.available_copies} / {b.total_copies}</td>
                  <td>
                    <div className="action-group">
                      <button className="btn-sm" style={{ background: '#2563eb' }} onClick={() => startEdit(b)}>
                        แก้ไข
                      </button>
                      <button className="btn-sm btn-reject" onClick={() => handleDelete(b.book_id)}>
                        ลบ
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
