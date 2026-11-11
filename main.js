/* ==========================================================
   CONFIG
   ========================================================== */
const CONFIG = {
  navLockMs: 520,          // 翻卡防連點
  ghostDensity: 1 / 150000, // 每 px² 的幽靈數量
  maxGhosts: 14,
};

const TEXT = {
  end: ['捏嚕嚕，', '生日快樂！'],
  fans: '位訪客',
  anon: '匿名的訪客',
  nameLabel: '你是誰捏？',
};

/* ==========================================================
   State
   ========================================================== */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const state = {
  phase: 'empty',   // empty：還沒導入 / ready：有問卷、箱子關著 / open：正在看卡片
  letters: [],      // 隨機排序後的問卷
  nameLabel: TEXT.nameLabel,
  fields: [],       // 名字以外的每一題：{ col, label, kind }，卡片會照這個順序排
  index: 0,         // letters.length 代表結尾卡片
  card: null,       // 目前顯示的卡片元素
  busy: false,
};

const $ = (id) => document.getElementById(id);
const els = {
  stage: $('stage'),
  hint: $('hint'),
  altar: $('altar'),
  box: $('offering'),
  boxInner: $('obInner'),
  slot: $('obSlot'),
  door: $('door'),
  doorFrame: $('doorFrame'),
  importBtn: $('importBtn'),
  importLabel: $('importLabel'),
  fileInput: $('fileInput'),
  viewer: $('viewer'),
  cardSlot: $('cardSlot'),
  prev: $('prevBtn'),
  next: $('nextBtn'),
  counter: $('counter'),
  dropHint: $('dropHint'),
  canvas: $('particles'),
  bg: $('bg'),
  front: $('front'),
};

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
function rand(a, b) { return a + Math.random() * (b - a); }
function unit() { return Math.min(innerWidth / 100, innerHeight / 56.25); } // = CSS 的 --u（px）

/* ==========================================================
   CSV：讀檔、解析、隨機排序
   ========================================================== */
async function readCsvFile(file) {
  const buf = await file.arrayBuffer();
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch (e) {
    text = new TextDecoder('big5').decode(buf); // Excel 另存的中文 CSV 常是 Big5
  }
  return text.replace(/^﻿/, '');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

// 題目文字：括號（含全形）裡的補充說明全部拿掉；題目裡的換行接成「：」（例如「…的問題：愛捏嚕嚕嗎！」）
function cleanLabel(s) {
  return s.replace(/[（(][^）)]*[）)]/g, '').replace(/\s*[\r\n]+\s*/g, '：').replace(/\s+/g, ' ').trim();
}

// 欄位挑選。名字欄一定要是「你是誰 / 名字 / 稱呼 / 暱稱」；
// Google 表單會自動收集的「使用者名稱 / 帳號 / 信箱」和「時間戳記」一律不拿（信箱不能上直播）；
// 標了「不公開 / 私下」的欄位也不拿。其餘每一欄都是一題，照問卷的順序排。
const isPrivate = (h) => /不公開|非公開|私下|私密|悄悄話/.test(h);
const isAccount = (h) => /使用者|帳號|帳戶|信箱|e-?mail|時間|timestamp/i.test(h);
const NAME_RE = /你是誰|名字|稱呼|暱稱/;
function pickColumns(header) {
  const usable = (i) => !isPrivate(header[i]) && !isAccount(header[i]);
  let name = header.findIndex((h, i) => usable(i) && NAME_RE.test(h));
  if (name < 0) name = header.findIndex((h, i) => usable(i)); // 找不到明確的名字欄就用第一個可用的
  const kindOf = (h) => (/祝福|想說|說的話|留言|公開/.test(h) ? 'words' : /印象/.test(h) ? 'impression' : 'plain');
  const fields = header
    .map((h, col) => ({ col, label: cleanLabel(h) || h, kind: kindOf(h) }))
    .filter((f) => f.col !== name && usable(f.col));
  return { name, fields };
}

