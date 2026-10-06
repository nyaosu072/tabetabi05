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
// 첫 화면 전체가 지도. 지역 이름표를 누르면 그 지역 게시물 서랍이 열린다 (넓은 화면은 왼쪽, 휴대폰은 아래).

const rowHTML = (p) => `
  <li><a class="post-row" href="#/post/${esc(p.id)}" style="--rc:${regionOf(p).color}">
    <img src="${esc(p.images?.[0] || '')}" alt="" loading="lazy">
    <span class="t">
      <span class="place jp">${esc(p.eyebrow)}</span>
      <b>${esc(p.title)}</b>
      <small>${esc(p.food)}<span>${fmtDate(p.published_at)}</span></small>
    </span>
  </a></li>`;

function renderMap() {
  const visited = REGIONS.filter((r) => countOf(r.id) > 0).length;

  const paths = MAP_PATHS.map(([r, d]) => `<path data-region="${r}" d="${d}" stroke="var(--sea)" stroke-width="0.9" stroke-linejoin="round"><title>${REGION[r].label}</title></path>`).join('');

  const labels = REGIONS.map((r) => {
    const n = countOf(r.id);
    return `<button class="tag${n ? ' on' : ''}" data-region="${r.id}" aria-pressed="false" aria-controls="drawer"
      aria-label="${r.label} ${n ? `게시물 ${n}편` : '아직 게시물 없음'}"
      style="left:${r.x}%;top:${r.y}%;--c:${r.color}">
      <b>${r.label}</b><span class="jp" aria-hidden="true">${r.jp}</span>${n ? `<small>${n}</small>` : ''}</button>`;
  }).join('');

  const shelf = state.posts.map((p) => `
    <li><a class="cover" href="#/post/${esc(p.id)}" style="--rc:${regionOf(p).color}">
      <img src="${esc(p.images?.[0] || '')}" alt="" loading="lazy">
      <span class="place jp">${esc(p.eyebrow)}</span>
      <b>${esc(p.title)}</b>
      <small>${esc(p.food)}<span>${fmtDate(p.published_at)}</span></small>
    </a></li>`).join('');

  app.innerHTML = `
    <section class="stage" aria-label="지도에서 지역 고르기">
      <div class="stage-in wrap">
        <div class="intro">
          <h1>지도로 고르는<br>일본 지역 음식</h1>
          <p>지금까지 9개 지역 중 <b>${visited}곳</b>의 음식을 소개했어요. 지역을 누르면 그곳 음식 카드뉴스가 나와요.</p>
        </div>
        <div class="map">
          <svg viewBox="0 0 640 640" role="img" aria-label="일본 지도. 지역 이름 버튼으로 고를 수 있어요">
            <rect x="20" y="26" width="244" height="194" rx="10" fill="none" stroke="var(--rule)" stroke-width="1.2" stroke-dasharray="4 5"/>
            ${paths}
          </svg>
          ${labels}
        </div>
        <aside id="drawer" class="drawer" aria-label="지역 게시물" hidden></aside>
      </div>
    </section>
    <section class="shelf wrap" aria-labelledby="shelf-h">
      <div class="shelf-head">
        <h2 id="shelf-h">최근 게시물</h2>
        <a href="#/board">게시판에서 전체 목록 보기</a>
      </div>
      <ul class="covers">${shelf}
        <li class="cover-next">
          <p><b>다음은 어느 지역일까요</b>새 게시물은 인스타그램에 먼저 올라와요.</p>
          <a class="btn" href="https://www.instagram.com/tabetabi05/">인스타그램 팔로우하기</a>
        </li>
      </ul>
    </section>`;

  app.querySelectorAll('.map [data-region]').forEach((el) => {
    el.addEventListener('click', () => selectRegion(state.region === el.dataset.region ? null : el.dataset.region));
    // 지역(도도부현 여러 개)이나 이름표에 마우스를 올리면 그 지역 전체가 지역색으로 비친다
    const hover = (on) => app.querySelectorAll(`.map path[data-region="${el.dataset.region}"]`).forEach((p) => p.classList.toggle('hover', on));
    el.addEventListener('mouseenter', () => hover(true));
    el.addEventListener('mouseleave', () => hover(false));
  });
  paintMap();
  if (state.region) selectRegion(state.region, { instant: true });
}

