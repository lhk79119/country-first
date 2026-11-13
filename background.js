importScripts('data.js', 'data-x.js', 'common.js');

const FILES = ['data.js', 'common.js', 'content.js'];

async function pickIn(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'pick' });
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: FILES });
      await chrome.tabs.sendMessage(tabId, { type: 'pick' });
    } catch {}
  }
}

chrome.commands.onCommand.addListener(async command => {
  if (command !== 'pick-country') return;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab?.id) pickIn(tab.id);
});

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') chrome.runtime.openOptionsPage();
  for (const tab of await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }))
    chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: FILES }).catch(() => {});
});

let indexCache = null;
let fullIndex = null;
function buildIndex() {
  const { DATA, LOCALES, nameOf, nameVariants, addName } = self.CF;
  const X = self.COUNTRIES_X || {};
  const map = new Map();
  for (const c of Object.keys(DATA)) {
    for (const v of [...DATA[c][4], ...DATA[c][5], ...(X[c] || [])]) addName(map, v, c);
    for (const n of [nameOf(c, 'en', 'short'), ...LOCALES.map(l => nameOf(c, l))])
      for (const v of nameVariants(n)) addName(map, v, c);
  }
  return map;
}
const targetCache = {};
function buildTargetExtra(code) {
  const { DATA, wordsOf, rivalsOf } = self.CF;
  if (!DATA[code]) return null;
  fullIndex ||= buildIndex();
  const own = new Set();
  for (const [v, owners] of fullIndex) if (owners.has(code)) for (const w of wordsOf(v)) own.add(w);
  return { names: (self.COUNTRIES_X || {})[code] || [], rivals: [...rivalsOf(code, own, fullIndex)] };
}
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type === 'index') {
    fullIndex ||= buildIndex();
    reply(indexCache ||= [...fullIndex].map(([v, s]) => [v, [...s].join(',')]));
  } else if (msg?.type === 'target') {
    reply(targetCache[msg.code] ||= buildTargetExtra(msg.code));
  }
});