function extractLetters(rows) {
  if (rows.length < 2) throw new Error('這個檔案裡沒有問卷回覆');
  const header = rows[0].map((h) => h.trim());
  const { name, fields } = pickColumns(header);
  if (name < 0 || !fields.length) throw new Error('看不懂這個檔案的欄位，請確認是問卷匯出的 CSV');
  const get = (r, c) => (r[c] ?? '').trim();
  // 量表（全部是 1~10 的數字）和選擇題（答案種類很少、都很短）：卡片右上角直接顯示答案，不當問答
  const data = rows.slice(1);
  for (const f of fields) {
    if (f.kind === 'words' || f.kind === 'impression') continue;
    const vals = data.map((r) => get(r, f.col)).filter(Boolean);
    if (vals.length >= 5 && vals.every((v) => /^(10|[1-9])$/.test(v))) f.kind = 'rating';
    else if (/最後一個|選擇/.test(f.label) || (vals.length >= 8 && new Set(vals).size <= 5 && vals.every((v) => v.length <= 14))) f.kind = 'choice';
  }
  let wi = fields.findIndex((f) => f.kind === 'words'); // 留言牆用的「想說的話」；沒有就取最後一題問答
  if (wi < 0) wi = fields.map((f) => f.kind).lastIndexOf('plain');
  if (wi < 0) wi = 0;
  if (fields[wi].kind === 'plain') fields[wi].kind = 'words';
  // 每一份回覆都保留，只略過全部空白的
  const letters = rows.slice(1)
    .map((r) => {
      const answers = fields.map((f) => get(r, f.col));
      return { name: get(r, name), words: answers[wi], answers };
    })
    .filter((l) => l.name || l.answers.some(Boolean));
  if (!letters.length) throw new Error('這個檔案裡沒有問卷回覆');
  return { nameLabel: cleanLabel(header[name]) || TEXT.nameLabel, fields, letters };
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

async function importFile(file) {
  if (!file || state.phase === 'open' || state.busy) return;
  try {
    const { nameLabel, fields, letters } = extractLetters(parseCsv(await readCsvFile(file)));
    state.nameLabel = nameLabel;
    state.fields = fields;
    state.letters = shuffle(letters);
    state.index = 0;
    setHint(`${letters.length} 份祝福都安息在棺材裡了`);
    els.importLabel.textContent = '重新導入';
    await dropCoins(Math.min(8, letters.length));
    state.phase = 'ready';
    els.box.dataset.state = 'ready';
    els.door.setAttribute('aria-label', '打開棺材');
  } catch (err) {
    setHint(err.message || '讀不了這個檔案', true);
  }
}

function setHint(text, isError = false) {
  els.hint.textContent = text;
  els.hint.classList.toggle('is-error', isError);
}

/* ==========================================================
   祭品箱：投錢動畫、打開、關上
   ========================================================== */
els.importBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  els.fileInput.click();
});
els.fileInput.addEventListener('change', () => {
  const file = els.fileInput.files[0];
  els.fileInput.value = ''; // 同一個檔案再選一次也要觸發
  importFile(file);
});

// 拖曳 CSV 到畫面上任何地方也能導入
let dragDepth = 0;
const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
document.addEventListener('dragenter', (e) => {
  if (!hasFiles(e) || state.phase === 'open') return;
  dragDepth++;
  els.dropHint.hidden = false;
});
document.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) els.dropHint.hidden = true;
});
document.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
document.addEventListener('drop', (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  dragDepth = 0;
  els.dropHint.hidden = true;
  importFile(e.dataTransfer.files[0]);
});

// 祭品一枚枚落進棺材的縫：邊飛邊翻面，落進去時箱子輕輕一震
async function dropCoins(n) {
  if (reduceMotion.matches) return;
  const slot = els.slot.getBoundingClientRect();
  const anims = [];
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'coin';
    document.body.appendChild(el);
    const w = el.offsetWidth;
    const x = slot.left + slot.width * rand(0.15, 0.85) - w / 2;
    const y = slot.top + slot.height * 0.5 - w / 2;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    const u = unit();
    const fromX = rand(-1, 1) * u * 14;
    const flips = Math.round(rand(2, 4));
    const frames = [];
    for (let k = 0; k <= 10; k++) {
      const p = k / 10;
      // 拋物線：先往上、再落下
      const tx = fromX * (1 - p);
      const ty = -u * 26 * (1 - p) - Math.sin(p * Math.PI) * u * 8;
      frames.push({ transform: `translate(${tx}px, ${ty}px) scaleY(${Math.cos(p * Math.PI * flips).toFixed(2)})`, opacity: p < 0.1 ? p * 10 : 1, offset: p * 0.85 });
    }
    frames.push({ transform: 'translate(0, 6px) scale(0.5, 0.15)', opacity: 0, offset: 1 });
    const delay = i * 160;
    const a = el.animate(frames, { duration: 900, delay, easing: 'cubic-bezier(0.4, 0, 0.7, 1)', fill: 'backwards' });
    setTimeout(() => {
      Music.sfx.coin();
      els.boxInner.animate([{ transform: 'none' }, { transform: 'translateY(0.25em)' }, { transform: 'none' }], { duration: 220, easing: 'ease-out' });
    }, delay + 780);
    anims.push(a.finished.then(() => el.remove()));
  }
  await Promise.all(anims);
}

els.box.addEventListener('click', (e) => {
  if (e.target.closest('.ob-import')) return; // 門上的字自己處理（選檔 / 重新導入）
  if (state.phase === 'ready') openBox();
  else if (state.phase === 'empty') els.fileInput.click(); // 還沒導入：點棺門就是選檔
});

async function openBox() {
  if (state.busy) return;
  state.busy = true;
  state.phase = 'open';
  state.index = 0;
  const motion = !reduceMotion.matches;
  if (motion) {
    // 先搖一搖箱子，門再打開
    await els.boxInner.animate([
      { transform: 'none' }, { transform: 'rotate(-2deg)' }, { transform: 'rotate(2deg)' }, { transform: 'rotate(-1.5deg)' }, { transform: 'rotate(1deg)' }, { transform: 'none' },
    ], { duration: 520, easing: 'ease-in-out' }).finished;
  }
  els.box.dataset.state = 'open';
  els.door.setAttribute('aria-label', '棺材已打開');
  Music.sfx.open();
  if (motion) {
    await wait(450);
    puffSheets(8);
    await wait(500);
  }
  els.stage.classList.add('is-open');
  if (motion) await wait(650);
  els.viewer.hidden = false;
  await showCard(0, 'enter');
  state.busy = false;
  els.next.focus({ preventScroll: true });
}

