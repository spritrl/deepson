import { checkPassword, makeToken, sessionCookie, SESSION_DAYS } from '../_lib/auth.js';
import { readBody } from '../_lib/firebase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'ADMIN_PASSWORD non configuré' });
  let b;
  try { b = readBody(req); } catch { return res.status(400).end(); }
  if (!checkPassword(b.password)) {
    await new Promise(r => setTimeout(r, 800)); // freine les essais en rafale
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }
  res.setHeader('Set-Cookie', sessionCookie(makeToken(), SESSION_DAYS * 86400));
  res.status(200).json({ ok: true });
}
