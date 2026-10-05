import { REGIONS, REGION, supabase, hasSupabase, esc, fmtDate } from './data.js';

const app = document.getElementById('app');
const logoutBtn = document.getElementById('logout');
let sb = null;
let session = null;

const say = (text, err) => `<div class="msg${err ? ' err' : ''}" role="${err ? 'alert' : 'status'}">${esc(text)}</div>`;

// datetime-local 값 <-> ISO (브라우저 시간대 기준)
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);

function statusBadge(p) {
  if (p.status !== 'published') return '<span class="badge draft">임시저장</span>';
  if (!p.published_at || Date.parse(p.published_at) > Date.now()) return '<span class="badge wait">예약</span>';
  return '<span class="badge live">공개</span>';
}

// ---------- 로그인 ----------
function renderLogin(message) {
  logoutBtn.hidden = true;
  app.innerHTML = `
    <section class="admin">
      <h1>관리자 로그인</h1>
      ${message || ''}
      <form class="login" id="login">
        <div class="field"><label for="email">이메일</label><input id="email" type="email" autocomplete="username" required></div>
        <div class="field"><label for="pw">비밀번호</label><input id="pw" type="password" autocomplete="current-password" required></div>
        <button class="btn solid" type="submit">로그인</button>
        <p class="hint" style="margin:0;color:var(--muted);font-size:14px">관리자 계정은 사이트 운영자가 Supabase에서 만들어 줘요.</p>
      </form>
    </section>`;
  document.getElementById('login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await sb.auth.signInWithPassword({
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('pw').value
    });
    if (error) renderLogin(say('이메일이나 비밀번호가 맞지 않아요.', true));
  });
}

async function isAdmin() {
  const { data, error } = await sb.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
  return !error && Boolean(data);
}

