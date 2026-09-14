import { supabase } from '../../lib/supabase.js';
import { getBearerToken } from '../../lib/auth.js';

export default async function handler(req, res) {
  const token = getBearerToken(req);
  if (token) {
    await supabase.from('auth_tokens').delete().eq('token', token);
  }
  return res.status(200).json({ message: 'ออกจากระบบแล้ว' });
}