// 지도 색: 다녀온 지역은 옅은 지역색, 고른 지역은 진하게
function paintMap() {
  app.querySelectorAll('.map path').forEach((el) => {
    const r = el.dataset.region;
    const picked = state.region === r;
    // 평소에는 모든 지역이 무색, 마우스를 올리거나 고른 지역만 지역색
    el.style.setProperty('--c', REGION[r].color);
    el.setAttribute('fill', picked ? REGION[r].color : 'var(--land)');
    el.setAttribute('fill-opacity', picked ? 0.85 : 1);
    el.classList.toggle('picked', picked);
  });
  app.querySelectorAll('.map .tag').forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.region === state.region)));
}

function selectRegion(r, { instant = false } = {}) {
  state.region = r;
  paintMap();
  const drawer = app.querySelector('#drawer');
  const stage = app.querySelector('.stage');
  if (!r) {
    stage.classList.remove('open');
    const done = () => { if (!state.region) drawer.hidden = true; };
    matchMedia('(prefers-reduced-motion: reduce)').matches ? done() : setTimeout(done, 320);
    return;
  }
  const sel = REGION[r];
  const shown = state.posts.filter((p) => p.region === r);
  drawer.style.setProperty('--rc', sel.color);
  drawer.innerHTML = `
    <div class="drawer-head">
      <h2 tabindex="-1">${esc(sel.label)} <span class="jp">${sel.jp}</span></h2>
      <button class="close" data-act="close" aria-label="서랍 닫기"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </div>
    ${shown.length
      ? `<p class="drawer-sub">게시물 ${shown.length}편</p><ul class="post-list">${shown.map(rowHTML).join('')}</ul>
         <button class="more" data-act="board">게시판에서 ${esc(sel.label)}만 보기</button>`
      : `<div class="empty"><b>${esc(sel.label)} 편은 아직 준비 중이에요</b><p>편수가 붙은 이름표를 누르면 지금까지 소개한 음식을 볼 수 있어요.</p></div>`}`;
  drawer.hidden = false;
  drawer.querySelector('[data-act="close"]').addEventListener('click', () => {
    selectRegion(null);
    app.querySelector(`.map .tag[data-region="${r}"]`)?.focus({ preventScroll: true });
  });
  drawer.querySelector('[data-act="board"]')?.addEventListener('click', () => { state.boardRegion = r; location.hash = '#/board'; });
  if (instant) { stage.classList.add('open'); return; }
  requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add('open')));
  drawer.querySelector('h2').focus({ preventScroll: true });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.region && app.querySelector('#drawer')) {
    const r = state.region;
    selectRegion(null);
    app.querySelector(`.map .tag[data-region="${r}"]`)?.focus({ preventScroll: true });
  }
});

