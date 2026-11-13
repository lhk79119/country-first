(() => {
  if (window.__countryFirst?.()) return;
  const alive = () => { try { return !!chrome.runtime?.id; } catch { return false; } };
  window.__countryFirst = alive;

  const { DATA, LOCALES, nameOf, norm, swap, expand, nameVariants, wordsOf, addName, rivalsOf, load, t: msg, uiLang } = self.CF;
  const CODES = Object.keys(DATA);
  const MARK = 'data-country-first';
  const SEP = MARK + '-sep';
  const CLONE = MARK + '-clone';
  const MIN_LIST = 8;
  const STRONG_ATTRS = ['data-country-code', 'data-country', 'data-iso', 'data-iso2', 'data-alpha2', 'data-region'];
  const WEAK_ATTRS = ['data-code', 'data-value', 'data-key', 'data-id', 'value'];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TITLE', 'TEXTAREA', 'OPTION', 'OPTGROUP', 'SELECT', 'TEMPLATE']);
  const COUNTRY_HINT = /countr|nation|region|territor|国|국가|나라|국적|pays|pa[ií]s|paese|(?:^|[^a-z])land(?:[^a-z]|$)|staat|страна|ülke|negara|quốc|ประเทศ|بلد|دولة/i;
  const POPUP = '[role=listbox],[role=option],[role=menu],[role=menuitem],[role=dialog],[role=grid],[role=tree],[role=combobox],' +
    '.select2-container,.select2-dropdown,.chosen-container,.choices,.dropdown,.dropdown-menu,.vs__dropdown-menu,.ant-select,.ant-select-dropdown,.MuiAutocomplete-root,.MuiAutocomplete-popper,.iti';

  const fold = s => s.normalize('NFKD').replace(/\p{M}/gu, '');

  const spacedText = el => {
    const parts = [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(), len = 0; n && len < 200; n = w.nextNode()) { parts.push(n.data); len += n.data.length; }
    return parts.join(' ');
  };

  function variants(text) {
    const raw = (text || '').trim();
    if (!raw || raw.length > 160) return [];
    const out = new Set();
    const add = s => {
      const n = norm(s);
      if (!n) return;
      out.add(n);
      const x = expand(n);
      if (x !== n) out.add(x);
    };
    for (const p of new Set([raw, ...raw.split(/\s*[\/|｜·•]\s*/)])) {
      const bare = p.replace(/\s*[(\[（][^)\]）]*[)\]）]\s*/g, ' ');
      const noCode = bare.replace(/(^|\s)[A-Z]{2,3}(?=\s|$)/g, ' ');
      add(p); add(bare); add(noCode);
      for (const m of p.matchAll(/[(\[（]([^)\]）]*)[)\]）]/g)) add(m[1]);
      add(swap(p)); add(swap(bare));
    }
    return [...out];
  }

  const pageLangs = [...new Set(['en', document.documentElement.lang, ...(navigator.languages || [])]
    .filter(Boolean).map(l => l.split(/[-_]/)[0]))];
  const anyIndex = new Map();
  const codeSet = new Set();
  const telOf = new Map();
  for (const c of CODES) {
    const [a3, , tel, , strong, weak] = DATA[c];
    codeSet.add(c.toLowerCase()).add(a3.toLowerCase());
    telOf.set(c, tel).set(a3, tel);
    for (const v of strong) addName(anyIndex, v, c);
    for (const v of weak) addName(anyIndex, v, c);
    for (const n of [nameOf(c, 'en', 'short'), ...pageLangs.map(l => nameOf(c, l))])
      for (const v of nameVariants(n)) addName(anyIndex, v, c);
  }
  let fullIndex = 0;
  function needFullIndex() {
    if (fullIndex) return;
    fullIndex = 1;
    chrome.runtime.sendMessage({ type: 'index' }).then(pairs => {
      if (!Array.isArray(pairs)) return;
      for (const [v, cs] of pairs) for (const c of cs.split(',')) addName(anyIndex, v, c);
      fullIndex = 2;
      listCache = new WeakMap();
      if (T) { T = buildTarget(settings.country); scan(document); flush(); }
    }).catch(() => { fullIndex = 0; });
  }
  const ownedByOther = (v, code) => [...(anyIndex.get(v) || [])].some(o => o !== code);
  const codeWithTel = t => {
    const m = t.match(/^([A-Z]{2,3})\s*\(?\+\s?(\d{1,4})\)?$/) || t.match(/^\(?\+\s?(\d{1,4})\)?\s*([A-Z]{2,3})$/);
    if (!m) return null;
    const [code, tel] = /\d/.test(m[1]) ? [m[2], m[1]] : [m[1], m[2]];
    return telOf.get(code) === tel ? code : null;
  };

  let settings = {};
  let T = null;
  let ext = { code: null, names: [], rivals: [] };
  let extAsked = null;
  function requestExt(code) {
    if (!code || ext.code === code || extAsked === code) return;
    extAsked = code;
    chrome.runtime.sendMessage({ type: 'target', code }).then(r => {
      if (!r || !Array.isArray(r.names)) return;
      ext = { code, names: r.names, rivals: r.rivals || [] };
      if (settings.country === code) { T = buildTarget(code); scan(document); flush(); }
    }).catch(() => { extAsked = null; });
  }
  const GENERIC = /^(republic|kingdom|united|states?|islands?|north|northern|south|southern|east|eastern|west|western|new|saint|democratic|people's|federal|federation|great|central|union|arab|islamic)$/;
  function keyWord(name) {
    const ws = wordsOf(name);
    const pool = [ws.filter(w => !STOPW.test(w) && !GENERIC.test(w)), ws.filter(w => !STOPW.test(w)), ws].find(p => p.length);
    return pool.reduce((best, w) => (w.length >= best.length ? w : best), '');
  }
  const STOPW = /^(of|the|and|rep|dem|st|de|du|del|di|da|do|la|le)$/;

  function buildTarget(code) {
    if (!DATA[code]) return null;
    const [a3, , tel, extra, strong, weakNames] = DATA[code];
    const weak = new Set(weakNames);
    const names = new Set([...strong, ...weakNames]);
    for (const n of [nameOf(code, 'en', 'short'), ...LOCALES.map(l => nameOf(code, l))])
      for (const v of nameVariants(n)) if (!ownedByOther(v, code)) names.add(v);
    if (ext.code === code) for (const v of ext.names) if (!ownedByOther(v, code)) names.add(v);
    for (const v of names) if (weak.has(v) && strong.includes(v)) weak.delete(v);

    const words = new Set();
    for (const n of names) { const w = keyWord(n); if (w) words.add(w); }
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const ascii = [...words].filter(w => /^[\x00-\x7f]+$/.test(w));
    const uni = [...words].filter(w => !/^[\x00-\x7f]+$/.test(w));
    const pre = {
      a: new RegExp([...(ascii.length ? [`\\b(?:${ascii.map(esc).join('|')})\\b`] : []),
        ...(tel ? [`\\+\\s?${tel}\\b`] : []), `\\b(?:${code}|${a3})\\b`].join('|'), 'i'),
      u: uni.length ? new RegExp(uni.map(esc).join('|'), 'iu') : null,
    };

    const freq = {};
    for (const n of [...extra, nameOf(code, 'en')]) for (const w of norm(n).split(' '))
      if (w.length >= 3 && !/^(republic|of|the|and|democratic|people's|state|federal|islands?)$/.test(w)) freq[w] = (freq[w] || 0) + 1;
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
    const docLang = (document.documentElement.lang || navigator.language || 'en').split(/[-_]/)[0];
    const typeWords = [...new Set([top && top[0].toUpperCase() + top.slice(1), nameOf(code, docLang), nameOf(code, 'en'),
      extra[1] || extra[0], nameOf(code, 'en', 'short')].filter(Boolean))].slice(0, 5);

    const own = new Set();
    for (const n of names) for (const w of wordsOf(n)) own.add(w);
    const rivals = rivalsOf(code, own, anyIndex);
    if (ext.code === code) for (const w of ext.rivals) if (!own.has(w)) rivals.add(w);

    return { code, lc: code.toLowerCase(), a3: a3.toLowerCase(), A3: a3, tel, names, weak, rivals, pre, typeWords };
  }

  function quick(s) {
    if (!s || !T) return false;
    const { a, u } = T.pre;
    if (a.test(s)) return true;
    if (!/[^\x00-\x7f]/.test(s)) return false;
    const f = fold(s);
    return a.test(f) || !!u && (u.test(s) || u.test(f));
  }
  function strength(text) {
    if (!T || !text) return 0;
    const t = text.trim();
    if (/^[A-Z]{2,3}$/.test(t)) {
      if (t === T.code || t === T.A3) return 2;
      if (codeSet.has(t.toLowerCase())) return 0;
    }
    const m = t.match(/^\(?\+\s?(\d{1,4})\)?$/);
    if (m) return T.tel && m[1] === T.tel ? 2 : 0;
    const ct = codeWithTel(t);
    if (ct) return ct === T.code || ct === T.A3 ? 2 : 0;
    const rank = n => (T.names.has(n) ? (T.weak.has(n) ? 1 : 2) : 0);
    const full = norm(t);
    const fullX = expand(full);
    let r = Math.max(rank(full), rank(fullX));
    if (r) return r;
    if (otherCountry(full) || otherCountry(fullX) || hasRival(fullX)) return 0;
    for (const v of variants(t)) r = Math.max(r, rank(v));
    return r;
  }
  const isTargetText = text => strength(text) > 0;
  const otherCountry = v => { const o = anyIndex.get(v); return !!o && !o.has(T.code); };
  const hasRival = n => wordsOf(n).some(w => T.rivals.has(w));
  const contradicts = text => {
    const n = expand(norm(text));
    return !T.names.has(n) && (otherCountry(n) || hasRival(n));
  };
  function isCountryText(text) {
    const t = (text || '').trim();
    if (!t) return false;
    if (/^\(?\+\s?\d{1,4}\)?$/.test(t) || codeWithTel(t)) return true;
    return variants(t).some(v => anyIndex.has(v));
  }

  function codeOf(el) {
    for (const a of STRONG_ATTRS) {
      const v = el.getAttribute(a)?.trim().toLowerCase();
      if (v && codeSet.has(v)) return v;
    }
    for (const a of WEAK_ATTRS) {
      const v = el.getAttribute(a)?.trim();
      if (v && /^[A-Z]{2,3}$/.test(v) && codeSet.has(v.toLowerCase())) return v.toLowerCase();
    }
    const cls = typeof el.className === 'string' ? el.className : el.className?.baseVal || '';
    if (/flag|fi-|iti|country/i.test(cls))
      for (const tok of el.classList) {
        const m = tok.toLowerCase().match(/(?:^|[-_])([a-z]{2})$/);
        if (m && codeSet.has(m[1])) return m[1];
      }
    if (el.tagName === 'IMG') {
      const m = (el.getAttribute('src') || '').toLowerCase().match(/flags?[\w.-]*\/(?:[\w-]+\/)*([a-z]{2})(?:\.(?:svg|png|gif|webp|jpe?g))|[\/_-]flag[_-]([a-z]{2})\./);
      const c = m && (m[1] || m[2]);
      if (c && codeSet.has(c)) return c;
    }
    return null;
  }
  const hasCodeHints = el => el.tagName === 'IMG' || STRONG_ATTRS.some(a => el.hasAttribute(a)) ||
    WEAK_ATTRS.some(a => a !== 'value' && el.hasAttribute(a)) ||
    /flag|fi-|iti/i.test(typeof el.className === 'string' ? el.className : '');
  const isTargetCode = c => !!T && (c === T.lc || c === T.a3);
  const labelOf = el => el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('alt') || '';
  const ownText = el => (el.textContent || '').trim();

  const shadowOf = el => {
    try { return el.shadowRoot || (el.localName.includes('-') && chrome.dom?.openOrClosedShadowRoot?.(el)) || null; }
    catch { return null; }
  };
  function deepActive() {
    let a = document.activeElement, sr;
    while (a && (sr = shadowOf(a)) && sr.activeElement) a = sr.activeElement;
    return a;
  }
  function deepQueryAll(sel, root = document, out = []) {
    out.push(...root.querySelectorAll(sel));
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    for (let n = w.nextNode(); n; n = w.nextNode()) { const sr = shadowOf(n); if (sr) deepQueryAll(sel, sr, out); }
    return out;
  }
  const composedParent = el => el.parentElement || (el.parentNode instanceof ShadowRoot ? el.parentNode.host : null);
  function closestDeep(el, sel) {
    for (let e = el; e; e = composedParent(e)) if (e.matches?.(sel)) return e;
    return null;
  }

  const visible = el => !!el?.isConnected && (el.checkVisibility
    ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : el.getClientRects().length > 0);

  function isPopupish(el) {
    if (closestDeep(el, POPUP)) return true;
    for (let e = el, i = 0; e && i < 12; e = composedParent(e), i++) {
      const pos = getComputedStyle(e).position;
      if (pos === 'fixed' || pos === 'absolute') return true;
    }
    return false;
  }
  const isNavLink = el => {
    const a = closestDeep(el, 'a[href]') || el.querySelector?.('a[href]');
    if (!a) return false;
    const h = a.getAttribute('href').trim();
    return !!h && !h.startsWith('#') && !/^javascript:/i.test(h);
  };
  const pickable = el => !isNavLink(el) || isPopupish(el);

  function findItem(el) {
    let cur = el, best = el, bestN = 0;
    for (let i = 0; i < 8 && cur.parentElement; i++) {
      const p = cur.parentElement;
      if (p === document.body || p === document.documentElement) break;
      const kids = p.children;
      if (kids.length >= 3 && kids.length > bestN) {
        let same = 0;
        for (const k of kids) if (k.tagName === cur.tagName) same++;
        if (same / kids.length >= 0.6) { best = cur; bestN = kids.length; }
      }
      cur = p;
    }
    return best;
  }

  function isCountryItem(k) {
    const text = ownText(k);
    if (text) return isCountryText(text) || (!!labelOf(k) && isCountryText(labelOf(k)));
    if (codeOf(k)) return true;
    const icon = k.querySelector?.('[class*="flag"],img,[data-country-code],[data-country]');
    return !!icon && (!!codeOf(icon) || isCountryText(labelOf(icon)));
  }
  let listCache = new WeakMap();
  function isCountryList(list) {
    if (!list) return false;
    const kids = list.children;
    const c = listCache.get(list);
    if (c && c.n === kids.length) return c.v;
    let hits = 0;
    for (let i = 0; i < Math.min(kids.length, 400) && hits < MIN_LIST; i++) if (isCountryItem(kids[i])) hits++;
    const v = hits >= Math.min(MIN_LIST, Math.max(3, Math.floor(kids.length / 2)));
    if (!v && kids.length >= 30 && fullIndex !== 2) needFullIndex();
    listCache.set(list, { n: kids.length, v });
    return v;
  }

  const hits = new Map();
  function considerText(node) {
    const el = node.parentElement;
    const raw = node.data;
    if (!T || !el || SKIP.has(el.tagName) || el.isContentEditable || !raw || raw.length > 160 || !quick(raw)) return;
    const item = findItem(el);
    const whole = item === el ? raw : spacedText(item);
    if (isTargetText(whole) || (isTargetText(raw) && !(whole.length <= 160 && contradicts(whole)))) register(el, item);
  }
  function considerAttr(el) {
    if (!T) return;
    const label = labelOf(el);
    const byLabel = quick(label) && isTargetText(label);
    const byCode = !byLabel && hasCodeHints(el) && isTargetCode(codeOf(el));
    if (!byLabel && !byCode) return;
    const item = findItem(el);
    const text = spacedText(item).trim();
    if (text && !isTargetText(text) && (byCode || isCountryText(text) || (text.length <= 160 && contradicts(text)))) return;
    register(el, item);
  }
  function register(hitEl, item) {
    if (hits.has(hitEl)) return;
    hits.set(hitEl, item);
    maybeDecorate(item);
  }
  function maybeDecorate(item) {
    if (settings.promote && !item.hasAttribute(MARK) && isCountryList(item.parentElement) && pickable(item)) decorate(item);
  }

  const ro = new ResizeObserver(entries => {
    for (const { target: el, contentRect } of entries) {
      if (!contentRect.height) { el.__cfShown = false; continue; }
      if (el.__cfShown) continue;
      el.__cfShown = true;
      if (settings.promote) scrollWithin(el);
    }
  });
  function decorate(item) {
    item.setAttribute(MARK, 'hit');
    item.style.setProperty('outline', '2px solid #12805c', 'important');
    item.style.setProperty('outline-offset', '-2px', 'important');
    ro.observe(item);
  }
  function undecorate(item) {
    item.removeAttribute(MARK);
    item.style.removeProperty('outline');
    item.style.removeProperty('outline-offset');
    ro.unobserve(item);
    item.__cfShown = false;
  }
  function scroller(el) {
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const oy = getComputedStyle(p).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight + 4) return p;
    }
    return null;
  }
  function scrollWithin(el) {
    const sc = scroller(el);
    if (!sc) return;
    const r = el.getBoundingClientRect(), s = sc.getBoundingClientRect();
    if (r.top < s.top || r.bottom > s.bottom) sc.scrollTop += r.top - s.top - (s.height - r.height) / 2;
  }

  const inserted = new Set();
  const touched = new WeakSet();
  const optText = o => o.text || o.label || '';
  const isCountrySelect = sel => {
    let n = 0;
    for (const o of sel.options) if (!o.hasAttribute(SEP) && !o.hasAttribute(CLONE) && isCountryText(optText(o)) && ++n >= MIN_LIST) return true;
    if (sel.options.length >= 30 && fullIndex !== 2) needFullIndex();
    return false;
  };
  function targetOption(sel, countrySelect = isCountrySelect(sel)) {
    let byCode = null, weak = null;
    for (const o of sel.options) {
      if (o.disabled || o.hasAttribute(SEP)) continue;
      const st = strength(optText(o));
      if (st === 2) return o;
      if (st === 1 && !weak) weak = o;
      if (!byCode && countrySelect && isTargetCode((o.value || '').trim().toLowerCase()) && !isCountryText(optText(o))) byCode = o;
    }
    return weak || byCode;
  }
  function isEmptySelect(sel) {
    const o = sel.options[sel.selectedIndex];
    return !o || o.value === '' || o.disabled || (sel.selectedIndex === 0 && /select|choose|선택|please|--|—/i.test(optText(o)));
  }

  function handleSelect(sel) {
    if (!T || sel.options.length < MIN_LIST || !isCountrySelect(sel)) return;
    const target = targetOption(sel, true);
    if (!target) return;
    if (settings.promote && !sel.querySelector(`[${CLONE}]`)) {
      const current = sel.options[sel.selectedIndex];
      let i = 0;
      while (sel.options[i] && (sel.options[i].value === '' || sel.options[i].disabled)) i++;
      const ref = sel.options[i] || null;
      const parent = ref ? ref.parentNode : sel;
      const clone = target.cloneNode(true);
      clone.removeAttribute('selected');
      clone.selected = false;
      clone.setAttribute(CLONE, '');
      const sep = new Option('──────────', '');
      sep.disabled = true;
      sep.setAttribute(SEP, '');
      parent.insertBefore(clone, ref);
      parent.insertBefore(sep, ref);
      if (current) current.selected = true;
      inserted.add(clone).add(sep);
    }
    if (settings.autoSelect && !touched.has(sel) && isEmptySelect(sel)) pickSelect(sel);
  }

  function setNative(el, prop, v) {
    let p = Object.getPrototypeOf(el);
    while (p && !Object.getOwnPropertyDescriptor(p, prop)) p = Object.getPrototypeOf(p);
    Object.getOwnPropertyDescriptor(p, prop).set.call(el, v);
  }
  const fire = (el, ...types) => types.forEach(t => el.dispatchEvent(new Event(t, { bubbles: true, composed: true })));

  function pickSelect(sel) {
    if (sel.disabled || closestDeep(sel, 'fieldset[disabled]')) return false;
    const o = targetOption(sel);
    if (!o) return false;
    if (sel.value === o.value) return true;
    setNative(sel, 'value', o.value);
    o.selected = true;
    fire(sel, 'input', 'change', 'chosen:updated');
    return true;
  }

  function visit(el) {
    if (el.tagName === 'SELECT') handleSelect(el);
    else if (el.hasAttributes()) considerAttr(el);
    const sr = shadowOf(el);
    if (sr) scan(sr);
  }
  function scan(root) {
    if (!T) return;
    if (root.nodeType !== 1) watch(root); else visit(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeType === 3 ? considerText(n) : visit(n);
  }

  let pending = new Set(), timer = 0;
  const watched = new WeakSet();
  function watch(root) {
    if (watched.has(root)) return;
    watched.add(root);
    const mo = new MutationObserver(records => {
      if (!alive()) return mo.disconnect();
      for (const r of records) {
        if (r.type === 'characterData') pending.add(r.target);
        for (const n of r.addedNodes) pending.add(n);
        const sel = r.target.closest?.('select') || r.target.parentNode?.closest?.('select');
        if (sel) pending.add(sel);
      }
      clearTimeout(timer);
      timer = setTimeout(flush, 150);
    });
    mo.observe(root, { childList: true, subtree: true, characterData: true });
  }
  function flush() {
    clearTimeout(timer);
    const nodes = pending;
    pending = new Set();
    for (const n of nodes) if (n.isConnected) n.nodeType === 3 ? considerText(n) : n.nodeType === 1 && scan(n);
    for (const [hitEl, item] of hits) hitEl.isConnected ? maybeDecorate(item) : hits.delete(hitEl);
  }

  function reset() {
    for (const n of inserted) n.remove();
    inserted.clear();
    deepQueryAll(`[${CLONE}],[${SEP}]`).forEach(n => n.remove());
    deepQueryAll(`[${MARK}]`).forEach(undecorate);
    hits.clear();
  }

  function clickLike(el) {
    const r = el.getBoundingClientRect();
    const base = { bubbles: true, cancelable: true, composed: true, view: window, button: 0, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
    for (const t of ['pointerover', 'mouseover', 'pointermove', 'mousemove', 'pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      const o = { ...base, buttons: /down/.test(t) ? 1 : 0 };
      el.dispatchEvent(t[0] === 'p' ? new PointerEvent(t, { ...o, pointerId: 1, pointerType: 'mouse', isPrimary: true }) : new MouseEvent(t, o));
    }
  }
  const valueOf = el => el.isContentEditable ? el.textContent : el.value;
  function typeInto(el, text) {
    el.focus();
    try { el.select?.(); document.execCommand('selectAll'); } catch {}
    let ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch {}
    if (!ok || valueOf(el) !== text) {
      el.isContentEditable ? (el.textContent = text) : setNative(el, 'value', text);
      fire(el, 'input');
    }
    el.dispatchEvent(new KeyboardEvent('keyup', { key: text.slice(-1) || 'Backspace', bubbles: true, composed: true }));
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function waitFor(fn, ms = 700) {
    for (const end = Date.now() + ms; Date.now() < end; await sleep(60)) { const v = fn(); if (v) return v; }
    return null;
  }

  function visibleHits(onlyLists = true) {
    flush();
    return [...hits].filter(([el, item]) => visible(el) && pickable(el) && (!onlyLists || isCountryList(item.parentElement))).map(([el]) => el);
  }
  function closestTo(els, ref) {
    if (!ref || ref === document.body || els.length < 2) return els[0];
    const rr = ref.getBoundingClientRect();
    const d = el => { const r = el.getBoundingClientRect(); return Math.hypot(r.left - rr.left, r.top - rr.bottom); };
    return els.sort((a, b) => d(a) - d(b))[0];
  }
  function preferStrong(els) {
    const strong = els.filter(el => { const text = spacedText(hits.get(el) || el).trim(); return !text || strength(text) !== 1; });
    return strong.length ? strong : els;
  }
  const choose = el => (scrollWithin(el), clickLike(el), true);

  function fieldText(el) {
    const ids = (el.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
    const root = el.getRootNode();
    return [el.name, el.id, el.getAttribute('placeholder'), el.getAttribute('autocomplete'), labelOf(el),
      ...[...(el.labels || [])].map(l => l.textContent), ...ids.map(id => root.getElementById?.(id)?.textContent)]
      .filter(Boolean).join(' ');
  }
  const isCountryField = el => COUNTRY_HINT.test(fieldText(el) + ' ' + (el.textContent || '').slice(0, 80)) ||
    isCountryText(valueOf(el) || '') || isCountryText((el.textContent || '').slice(0, 80));
  const COMBO_WRAP = '[role=listbox],[role=combobox],.select2-container,.select2-dropdown,.chosen-container,.choices,.vs__dropdown-menu,.ant-select,.ant-select-dropdown,.MuiAutocomplete-root,.iti';
  const isComboInput = el => el.getAttribute('role') === 'combobox' || el.hasAttribute('aria-autocomplete') || el.hasAttribute('list') ||
    !!closestDeep(el, COMBO_WRAP);
  function controlsCountryList(el) {
    const root = el.getRootNode();
    return (el.getAttribute('aria-controls') + ' ' + el.getAttribute('aria-owns')).split(/\s+/)
      .some(id => { const l = id && id !== 'null' && root.getElementById?.(id); return !!l && (isCountryList(l) || [...l.children].some(isCountryList)); });
  }
  function nearbyHint(el) {
    for (let p = el.parentElement, i = 0; p && i < 2; p = p.parentElement, i++) {
      const t = p.textContent || '';
      if (t.length < 200 && COUNTRY_HINT.test(t)) return true;
    }
    return false;
  }
  const isCountryInput = el => COUNTRY_HINT.test(fieldText(el)) || isCountryText(valueOf(el) || '') || controlsCountryList(el) || nearbyHint(el);
  const isTypable = el => !!el && !el.disabled && !el.readOnly &&
    ((el.tagName === 'INPUT' && /^(text|search)$/.test(el.type)) || el.isContentEditable);
  const isTrigger = el => !!el && el !== document.body && !isTypable(el) && el.tagName !== 'INPUT' &&
    (!!el.getAttribute('aria-haspopup') || el.getAttribute('role') === 'combobox' || el.getAttribute('aria-expanded') === 'false');

  function triggerFor(a) {
    if (!a || a === document.body) return null;
    if (isTrigger(a) && isCountryField(a)) return a;
    const iti = closestDeep(a, '.iti');
    if (iti) return iti.querySelector('.iti__selected-country,.iti__selected-flag,.iti__flag-container [role=combobox],.iti__country-container button');
    for (let p = a.parentElement, i = 0; p && i < 3; p = p.parentElement, i++) {
      const t = [...p.querySelectorAll('[aria-haspopup],[role=combobox]')].find(x => x !== a && isTrigger(x) && isCountryField(x));
      if (t) return t;
    }
    return null;
  }

  function pickDatalist(input) {
    const list = input.list;
    if (!list) return false;
    const o = [...list.options].find(o => isTargetText(o.value) || isTargetText(o.label));
    if (!o) return false;
    input.focus();
    setNative(input, 'value', o.value);
    fire(input, 'input', 'change');
    return true;
  }

  async function searchScrollers() {
    const lists = deepQueryAll('*').filter(el => {
      if (el === document.body || el === document.documentElement || el.scrollHeight <= el.clientHeight + 20) return false;
      if (!/auto|scroll/.test(getComputedStyle(el).overflowY) || !visible(el)) return false;
      let n = 0;
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let t = w.nextNode(); t && n < 5; t = w.nextNode()) if (t.data.length < 80 && isCountryText(t.data)) n++;
      return n >= 5;
    });
    for (const sc of lists) {
      const orig = sc.scrollTop;
      sc.scrollTop = 0;
      for (let i = 0; i < 400; i++) {
        await sleep(40);
        scan(sc);
        const h = visibleHits(true).find(x => sc.contains(x));
        if (h) return choose(h);
        if (sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2) break;
        sc.scrollTop += sc.clientHeight * 0.85;
      }
      sc.scrollTop = orig;
    }
    return false;
  }

  async function enableFlutter() {
    if (!document.querySelector('flutter-view, flt-glass-pane')) return false;
    const ph = deepQueryAll('flt-semantics-placeholder')[0];
    if (!ph) return false;
    clickLike(ph);
    await sleep(400);
    scan(document);
    return true;
  }

  function fillEmptySelects() {
    let n = 0;
    for (const sel of deepQueryAll('select'))
      if (visible(sel) && isCountrySelect(sel) && isEmptySelect(sel) && pickSelect(sel)) n++;
    return n;
  }

  async function pick() {
    if (!document.hasFocus()) return;
    let a = deepActive();
    if (a?.tagName === 'IFRAME' || a?.tagName === 'FRAME') return;
    if (!T) return toast(msg(settings.uiLang, 'noCountry'));
    const label = nameOf(T.code, uiLang(settings.uiLang)) || T.code;
    const done = () => (toast('✓ ' + label), true);
    const nothingFocused = !a || a === document.body || a === document.documentElement;

    if (a?.tagName === 'SELECT') {
      if (pickSelect(a)) return done();
    } else if (nothingFocused) {
      if (fillEmptySelects()) return done();
    } else if (a.tagName === 'INPUT' && a.list && pickDatalist(a)) return done();

    let vis = visibleHits();
    if (!vis.length) {
      const trig = triggerFor(a);
      if (trig) {
        clickLike(trig);
        await sleep(250);
        a = deepActive() || a;
        vis = visibleHits();
      }
    }
    if (vis.length) return choose(closestTo(preferStrong(vis), a)) && done();

    const okInput = el => isTypable(el) && (el.isContentEditable ? isComboInput(el) && isCountryInput(el) : isCountryInput(el));
    const input = okInput(a) ? a
      : deepQueryAll('[role=listbox] input,[role=combobox] input,input[role=combobox],input[aria-autocomplete],.select2-search__field,.chosen-search input,.iti__search-input')
        .find(el => visible(el) && okInput(el));
    if (input) {
      const original = valueOf(input);
      const before = new Set(visibleHits(false));
      for (const word of T.typeWords) {
        typeInto(input, word);
        const h = await waitFor(() => visibleHits(false).find(x => !before.has(x) && !input.contains(x)) || visibleHits()[0]);
        if (h) return choose(h) && done();
      }
      typeInto(input, original);
    }

    if (await searchScrollers()) return done();
    if (await enableFlutter()) { const v = visibleHits(); if (v.length) return choose(v[0]) && done(); }
    if (!nothingFocused && fillEmptySelects()) return done();
    toast(msg(settings.uiLang, 'notFound', label));
  }

  let toastBox;
  function toast(msg) {
    try {
      if (!toastBox?.isConnected) {
        const host = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
        host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;bottom:24px;left:50%;transform:translateX(-50%);pointer-events:none';
        const sr = host.attachShadow({ mode: 'closed' });
        sr.innerHTML = '<style>div{font:600 14px system-ui,sans-serif;background:#202124;color:#fff;padding:10px 16px;border-radius:999px;box-shadow:0 6px 20px rgba(0,0,0,.25);opacity:0;transition:opacity .15s;white-space:nowrap}</style><div></div>';
        (document.body || document.documentElement).appendChild(host);
        toastBox = sr.querySelector('div');
      }
      toastBox.textContent = msg;
      toastBox.style.opacity = 1;
      clearTimeout(toastBox.__t);
      toastBox.__t = setTimeout(() => (toastBox.style.opacity = 0), 1400);
    } catch {}
  }

  let busy = false;
  async function onPick() {
    if (busy) return;
    busy = true;
    try { await pick(); } catch {} finally { busy = false; }
  }

  document.addEventListener('change', e => {
    const t = e.composedPath()[0];
    if (e.isTrusted && t?.tagName === 'SELECT') touched.add(t);
  }, true);
  chrome.runtime.onMessage.addListener(msg => { if (msg?.type === 'pick') onPick(); });

  function apply(next) {
    const prev = settings;
    settings = { ...settings, ...next };
    if ((prev.country && prev.country !== settings.country) || (prev.promote && !settings.promote)) reset();
    T = buildTarget(settings.country);
    scan(document);
    requestExt(settings.country);
  }
  load(apply);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const next = {};
    for (const k in changes) next[k] = changes[k].newValue;
    if ('promote' in next) next.promote = next.promote !== false;
    if ('autoSelect' in next) next.autoSelect = !!next.autoSelect;
    if ('country' in next && !next.country) next.country = self.CF.guessCountry();
    if ('uiLang' in next) next.uiLang = uiLang(next.uiLang);
    apply(next);
  });
})();
