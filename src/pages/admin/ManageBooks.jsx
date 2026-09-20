import { useEffect, useMemo, useState } from 'react';
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
  cover_image: null,
};

export default function ManageBooks() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(null);

  // view: 'list' | 'detail' | 'form'
  const [view, setView] = useState('list');
  const [selectedBook, setSelectedBook] = useState(null);

  // ----- ค้นหา (หน้ารายการ) -----
  const [keyword, setKeyword] = useState('');
  const [searchCategoryId, setSearchCategoryId] = useState('');

  // ----- เพิ่มหมวดหมู่ -----
  const [newCategory, setNewCategory] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);

  // ----- ฟอร์มเพิ่ม/แก้ไขหนังสือ -----
  const [form, setForm] = useState(emptyForm);
  const [coverFile, setCoverFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // ----- ปรับจำนวนหนังสือ (หน้ารายละเอียด) -----
  const [qtyMode, setQtyMode] = useState(null); // null | 'increase' | 'decrease'
  const [qtyAmount, setQtyAmount] = useState(1);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const [bookData, catData] = await Promise.all([
        api.adminGetBooks(),
        api.adminGetCategories(),
      ]);
      setBooks(bookData.books);
      setCategories(catData.categories);
      // ถ้ากำลังดูรายละเอียดเล่มใดอยู่ ให้รีเฟรชข้อมูลเล่มนั้นด้วย
      setSelectedBook((prev) => {
        if (!prev) return prev;
        return bookData.books.find((b) => b.book_id === prev.book_id) || prev;
      });
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 15000);
    return () => clearInterval(interval);
  }, []);

  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const kw = keyword.trim().toLowerCase();
      const matchKeyword =
        !kw ||
        b.title.toLowerCase().includes(kw) ||
        b.book_code.toLowerCase().includes(kw) ||
        b.author.toLowerCase().includes(kw);
      const matchCategory = !searchCategoryId || String(b.category_id) === String(searchCategoryId);
      return matchKeyword && matchCategory;
    });
  }, [books, keyword, searchCategoryId]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    // การกรองเป็นแบบ live อยู่แล้ว (useMemo) ปุ่มค้นหาไว้กันคนเผลอกด Enter เฉยๆ
  }

  // ===================== เข้าหน้ารายละเอียด =====================
  function openDetail(book) {
    setSelectedBook(book);
    setQtyMode(null);
    setQtyAmount(1);
    setView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function backToList() {
    setSelectedBook(null);
    setView('list');
    setQtyMode(null);
  }

  // ===================== ฟอร์มเพิ่ม/แก้ไข =====================
  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  function openAddForm() {
    setForm(emptyForm);
    setCoverFile(null);
    setView('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openEditForm(book) {
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
    setView('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelForm() {
    // ถ้ามาจากหน้ารายละเอียด กลับไปหน้ารายละเอียดเดิม ไม่งั้นกลับไปหน้ารายการ
    if (selectedBook && form.book_id === selectedBook.book_id) {
      setView('detail');
    } else {
      setView('list');
    }
  }

  const isEditing = form.book_id !== null;

  async function handleSubmit(e) {
    e.preventDefault();
    setFlash(null);
    try {
      const payload = { ...form, total_copies: Number(form.total_copies), category_id: Number(form.category_id) };
      const res = isEditing ? await api.adminUpdateBook(payload) : await api.adminAddBook(payload);

      if (coverFile) {
        const bookId = isEditing ? form.book_id : res.book_id;
        setUploading(true);
        await api.adminUploadCover(bookId, coverFile);
        setUploading(false);
      }

      setFlash({ type: 'success', message: res.message });
      setCoverFile(null);
      await load();
      setView(isEditing ? 'detail' : 'list');
    } catch (err) {
      setUploading(false);
      setFlash({ type: 'error', message: err.message });
    }
  }

  // ===================== ปรับจำนวนหนังสือ =====================
  async function handleAdjustQty(direction) {
    const amount = Number(qtyAmount);
    if (!amount || amount <= 0) {
      setFlash({ type: 'error', message: 'กรุณากรอกจำนวนที่มากกว่า 0' });
      return;
    }
    const newTotal =
      direction === 'increase'
        ? selectedBook.total_copies + amount
        : selectedBook.total_copies - amount;

    if (newTotal < 0) {
      setFlash({ type: 'error', message: 'จำนวนที่ลดมากเกินไป (ติดลบ)' });
      return;
    }

    try {
      const payload = {
        book_id: selectedBook.book_id,
        book_code: selectedBook.book_code,
        title: selectedBook.title,
        author: selectedBook.author,
        category_id: selectedBook.category_id,
        publisher: selectedBook.publisher || '',
        isbn: selectedBook.isbn || '',
        description: selectedBook.description || '',
        total_copies: newTotal,
      };
      const res = await api.adminUpdateBook(payload);
      setFlash({ type: 'success', message: res.message });
      setQtyMode(null);
      setQtyAmount(1);
      await load();
    } catch (err) {
      setFlash({ type: 'error', message: err.message });
    }
  }

  // ===================== ลบหนังสือ =====================
  async function handleDelete(bookId) {
    if (!confirm('ยืนยันลบหนังสือเล่มนี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;
    try {
      const res = await api.adminDeleteBook(bookId);
      setFlash({ type: 'success', message: res.message });
      await load();
      backToList();
    } catch (err) {
      setFlash({ type: 'error', message: err.message });
    }
  }

  // ===================== เพิ่มหมวดหมู่ =====================
  async function handleAddCategory(e) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    try {
      const res = await api.adminAddCategory(newCategory.trim());
      setFlash({ type: 'success', message: res.message });
      setNewCategory('');
      setShowAddCategory(false);
      load();
    } catch (err) {
      setFlash({ type: 'error', message: err.message });
    }
  }

  const headerButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    border: 'none',
    borderRadius: 8,
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  return (
    <div className="app">
      <Navbar />
      <div className="container">
        <div className="page-intro">
          <div className="icon">📚</div>
          <div>
            <h1>จัดการหนังสือ</h1>
            <p>ค้นหา เพิ่ม แก้ไข หรือลบข้อมูลหนังสือและหมวดหมู่ในระบบ</p>
          </div>
        </div>

        {flash && (
          <div className={`alert alert-${flash.type === 'error' ? 'error' : 'success'}`}>
            {flash.message}
          </div>
        )}

        {/* ===================== หน้ารายการหนังสือ ===================== */}
        {view === 'list' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <h2 className="section-title" style={{ margin: 0 }}>รายการหนังสือ</h2>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setShowAddCategory(!showAddCategory)}
                  style={{ ...headerButtonStyle, background: '#f1f5f9', color: '#1e293b' }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> เพิ่มหมวดหมู่
                </button>
                <button
                  type="button"
                  onClick={openAddForm}
                  style={{
                    ...headerButtonStyle,
                    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                    color: '#fff',
                    boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
                  }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> เพิ่มหนังสือ
                </button>
              </div>
            </div>

            {showAddCategory && (
              <form
                onSubmit={handleAddCategory}
                style={{
                  display: 'flex', gap: 10, background: '#fff', border: '1px solid #e5e9f0',
                  borderRadius: 12, padding: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 20,
                }}
              >
                <input
                  type="text" placeholder="ชื่อหมวดหมู่ใหม่" value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)} autoFocus required
                  style={{ padding: '9px 12px', border: '1px solid #ccc', borderRadius: 8, fontSize: 14, width: 220 }}
                />
                <button type="submit" style={{ background: '#1e8449', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  บันทึก
                </button>
                <button type="button" onClick={() => { setShowAddCategory(false); setNewCategory(''); }}
                  style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  ยกเลิก
                </button>
              </form>
            )}

            {/* ----- กล่องค้นหา ----- */}
            <form className="search-box" onSubmit={handleSearchSubmit} style={{ marginBottom: 22 }}>
              <input
                type="text"
                placeholder="ค้นหาจากชื่อหนังสือ / รหัส / ผู้แต่ง"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <select value={searchCategoryId} onChange={(e) => setSearchCategoryId(e.target.value)}>
                <option value="">ทุกหมวดหมู่</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                ))}
              </select>
              <button type="submit">ค้นหา</button>
            </form>

            {loading ? (
              <div className="empty-state">กำลังโหลด...</div>
            ) : filteredBooks.length === 0 ? (
              <div className="empty-state">ไม่พบหนังสือที่ตรงกับการค้นหา</div>
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
                  </tr>
                </thead>
                <tbody>
                  {filteredBooks.map((b) => (
                    <tr key={b.book_id} onClick={() => openDetail(b)} style={{ cursor: 'pointer' }}>
                      <td>
                        {b.cover_image ? (
                          <img src={`${ASSET_BASE}/${b.cover_image}`} alt="ปกหนังสือ"
                            style={{ width: 40, height: 55, objectFit: 'cover', borderRadius: 4, border: '1px solid #eee' }} />
                        ) : (
                          <div style={{ width: 40, height: 55, background: '#f1f5f9', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                            📕
                          </div>
                        )}
                      </td>
                      <td>{b.book_code}</td>
                      <td className="book-title-link">{b.title}</td>
                      <td>{b.author}</td>
                      <td>{b.category_name}</td>
                      <td>{b.available_copies} / {b.total_copies}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* ===================== หน้ารายละเอียดหนังสือ ===================== */}
        {view === 'detail' && selectedBook && (
          <>
            <button type="button" onClick={backToList} className="back-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              ← กลับไปรายการหนังสือ
            </button>

            <div className="book-detail" style={{ marginTop: 16 }}>
              <div>
                {selectedBook.cover_image ? (
                  <img src={`${ASSET_BASE}/${selectedBook.cover_image}`} alt="ปกหนังสือ" className="book-detail-cover" />
                ) : (
                  <div className="book-detail-cover-placeholder">📕</div>
                )}
              </div>

              <div className="book-detail-info">
                <h1>{selectedBook.title}</h1>
                <div className="author">โดย {selectedBook.author}</div>

                <div className="book-detail-meta">
                  <div className="row"><span>รหัสหนังสือ</span>{selectedBook.book_code}</div>
                  <div className="row"><span>หมวดหมู่</span>{selectedBook.category_name}</div>
                  {selectedBook.publisher && <div className="row"><span>สำนักพิมพ์</span>{selectedBook.publisher}</div>}
                  {selectedBook.isbn && <div className="row"><span>ISBN</span>{selectedBook.isbn}</div>}
                  <div className="row"><span>จำนวนคงเหลือ</span>{selectedBook.available_copies} / {selectedBook.total_copies} เล่ม</div>
                  <div className="row"><span>กำลังถูกยืม</span>{selectedBook.total_copies - selectedBook.available_copies} เล่ม</div>
                </div>

                {selectedBook.description && (
                  <div style={{ marginBottom: 22 }}>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>รายละเอียดเพิ่มเติม</div>
                    <div className="book-detail-description">{selectedBook.description}</div>
                  </div>
                )}

                {/* ----- ปุ่มจัดการ 4 ปุ่ม ----- */}
                <div className="book-detail-actions" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn-sm" style={{ background: '#2563eb', padding: '9px 16px' }}
                      onClick={() => openEditForm(selectedBook)}>
                      แก้ไขข้อมูลหนังสือ
                    </button>
                    <button className="btn-sm btn-approve" style={{ padding: '9px 16px' }}
                      onClick={() => { setQtyMode(qtyMode === 'increase' ? null : 'increase'); setQtyAmount(1); }}>
                      เพิ่มจำนวนหนังสือ
                    </button>
                    <button className="btn-sm" style={{ background: '#f59e0b', padding: '9px 16px' }}
                      onClick={() => { setQtyMode(qtyMode === 'decrease' ? null : 'decrease'); setQtyAmount(1); }}>
                      ลดจำนวนหนังสือ
                    </button>
                    <button className="btn-sm btn-reject" style={{ padding: '9px 16px' }}
                      onClick={() => handleDelete(selectedBook.book_id)}>
                      ลบหนังสือ
                    </button>
                  </div>

                  {qtyMode && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', padding: 12, borderRadius: 8 }}>
                      <label style={{ fontSize: 14 }}>
                        {qtyMode === 'increase' ? 'จำนวนที่จะเพิ่ม' : 'จำนวนที่จะลด'}
                      </label>
                      <input
                        type="number" min="1" value={qtyAmount}
                        onChange={(e) => setQtyAmount(e.target.value)}
                        style={{ width: 80, padding: 7, border: '1px solid #ccc', borderRadius: 6 }}
                      />
                      <span style={{ fontSize: 13, color: '#888' }}>
                        เล่ม (ปัจจุบัน {selectedBook.total_copies} เล่ม)
                      </span>
                      <button
                        className="btn-sm"
                        style={{ background: qtyMode === 'increase' ? '#1e8449' : '#f59e0b' }}
                        onClick={() => handleAdjustQty(qtyMode)}
                      >
                        ยืนยัน
                      </button>
                      <button className="btn-sm" style={{ background: '#94a3b8' }} onClick={() => setQtyMode(null)}>
                        ยกเลิก
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ===================== ฟอร์มเพิ่ม/แก้ไขหนังสือ ===================== */}
        {view === 'form' && (
          <>
            <h2 className="section-title" style={{ marginTop: 0 }}>
              {isEditing ? `แก้ไขข้อมูลหนังสือ: ${form.title}` : 'เพิ่มหนังสือใหม่'}
            </h2>

            <div className="auth-box" style={{ margin: '0 auto 24px auto', width: '100%', maxWidth: 700 }}>
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
                  <label>จำนวนเล่มทั้งหมด {isEditing && '(เริ่มต้นตอนเพิ่มเล่มนี้ครั้งแรก)'}</label>
                  <input type="number" min="1" value={form.total_copies} onChange={update('total_copies')} required disabled={isEditing} />
                  {isEditing && (
                    <small style={{ color: '#888' }}>
                      ปรับจำนวนได้จากปุ่ม "เพิ่มจำนวนหนังสือ" / "ลดจำนวนหนังสือ" ในหน้ารายละเอียดแทน
                    </small>
                  )}
                </div>

                <button type="submit" className="btn" disabled={uploading}>
                  {uploading ? 'กำลังอัปโหลดรูป...' : isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มหนังสือ'}
                </button>
                <button type="button" className="btn" style={{ background: '#94a3b8', marginTop: 8 }} onClick={cancelForm}>
                  ยกเลิก
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