// ---------- 게시판 ----------
function renderBoard() {
  const rows = state.boardRegion === 'all' ? state.posts : state.posts.filter((p) => p.region === state.boardRegion);
  const chips = [{ id: 'all', label: '전체', color: 'var(--ink)' }, ...REGIONS].map((r) => {
    const n = r.id === 'all' ? state.posts.length : countOf(r.id);
    return `<button class="chip" data-chip="${r.id}" aria-pressed="${state.boardRegion === r.id}" style="--c:${r.color}"${n ? '' : ' data-zero'}>${r.label}<span>${n}</span></button>`;
  }).join('');

  app.innerHTML = `
    <section class="board wrap">
      <div class="board-head">
        <h1>게시판</h1>
        <p>${state.boardRegion === 'all' ? `게시물 ${state.posts.length}편` : `${esc(REGION[state.boardRegion].label)} 게시물 ${rows.length}편`}</p>
      </div>
      <div class="chips" role="group" aria-label="지역으로 거르기">${chips}</div>
      ${rows.length ? `
      <div class="table-box">
        <table class="list">
          <thead><tr>
            <th style="width:72px">번호</th><th style="width:68px">표지</th><th>제목</th>
            <th style="width:170px">지역</th><th style="width:120px">게시일</th><th class="num" style="width:64px">카드</th>
          </tr></thead>
          <tbody>${rows.map((p) => `
            <tr>
              <td class="id">${esc(p.id)}</td>
              <td><img class="thumb" src="${esc(p.images?.[0] || '')}" alt="" loading="lazy"></td>
              <td><a class="title" href="#/post/${esc(p.id)}">${esc(p.title)}</a><small>${esc(p.food)} <span class="jp">${esc(p.food_jp)}</span></small></td>
              <td><span class="region" style="--c:${regionOf(p).color}">${esc(regionOf(p).label)}</span><small>${esc(p.place)}</small></td>
              <td>${fmtDate(p.published_at)}</td>
              <td class="num">${p.images?.length || 0}장</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '<p class="notice">이 지역 게시물은 아직 없어요. 다른 지역을 골라 보세요.</p>'}
    </section>`;

  app.querySelectorAll('[data-chip]').forEach((el) => el.addEventListener('click', () => {
    state.boardRegion = el.dataset.chip;
    renderBoard();
    app.querySelector(`[data-chip="${el.dataset.chip}"]`)?.focus({ preventScroll: true });
  }));
}

// ---------- 게시물 보기 ----------
function renderPost(id) {
  const idx = state.posts.findIndex((p) => p.id === id);
  if (idx < 0) {
    app.innerHTML = `<section class="post wrap"><div class="empty"><b>게시물을 찾을 수 없어요</b><p>주소가 바뀌었거나 아직 공개되지 않은 게시물이에요.</p><a class="btn" href="#/">지도로 돌아가기</a></div></section>`;
    return;
  }
  const p = state.posts[idx];
  const reg = regionOf(p);
  const imgs = p.images || [];
  const n = imgs.length;
  const c = Math.min(state.card, Math.max(n - 1, 0));
  const older = state.posts[idx + 1];
  const newer = state.posts[idx - 1];
  const back = state.from === 'board' ? ['#/board', '게시판으로'] : ['#/', '지도로'];

  app.innerHTML = `
    <section class="post wrap">
      <a class="back" href="${back[0]}">${icon.left}${back[1]}</a>
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
          <header class="sign" style="--rc:${reg.color}">
            <span class="place jp">${esc(p.eyebrow)}</span>
            <h1>${esc(p.title)}</h1>
            <p class="food">${esc(p.food)} <span class="jp">${esc(p.food_jp)}</span><span>${esc(p.place)}</span></p>
            <nav class="neighbors" aria-label="다른 게시물">
              ${older ? `<a class="prev" href="#/post/${esc(older.id)}">${icon.left}<span><small>이전 편</small>${esc(older.food)}</span></a>` : '<span></span>'}
              ${newer ? `<a class="next" href="#/post/${esc(newer.id)}"><span><small>다음 편</small>${esc(newer.food)}</span>${icon.right}</a>` : '<span></span>'}
            </nav>
          </header>
          <p class="facts"><span>No.${esc(p.id)}</span><span>${fmtDate(p.published_at)} 게시</span><span class="region" style="--c:${reg.color}">${esc(reg.label)}</span></p>
          <p class="caption">${esc(p.caption)}</p>
          ${p.tags?.length ? `<div class="tags">${p.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
          ${p.credit ? `<div class="credit"><h2>사진·영상 출처</h2><p>${esc(p.credit)}</p></div>` : ''}
          <div class="actions">
            <a class="btn solid" href="${esc(p.instagram_url || 'https://www.instagram.com/tabetabi05/')}">인스타그램에서 보기</a>
          </div>
        </article>
      </div>
    </section>`;

  app.querySelectorAll('[data-step]').forEach((el) => el.addEventListener('click', () => {
    state.card = (c + Number(el.dataset.step) + n) % n;
    renderPost(id);
    app.querySelector(`[data-step="${el.dataset.step}"]`)?.focus({ preventScroll: true });
  }));
  app.querySelectorAll('[data-card]').forEach((el) => el.addEventListener('click', () => { state.card = Number(el.dataset.card); renderPost(id); app.querySelector(`[data-card="${state.card}"]`)?.focus({ preventScroll: true }); }));
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
    app.innerHTML = '<div class="wrap"><p class="notice" style="margin:64px 0">게시물을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p></div>';
  });