async function closeBox() {
  if (state.busy) return;
  state.busy = true;
  const card = state.card;
  state.card = null;
  if (card) await animateOut(card, 'return').catch(() => {});
  els.cardSlot.replaceChildren();
  els.viewer.hidden = true;
  els.stage.classList.remove('is-open');
  if (!reduceMotion.matches) await wait(900);
  state.phase = 'ready';
  els.box.dataset.state = 'ready';
  els.door.setAttribute('aria-label', '打開棺材');
  state.busy = false;
  els.door.focus({ preventScroll: true });
}

// 打開時從箱子飄出來的籤紙
function puffSheets(n) {
  const d = els.doorFrame.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'mini-sheet';
    document.body.appendChild(el);
    el.style.left = `${d.left + d.width / 2 - el.offsetWidth / 2}px`;
    el.style.top = `${d.top + d.height / 2 - el.offsetHeight / 2}px`;
    const u = unit();
    const dx = rand(-1, 1) * u * 30;
    const dy = -rand(14, 34) * u;
    el.animate([
      { transform: 'translate(0, 0) scale(0.3) rotate(0deg)', opacity: 0 },
      { opacity: 1, offset: 0.15 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.7}px) scale(1) rotate(${rand(-40, 40)}deg)`, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.9) rotate(${rand(-120, 120)}deg)`, opacity: 0 },
    ], { duration: rand(1500, 2200), delay: i * 70, easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)', fill: 'backwards' })
      .finished.then(() => el.remove());
  }
}

/* ==========================================================
   卡片
   ========================================================== */
// 左上角的裝飾：一朵暗紅玫瑰（由外往內三圈花瓣 + 螺旋花心），後面襯兩片深綠葉子
const ROSE_PETAL = 'M30 30 C 14 28 10 9 30 5.5 C 50 9 46 28 30 30 Z';
const ring = (cls, n, off, scale) => Array.from({ length: n }, (_, i) =>
  `<path class="${cls}" transform="rotate(${off + (360 / n) * i} 30 30) translate(30 30) scale(${scale}) translate(-30 -30)" d="${ROSE_PETAL}"/>`).join('');
const DECO_SVG = '<svg class="card-deco" viewBox="0 0 60 60" aria-hidden="true">'
  + '<path class="leaf" d="M30 30 C 12 34 3 46 6 56 C 20 56 31 46 30 30 Z"/>'
  + '<path class="leaf" d="M30 30 C 48 34 57 46 54 56 C 40 56 29 46 30 30 Z"/>'
  + '<path class="vein" d="M29 33 C 20 40 13 46 9 53 M31 33 C 40 40 47 46 51 53"/>'
  + ring('petal-o', 6, 0, 1)
  + ring('petal-m', 5, 20, 0.74)
  + ring('petal-i', 4, 45, 0.5)
  + '<path class="spiral" d="M30 30 m-2.6 0 a2.6 2.6 0 1 1 2.6 2.6 a1.5 1.5 0 1 1 -1.5 -1.5"/>'
  + '</svg>';

// 卡片上緣中央的哥德尖拱冠飾（三葉紋 + 十字架）
const CREST_SVG = '<svg class="card-crest" viewBox="0 0 80 52" aria-hidden="true">'
  + '<path class="crest-arch" d="M8 48V26Q8 10 40 2Q72 10 72 26V48Z"/>'
  + '<path class="crest-line" d="M15 48V27Q15 15 40 8Q65 15 65 27V48"/>'
  + '<circle class="crest-gold" cx="40" cy="28" r="6.5"/><circle class="crest-gold" cx="29.5" cy="35" r="6.5"/><circle class="crest-gold" cx="50.5" cy="35" r="6.5"/>'
  + '<circle class="crest-core" cx="40" cy="32" r="4.2"/>'
  + '<path class="crest-cross" d="M40 -4V10M35 2H45"/>'
  + '</svg>';