// ---------- 목록 ----------
async function renderList(message) {
  const { data, error } = await sb.from('posts').select('*').order('id', { ascending: false });
  if (error) { app.innerHTML = `<section class="admin">${say('목록을 불러오지 못했어요: ' + error.message, true)}</section>`; return; }
  app.innerHTML = `
    <section class="admin">
      <div class="board-head">
        <h1>게시물 관리</h1>
        <a class="btn solid" href="#/new">새 게시물</a>
      </div>
      ${message || ''}
      <div class="table-box">
        <table class="list">
          <thead><tr><th style="width:64px">번호</th><th style="width:60px">표지</th><th>제목</th><th style="width:110px">지역</th><th style="width:150px">게시 시간</th><th style="width:90px">상태</th><th style="width:170px"><span class="sr-only">관리</span></th></tr></thead>
          <tbody>${data.map((p) => `
            <tr>
              <td><b>${esc(p.id)}</b></td>
              <td><img class="thumb" src="${esc(p.images?.[0] || '')}" alt=""></td>
              <td><b>${esc(p.title)}</b><small>${esc(p.food)} · ${esc(p.slug)}</small></td>
              <td>${esc(REGION[p.region]?.label || p.region)}</td>
              <td>${fmtDate(p.published_at)} ${p.published_at ? new Date(p.published_at).toTimeString().slice(0, 5) : ''}</td>
              <td>${statusBadge(p)}</td>
              <td><div class="actions"><a class="btn" href="#/edit/${encodeURIComponent(p.id)}">수정</a><button class="btn danger" data-del="${esc(p.id)}" data-title="${esc(p.title)}">삭제</button></div></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${data.length ? '' : '<p class="notice">아직 게시물이 없어요.</p>'}
    </section>`;
  app.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm(`No.${b.dataset.del} "${b.dataset.title}" 게시물을 사이트에서 지울까요? 되돌릴 수 없어요.\n(인스타그램 게시물은 그대로 남아요)`)) return;
    const { error: e } = await sb.from('posts').delete().eq('id', b.dataset.del);
    renderList(e ? say('삭제하지 못했어요: ' + e.message, true) : say(`No.${b.dataset.del} 게시물을 지웠어요.`));
  }));
}

// ---------- 새 게시물 / 수정 ----------
async function renderForm(id) {
  let p = { id: '', slug: '', food: '', food_jp: '', place: '', region: 'tohoku', eyebrow: '', title: '', caption: '', tags: [], credit: '', images: [], instagram_url: '', published_at: new Date().toISOString(), status: 'published' };
  if (id) {
    const { data, error } = await sb.from('posts').select('*').eq('id', id).maybeSingle();
    if (error || !data) { app.innerHTML = `<section class="admin">${say('게시물을 찾지 못했어요.', true)}<a class="btn" href="#/">목록으로</a></section>`; return; }
    p = data;
  }
  let images = [...(p.images || [])];

  app.innerHTML = `
    <section class="admin">
      <a class="btn link" href="#/" style="align-self:flex-start;color:var(--ink)">← 목록으로</a>
      <h1>${id ? `No.${esc(id)} 수정` : '새 게시물'}</h1>
      <div id="msg"></div>
      <form id="post" class="form-grid" novalidate>
        <div class="field"><label for="f-id">번호</label><input id="f-id" value="${esc(p.id)}" ${id ? 'readonly' : ''} required pattern="\\d{3,}" placeholder="004"><span class="hint">세 자리 숫자. 만든 뒤에는 바꿀 수 없어요.</span></div>
        <div class="field"><label for="f-slug">폴더 이름</label><input id="f-slug" value="${esc(p.slug)}" required placeholder="004-kiritanpo"></div>
        <div class="field"><label for="f-region">지역</label><select id="f-region">${REGIONS.map((r) => `<option value="${r.id}" ${p.region === r.id ? 'selected' : ''}>${r.label} (${r.jp})</option>`).join('')}</select></div>
        <div class="field"><label for="f-food">음식 이름</label><input id="f-food" value="${esc(p.food)}" required placeholder="기리탄포"></div>
        <div class="field"><label for="f-foodjp">음식 이름 (일본어)</label><input id="f-foodjp" value="${esc(p.food_jp)}" placeholder="きりたんぽ"></div>
        <div class="field"><label for="f-place">지역 자세히</label><input id="f-place" value="${esc(p.place)}" placeholder="아키타현 오다테"></div>
        <div class="field"><label for="f-eyebrow">표지 일본어 지명</label><input id="f-eyebrow" value="${esc(p.eyebrow)}" placeholder="秋田・大館"></div>
        <div class="field wide"><label for="f-title">제목 (표지 질문)</label><input id="f-title" value="${esc(p.title)}" required></div>
        <div class="field wide"><label for="f-caption">캡션</label><textarea id="f-caption" rows="10">${esc(p.caption)}</textarea></div>
        <div class="field wide"><label for="f-tags">해시태그</label><input id="f-tags" value="${esc((p.tags || []).join(' '))}" placeholder="#일본여행 #일본향토음식"><span class="hint">띄어쓰기로 나눠요.</span></div>
        <div class="field wide"><label for="f-credit">사진·영상 출처</label><textarea id="f-credit" rows="3">${esc(p.credit)}</textarea></div>
        <div class="field wide">
          <span class="label">카드 이미지 <span class="hint">(순서대로, 첫 장이 표지)</span></span>
          <div class="img-list" id="imgs"></div>
          <div class="actions">
            <label class="btn" for="f-files">이미지 파일 올리기</label>
            <input id="f-files" type="file" accept="image/png,image/jpeg,image/webp" multiple class="sr-only">
          </div>
          <div class="field"><label for="f-url">또는 이미지 주소 추가</label><div class="actions"><input id="f-url" type="url" style="flex:1;min-width:220px" placeholder="https://raw.githubusercontent.com/nyaosu072/tabetabi-images/main/004-…/01.png"><button class="btn" type="button" id="add-url">추가</button></div></div>
        </div>
        <div class="field"><label for="f-ig">인스타그램 게시물 주소</label><input id="f-ig" type="url" value="${esc(p.instagram_url)}" placeholder="https://www.instagram.com/p/…"></div>
        <div class="field"><label for="f-date">게시 시간</label><input id="f-date" type="datetime-local" value="${toLocalInput(p.published_at)}"><span class="hint">이 시간이 지나야 사이트에 보여요.</span></div>
        <div class="field"><label for="f-status">상태</label><select id="f-status"><option value="published" ${p.status === 'published' ? 'selected' : ''}>게시</option><option value="draft" ${p.status === 'draft' ? 'selected' : ''}>임시저장 (사이트에 안 보임)</option></select></div>
        <div class="actions wide"><button class="btn solid" type="submit">${id ? '고친 내용 저장' : '게시물 만들기'}</button><a class="btn" href="#/">취소</a></div>
      </form>
    </section>`;

  const msg = document.getElementById('msg');
  const imgBox = document.getElementById('imgs');
  const drawImages = () => {
    imgBox.innerHTML = images.length ? images.map((src, i) => `
      <div class="img-item">
        <img src="${esc(src)}" alt="카드 ${i + 1}">
        <span>${i + 1}번째</span>
        <div class="row">
          <button type="button" data-mv="${i}" data-d="-1" aria-label="${i + 1}번째 앞으로" ${i === 0 ? 'disabled' : ''}>←</button>
          <button type="button" data-mv="${i}" data-d="1" aria-label="${i + 1}번째 뒤로" ${i === images.length - 1 ? 'disabled' : ''}>→</button>
          <button type="button" data-rm="${i}" aria-label="${i + 1}번째 빼기">✕</button>
        </div>
      </div>`).join('') : '<p class="hint" style="margin:0;color:var(--muted)">아직 이미지가 없어요.</p>';
    imgBox.querySelectorAll('[data-mv]').forEach((b) => b.addEventListener('click', () => {
      const i = Number(b.dataset.mv), j = i + Number(b.dataset.d);
      [images[i], images[j]] = [images[j], images[i]];
      drawImages();
    }));
    imgBox.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { images.splice(Number(b.dataset.rm), 1); drawImages(); }));
  };
  drawImages();

  document.getElementById('add-url').addEventListener('click', () => {
    const v = document.getElementById('f-url').value.trim();
    if (/^https:\/\//.test(v)) { images.push(v); document.getElementById('f-url').value = ''; drawImages(); }
  });

  document.getElementById('f-files').addEventListener('change', async (e) => {
    const slug = document.getElementById('f-slug').value.trim() || 'misc';
    const files = [...e.target.files].sort((a, b) => a.name.localeCompare(b.name));
    msg.innerHTML = say(`이미지 ${files.length}장 올리는 중…`);
    for (const f of files) {
      const path = `${slug}/${Date.now()}-${f.name.replace(/[^\w.-]/g, '_')}`;
      const { error } = await sb.storage.from('cards').upload(path, f, { upsert: false, contentType: f.type });
      if (error) { msg.innerHTML = say(`${f.name} 을(를) 올리지 못했어요: ${error.message}`, true); return; }
      images.push(sb.storage.from('cards').getPublicUrl(path).data.publicUrl);
      drawImages();
    }
    msg.innerHTML = say(`이미지 ${files.length}장을 올렸어요. 저장해야 게시물에 반영돼요.`);
    e.target.value = '';
  });

  document.getElementById('post').addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = (k) => document.getElementById(k).value.trim();
    const row = {
      id: v('f-id'), slug: v('f-slug'), region: v('f-region'),
      food: v('f-food'), food_jp: v('f-foodjp') || null, place: v('f-place') || null,
      eyebrow: v('f-eyebrow') || null, title: v('f-title'),
      caption: document.getElementById('f-caption').value, credit: document.getElementById('f-credit').value || null,
      tags: v('f-tags').split(/\s+/).filter(Boolean),
      images, instagram_url: v('f-ig') || null,
      published_at: fromLocalInput(v('f-date')), status: v('f-status')
    };
    const missing = [['번호', /^\d{3,}$/.test(row.id)], ['폴더 이름', row.slug], ['음식 이름', row.food], ['제목', row.title], ['카드 이미지', images.length]].filter(([, ok]) => !ok).map(([n]) => n);
    if (missing.length) { msg.innerHTML = say(`채워 주세요: ${missing.join(', ')}`, true); msg.scrollIntoView({ block: 'center' }); return; }
    const { error } = id ? await sb.from('posts').update(row).eq('id', id) : await sb.from('posts').insert(row);
    if (error) {
      msg.innerHTML = say((error.code === '23505' ? '같은 번호나 폴더 이름이 이미 있어요. ' : '저장하지 못했어요: ') + error.message, true);
      msg.scrollIntoView({ block: 'center' });
      return;
    }
    history.replaceState(null, '', '#/');
    renderList(say(id ? `No.${row.id}을(를) 고쳤어요.` : `No.${row.id}을(를) 만들었어요.`));
  });
}

// ---------- 시작 ----------
async function route() {
  if (!session) return renderLogin();
  logoutBtn.hidden = false;
  if (!(await isAdmin())) {
    app.innerHTML = `<section class="admin"><h1>권한이 없어요</h1>${say(`${session.user.email} 계정은 관리자로 등록돼 있지 않아요. 사이트 운영자에게 요청해 주세요.`, true)}</section>`;
    return;
  }
  const [view, arg] = location.hash.replace(/^#\/?/, '').split('/');
  if (view === 'new') renderForm(null);
  else if (view === 'edit' && arg) renderForm(decodeURIComponent(arg));
  else renderList();
}

async function start() {
  if (!hasSupabase) {
    app.innerHTML = `<section class="admin"><h1>관리자 화면 준비 전</h1>${say('js/config.js 에 Supabase 주소와 anon 키를 넣어야 관리자 화면을 쓸 수 있어요.', true)}</section>`;
    return;
  }
  sb = await supabase();
  session = (await sb.auth.getSession()).data.session;
  sb.auth.onAuthStateChange((_e, s) => {
    const changed = Boolean(s) !== Boolean(session);
    session = s;
    if (changed) route();
  });
  logoutBtn.addEventListener('click', () => sb.auth.signOut());
  window.addEventListener('hashchange', route);
  route();
}
start();
