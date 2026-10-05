import { REGIONS, REGION, loadPosts, esc, fmtDate } from './data.js';
import { MAP_PATHS } from './japan-map.js';

const app = document.getElementById('app');
const state = { posts: [], region: null, boardRegion: 'all', card: 0, from: 'map' };

const icon = {
  left: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  right: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>'
};

const countOf = (id) => state.posts.filter((p) => p.region === id).length;
const regionOf = (p) => REGION[p.region] || { label: p.region, color: '#888', jp: '' };

// ---------- 지도 홈 ----------
function renderMap() {
  const sel = state.region ? REGION[state.region] : null;
  const shown = sel ? state.posts.filter((p) => p.region === sel.id) : state.posts;
  const cards = state.posts.reduce((s, p) => s + (p.images?.length || 0), 0);

  const paths = MAP_PATHS.map(([r, d]) => {
    const reg = REGION[r];
    const fill = countOf(r) > 0 ? reg.color : 'var(--land)';
    const op = sel && sel.id !== r ? 0.35 : 1;
    return `<path data-region="${r}" d="${d}" fill="${fill}" fill-opacity="${op}" stroke="var(--paper)" stroke-width="0.8" stroke-linejoin="round"><title>${reg.label}</title></path>`;
  }).join('');

  const pins = REGIONS.map((r) => {
    const n = countOf(r.id);
    return `<button class="pin" data-region="${r.id}" aria-pressed="${state.region === r.id}" style="left:${r.x}%;top:${r.y}%;--pin:${n ? r.color : 'var(--line)'}">${r.label}<span>${n}</span></button>`;
  }).join('');

  const list = shown.length
    ? `<ul class="post-list">${shown.map((p) => `
        <li><a class="post-row" href="#/post/${esc(p.id)}" style="--rc:${regionOf(p).color}">
          <img src="${esc(p.images?.[0] || '')}" alt="" loading="lazy">
          <span class="t">
            <span class="no">No.${esc(p.id)}</span>
            <span class="jp" style="color:${regionOf(p).color}">${esc(p.eyebrow)}</span>
            <b>${esc(p.title)}</b>
            <small>${esc(p.food)} · ${fmtDate(p.published_at)} · 카드 ${p.images?.length || 0}장</small>
          </span>
        </a></li>`).join('')}</ul>`
    : sel
      ? `<div class="empty"><b>${esc(sel.label)} 편은 아직 준비 중이에요</b><p>다른 지역을 먼저 다녀오고 있어요.</p><button class="btn" data-act="all">전체 게시물 보기</button></div>`
      : `<div class="empty"><b>첫 게시물을 준비하고 있어요</b><p>인스타그램 @tabetabi05에 올라오면 여기에도 모여요.</p></div>`;

  app.innerHTML = `
    <section class="hero">
      <div class="hero-v jp" aria-hidden="true">日本各地の郷土の味</div>
      <div>
        <div class="eyebrow">日本各地の郷土の味 · 地図から旅する</div>
        <h1>지도를 눌러<br>그 지역 <em>음식</em>을 만나 보세요</h1>
        <p>인스타그램 @tabetabi05에 올린 카드뉴스를 일본 지도 위에 모았어요. 지역을 누르면 그곳 음식 게시물이 나와요.</p>
      </div>
      <dl class="stats">
        <div><dt>게시물 <span class="jp">投稿</span></dt><dd>${state.posts.length}<small>편</small></dd></div>
        <div><dt>카드 <span class="jp">枚数</span></dt><dd>${cards}<small>장</small></dd></div>
      </dl>
    </section>
    <section class="explore" aria-label="지도에서 지역 고르기">
      <div class="map">
        <span class="map-tag jp" aria-hidden="true">日本 · JAPAN</span>
        <svg viewBox="0 0 640 640" role="img" aria-label="일본 지도. 아래 지역 버튼으로도 고를 수 있어요">
          <rect x="20" y="26" width="244" height="194" fill="none" stroke="var(--sea-line)" stroke-width="1.2" stroke-dasharray="4 4"/>
          ${paths}
        </svg>
        ${pins}
      </div>
      <div class="panel" aria-live="polite">
        <div>
          <div class="eyebrow" style="color:${sel ? sel.color : 'var(--accent)'}">${sel ? sel.jp : '最新の投稿'}</div>
          <h2>${sel ? esc(sel.label) + ' 지역 음식' : '최근 게시물'}</h2>
          <p class="sub">${sel ? (shown.length ? `게시물 ${shown.length}편` : '아직 게시물이 없어요') : '지도에서 지역을 누르면 그곳 음식만 모아 볼 수 있어요.'}</p>
        </div>
        ${list}
        <a class="btn link" href="#/board">게시판에서 전체 목록 보기 →</a>
      </div>
    </section>`;

  app.querySelectorAll('[data-region]').forEach((el) => el.addEventListener('click', () => {
    const r = el.dataset.region;
    state.region = state.region === r ? null : r;
    renderMap();
  }));
  app.querySelector('[data-act="all"]')?.addEventListener('click', () => { state.region = null; renderMap(); });
}