// 右下角的紅蠟封印：不規則的蠟、壓出的外圈、浮雕的「祝」字，下面垂兩條緞帶
const SEAL_SVG = '<svg viewBox="8 14 84 84" aria-hidden="true">'
  + '<defs>'
  + '<radialGradient id="waxG" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#5061cd"/><stop offset=".45" stop-color="#223193"/><stop offset="1" stop-color="#101642"/></radialGradient>'
  + ''
  + '</defs>'
  + '<path d="M85.5 56.0 C86.3 60.1 87.7 65.5 86.2 69.2 C84.7 72.9 79.6 75.2 76.6 78.3 C73.6 81.4 71.7 85.4 68.4 87.8 C65.0 90.3 60.6 92.2 56.5 92.8 C52.4 93.4 47.9 92.4 43.7 91.6 C39.5 90.9 35.0 90.4 31.3 88.5 C27.5 86.5 24.0 83.4 21.3 80.1 C18.5 76.8 16.4 72.9 14.7 68.8 C13.1 64.8 11.2 60.3 11.2 56.0 C11.3 51.7 13.4 47.3 15.1 43.3 C16.9 39.4 19.4 36.1 21.8 32.3 C24.2 28.6 26.1 22.7 29.8 21.0 C33.5 19.3 39.6 22.0 44.0 22.1 C48.4 22.1 51.8 21.4 56.1 21.3 C60.4 21.2 66.1 19.8 69.9 21.6 C73.6 23.4 76.6 28.3 78.5 32.1 C80.4 35.9 80.1 40.6 81.3 44.6 C82.5 48.6 84.7 51.9 85.5 56.0Z" transform="translate(2.5 3.5)" fill="#000" opacity=".5"/>'
  + '<path d="M85.5 56.0 C86.3 60.1 87.7 65.5 86.2 69.2 C84.7 72.9 79.6 75.2 76.6 78.3 C73.6 81.4 71.7 85.4 68.4 87.8 C65.0 90.3 60.6 92.2 56.5 92.8 C52.4 93.4 47.9 92.4 43.7 91.6 C39.5 90.9 35.0 90.4 31.3 88.5 C27.5 86.5 24.0 83.4 21.3 80.1 C18.5 76.8 16.4 72.9 14.7 68.8 C13.1 64.8 11.2 60.3 11.2 56.0 C11.3 51.7 13.4 47.3 15.1 43.3 C16.9 39.4 19.4 36.1 21.8 32.3 C24.2 28.6 26.1 22.7 29.8 21.0 C33.5 19.3 39.6 22.0 44.0 22.1 C48.4 22.1 51.8 21.4 56.1 21.3 C60.4 21.2 66.1 19.8 69.9 21.6 C73.6 23.4 76.6 28.3 78.5 32.1 C80.4 35.9 80.1 40.6 81.3 44.6 C82.5 48.6 84.7 51.9 85.5 56.0Z" fill="url(#waxG)" stroke="#0b102e" stroke-width="1.4"/>'
  + '<circle cx="50" cy="56" r="26" fill="none" stroke="#090d27" stroke-width="2.4" transform="translate(1 1)"/>'
  + '<circle cx="50" cy="56" r="26" fill="none" stroke="#8692e2" stroke-opacity=".55" stroke-width="1.2" transform="translate(-.8 -.8)"/>'
  + [0, 1, 2, 3, 4, 5, 6, 7].map((k) => `<circle cx="${(50 + Math.cos(k * Math.PI / 4) * 31).toFixed(1)}" cy="${(56 + Math.sin(k * Math.PI / 4) * 31).toFixed(1)}" r="1.5" fill="#0d1235" opacity=".8"/>`).join('')
  + '<text x="50" y="58" text-anchor="middle" dominant-baseline="middle" class="seal-glyph" fill="#97a1e6" fill-opacity=".55" transform="translate(-.9 -.9)">祝</text>'
  + '<text x="50" y="58" text-anchor="middle" dominant-baseline="middle" class="seal-glyph" fill="#080b20" fill-opacity=".9" transform="translate(1.1 1.1)">祝</text>'
  + '<text x="50" y="58" text-anchor="middle" dominant-baseline="middle" class="seal-glyph" fill="#1b2672">祝</text>'
  + '<ellipse cx="34" cy="36" rx="9" ry="4.5" fill="#fff" opacity=".22" transform="rotate(-35 34 36)"/>'
  + '</svg>';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function question(label, answer, cls, answerCls) {
  const q = el('div', `q ${cls || ''}`);
  q.append(el('p', 'q-label', label));
  const a = el('p', answerCls, answer || '（沒有填）');
  if (!answer) a.classList.add('is-empty');
  q.append(a);
  return q;
}

