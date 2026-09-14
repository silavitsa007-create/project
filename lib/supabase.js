import { createClient } from '@supabase/supabase-js';

// ใช้ Service Role Key เพราะรันฝั่งเซิร์ฟเวอร์เท่านั้น (มีสิทธิ์เต็ม ไม่ผ่าน RLS)
// ค่าทั้งสองนี้ต้องตั้งใน Vercel Environment Variables ห้ามเขียนค่าจริงในโค้ดตรงๆ
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
