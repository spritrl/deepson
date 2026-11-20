import { getDb, FieldValue, dayKey, readBody, clean, BOT_UA } from './_lib/firebase.js';

/* Statistiques agrégées par jour : stats/{AAAA-MM-JJ}
   { visits, visitors, bookings, clicks:{label:n}, sources:{host:n}, devices:{mobile:n, desktop:n} } */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (BOT_UA.test(req.headers['user-agent'] || '')) return res.status(204).end();

  let b;
  try { b = readBody(req); } catch { return res.status(400).end(); }

  const inc = FieldValue.increment(1);
  const u = {};
  if (b.t === 'visit') {
    u.visits = inc;
    if (b.nv) u.visitors = inc;
    u.sources = { [clean(b.src, 60).toLowerCase() || 'direct']: inc };
    u.devices = { [b.dev === 'mobile' ? 'mobile' : 'desktop']: inc };
  } else if (b.t === 'click') {
    const label = clean(b.l).replace(/^__|__$/g, '');
    if (!label) return res.status(400).end();
    u.clicks = { [label]: inc };
  } else {
    return res.status(400).end();
  }

  try {
    await getDb().collection('stats').doc(dayKey()).set(u, { merge: true });
    res.status(204).end();
  } catch (e) {
    console.error('track', e);
    res.status(500).end();
  }
}
