const { DATA, nameOf, load, t } = self.CF;
const $ = id => document.getElementById(id);
const el = (tag, text) => Object.assign(document.createElement(tag), { textContent: text });
if (window.innerWidth > 500) document.body.classList.add('tab');

const fold = s => (s || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();

let state = {};
let rows = [];

function buildRows(lang) {
  rows = Object.keys(DATA).map(code => {
    const name = nameOf(code, lang) || nameOf(code, 'en') || DATA[code][3][0];
    return { code, name, hay: fold([code, DATA[code][0], name, nameOf(code, 'en'), nameOf(code, 'ko'), ...DATA[code][3], ...DATA[code][4], ...DATA[code][5]].join(' ')) };
  }).sort((a, b) => a.name.localeCompare(b.name, lang));
}

function renderText() {
  const L = state.uiLang;
  document.documentElement.lang = L;
  document.title = t(L, 'appName');
  document.querySelectorAll('[data-i18n]').forEach(n => (n.textContent = t(L, n.dataset.i18n)));
  $('q').placeholder = t(L, 'search');
  document.querySelectorAll('.lang button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === L));
  chrome.commands.getAll(cmds => {
    const keys = cmds.find(x => x.name === 'pick-country')?.shortcut;
    $('keys').replaceChildren(...(keys ? keys.split('+').map(k => el('kbd', k)) : [el('kbd', t(L, 'unset'))]));
  });
}

function render(keepScroll) {
  const c = state.country;
  $('curName').textContent = c ? rows.find(r => r.code === c)?.name || c : t(state.uiLang, 'unset');
  $('curCode').textContent = c || '';
  const q = fold($('q').value.trim());
  const shown = rows.filter(r => !q || r.hay.includes(q));
  const list = $('list');
  const top = list.scrollTop;
  list.replaceChildren(...shown.map(r => {
    const li = el('li');
    li.className = r.code === c ? 'on' : '';
    li.append(el('b', r.name), el('i', r.code));
    li.onclick = () => save({ country: r.code }, true);
    return li;
  }));
  list.hidden = !shown.length;
  $('none').hidden = !!shown.length;
  const on = list.querySelector('.on');
  if (keepScroll) list.scrollTop = top;
  else if (on) list.scrollTop = on.offsetTop - on.offsetHeight * 3;
}

function save(patch, keepScroll) {
  state = { ...state, ...patch };
  chrome.storage.sync.set(patch);
  if ('uiLang' in patch) { buildRows(state.uiLang); renderText(); }
  render(keepScroll);
}

load(s => {
  state = s;
  if (!s.saved && s.country) chrome.storage.sync.set({ country: s.country });
  $('promote').checked = s.promote;
  $('autoSelect').checked = s.autoSelect;
  buildRows(s.uiLang);
  renderText();
  render();
});
$('q').addEventListener('input', () => render());
$('promote').onchange = e => save({ promote: e.target.checked }, true);
$('autoSelect').onchange = e => save({ autoSelect: e.target.checked }, true);
document.querySelectorAll('.lang button').forEach(b => (b.onclick = () => save({ uiLang: b.dataset.lang })));
$('change').onclick = () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
