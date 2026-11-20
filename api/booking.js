import { getDb, FieldValue, dayKey, readBody, clean } from './_lib/firebase.js';

const FIELDS = { type: 40, date: 10, horaires: 60, lieu: 120, invites: 40, budget: 40, nom: 100, etablissement: 120, email: 160, telephone: 40, message: 4000 };
const REQUIRED = ['type', 'date', 'lieu', 'nom', 'email'];

/* Demandes de booking : bookings/{id} */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let b;
  try { b = readBody(req); } catch { return res.status(400).json({ error: 'json' }); }
  if (b._honey) return res.status(204).end();

  const data = {};
  for (const [k, max] of Object.entries(FIELDS)) data[k] = k === 'message' ? String(b[k] ?? '').trim().slice(0, max) : clean(b[k], max);
  if (REQUIRED.some(k => !data[k]) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || !/^\d{4}-\d{2}-\d{2}$/.test(data.date))
    return res.status(400).json({ error: 'invalid' });

  try {
    const db = getDb();
    const ref = db.collection('bookings').doc();
    const batch = db.batch();
    batch.set(ref, { ...data, status: 'nouvelle', createdAt: FieldValue.serverTimestamp() });
    batch.set(db.collection('stats').doc(dayKey()), { bookings: FieldValue.increment(1) }, { merge: true });
    await batch.commit();
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error('booking', e);
    res.status(500).json({ error: 'server' });
  }
}