function buildCard(i) {
  const card = el('article', 'card');
  card.insertAdjacentHTML('afterbegin', DECO_SVG + CREST_SVG);
  const body = el('div', 'card-body');
  if (i >= state.letters.length) {
    card.classList.add('card-end');
    const count = el('p', 'end-count');
    count.append('以上是 ', el('b', '', String(state.letters.length)), ` ${TEXT.fans}的祝福`);
    const title = el('h2', 'end-title');
    title.append(...TEXT.end.map((line) => el('span', 'hl', line)));
    const actions = el('div', 'end-actions');
    const all = el('button', 'end-back', '看大家的祝福');
    all.type = 'button';
    all.addEventListener('click', () => Board.open());
    const back = el('button', 'end-back ghost', '回到棺材');
    back.type = 'button';
    back.addEventListener('click', closeBox);
    actions.append(all, back);
    body.append(count, title, actions);
  } else {
    const L = state.letters[i];
    const name = question(state.nameLabel, L.name || TEXT.anon, 'q-name', 'q-name-text');
    if (!L.name) name.querySelector('.q-name-text').classList.add('is-anon');
    body.append(name);
    // 量表與選擇題：只顯示答案，放在卡片右上角；問答題：祝福最大、印象次之、其餘小題在後面；沒填的題整題拿掉
    const given = state.fields.map((f, k) => ({ f, text: L.answers[k] })).filter((b) => b.text);
    const badges = given.filter((b) => b.f.kind === 'rating' || b.f.kind === 'choice');
    if (badges.length) {
      card.classList.add('has-badges');
      const wrap = el('div', 'card-badges');
      for (const b of badges) {
        const t = el('span', `badge badge-${b.f.kind}`, b.text);
        t.title = b.f.label;
        wrap.append(t);
      }
      card.append(wrap);
    }
    const order = ['words', 'impression', 'plain'];
    const blocks = given
      .filter((b) => b.f.kind !== 'rating' && b.f.kind !== 'choice')
      .sort((a, b) => order.indexOf(a.f.kind) - order.indexOf(b.f.kind));
    const grid = el('div', 'q-grid');
    for (const b of blocks) {
      const wide = b.f.kind !== 'plain' || b.text.length > 70;
      grid.append(question(b.f.label, b.text, `q-${b.f.kind}${wide ? ' q-wide' : ''}`, 'q-answer'));
    }
    body.append(grid);

    const remove = el('button', 'card-remove', '移除這張');
    remove.type = 'button';
    remove.setAttribute('aria-label', '從這次播放中移除這張問卷');
    remove.addEventListener('click', () => onRemove(remove));
    const seal = el('span', 'card-seal');
    seal.innerHTML = SEAL_SVG;
    card.append(remove, seal);
  }
  card.append(body);
  return card;
}

// 字太多時整張卡的字一起縮小，縮到 0.6 倍還放不下才捲動
function fitCard(card) {
  const body = card.querySelector('.card-body');
  let fit = 1;
  body.style.setProperty('--fit', '1');
  while (body.scrollHeight > body.clientHeight + 1 && fit > 0.4) {
    fit = Math.round((fit - 0.05) * 100) / 100;
    body.style.setProperty('--fit', String(fit));
  }
}

function doorCenter() {
  const d = els.doorFrame.getBoundingClientRect();
  return { x: d.left + d.width / 2, y: d.top + d.height / 2, w: d.width };
}

