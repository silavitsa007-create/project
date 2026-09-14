import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { api } from '../../api';
import { formatThaiDate } from '../../utils';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [popularBooks, setPopularBooks] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  function load(silent = false) {
    return api.adminDashboard().then((data) => {
      setStats(data.stats);
      setPopularBooks(data.popular_books);
      setStatusBreakdown(data.status_breakdown);
      setRecent(data.recent_requests);
    }).finally(() => {
      if (!silent) setLoading(false);
    });
  }

  useEffect(() => {
    load();

    // ----- ดึงข้อมูลใหม่แบบเงียบๆ ทุก 15 วินาที ไม่ต้องกดรีเฟรชเอง -----
    const interval = setInterval(() => load(true), 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="app">
        <Navbar />
        <div className="container"><div className="empty-state">กำลังโหลด...</div></div>
      </div>
    );
  }

  const maxPopular = Math.max(0, ...popularBooks.map((b) => b.cnt));

  // สร้าง conic-gradient string จากสัดส่วนสถานะ
  let cursor = 0;
  const pieStops = statusBreakdown.map((seg) => {
    const start = cursor;
    const end = cursor + seg.pct;
    cursor = end;
    return `${seg.color} ${start}% ${end}%`;
  });
  const pieGradient = pieStops.length > 0 ? `conic-gradient(${pieStops.join(', ')})` : '#e2e8f0';

  return (
    <div className="app">
      <Navbar />
      <div className="container">
        <div className="page-intro">
          <div className="icon">📊</div>
          <div>
            <h1>ภาพรวมระบบ</h1>
            <p>สรุปสถานะห้องสมุด คำขอยืม และหนังสือค้างคืนแบบเรียลไทม์</p>
          </div>
        </div>

        {/* ===== แถวบน: วงแหวนใหญ่ + วงแหวนเล็ก ===== */}
        <div className="dash-grid">
          <div className="dash-main-ring">
            <div
              className="ring ring-big"
              style={{ background: `conic-gradient(#fff 0% ${stats.borrow_rate_pct}%, rgba(255,255,255,0.25) ${stats.borrow_rate_pct}% 100%)` }}
            >
              <div className="ring-text">
                <div className="value">{stats.borrow_rate_pct}%</div>
                <div className="label">อัตราการยืม<br />หนังสือ</div>
              </div>
            </div>
            <div style={{ marginTop: 14, fontSize: 12, opacity: 0.85, textAlign: 'center' }}>
              ถูกยืมอยู่ {stats.total_copies - stats.avail_copies} จากทั้งหมด {stats.total_copies} เล่ม
            </div>
          </div>

          <div className="dash-small-rings">
            <div className="dash-ring-card">
              <div className="ring ring-small" style={{ background: `conic-gradient(#f59e0b 0% ${stats.pending_pct}%, #e2e8f0 ${stats.pending_pct}% 100%)` }}>
                <div className="ring-text"><div className="value">{stats.pending_count}</div></div>
              </div>
              <div className="label">คำขอรออนุมัติ</div>
            </div>
            <div className="dash-ring-card">
              <div className="ring ring-small" style={{ background: `conic-gradient(#2563eb 0% ${stats.borrowed_pct}%, #e2e8f0 ${stats.borrowed_pct}% 100%)` }}>
                <div className="ring-text"><div className="value">{stats.borrowed_count}</div></div>
              </div>
              <div className="label">กำลังถูกยืมอยู่</div>
            </div>
            <div className="dash-ring-card">
              <div className="ring ring-small" style={{ background: `conic-gradient(#dc2626 0% ${stats.overdue_pct}%, #e2e8f0 ${stats.overdue_pct}% 100%)` }}>
                <div className="ring-text"><div className="value">{stats.overdue_count}</div></div>
              </div>
              <div className="label">เกินกำหนดคืน</div>
            </div>
            <div className="dash-ring-card">
              <div className="ring ring-small" style={{ background: 'conic-gradient(#1e8449 0% 100%, #e2e8f0 100% 100%)' }}>
                <div className="ring-text"><div className="value">{stats.total_books}</div></div>
              </div>
              <div className="label">หนังสือทั้งหมด</div>
            </div>
            <div className="dash-ring-card">
              <div className="ring ring-small" style={{ background: 'conic-gradient(#7c3aed 0% 100%, #e2e8f0 100% 100%)' }}>
                <div className="ring-text"><div className="value">{stats.total_members}</div></div>
              </div>
              <div className="label">สมาชิกทั้งหมด</div>
            </div>
          </div>
        </div>

        {/* ===== แถวล่าง: กราฟแท่ง + กราฟวงกลม ===== */}
        <div className="dash-charts-grid">
          <div className="chart-card">
            <div className="chart-card-title">หนังสือยอดนิยม 5 อันดับ (ยืมบ่อยที่สุด)</div>
            {popularBooks.length === 0 ? (
              <div className="empty-state" style={{ padding: 20 }}>ยังไม่มีข้อมูลการยืม</div>
            ) : (
              popularBooks.map((pb, i) => {
                const barPct = maxPopular > 0 ? Math.round((pb.cnt / maxPopular) * 100) : 0;
                return (
                  <div className="bar-row" key={i}>
                    <div className="bar-label" title={pb.title}>{pb.title}</div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${barPct}%` }}>{pb.cnt}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="chart-card">
            <div className="chart-card-title">สัดส่วนสถานะการยืมทั้งหมด</div>
            {statusBreakdown.length === 0 ? (
              <div className="empty-state" style={{ padding: 20 }}>ยังไม่มีข้อมูลการยืม</div>
            ) : (
              <div className="pie-wrap">
                <div className="pie" style={{ background: pieGradient }}></div>
                <div className="pie-legend">
                  {statusBreakdown.map((seg, i) => (
                    <div className="pie-legend-item" key={i}>
                      <span className="pie-dot" style={{ background: seg.color }}></span>
                      {seg.label} ({seg.count})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {stats.pending_count > 0 && (
          <div className="alert alert-error">
            มีคำขอยืมหนังสือรออนุมัติ {stats.pending_count} รายการ
            <Link to="/admin/borrow-requests" style={{ fontWeight: 'bold', marginLeft: 6 }}>
              ไปจัดการเลย →
            </Link>
          </div>
        )}

        <h3 className="section-title">คำขอยืมล่าสุด</h3>

        {recent.length === 0 ? (
          <div className="empty-state">ไม่มีคำขอยืมที่รออนุมัติในขณะนี้</div>
        ) : (
          <>
            <table className="book-table">
              <thead>
                <tr>
                  <th>วันที่ขอยืม</th>
                  <th>สมาชิก</th>
                  <th>หนังสือ</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.borrow_id}>
                    <td>{formatThaiDate(r.request_date)}</td>
                    <td>{r.full_name}</td>
                    <td>{r.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 14 }}>
              <Link to="/admin/borrow-requests">ดูคำขอทั้งหมด →</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
