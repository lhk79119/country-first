# Country First · 국가 선택기

Signing up on a foreign site, and South Korea is hiding under **R** as `Korea, Republic of`, right next to North Korea? Or the list starts at Afghanistan and you scroll for ten seconds every time? Set your country once, and Country First moves it to the top of every country picker on any site. **Alt+K** selects it instantly.

**[Install from the Chrome Web Store](https://chromewebstore.google.com/detail/coonojgeinmmeibcgcnceaogmhechodk)**

![Country First](docs/screenshot.png)

## What it does

- Finds your country in native `<select>` lists, ARIA listboxes, plain `div` lists, virtual-scroll lists, searchable comboboxes, phone-code pickers, flag-only lists, shadow DOM components and iframes.
- Reads country names in 80+ languages, plus official, short and abbreviated forms (`Korea, Republic of`, `S. Korea`, `Corée du Sud`, `大韓民國`, `ROK`, `+82`).
- Does not pick a look-alike. `Korea (North)`, `Congo (Kinshasa)`, `Guinea-Bissau`, `Sudan (South)` and `Estados Unidos Mexicanos` are recognized as other countries and skipped.
- With nothing focused, Alt+K fills every empty country field on the page.
- Collects no data and makes no network requests. See the [privacy policy](PRIVACY.md).


## FAQ

**Why is South Korea listed under R?**
Many sites take their country list straight from ISO 3166, where the English short name is `Korea, Republic of`. Sorted alphabetically, it lands between Qatar and Romania. Country First matches that form along with every other common spelling, so the list order no longer matters.

**Does it work for countries other than Korea?**
Yes. Pick any country or territory in the popup. Korea gets extra attention because its names are unusually scattered across lists, but the same matching runs for every country.

**Will it ever select North Korea by mistake?**
No. A name that also belongs to another country is never used, and a partial match is dropped when the rest of the line points to a different country.

**Can I change the shortcut?**
Yes. Open `chrome://extensions/shortcuts`, or click **Change** in the popup.

## Install from source

Open `chrome://extensions`, turn on Developer mode, choose **Load unpacked** and select this folder.

`build.sh` produces the minified package that is uploaded to the Chrome Web Store. It needs [terser](https://terser.org/).

## How matching works

Every option's text is normalized (accents, punctuation, dial codes and flag emoji removed) and compared against the names of the chosen country. A name that also belongs to another country is never used. When only part of the text matches, such as `Korea` inside `Korea (North)`, the rest of the line is checked for words that mark a different country, and the line is skipped if any are found. Aliases such as `England` are weak: they are used only when no stronger name for the country is in the list.

## Third-party data

Country names are derived from iso-codes and pycountry (LGPL-2.1), and calling codes from libphonenumber (Apache-2.0). See [NOTICE.md](NOTICE.md).
