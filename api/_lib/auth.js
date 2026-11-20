import crypto from 'node:crypto';

/* Session admin : cookie signé (HMAC) « expiration.signature ».
   Changer ADMIN_PASSWORD (ou ADMIN_SECRET) invalide toutes les sessions. */
const secret = () =>
  process.env.ADMIN_SECRET ||
  crypto.createHash('sha256').update('deepson-admin:' + (process.env.ADMIN_PASSWORD || '')).digest('hex');

const sign = v => crypto.createHmac('sha256', secret()).update(v).digest('base64url');
const sha = v => crypto.createHash('sha256').update(String(v ?? '')).digest();

export const SESSION_DAYS = 7;

export function makeToken() {
  const exp = String(Date.now() + SESSION_DAYS * 864e5);
  return `${exp}.${sign(exp)}`;
}

export function isAuthed(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)ds_admin=([^;]+)/);
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function checkPassword(p) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return crypto.timingSafeEqual(sha(p), sha(expected));
}

export const sessionCookie = (value, maxAge) =>
  `ds_admin=${value}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

export function requireAdmin(req, res) {
  if (isAuthed(req)) return true;
  res.status(401).json({ error: 'unauthorized' });
  return false;
}
