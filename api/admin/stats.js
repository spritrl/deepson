import { requireAdmin } from '../_lib/auth.js';
import { getDb, FieldPath, dayKey } from '../_lib/firebase.js';

const addTo = (acc, obj) => { for (const [k, v] of Object.entries(obj || {})) acc[k] = (acc[k] || 0) + v; };
const sorted = obj => Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!requireAdmin(req, res)) return;

  const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
  const keys = [];
  for (let i = days - 1; i >= 0; i--) keys.push(dayKey(new Date(Date.now() - i * 864e5)));
  const [from, to] = [keys[0], keys[keys.length - 1]];

  try {
    const db = getDb();
    const [statsSnap, bookingsSnap] = await Promise.all([
      db.collection('stats').where(FieldPath.documentId(), '>=', from).where(FieldPath.documentId(), '<=', to).get(),
      db.collection('bookings').orderBy('createdAt', 'desc').limit(300).get(),
    ]);

    const byDay = Object.fromEntries(statsSnap.docs.map(d => [d.id, d.data()]));
    const totals = { visits: 0, visitors: 0, bookings: 0, clicks: 0 };
    const clicks = {}, sources = {}, devices = {};
    const series = keys.map(day => {
      const d = byDay[day] || {};
      const c = Object.values(d.clicks || {}).reduce((a, b) => a + b, 0);
      totals.visits += d.visits || 0;
      totals.visitors += d.visitors || 0;
      totals.bookings += d.bookings || 0;
      totals.clicks += c;
      addTo(clicks, d.clicks); addTo(sources, d.sources); addTo(devices, d.devices);
      return { day, visits: d.visits || 0, visitors: d.visitors || 0, bookings: d.bookings || 0, clicks: c };
    });

    const bookings = bookingsSnap.docs.map(d => {
      const x = d.data();
      return { id: d.id, ...x, createdAt: x.createdAt?.toDate?.().toISOString() ?? null };
    });

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ days, from, to, totals, series, clicks: sorted(clicks), sources: sorted(sources), devices, bookings });
  } catch (e) {
    console.error('stats', e);
    res.status(500).json({ error: String(e.message || e) });
  }
}
