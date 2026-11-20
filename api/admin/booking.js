import { requireAdmin } from '../_lib/auth.js';
import { getDb, readBody } from '../_lib/firebase.js';

export const STATUSES = ['nouvelle', 'en cours', 'acceptée', 'refusée'];

/* Mise à jour du statut d'une demande */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!requireAdmin(req, res)) return;
  let b;
  try { b = readBody(req); } catch { return res.status(400).end(); }
  if (typeof b.id !== 'string' || !/^[A-Za-z0-9]{10,40}$/.test(b.id) || !STATUSES.includes(b.status))
    return res.status(400).json({ error: 'invalid' });
  try {
    await getDb().collection('bookings').doc(b.id).update({ status: b.status });
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('booking status', e);
    res.status(e.code === 5 ? 404 : 500).json({ error: 'server' });
  }
}
