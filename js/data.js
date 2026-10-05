import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const REGIONS = [
  { id: 'hokkaido', label: '홋카이도', jp: '北海道', color: '#2f6f9f', x: 76, y: 17 },
  { id: 'tohoku',   label: '도호쿠',   jp: '東北',   color: '#4f8a3c', x: 86, y: 40 },
  { id: 'kanto',    label: '간토',     jp: '関東',   color: '#c8553d', x: 84, y: 64 },
  { id: 'chubu',    label: '주부',     jp: '中部',   color: '#b9832b', x: 53, y: 57 },
  { id: 'kansai',   label: '간사이',   jp: '関西',   color: '#8e3b62', x: 45, y: 71 },
  { id: 'chugoku',  label: '주고쿠',   jp: '中国',   color: '#a3462f', x: 25, y: 68 },
  { id: 'shikoku',  label: '시코쿠',   jp: '四国',   color: '#2e8a83', x: 31, y: 87 },
  { id: 'kyushu',   label: '규슈',     jp: '九州',   color: '#c2412d', x: 12, y: 84 },
  { id: 'okinawa',  label: '오키나와', jp: '沖縄',   color: '#1f8fb3', x: 20, y: 39 }
];
export const REGION = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client = null;
export async function supabase() {
  if (!hasSupabase) return null;
  if (!client) {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}

// 공개 사이트용: 게시 시간이 지난 게시물만, 최신순
export async function loadPosts() {
  let rows;
  const sb = await supabase();
  if (sb) {
    const { data, error } = await sb.from('posts').select('*').order('published_at', { ascending: false });
    if (error) throw error;
    rows = data;
  } else {
    const res = await fetch('data/posts.json', { cache: 'no-cache' });
    rows = await res.json();
  }
  const now = Date.now();
  return rows
    .filter((p) => p.status === 'published' && p.published_at && Date.parse(p.published_at) <= now)
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at) || b.id.localeCompare(a.id));
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}
