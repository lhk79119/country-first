self.CF = (() => {
  const DATA = self.COUNTRIES;
  const LANG_COUNTRY = { ko: 'KR', ja: 'JP', zh: 'CN', vi: 'VN', th: 'TH', id: 'ID', tr: 'TR', pl: 'PL', uk: 'UA', cs: 'CZ',
    hu: 'HU', ro: 'RO', el: 'GR', he: 'IL', fa: 'IR', it: 'IT', fr: 'FR', de: 'DE', nl: 'NL', sv: 'SE', da: 'DK', fi: 'FI', ru: 'RU' };

  const cache = {};
  const displayNames = (loc, style = 'long') => {
    const k = loc + style;
    if (!(k in cache)) {
      try { cache[k] = new Intl.DisplayNames([loc], { type: 'region', style, fallback: 'none' }); }
      catch { cache[k] = null; }
    }
    return cache[k];
  };
  const nameOf = (code, loc, style) => { try { return displayNames(loc, style)?.of(code) || ''; } catch { return ''; } };

  const guessCountry = () => {
    for (const l of navigator.languages || [navigator.language]) {
      const [lang, region] = l.split('-');
      if (region && DATA[region.toUpperCase()]) return region.toUpperCase();
      if (LANG_COUNTRY[lang]) return LANG_COUNTRY[lang];
    }
    return null;
  };

  const norm = s => (s || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, ' ').replace(/\+\s?\d[\d\s-]*/g, ' ')
    .replace(/[’'`´]/g, "'").replace(/&/g, ' and ').replace(/\./g, '')
    .replace(/[^\p{L}\p{N}'\s]/gu, ' ').replace(/\s+/g, ' ').trim().replace(/^the /, '');
  const swap = s => { const p = (s || '').split(','); return p.length === 2 ? `${p[1]} ${p[0]}` : null; };
  const expand = n => n.replace(/^s /, 'south ').replace(/^n /, 'north ').replace(/ s$/, ' south').replace(/ n$/, ' north')
    .replace(/\bst /g, 'saint ').replace(/\brep\b/g, 'republic').replace(/\bdem\b/g, 'democratic').replace(/\b(is|isl|isls)\b/g, 'islands');
  const nameVariants = n => {
    const out = new Set();
    for (const v of [norm(n), norm(swap(n))]) if (v) out.add(v).add(expand(v));
    return [...out];
  };
  const STOP = /^(of|the|and|republic|rep|islands?|saint|st|de|du|del|della|di|da|do|la|le|les|los|las|el|et|y|e|und|der|van)$/;
  const wordsOf = n => n.split(' ').filter(Boolean);
  const addName = (index, v, code) => (index.get(v) || index.set(v, new Set()).get(v)).add(code);
  const rivalsOf = (code, own, index) => {
    const rivals = new Set();
    for (const [v, owners] of index) {
      if (owners.has(code)) continue;
      const ws = wordsOf(v);
      if (ws.some(w => own.has(w) && !STOP.test(w))) for (const w of ws) if (!own.has(w)) rivals.add(w);
    }
    return rivals;
  };

  const LOCALES = ['en', 'ko', 'ja', 'zh', 'zh-Hant', 'es', 'fr', 'de', 'it', 'pt', 'pt-PT', 'ru', 'ar', 'hi',
    'id', 'ms', 'th', 'vi', 'tr', 'pl', 'nl', 'sv', 'nb', 'da', 'fi', 'cs', 'sk', 'hu', 'ro', 'bg', 'el', 'he',
    'uk', 'fa', 'ur', 'bn', 'ta', 'te', 'ml', 'kn', 'mr', 'gu', 'pa', 'sw', 'fil', 'hr', 'sr', 'sr-Latn', 'sl',
    'lt', 'lv', 'et', 'ca', 'eu', 'gl', 'is', 'ga', 'af', 'am', 'az', 'ka', 'kk', 'uz', 'mn', 'km', 'lo', 'my',
    'ne', 'si', 'hy', 'be', 'mk', 'sq', 'bs', 'cy', 'zu', 'ha', 'yo', 'so', 'ps', 'ky', 'tg', 'tk'];

  const STRINGS = {
    en: {
      appName: 'Country First', noMatch: 'No matches', myCountry: 'Country', search: 'Search countries…', promote: 'Move it to the top of country lists',
      autoSelect: 'Fill empty country fields automatically', shortcut: 'Shortcut', change: 'Change', unset: 'Not set',
      noCountry: 'Choose your country in Country First first.', notFound: 'Couldn’t find $1 here',
    },
    ko: {
      appName: '국가 선택기', noMatch: '검색 결과가 없어요', myCountry: '나라', search: '나라 검색…', promote: '국가 목록에서 맨 위로 올리기',
      autoSelect: '비어 있는 국가 칸 자동으로 채우기', shortcut: '단축키', change: '바꾸기', unset: '지정 안 됨',
      noCountry: '국가 선택기에서 먼저 나라를 정해 주세요.', notFound: '여기서 $1을(를) 찾지 못했어요',
    },
  };
  const defaultLang = () => (chrome.i18n?.getUILanguage?.() || navigator.language || '').toLowerCase().startsWith('ko') ? 'ko' : 'en';
  const uiLang = l => (l in STRINGS ? l : defaultLang());
  const t = (lang, key, sub = '') => (STRINGS[uiLang(lang)][key] || STRINGS.en[key] || '').replace('$1', sub);

  const load = cb => chrome.storage.sync.get(['country', 'autoSelect', 'promote', 'uiLang'], s => cb({
    country: s.country || guessCountry(), autoSelect: !!s.autoSelect, promote: s.promote !== false,
    uiLang: uiLang(s.uiLang), saved: !!s.country,
  }));

  return { DATA, LOCALES, nameOf, norm, swap, expand, nameVariants, wordsOf, addName, rivalsOf, guessCountry, uiLang, t, load };
})();
