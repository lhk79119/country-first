# Country First · 국가 선택기

Stop scrolling for your country. Set it once; it jumps to the top of every country picker on any site, and **Alt+K** selects it instantly.

![Country First](docs/screenshot.png)

## What it does

- Finds your country in native `<select>` lists, ARIA listboxes, plain `div` lists, virtual-scroll lists, searchable comboboxes, phone-code pickers, flag-only lists, shadow DOM components and iframes.
- Reads country names in 80+ languages, plus official, short and abbreviated forms (`Korea, Republic of`, `S. Korea`, `Corée du Sud`, `大韓民國`, `ROK`, `+82`).
- Does not pick a look-alike. `Korea (North)`, `Congo (Kinshasa)`, `Guinea-Bissau`, `Sudan (South)` and `Estados Unidos Mexicanos` are recognized as other countries and skipped.
- With nothing focused, Alt+K fills every empty country field on the page.
- Collects no data and makes no network requests.

## Install

Chrome Web Store listing: in review.

To load it from source, open `chrome://extensions`, turn on Developer mode, choose **Load unpacked** and select this folder.

## How matching works

Every option's text is normalized (accents, punctuation, dial codes and flag emoji removed) and compared against the names of the chosen country. A name that also belongs to another country is never used. When only part of the text matches, such as `Korea` inside `Korea (North)`, the rest of the line is checked for words that mark a different country, and the line is skipped if any are found. Aliases such as `England` are weak: they are used only when no stronger name for the country is in the list.

## Layout

| File | Role |
| --- | --- |
| `content.js` | Finds country pickers on the page, promotes and selects the country |
| `common.js` | Normalization, settings and strings shared by all scripts |
| `background.js` | Shortcut handling and the full multilingual name index |
| `data.js` | Curated country names, pre-normalized |
| `data-x.js` | Official names in 31 languages, loaded by the background worker only |
| `popup.html`, `popup.js` | Settings popup |
| `tools/` | Scripts that generate `data.js` and `data-x.js` |
| `build.sh` | Minifies the scripts into a release folder |

## 한국어

스크롤은 이제 그만. 나라를 한 번만 정해 두면 어느 사이트의 국가 선택창이든 그 나라를 맨 위로 올리고, **Alt+K** 한 번에 바로 고릅니다.

해외 사이트에서 한국은 매번 다른 데 숨어 있습니다. `Korea, Republic of`는 K에, `South Korea`는 S에, `Republic of Korea`는 R에 있습니다. 국가 선택기는 어떤 표기든 알아보고, 북한은 고르지 않습니다. 데이터를 수집하지 않고 외부와 통신하지 않습니다.
