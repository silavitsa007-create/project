// ----- แปลงวันที่จาก YYYY-MM-DD เป็น วัน/เดือน/ปี (dd/mm/yyyy) -----
// ใช้ร่วมกันได้ทุกหน้า import { formatThaiDate } from '../utils'
export function formatThaiDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