// 卡片從箱子飄出來 / 回到箱子（用同一組座標）
// 用卡片槽的位置計算（卡片本身可能正在動畫中）
function boxKeyframes() {
  const r = els.cardSlot.getBoundingClientRect();
  const d = doorCenter();
  const dx = d.x - (r.left + r.width / 2);
  const dy = d.y - (r.top + r.height / 2);
  const s = Math.max(0.06, d.w / r.width);
  return [
    { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(-14deg)`, opacity: 0 },
    { opacity: 1, offset: 0.2 },
    { transform: `translate(${dx * 0.35}px, ${dy * 0.1 - unit() * 3}px) scale(0.72) rotate(5deg)`, offset: 0.6 },
    { transform: 'none', opacity: 1 },
  ];
}
// 卡片隨風飄走 / 從風裡飄回來
function windKeyframes() {
  return [
    { transform: 'none', opacity: 1 },
    { transform: `translate(${innerWidth * 0.55}px, ${-innerHeight * 0.32}px) rotate(18deg) scale(0.7)`, opacity: 0 },
  ];
}
const fade = [{ opacity: 0 }, { opacity: 1 }];
// 倒著播：順序反過來，offset 也要跟著換成 1 - offset（不然瀏覽器會報錯）
function reversed(frames) {
  return [...frames].reverse().map((f) => (f.offset == null ? f : { ...f, offset: 1 - f.offset }));
}

function animateIn(card, from) {
  if (reduceMotion.matches) return card.animate(fade, { duration: 220 }).finished;
  if (from === 'wind') return card.animate(reversed(windKeyframes()), { duration: 760, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' }).finished;
  return card.animate(boxKeyframes(), { duration: 980, easing: 'cubic-bezier(0.3, 0.7, 0.3, 1)' }).finished;
}
function animateOut(card, to) {
  card.style.pointerEvents = 'none';
  if (reduceMotion.matches) return card.animate(reversed(fade), { duration: 180, fill: 'forwards' }).finished;
  if (to === 'wind') return card.animate(windKeyframes(), { duration: 620, easing: 'cubic-bezier(0.55, 0, 0.8, 0.4)', fill: 'forwards' }).finished;
  if (to === 'drop') return card.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(30px) scale(0.92)', opacity: 0 }], { duration: 360, easing: 'ease-in', fill: 'forwards' }).finished;
  return card.animate(reversed(boxKeyframes()), { duration: 620, easing: 'cubic-bezier(0.6, 0, 0.8, 0.5)', fill: 'forwards' }).finished;
}

// dir：enter（從箱子飄出）/ next（舊的隨風飄走、新的從箱子飄出）/ prev（舊的回到箱子、上一張從風裡飄回來）/ remove
// 「目前這張」記在 state.card：快速翻頁時，上一張可能還在飄走的動畫中，不能拿卡片槽裡的第一張來當目前這張
async function showCard(i, dir) {
  state.index = i;
  const old = state.card;
  const card = buildCard(i);
  state.card = card;
  els.cardSlot.append(card);
  fitCard(card);
  updateNav();
  const outTo = { next: 'wind', prev: 'return', remove: 'drop' }[dir];
  const jobs = [animateIn(card, dir === 'prev' ? 'wind' : 'box')];
  // 動畫不管成功或被打斷，舊卡片最後一定移除
  if (old) jobs.push(animateOut(old, outTo).catch(() => {}).finally(() => old.remove()));
  if (i >= state.letters.length) { celebrate(); Music.sfx.finale(); }
  await Promise.race([Promise.all(jobs).catch(() => {}), wait(CONFIG.navLockMs)]);
}

function updateNav() {
  const n = state.letters.length;
  const atEnd = state.index >= n;
  els.prev.disabled = state.index <= 0;
  els.next.disabled = atEnd;
  els.counter.textContent = atEnd ? `共 ${n} 張` : `${state.index + 1} / ${n}`;
}

async function go(delta) {
  if (state.phase !== 'open' || state.busy) return;
  const i = state.index + delta;
  if (i < 0 || i > state.letters.length) return;
  state.busy = true;
  try {
    await showCard(i, delta > 0 ? 'next' : 'prev');
  } finally {
    state.busy = false; // 就算動畫出錯也要解鎖，翻頁才不會卡住
  }
}
els.next.addEventListener('click', () => go(1));
els.prev.addEventListener('click', () => go(-1));

// 移除：按一次變成「確定移除？」，3 秒內再按一次才真的移除
function onRemove(btn) {
  if (state.busy) return;
  if (!btn.classList.contains('is-confirm')) {
    btn.classList.add('is-confirm');
    btn.textContent = '確定移除？';
    clearTimeout(btn._t);
    btn._t = setTimeout(() => { btn.classList.remove('is-confirm'); btn.textContent = '移除這張'; }, 3000);
    return;
  }
  clearTimeout(btn._t);
  state.busy = true;
  state.letters.splice(state.index, 1);
  showCard(Math.min(state.index, state.letters.length), 'remove').finally(() => { state.busy = false; });
}

document.addEventListener('keydown', (e) => {
  if (state.phase !== 'open' || Board.isOpen() || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.target.closest && e.target.closest('input, textarea, select')) return;
  const onButton = e.target.closest && e.target.closest('button');
  if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !onButton)) { e.preventDefault(); go(1); }
  else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
});

/* ==========================================================
   幽靈與鬼火：目標點漫遊，近景畫在拱門與棺材前面
   ========================================================== */
const ctx = els.canvas.getContext('2d');
const frontCtx = els.front.getContext('2d');
let W = 0, H = 0, DPR = 1;
let ghosts = [], motes = [], burst = [];

// 靈體：192px 高解析精靈圖。0 = 經典床單鬼（Q 版彩蛋），1~3 = 拖著彎曲尾巴的空洞靈體
function makeGhostSprite(variant) {
  const c = document.createElement('canvas');
  c.width = c.height = 192;
  const g = c.getContext('2d');
  const tints = [['#ffffff', '210,236,238'], ['#f2fbff', '190,225,240'], ['#eefcf6', '185,235,215'], ['#f6f0ff', '205,200,240']];
  const [core, rgb] = tints[variant];
  const body = () => {
    g.beginPath();
    g.moveTo(54, 128);
    g.lineTo(54, 78);
    g.bezierCurveTo(54, 20, 138, 20, 138, 78);
    g.lineTo(138, 128);
    if (variant === 0) { // 下擺波浪
      for (let i = 0; i < 4; i++) g.quadraticCurveTo(138 - 12 - i * 21, 158 - (i % 2) * 2, 138 - 21 - i * 21, 132 + (i % 2 ? 0 : 6));
      g.quadraticCurveTo(48, 150, 54, 128);
    } else { // 尾巴：往下漸細並彎曲
      g.bezierCurveTo(140, 150, 112, 150, 108, 168);
      g.bezierCurveTo(106, 180, 118, 184, 128, 180);
      g.bezierCurveTo(100, 192, 82, 172, 86, 156);
      g.bezierCurveTo(78, 148, 56, 150, 54, 128);
    }
    g.closePath();
  };
  // 外圈光暈
  g.save();
  g.shadowColor = `rgba(${rgb},0.95)`; g.shadowBlur = 22;
  g.fillStyle = `rgba(${rgb},0.35)`;
  body(); g.fill();
  g.restore();
  // 本體：上實下虛
  const fill = g.createLinearGradient(0, 24, 0, 188);
  fill.addColorStop(0, core);
  fill.addColorStop(0.55, `rgba(${rgb},0.8)`);
  fill.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = fill;
  body(); g.fill();
  // 內部高光（左上）與皺褶
  const hi = g.createRadialGradient(80, 62, 2, 80, 62, 42);
  hi.addColorStop(0, 'rgba(255,255,255,0.85)'); hi.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hi; body(); g.fill();
  g.save(); body(); g.clip();
  g.strokeStyle = `rgba(${rgb},0.45)`; g.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(70 + i * 24, 100); g.quadraticCurveTo(66 + i * 24, 130, 74 + i * 24, 166); g.stroke(); }
  g.restore();
  // 手
  if (variant === 0) {
    g.fillStyle = `rgba(${rgb},0.9)`;
    g.beginPath(); g.ellipse(50, 100, 13, 7, -0.7, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(142, 100, 13, 7, 0.7, 0, Math.PI * 2); g.fill();
  }
  // 臉：空洞的眼睛（外暗內柔），Q 版那隻有圓嘴
  for (const x of [80, 112]) {
    const eye = g.createRadialGradient(x, 76, 1, x, 78, 14);
    eye.addColorStop(0, '#0d0914'); eye.addColorStop(0.7, 'rgba(26,18,40,0.92)'); eye.addColorStop(1, 'rgba(26,18,40,0)');
    g.fillStyle = eye;
    g.beginPath(); g.ellipse(x, 78, variant === 0 ? 8 : 9, variant === 0 ? 11 : 15 + variant, variant === 2 ? (x < 96 ? -0.2 : 0.2) : 0, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = 'rgba(20,14,32,0.9)';
  g.beginPath(); g.ellipse(96, 104, variant === 0 ? 5 : 6, variant === 0 ? 7 : 11 - variant, 0, 0, Math.PI * 2); g.fill();
  if (variant === 0) { g.fillStyle = 'rgba(170,179,235,0.45)'; for (const x of [68, 124]) { g.beginPath(); g.ellipse(x, 94, 8, 4.5, 0, 0, Math.PI * 2); g.fill(); } }
  return c;
}
function blurred(src) {
  const c = document.createElement('canvas');
  c.width = c.height = 192;
  const g = c.getContext('2d');
  g.filter = 'blur(5px)';
  g.drawImage(src, 0, 0);
  return c;
}
function makeWispSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const glow = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, '#b3d2ed');
  glow.addColorStop(0.2, 'rgba(123,168,224,.8)');
  glow.addColorStop(1, 'rgba(69,127,178,0)');
  g.fillStyle = glow; g.fillRect(0, 0, 64, 64);
  return c;
}
const SPRITES = [];
SPRITES[1] = makeGhostSprite(1);
const ghostBlur = [];
ghostBlur[1] = blurred(SPRITES[1]);
const wispSprite = makeWispSprite();
function newGhost(mote = false) {
  const s = Math.max(0.4, unit() / 19.2);
  const z = rand(0.6, 1.5), near = !mote && z > 1.25;
  const variant = 1; // 只有一種幽靈：拖著尾巴的空洞靈體
  return {
    mote, near, z, variant, sprite: mote ? wispSprite : (near ? ghostBlur : SPRITES)[variant],
    x: rand(0, W), y: rand(0, H), vx: rand(-12, 12) * s, vy: rand(-12, 12) * s,
    tx: rand(0, W), ty: rand(0, H), retarget: rand(2, 6), phase: rand(0, Math.PI * 2),
    maxSpeed: rand(15, 42) * s, size: (mote ? rand(12, 22) : rand(84, 118)) * s * z * (near ? 1.35 : 1),
    mode: 0, a: mote ? rand(0.35, 0.7) : near ? rand(0.4, 0.55) : rand(0.5, 0.8),
  };
}
function altarLayout() {
  const t = els.altar.getBoundingClientRect();
  return { groundY: t.top, cx: t.left + t.width / 2, altarW: t.width };
}
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = innerWidth; H = innerHeight;
  els.canvas.width = Math.round(W * DPR); els.canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  Scenery.resize(W, H, DPR, { bg: els.bg, front: els.front }, altarLayout());
  els.cardSlot.querySelectorAll('.card').forEach(fitCard);
  const calm = reduceMotion.matches ? 0.35 : 1;
  const n = Math.round(Math.max(8, Math.min(CONFIG.maxGhosts, W * H * CONFIG.ghostDensity)) * calm);
  ghosts = Array.from({ length: n }, () => newGhost()).sort((a, b) => a.z - b.z);
  motes = Array.from({ length: Math.round(n * 2.5) }, () => newGhost(true));
  burst = [];
}
function celebrate() {
  if (reduceMotion.matches) return;
  const sheep = $('sheep');
  sheep.classList.remove('is-hop');
  void sheep.offsetWidth;
  sheep.classList.add('is-hop');
  const r = els.cardSlot.getBoundingClientRect();
  for (let i = 0; i < 32; i++) {
    const p = newGhost(i >= 10), angle = rand(0, Math.PI * 2);
    const v = rand(100, 280) * unit() / 19.2;
    burst.push({ ...p, x: r.left + r.width / 2, y: r.top + r.height / 2,
      bvx: Math.cos(angle) * v, bvy: Math.sin(angle) * v, life: 0, ttl: rand(4, 7) });
  }
}
function stepGhost(p, t, dt) {
  p.retarget -= dt;
  const outside = p.x < 0 || p.x > W || p.y < 0 || p.y > H;
  if (p.retarget <= 0 || outside) {
    p.tx = rand(W * 0.08, W * 0.92); p.ty = rand(H * 0.08, H * 0.92);
    p.retarget = rand(2, 6); p.mode = Math.random();
  }
  const dx = p.tx - p.x, dy = p.ty - p.y, distance = Math.max(1, Math.hypot(dx, dy));
  const speed = p.maxSpeed * (p.mode > 0.92 ? 1.6 : 1);
  const circle = p.mode < 0.12 && !outside ? 0.9 : 0;
  const desiredX = (dx / distance - dy / distance * circle) * speed;
  const desiredY = (dy / distance + dx / distance * circle) * speed - (p.mote ? speed * 0.3 : 0);
  const steer = 1 - Math.exp(-dt * 0.8);
  p.vx += (desiredX - p.vx) * steer; p.vy += (desiredY - p.vy) * steer;
  const v = Math.hypot(p.vx, p.vy);
  if (v > speed) { p.vx *= speed / v; p.vy *= speed / v; }
  const sway = p.maxSpeed * 0.18;
  p.x += (p.vx + Math.sin(t * 0.7 + p.phase) * sway) * dt;
  p.y += (p.vy + Math.cos(t * 0.9 + p.phase) * sway) * dt;
}
function drawGhost(g, p, t, alpha) {
  g.save();
  g.globalAlpha = alpha * p.a * (0.78 + 0.22 * Math.sin(t * 0.8 + p.phase));
  g.translate(p.x, p.y);
  g.rotate(p.vx * 0.003);
  g.scale(p.vx < 0 ? -1 : 1, 1);
  if (!p.mote && p.variant !== 0) g.transform(1, 0, Math.max(-.3, Math.min(.3, p.vx * .008)), 1, 0, 0);
  g.drawImage(p.sprite, -p.size / 2, -p.size / 2, p.size, p.size);
  g.restore();
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const t = now / 1000, calm = reduceMotion.matches, speed = calm ? 0.35 : 1;
  ctx.clearRect(0, 0, W, H);
  Scenery.drawFront(frontCtx, t, (Math.sin(t * 0.23) * 0.5 + 0.9) * speed, calm);
  for (const p of [...ghosts, ...motes]) {
    stepGhost(p, t, dt * speed);
    drawGhost(p.near ? frontCtx : ctx, p, calm ? 0 : t, 1);
  }
  for (let i = burst.length - 1; i >= 0; i--) {
    const p = burst[i]; p.life += dt;
    if (p.life >= p.ttl) { burst.splice(i, 1); continue; }
    const drag = Math.exp(-dt * 1.6);
    p.bvx *= drag; p.bvy *= drag;
    stepGhost(p, t, dt * speed);
    p.x += p.bvx * dt * speed; p.y += p.bvy * dt * speed;
    const alpha = Math.min(1, p.life / 0.2) * Math.min(1, (p.ttl - p.life) / 0.8);
    drawGhost(frontCtx, p, t, alpha);
  }
  requestAnimationFrame(frame);
}
reduceMotion.addEventListener('change', resize);

/* ==========================================================
   背景音樂：開關與音量記在瀏覽器；瀏覽器規定要先點過畫面才能出聲，所以第一次點擊時才開始
   ========================================================== */
const musicBtn = $('musicBtn');
const musicVol = $('musicVol');
function loadPref(key, fallback) {
  try { const v = localStorage.getItem(key); return v == null ? fallback : v; } catch (e) { return fallback; }
}
function savePref(key, v) {
  try { localStorage.setItem(key, v); } catch (e) { /* 存不了就算了 */ }
}
function updateMusicBtn() {
  const on = Music.enabled;
  musicBtn.setAttribute('aria-pressed', String(on));
  musicBtn.classList.toggle('is-waiting', on && !Music.started);
  $('musicLabel').textContent = on && !Music.started ? '點畫面開始音樂' : '音樂';
  musicBtn.title = on ? '關掉背景音樂' : '打開背景音樂';
}
Music.setVolume(Number(loadPref('musicVol', '0.6')));
musicVol.value = loadPref('musicVol', '0.6');
if (loadPref('music', 'on') === 'off') Music.setEnabled(false);
updateMusicBtn();
musicBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  Music.setEnabled(!Music.enabled || !Music.started);
  savePref('music', Music.enabled ? 'on' : 'off');
  updateMusicBtn();
});
musicVol.addEventListener('input', () => {
  Music.setVolume(Number(musicVol.value));
  savePref('musicVol', musicVol.value);
});
function unlockAudio(e) {
  if (e.target.closest && e.target.closest('.controls')) return; // 音樂按鈕自己處理
  Music.unlock();
  updateMusicBtn();
  window.removeEventListener('pointerdown', unlockAudio, true);
  window.removeEventListener('keydown', unlockAudio, true);
}
window.addEventListener('pointerdown', unlockAudio, true);
window.addEventListener('keydown', unlockAudio, true);

/* ==========================================================
   Init
   ========================================================== */
resize();
let resizeTimer = 0;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); });
requestAnimationFrame(frame);
