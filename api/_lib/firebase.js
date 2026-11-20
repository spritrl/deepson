import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, FieldPath } from 'firebase-admin/firestore';

let db;

/* Firestore via le compte de service (variable FIREBASE_SERVICE_ACCOUNT :
   le JSON du compte de service, brut ou encodé en base64). */
export function getDb() {
  if (db) return db;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT manquant');
  const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  const app = getApps()[0] || initializeApp({ credential: cert(JSON.parse(json)) });
  db = getFirestore(app);
  return db;
}

export { FieldValue, FieldPath };

/* Jour au format AAAA-MM-JJ, heure de Paris */
export const dayKey = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

/* Corps JSON, y compris envoyé en text/plain par navigator.sendBeacon */
export function readBody(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'string') return JSON.parse(b);
  if (Buffer.isBuffer(b)) return JSON.parse(b.toString('utf8'));
  return b;
}

export const clean = (s, n = 80) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export const BOT_UA = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp|telegram|discord/i;
