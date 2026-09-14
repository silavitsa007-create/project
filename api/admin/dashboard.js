import { supabase } from '../../lib/supabase.js';
import { requireAdminAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  try {
    const admin = await requireAdminAuth(req, res);
    if (!admin) return;

    const { count: totalBooks } = await supabase.from('books').select('*', { count: 'exact', head: true });
    const { count: totalMembers } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'user');
    const { count: pendingCount } = await supabase.from('borrow_transactions').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: borrowedCount } = await supabase.from('borrow_transactions').select('*', { count: 'exact', head: true }).eq('status', 'borrowed');

    const today = new Date().toISOString().slice(0, 10);
    const { count: overdueCount } = await supabase
      .from('borrow_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'borrowed')
      .lt('due_date', today);

    const { data: books } = await supabase.from('books').select('total_copies, available_copies');
    const totalCopies = (books || []).reduce((sum, b) => sum + b.total_copies, 0);
    const availCopies = (books || []).reduce((sum, b) => sum + b.available_copies, 0);
    const borrowRatePct = totalCopies > 0 ? Math.round(((totalCopies - availCopies) / totalCopies) * 100) : 0;

    const { count: totalTransactions } = await supabase.from('borrow_transactions').select('*', { count: 'exact', head: true });
    const pendingPct = totalTransactions > 0 ? Math.round((pendingCount / totalTransactions) * 100) : 0;
    const borrowedPct = totalTransactions > 0 ? Math.round((borrowedCount / totalTransactions) * 100) : 0;
    const overduePct = totalTransactions > 0 ? Math.round((overdueCount / totalTransactions) * 100) : 0;

    // ----- หนังสือยอดนิยม 5 อันดับ -----
    const { data: allBorrows } = await supabase.from('borrow_transactions').select('book_id, books(title)');
    const countMap = {};
    (allBorrows || []).forEach((b) => {
      const title = b.books?.title || 'ไม่พบชื่อ';
      countMap[title] = (countMap[title] || 0) + 1;
    });
    const popularBooks = Object.entries(countMap)
      .map(([title, cnt]) => ({ title, cnt }))
      .sort((a, b) => b.cnt - a.cnt)
      .slice(0, 5);

    // ----- สัดส่วนสถานะการยืมทั้งหมด -----
    const statusMeta = {
      pending: { label: 'รออนุมัติ', color: '#f59e0b' },
      borrowed: { label: 'กำลังยืม', color: '#2563eb' },
      returned: { label: 'คืนแล้ว', color: '#1e8449' },
      overdue: { label: 'เกินกำหนด', color: '#dc2626' },
      rejected: { label: 'ถูกปฏิเสธ', color: '#94a3b8' },
    };
    const { data: statusRows } = await supabase.from('borrow_transactions').select('status');
    const statusCounts = {};
    (statusRows || []).forEach((r) => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });
    const statusBreakdown = Object.entries(statusMeta)
      .map(([key, meta]) => {
        const cnt = statusCounts[key] || 0;
        return cnt > 0
          ? { label: meta.label, color: meta.color, count: cnt, pct: totalTransactions > 0 ? (cnt / totalTransactions) * 100 : 0 }
          : null;
      })
      .filter(Boolean);

    // ----- คำขอยืมล่าสุด 5 รายการ -----
    const { data: recentRaw } = await supabase
      .from('borrow_transactions')
      .select('borrow_id, request_date, users(full_name), books(title)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);

    const recent = (recentRaw || []).map((r) => ({
      borrow_id: r.borrow_id,
      request_date: r.request_date,
      full_name: r.users?.full_name,
      title: r.books?.title,
    }));

    return res.status(200).json({
      stats: {
        total_books: totalBooks || 0,
        total_members: totalMembers || 0,
        pending_count: pendingCount || 0,
        borrowed_count: borrowedCount || 0,
        overdue_count: overdueCount || 0,
        borrow_rate_pct: borrowRatePct,
        total_copies: totalCopies,
        avail_copies: availCopies,
        pending_pct: pendingPct,
        borrowed_pct: borrowedPct,
        overdue_pct: overduePct,
      },
      popular_books: popularBooks,
      status_breakdown: statusBreakdown,
      recent_requests: recent,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server crash: ' + err.message });
  }
}