// ---------- 게시판 ----------
function renderBoard() {
  const rows = state.boardRegion === 'all' ? state.posts : state.posts.filter((p) => p.region === state.boardRegion);
  const chips = [{ id: 'all', label: '전체', color: 'var(--ink)' }, ...REGIONS].map((r) => {
    const n = r.id === 'all' ? state.posts.length : countOf(r.id);
    return `<button class="chip" data-chip="${r.id}" aria-pressed="${state.boardRegion === r.id}"><span class="dot" style="background:${r.color}"></span>${r.label}<span>${n}</span></button>`;
  }).join('');

  app.innerHTML = `
    <section class="board">
      <div class="board-head">
        <div><div class="eyebrow">投稿一覧</div><h1>게시판</h1></div>
        <div class="meta">전체 ${state.posts.length}편 중 <b style="color:var(--ink)">${rows.length}편</b></div>
      </div>
      <div class="chips" role="group" aria-label="지역으로 거르기">${chips}</div>
      <div class="table-box">
        <table class="list">
          <thead><tr>
            <th style="width:72px">번호</th><th style="width:64px">표지</th><th>제목</th>
            <th style="width:150px">지역</th><th style="width:120px">게시일</th><th class="num" style="width:64px">카드</th>
          </tr></thead>
          <tbody>${rows.map((p) => `
            <tr style="--rc:${regionOf(p).color}">
              <td><b class="no">${esc(p.id)}</b></td>
              <td><img class="thumb" src="${esc(p.images?.[0] || '')}" alt="" loading="lazy"></td>
              <td><a class="title" href="#/post/${esc(p.id)}">${esc(p.title)}</a><small>${esc(p.food)} <span class="jp">${esc(p.food_jp)}</span></small></td>
              <td><span class="meta" style="color:var(--ink)"><span class="dot" style="background:${regionOf(p).color}"></span>${esc(regionOf(p).label)}</span><small>${esc(p.place)}</small></td>
              <td>${fmtDate(p.published_at)}</td>
              <td class="num">${p.images?.length || 0}장</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${rows.length ? '' : '<p class="notice">이 지역 게시물은 아직 없어요.</p>'}
    </section>`;

  app.querySelectorAll('[data-chip]').forEach((el) => el.addEventListener('click', () => {
    state.boardRegion = el.dataset.chip;
    renderBoard();
  }));
}

// ---------- 게시물 보기 ----------
function renderPost(id) {
  const idx = state.posts.findIndex((p) => p.id === id);
  if (idx < 0) {
    app.innerHTML = `<section class="post"><div class="empty"><b>게시물을 찾을 수 없어요</b><a class="btn" href="#/">지도로 돌아가기</a></div></section>`;
    return;
  }
  const p = state.posts[idx];
  const reg = regionOf(p);
  const imgs = p.images || [];
  const n = imgs.length;
  const c = Math.min(state.card, Math.max(n - 1, 0));
  const older = state.posts[idx + 1];
  const back = state.from === 'board' ? ['#/board', '게시판으로'] : ['#/', '지도로'];

  app.innerHTML = `
    <section class="post">
      <a class="btn link" href="${back[0]}" style="align-self:flex-start;color:var(--ink)">${icon.left}${back[1]}</a>
      <div class="post-body">
        <div class="viewer">
          <div class="main"><img src="${esc(imgs[c] || '')}" alt="${esc(p.food)} 카드 ${c + 1}"></div>
          <div class="ctrl">
            <button class="round" data-step="-1" aria-label="이전 카드">${icon.left}</button>
            <span>${c + 1} / ${n}</span>
            <button class="round" data-step="1" aria-label="다음 카드">${icon.right}</button>
          </div>
          <div class="thumbs">${imgs.map((src, i) => `<button data-card="${i}" aria-label="카드 ${i + 1} 보기" aria-current="${i === c}"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join('')}</div>
        </div>
        <article class="post-text">
          <div style="display:flex;flex-direction:column;gap:10px">
            <div class="meta"><b style="color:var(--ink)">No.${esc(p.id)}</b><span class="sep"></span><span>${fmtDate(p.published_at)} 게시</span><span class="sep"></span><span class="meta"><span class="dot" style="background:${reg.color}"></span>${esc(reg.label)}</span></div>
            <div class="eyebrow" style="color:${reg.color};font-size:18px">${esc(p.eyebrow)}</div>
            <h1>${esc(p.title)}</h1>
            <div class="food">${esc(p.food)} <span class="jp">${esc(p.food_jp)}</span> · ${esc(p.place)}</div>
          </div>
          <p class="caption">${esc(p.caption)}</p>
          ${p.tags?.length ? `<div class="tags">${p.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
          ${p.credit ? `<div class="credit"><h2>사진·영상 출처</h2><p>${esc(p.credit)}</p></div>` : ''}
          <div class="actions">
            <a class="btn solid" href="${esc(p.instagram_url || 'https://www.instagram.com/tabetabi05/')}">인스타그램에서 보기</a>
            ${older ? `<a class="btn" href="#/post/${esc(older.id)}">이전 편: ${esc(older.food)}</a>` : ''}
          </div>
        </article>
      </div>
    </section>`;

  const go = (i) => { state.card = (i + n) % n; renderPost(id); };
  app.querySelectorAll('[data-step]').forEach((el) => el.addEventListener('click', () => go(c + Number(el.dataset.step))));
  app.querySelectorAll('[data-card]').forEach((el) => el.addEventListener('click', () => go(Number(el.dataset.card))));
}

// ---------- 라우팅 ----------
let lastView = 'map';
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [view, arg] = h.split('/');
  if (view === 'post') {
    if (lastView !== 'post') { state.from = lastView; }
    state.card = 0;
    renderPost(decodeURIComponent(arg || ''));
    lastView = 'post';
  } else if (view === 'board') {
    renderBoard();
    lastView = 'board';
  } else {
    renderMap();
    lastView = 'map';
  }
  const navKey = lastView === 'post' ? state.from : lastView;
  document.querySelectorAll('[data-nav]').forEach((a) => a.setAttribute('aria-current', a.dataset.nav === navKey ? 'page' : 'false'));
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
loadPosts()
  .then((posts) => { state.posts = posts; route(); })
  .catch((e) => {
    console.error(e);
    app.innerHTML = '<p class="notice" style="margin:64px 0">게시물을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p>';
  });
