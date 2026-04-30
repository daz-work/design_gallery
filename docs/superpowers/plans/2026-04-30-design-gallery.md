# design-gallery 実装計画

> **エージェント向け:** このプランをタスク単位で実行する場合は `superpowers:subagent-driven-development`（推奨）または `superpowers:executing-plans` スキルを必ず使うこと。各ステップはチェックボックス（`- [ ]`）で進捗管理する。

**目標:** awesome-design-md の71ブランドのデザイン仕様書をカード型ギャラリーで一覧表示し、クリックするとブランドカラーで描画されたランディングページプレビューとデザイントークン一覧がモーダルで見られる静的Webサイトを作る。

**アーキテクチャ:** 静的サイト（`index.html` + `style.css` + `app.js`）が生成済みの `data.js`（`window.DESIGN_DATA`）を読み込む構成。Node.jsビルドスクリプト（`fetch-data.js`）がローカルの `getdesign` npmパッケージからDESIGN.mdテンプレートを読み込んで `data.js` を生成する。実行時はネットワーク通信なし。ローカル表示は `npx serve`、本番はGitHub Pages。

**技術スタック:** バニラHTML/CSS/JS、Node.js（ESM）+ `js-yaml`（ビルドスクリプト用）、`node:test`（ユニットテスト）、`getdesign` npmパッケージ（テンプレートソース）

---

## ファイル構成

```
design-gallery/
├── index.html          — ギャラリーページ：カードグリッド + モーダル骨格
├── style.css           — カードグリッド、カードスタイル、モーダル、フィルターボタン
├── app.js              — DESIGN_DATA読み込み、カードレンダリング、フィルター、モーダルロジック
├── data.js             — 生成物：window.DESIGN_DATA = { brands: [...] }
├── fetch-data.js       — ビルドスクリプト：getdesignテンプレートを読んでdata.jsを生成
├── package.json        — 依存: js-yaml, getdesign
└── test/
    └── parser.test.js  — parseFrontmatter / extractProseColors / extractProseFonts のユニットテスト
```

**各ファイルの責務:**
- `fetch-data.js` — データ抽出ロジック全般。`parseFrontmatter`・`extractProseColors`・`extractProseFonts` をテスト用に `export` する
- `data.js` — 手動編集禁止。常に `fetch-data.js` が上書き再生成する
- `app.js` — データ抽出なし。`window.DESIGN_DATA` を読むだけ
- `index.html` — インラインJSロジックなし。`data.js` と `app.js` を読み込むだけ

---

## フェーズ1 — 3ブランドで先行実装（apple / stripe / notion）

---

### タスク1: プロジェクト初期化

**対象ファイル:**
- 作成: `package.json`

- [ ] **ステップ1: `package.json` を作成する**

```json
{
  "name": "design-gallery",
  "type": "module",
  "scripts": {
    "fetch": "node fetch-data.js",
    "test": "node --test test/parser.test.js",
    "serve": "npx serve ."
  },
  "dependencies": {
    "getdesign": "latest"
  },
  "devDependencies": {
    "js-yaml": "^4.1.0"
  }
}
```

- [ ] **ステップ2: 依存をインストールする**

実行: `npm install`

確認: `ls node_modules/getdesign/templates/ | head -5`
期待出力に `airbnb.md`、`apple.md` などが含まれること。`node_modules/js-yaml/` も存在すること。

- [ ] **ステップ3: testディレクトリを作成する**

実行: `mkdir -p test`

- [ ] **ステップ4: コミットする**

```bash
git init
git add package.json package-lock.json
git commit -m "chore: initialize project"
```

---

### タスク2: パーサーのテストを書く（TDD — 実装より先に書く）

**対象ファイル:**
- 作成: `test/parser.test.js`

- [ ] **ステップ1: `test/parser.test.js` を作成する**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter, extractProseColors, extractProseFonts } from '../fetch-data.js';

// ── parseFrontmatter ──────────────────────────────────────────────────────────

test('parseFrontmatter: 散文のみのコンテンツにはnullを返す', () => {
  const content = `# Design System Inspired by Stripe\n\nSome prose here.`;
  assert.equal(parseFrontmatter(content), null);
});

test('parseFrontmatter: YAMLフロントマターから名前とカラーを抽出する', () => {
  const content = `---
version: alpha
name: Apple
description: Consumer electronics brand.
colors:
  primary: "#0066cc"
  ink: "#1d1d1f"
  canvas: "#ffffff"
typography:
  hero-display:
    fontFamily: "SF Pro Display, system-ui, sans-serif"
    fontSize: 56px
---
# rest of content`;

  const result = parseFrontmatter(content);
  assert.equal(result.name, 'Apple');
  assert.equal(result.description, 'Consumer electronics brand.');
  assert.ok(result.colors.includes('#0066cc'));
  assert.ok(result.colors.includes('#1d1d1f'));
  assert.ok(result.colors.includes('#ffffff'));
  assert.equal(result.headingFont, 'SF Pro Display');
});

test('parseFrontmatter: HEX以外のカラー値はスキップする', () => {
  const content = `---
name: Test
colors:
  primary: "#ff0000"
  gradient: "linear-gradient(#ff0000, #0000ff)"
  named: "red"
typography: {}
---`;

  const result = parseFrontmatter(content);
  assert.deepEqual(result.colors, ['#ff0000']);
});

test('parseFrontmatter: typographyが空のときheadingFontはnullを返す', () => {
  const content = `---
name: Test
colors:
  primary: "#000000"
typography: {}
---`;

  const result = parseFrontmatter(content);
  assert.equal(result.headingFont, null);
});

// ── extractProseColors ────────────────────────────────────────────────────────

test('extractProseColors: バッククォートで囲まれたHEXコードを見つける', () => {
  const content = `white canvas (\`#ffffff\`) with deep navy headings (\`#061b31\`) and signature purple (\`#533afd\`)`;

  const colors = extractProseColors(content);
  assert.ok(colors.includes('#ffffff'));
  assert.ok(colors.includes('#061b31'));
  assert.ok(colors.includes('#533afd'));
});

test('extractProseColors: 重複カラーを除去する', () => {
  const content = `color \`#ffffff\` appears \`#ffffff\` twice`;

  const colors = extractProseColors(content);
  assert.equal(colors.filter(c => c === '#ffffff').length, 1);
});

test('extractProseColors: 最大8色を返す', () => {
  const content = Array.from({ length: 12 }, (_, i) =>
    `\`#${String(i).padStart(6, '0')}\``
  ).join(' ');

  const colors = extractProseColors(content);
  assert.equal(colors.length, 8);
});

// ── extractProseFonts ─────────────────────────────────────────────────────────

test('extractProseFonts: "variable font" の前のフォント名を見つける', () => {
  const content = `The custom \`sohne-var\` variable font is the defining element`;

  const fonts = extractProseFonts(content);
  assert.ok(fonts.includes('sohne-var'), `sohne-var が見つからない: [${fonts}]`);
});

test('extractProseFonts: "(modified X)" 付きのフォント名を見つける', () => {
  const content = `The custom \`NotionInter\` (modified Inter) font is the backbone`;

  const fonts = extractProseFonts(content);
  assert.ok(fonts.includes('NotionInter'), `NotionInter が見つからない: [${fonts}]`);
});

test('extractProseFonts: フォントが見つからないときは空配列を返す', () => {
  const content = `Just some text with \`#ff0000\` colors but no font mentions`;

  const fonts = extractProseFonts(content);
  assert.ok(Array.isArray(fonts));
  assert.equal(fonts.length, 0);
});
```

- [ ] **ステップ2: テストを実行して失敗を確認する（fetch-data.jsがまだ存在しない）**

実行: `npm test`

期待: `Cannot find module '../fetch-data.js'` のようなエラー

---

### タスク3: `fetch-data.js` を実装する

**対象ファイル:**
- 作成: `fetch-data.js`

- [ ] **ステップ1: `fetch-data.js` を作成する**

```javascript
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, 'node_modules', 'getdesign', 'templates');

const CATEGORY_MAP = {
  airbnb: 'E-commerce', airtable: 'Productivity & SaaS', apple: 'Media & Tech',
  binance: 'Fintech & Crypto', bmw: 'Automotive', 'bmw-m': 'Automotive',
  bugatti: 'Automotive', cal: 'Productivity & SaaS', claude: 'AI & LLM',
  clay: 'Design & Creative', clickhouse: 'Backend & DevOps', cohere: 'AI & LLM',
  coinbase: 'Fintech & Crypto', composio: 'Developer Tools', cursor: 'Developer Tools',
  elevenlabs: 'AI & LLM', expo: 'Developer Tools', ferrari: 'Automotive',
  figma: 'Design & Creative', framer: 'Design & Creative', hashicorp: 'Backend & DevOps',
  ibm: 'Media & Tech', intercom: 'Productivity & SaaS', kraken: 'Fintech & Crypto',
  lamborghini: 'Automotive', 'linear.app': 'Productivity & SaaS', lovable: 'Developer Tools',
  mastercard: 'Fintech & Crypto', meta: 'Media & Tech', minimax: 'AI & LLM',
  mintlify: 'Developer Tools', miro: 'Productivity & SaaS', 'mistral.ai': 'AI & LLM',
  mongodb: 'Backend & DevOps', nike: 'E-commerce', notion: 'Productivity & SaaS',
  nvidia: 'Media & Tech', ollama: 'AI & LLM', 'opencode.ai': 'Developer Tools',
  pinterest: 'E-commerce', playstation: 'Media & Tech', posthog: 'Backend & DevOps',
  raycast: 'Developer Tools', renault: 'Automotive', replicate: 'AI & LLM',
  resend: 'Developer Tools', revolut: 'Fintech & Crypto', runwayml: 'AI & LLM',
  sanity: 'Backend & DevOps', sentry: 'Backend & DevOps', shopify: 'E-commerce',
  slack: 'Productivity & SaaS', spacex: 'Media & Tech', spotify: 'Media & Tech',
  starbucks: 'E-commerce', stripe: 'Fintech & Crypto', supabase: 'Backend & DevOps',
  superhuman: 'Productivity & SaaS', tesla: 'Automotive', theverge: 'Media & Tech',
  'together.ai': 'AI & LLM', uber: 'E-commerce', vercel: 'Developer Tools',
  vodafone: 'Media & Tech', voltagent: 'Developer Tools', warp: 'Developer Tools',
  webflow: 'Design & Creative', wired: 'Media & Tech', wise: 'Fintech & Crypto',
  'x.ai': 'AI & LLM', zapier: 'Productivity & SaaS',
};

// テスト用にexport
export function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  let data;
  try {
    data = yaml.load(match[1]);
  } catch {
    return null;
  }

  const colorMap = data.colors || {};
  const colors = Object.values(colorMap)
    .filter(v => typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v))
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 8);

  const typo = data.typography || {};
  const firstTypo = Object.values(typo).find(v => v && typeof v.fontFamily === 'string');
  const headingFont = firstTypo
    ? firstTypo.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '')
    : null;

  return {
    name: typeof data.name === 'string' ? data.name : null,
    description: typeof data.description === 'string' ? data.description : null,
    colors,
    headingFont,
    colorMap,
  };
}

export function extractProseColors(content) {
  const pattern = /`(#[0-9a-fA-F]{3,8})`/g;
  const seen = new Set();
  const colors = [];
  let match;
  while ((match = pattern.exec(content)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
      colors.push(match[1]);
    }
  }
  return colors.slice(0, 8);
}

export function extractProseFonts(content) {
  const patterns = [
    /`([A-Za-z][A-Za-z0-9\s\-]+)`(?:\s+\([^)]*\))?\s+(?:variable\s+)?(?:font|typeface)/gi,
    /custom\s+`([A-Za-z][A-Za-z0-9\s\-]+)`/gi,
  ];
  const fonts = [];
  for (const pat of patterns) {
    let m;
    pat.lastIndex = 0;
    while ((m = pat.exec(content)) !== null) {
      const f = m[1].trim();
      if (f && !fonts.includes(f)) fonts.push(f);
    }
  }
  return fonts.slice(0, 2);
}

function isLight(hex) {
  const h = hex.replace('#', '').slice(0, 6).padEnd(6, '0');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function pickCardColors(colors, colorMap) {
  const find = (keys) => {
    for (const k of keys) {
      const v = colorMap[k];
      if (v && /^#[0-9a-fA-F]{3,8}$/.test(v)) return v;
    }
    return null;
  };

  // YAMLファイルはセマンティックキーで優先探索、散文ファイルは配列から推定
  const bg = find(['canvas', 'background', 'page-bg', 'surface-white', 'canvas-parchment'])
    || colors.find(isLight)
    || '#ffffff';

  const primary = find(['primary'])
    || colors.find(c => !isLight(c) && c !== bg)
    || colors[0]
    || '#000000';

  const text = find(['ink', 'body', 'text', 'heading'])
    || (isLight(bg) ? '#111111' : '#ffffff');

  return { bgColor: bg, primaryColor: primary, textColor: text };
}

function buildBrandEntry(slug, content, manifestEntry) {
  const hasFrontmatter = content.trimStart().startsWith('---');
  let colors, headingFont, name, description, colorMap = {};

  if (hasFrontmatter) {
    const parsed = parseFrontmatter(content);
    if (parsed) {
      colors = parsed.colors;
      headingFont = parsed.headingFont;
      name = parsed.name;
      description = parsed.description;
      colorMap = parsed.colorMap || {};
    }
  }

  // YAMLがなかった、またはcolorsが空の場合は散文から抽出
  if (!colors || colors.length === 0) {
    colors = extractProseColors(content);
    const fonts = extractProseFonts(content);
    headingFont = headingFont || fonts[0] || null;
  }

  name = name
    || (manifestEntry?.brand ? manifestEntry.brand.replace(/-/g, ' ').replace(/(?:^|\s)\S/g, c => c.toUpperCase()) : null)
    || slug;
  description = description || manifestEntry?.description || '';

  const { bgColor, primaryColor, textColor } = pickCardColors(colors, colorMap);

  return {
    slug,
    name,
    category: CATEGORY_MAP[slug] || 'Other',
    description,
    colors: colors.slice(0, 6),
    primaryColor,
    bgColor,
    textColor,
    headingFont: headingFont || 'Inter',
  };
}

async function main() {
  const manifestPath = join(TEMPLATES_DIR, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const manifestMap = Object.fromEntries(manifest.map(e => [e.brand, e]));

  const slugs = process.argv.slice(2); // 任意: ブランド名で絞り込み
  const files = readdirSync(TEMPLATES_DIR)
    .filter(f => f.endsWith('.md'))
    .filter(f => slugs.length === 0 || slugs.includes(f.replace('.md', '')));

  const brands = files
    .map(file => {
      const slug = file.replace('.md', '');
      const content = readFileSync(join(TEMPLATES_DIR, file), 'utf8');
      return buildBrandEntry(slug, content, manifestMap[slug]);
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const output = `window.DESIGN_DATA = ${JSON.stringify({ brands }, null, 2)};\n`;
  writeFileSync(join(__dirname, 'data.js'), output);
  console.log(`✓ Generated data.js with ${brands.length} brands`);
}

main();
```

- [ ] **ステップ2: テストを実行してすべてパスすることを確認する**

実行: `npm test`

期待出力:
```
✓ parseFrontmatter: 散文のみのコンテンツにはnullを返す
✓ parseFrontmatter: YAMLフロントマターから名前とカラーを抽出する
...
ℹ tests 9
ℹ pass 9
ℹ fail 0
```

失敗したテストがあれば `fetch-data.js` を修正してから続行する。

- [ ] **ステップ3: コミットする**

```bash
git add fetch-data.js test/parser.test.js
git commit -m "feat: add data parser with tests"
```

---

### タスク4: 3ブランド用の `data.js` を生成する

**対象ファイル:**
- 作成: `data.js`（生成物）

- [ ] **ステップ1: apple / stripe / notion の3ブランドだけで実行する**

実行: `node fetch-data.js apple stripe notion`

期待出力: `✓ Generated data.js with 3 brands`

- [ ] **ステップ2: data.jsの内容を確認する**

実行: `head -3 data.js && grep '"slug"' data.js | wc -l`

期待出力:
```
window.DESIGN_DATA = {
  "brands": [
    {
3
```
（3行 = 3ブランド）

テキストエディタで `data.js` を開いて apple・stripe・notion の各エントリに `colors` が3件以上あり `headingFont` が空でないことも目視確認する。

- [ ] **ステップ3: コミットする**

```bash
git add data.js
git commit -m "feat: generate data.js for 3 seed brands"
```

---

### タスク5: `index.html` の骨格を作る

**対象ファイル:**
- 作成: `index.html`

- [ ] **ステップ1: `index.html` を作成する**

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Design Gallery</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="site-header">
    <h1 class="site-title">Design Gallery</h1>
    <p class="site-subtitle">71 brand design systems — click to preview</p>
    <div class="filter-bar" id="filterBar"></div>
  </header>

  <main class="gallery" id="gallery"></main>

  <!-- モーダル -->
  <div class="modal-overlay" id="modalOverlay" hidden>
    <div class="modal">
      <button class="modal-close" id="modalClose" aria-label="閉じる">✕</button>
      <div class="modal-header">
        <h2 class="modal-brand-name" id="modalBrandName"></h2>
        <span class="modal-category" id="modalCategory"></span>
      </div>
      <div class="modal-tabs">
        <button class="tab-btn active" data-tab="landing">ランディングページ</button>
        <button class="tab-btn" data-tab="tokens">デザイントークン</button>
      </div>
      <div class="modal-body">
        <div class="tab-panel active" id="tabLanding">
          <iframe class="landing-frame" id="landingFrame" title="ランディングページプレビュー"></iframe>
        </div>
        <div class="tab-panel" id="tabTokens">
          <div class="tokens-content" id="tokensContent"></div>
        </div>
      </div>
    </div>
  </div>

  <script src="data.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

- [ ] **ステップ2: コミットする**

```bash
git add index.html
git commit -m "feat: add index.html skeleton"
```

---

### タスク6: `style.css` を作る

**対象ファイル:**
- 作成: `style.css`

- [ ] **ステップ1: `style.css` を作成する**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0f0f0f;
  color: #f0f0f0;
  min-height: 100vh;
}

/* ── ヘッダー ── */
.site-header {
  padding: 40px 32px 24px;
  border-bottom: 1px solid #222;
}
.site-title { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
.site-subtitle { margin-top: 4px; font-size: 14px; color: #888; }

/* ── フィルターバー ── */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
}
.filter-btn {
  padding: 5px 14px;
  border-radius: 999px;
  border: 1px solid #333;
  background: transparent;
  color: #ccc;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.filter-btn:hover { border-color: #666; color: #fff; }
.filter-btn.active { background: #fff; color: #000; border-color: #fff; }

/* ── ギャラリーグリッド ── */
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 24px 32px;
}

/* ── カード ── */
.card {
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  border: 1px solid rgba(255,255,255,0.06);
}
.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.4);
}
.card-accent { height: 6px; width: 100%; }
.card-body { padding: 18px; }
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
}
.card-name { font-size: 17px; font-weight: 600; line-height: 1.2; }
.card-category {
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(255,255,255,0.12);
  color: inherit;
  white-space: nowrap;
  margin-left: 8px;
  flex-shrink: 0;
}
.card-swatches { display: flex; gap: 5px; margin-bottom: 12px; }
.swatch {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid rgba(0,0,0,0.15);
  flex-shrink: 0;
}
.card-font { font-size: 11px; opacity: 0.65; margin-bottom: 6px; font-family: monospace; }
.card-desc {
  font-size: 12px;
  opacity: 0.75;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── モーダル ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}
.modal-overlay[hidden] { display: none; }
.modal {
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 16px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: #2a2a2a;
  border: none;
  color: #ccc;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px 0;
  position: relative;
}
.modal-brand-name { font-size: 22px; font-weight: 700; }
.modal-category {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 999px;
  background: #2a2a2a;
  color: #aaa;
}
.modal-tabs {
  display: flex;
  gap: 4px;
  padding: 16px 24px 0;
  border-bottom: 1px solid #2a2a2a;
}
.tab-btn {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: #666;
  font-size: 13px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.15s;
}
.tab-btn.active { color: #fff; border-bottom-color: #fff; }
.modal-body { flex: 1; overflow: hidden; }
.tab-panel { display: none; height: 100%; }
.tab-panel.active { display: block; }
#tabLanding { height: 580px; }
.landing-frame { width: 100%; height: 100%; border: none; }
#tabTokens { overflow-y: auto; max-height: 580px; padding: 24px; }

/* ── トークンタブ ── */
.tokens-section { margin-bottom: 28px; }
.tokens-section h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #666; margin-bottom: 12px; }
.color-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.color-chip { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.color-chip-swatch { width: 48px; height: 48px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); }
.color-chip-hex { font-size: 10px; font-family: monospace; color: #888; }
.font-sample { margin-bottom: 12px; }
.font-sample-name { font-size: 11px; font-family: monospace; color: #666; margin-bottom: 4px; }
.font-sample-text { font-size: 28px; font-weight: 600; }
.component-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 8px; }
.demo-btn { padding: 8px 18px; border-radius: 6px; border: none; font-size: 14px; cursor: default; font-weight: 500; }
.demo-badge { padding: 3px 10px; border-radius: 999px; font-size: 11px; }
```

- [ ] **ステップ2: コミットする**

```bash
git add style.css
git commit -m "feat: add gallery and modal styles"
```

---

### タスク7: `app.js` を作る — カードレンダリングとフィルター

**対象ファイル:**
- 作成: `app.js`

- [ ] **ステップ1: `app.js` を作成する**

```javascript
(function () {
  const brands = window.DESIGN_DATA.brands;
  let activeCategory = 'All';

  // ── フィルターボタンをレンダリング ────────────────────────────────────────
  const categories = ['All', ...new Set(brands.map(b => b.category))].sort((a, b) =>
    a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b)
  );

  const filterBar = document.getElementById('filterBar');
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (cat === 'All' ? ' active' : '');
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      activeCategory = cat;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderCards();
    });
    filterBar.appendChild(btn);
  });

  // ── カードグリッドをレンダリング ─────────────────────────────────────────
  const gallery = document.getElementById('gallery');

  function renderCards() {
    const filtered = activeCategory === 'All'
      ? brands
      : brands.filter(b => b.category === activeCategory);

    gallery.innerHTML = '';
    filtered.forEach(brand => gallery.appendChild(makeCard(brand)));
  }

  function makeCard(brand) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.background = brand.bgColor;
    card.style.color = brand.textColor;

    const swatches = brand.colors
      .map(c => `<div class="swatch" style="background:${c}" title="${c}"></div>`)
      .join('');

    card.innerHTML = `
      <div class="card-accent" style="background:${brand.primaryColor}"></div>
      <div class="card-body">
        <div class="card-header">
          <span class="card-name">${brand.name}</span>
          <span class="card-category">${brand.category}</span>
        </div>
        <div class="card-swatches">${swatches}</div>
        <div class="card-font">Font: ${brand.headingFont}</div>
        <div class="card-desc">${brand.description}</div>
      </div>
    `;
    card.addEventListener('click', () => openModal(brand));
    return card;
  }

  renderCards();

  // ── モーダルロジック ──────────────────────────────────────────────────────
  const overlay = document.getElementById('modalOverlay');
  const closeBtn = document.getElementById('modalClose');
  const brandName = document.getElementById('modalBrandName');
  const categoryEl = document.getElementById('modalCategory');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = { landing: document.getElementById('tabLanding'), tokens: document.getElementById('tabTokens') };
  const landingFrame = document.getElementById('landingFrame');
  const tokensContent = document.getElementById('tokensContent');

  function openModal(brand) {
    brandName.textContent = brand.name;
    categoryEl.textContent = brand.category;
    landingFrame.srcdoc = generateLandingPage(brand);
    tokensContent.innerHTML = generateTokens(brand);
    switchTab('landing');
    overlay.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    overlay.setAttribute('hidden', '');
    document.body.style.overflow = '';
    landingFrame.srcdoc = '';
  }

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  function switchTab(tab) {
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    Object.entries(tabPanels).forEach(([key, panel]) =>
      panel.classList.toggle('active', key === tab)
    );
  }

  // ── ランディングページテンプレート ───────────────────────────────────────
  function generateLandingPage(brand) {
    const { primaryColor, bgColor, textColor, headingFont, colors, name, description } = brand;
    const surfaceColor = colors[1] || adjustBrightness(bgColor, isLight(bgColor) ? -10 : 15);
    const accentColor = colors[2] || primaryColor;
    const mutedText = blendColor(textColor, bgColor, 0.5);

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --primary: ${primaryColor};
    --bg: ${bgColor};
    --surface: ${surfaceColor};
    --text: ${textColor};
    --accent: ${accentColor};
    --muted: ${mutedText};
    --font: '${headingFont}', -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
    --radius: 8px;
  }
  body { background: var(--bg); color: var(--text); font-family: var(--font); line-height: 1.6; }
  nav { display: flex; align-items: center; justify-content: space-between; padding: 16px 48px; border-bottom: 1px solid rgba(128,128,128,0.15); }
  .nav-logo { font-size: 18px; font-weight: 700; color: var(--text); }
  .nav-links { display: flex; gap: 28px; list-style: none; }
  .nav-links a { font-size: 14px; color: var(--muted); text-decoration: none; }
  .nav-cta { padding: 8px 18px; background: var(--primary); color: #fff; border-radius: var(--radius); font-size: 14px; font-weight: 500; text-decoration: none; }
  .hero { padding: 80px 48px 72px; max-width: 800px; }
  .hero-badge { display: inline-block; padding: 4px 12px; background: var(--surface); color: var(--muted); border-radius: 999px; font-size: 12px; margin-bottom: 20px; }
  .hero h1 { font-size: 52px; font-weight: 700; line-height: 1.08; letter-spacing: -1.5px; margin-bottom: 20px; }
  .hero p { font-size: 18px; color: var(--muted); max-width: 520px; margin-bottom: 32px; line-height: 1.7; }
  .hero-actions { display: flex; gap: 12px; }
  .btn-primary { padding: 12px 24px; background: var(--primary); color: #fff; border-radius: var(--radius); font-size: 15px; font-weight: 600; text-decoration: none; }
  .btn-secondary { padding: 12px 24px; background: transparent; color: var(--text); border: 1px solid rgba(128,128,128,0.3); border-radius: var(--radius); font-size: 15px; text-decoration: none; }
  .features { padding: 64px 48px; background: var(--surface); }
  .features h2 { font-size: 32px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 8px; }
  .features-subtitle { color: var(--muted); margin-bottom: 40px; font-size: 16px; }
  .feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
  .feature-card { padding: 24px; background: var(--bg); border-radius: calc(var(--radius) * 1.5); border: 1px solid rgba(128,128,128,0.12); }
  .feature-icon { font-size: 24px; margin-bottom: 12px; }
  .feature-card h3 { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
  .feature-card p { font-size: 13px; color: var(--muted); line-height: 1.6; }
  .cta { padding: 64px 48px; text-align: center; }
  .cta h2 { font-size: 36px; font-weight: 700; margin-bottom: 12px; }
  .cta p { color: var(--muted); font-size: 16px; margin-bottom: 28px; }
</style>
</head>
<body>
  <nav>
    <span class="nav-logo">${name}</span>
    <ul class="nav-links">
      <li><a href="#">Product</a></li>
      <li><a href="#">Pricing</a></li>
      <li><a href="#">Docs</a></li>
    </ul>
    <a class="nav-cta" href="#">Get Started</a>
  </nav>
  <section class="hero">
    <span class="hero-badge">✦ Now in public beta</span>
    <h1>The modern way to<br>build faster</h1>
    <p>${description || 'Powerful tools for teams who move fast. Ship with confidence.'}</p>
    <div class="hero-actions">
      <a class="btn-primary" href="#">Start for free</a>
      <a class="btn-secondary" href="#">View docs →</a>
    </div>
  </section>
  <section class="features">
    <h2>Everything you need</h2>
    <p class="features-subtitle">Built for scale, designed for simplicity.</p>
    <div class="feature-grid">
      <div class="feature-card"><div class="feature-icon">⚡</div><h3>Blazing fast</h3><p>Optimized from the ground up for performance at any scale.</p></div>
      <div class="feature-card"><div class="feature-icon">🔒</div><h3>Secure by default</h3><p>Enterprise-grade security built into every layer of the stack.</p></div>
      <div class="feature-card"><div class="feature-icon">🔧</div><h3>Fully extensible</h3><p>APIs and webhooks for every workflow your team can imagine.</p></div>
    </div>
  </section>
  <section class="cta">
    <h2>Ready to get started?</h2>
    <p>Join thousands of teams already using ${name}.</p>
    <a class="btn-primary" href="#">Start free trial</a>
  </section>
</body>
</html>`;
  }

  // ── デザイントークンタブ ──────────────────────────────────────────────────
  function generateTokens(brand) {
    const { colors, headingFont, primaryColor, bgColor, textColor, name } = brand;

    const swatches = colors.map(c => `
      <div class="color-chip">
        <div class="color-chip-swatch" style="background:${c}"></div>
        <span class="color-chip-hex">${c}</span>
      </div>
    `).join('');

    const cardBg = isLight(bgColor) ? '#f4f4f4' : '#1e1e1e';
    const cardText = isLight(bgColor) ? '#111' : '#eee';
    const cardBorder = isLight(bgColor) ? '#e0e0e0' : '#333';

    return `
      <div class="tokens-section">
        <h3>カラーパレット</h3>
        <div class="color-grid">${swatches}</div>
      </div>
      <div class="tokens-section">
        <h3>タイポグラフィ</h3>
        <div class="font-sample">
          <div class="font-sample-name">${headingFont}</div>
          <div class="font-sample-text" style="font-family:'${headingFont}',sans-serif;color:${cardText === '#eee' ? '#fff' : '#111'}">${name}</div>
        </div>
      </div>
      <div class="tokens-section">
        <h3>コンポーネント</h3>
        <div class="component-row">
          <button class="demo-btn" style="background:${primaryColor};color:#fff">Primary</button>
          <button class="demo-btn" style="background:transparent;color:${cardText};border:1px solid ${cardBorder}">Secondary</button>
          <button class="demo-btn" style="background:${bgColor};color:${textColor};border:1px solid ${primaryColor}">Outline</button>
        </div>
        <div class="component-row">
          <span class="demo-badge" style="background:${primaryColor}22;color:${primaryColor}">Badge</span>
          <span class="demo-badge" style="background:${cardBg};color:${cardText};border:1px solid ${cardBorder}">Neutral</span>
        </div>
        <div style="margin-top:12px;padding:16px;border-radius:8px;background:${cardBg};border:1px solid ${cardBorder};color:${cardText}">
          <strong style="font-size:14px">カードコンポーネント</strong>
          <p style="font-size:12px;margin-top:4px;opacity:0.7">サーフェスカラー、ボーダーラジウス、ボーダーのサンプル。</p>
        </div>
      </div>
    `;
  }

  // ── カラーユーティリティ ──────────────────────────────────────────────────
  function isLight(hex) {
    const h = hex.replace('#', '').slice(0, 6).padEnd(6, '0');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 128;
  }

  function adjustBrightness(hex, amount) {
    const h = hex.replace('#', '').slice(0, 6).padEnd(6, '0');
    const r = Math.min(255, Math.max(0, parseInt(h.slice(0, 2), 16) + amount));
    const g = Math.min(255, Math.max(0, parseInt(h.slice(2, 4), 16) + amount));
    const b = Math.min(255, Math.max(0, parseInt(h.slice(4, 6), 16) + amount));
    return `#${[r,g,b].map(v => v.toString(16).padStart(2,'0')).join('')}`;
  }

  function blendColor(hex1, hex2, t) {
    const parse = h => { const s = h.replace('#','').slice(0,6).padEnd(6,'0'); return [parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),parseInt(s.slice(4,6),16)]; };
    const [r1,g1,b1] = parse(hex1);
    const [r2,g2,b2] = parse(hex2);
    const r = Math.round(r1 + (r2-r1)*t);
    const g = Math.round(g1 + (g2-g1)*t);
    const b = Math.round(b1 + (b2-b1)*t);
    return `#${[r,g,b].map(v => v.toString(16).padStart(2,'0')).join('')}`;
  }
})();
```

- [ ] **ステップ2: コミットする**

```bash
git add app.js
git commit -m "feat: add gallery rendering, modal, landing page and token preview"
```

---

### タスク8: フェーズ1 ブラウザ動作確認（apple / stripe / notion）

- [ ] **ステップ1: ローカルサーバーを起動する**

実行: `npx serve . -p 3000`

ブラウザで開く: `http://localhost:3000`

- [ ] **ステップ2: カードグリッドを確認する**

- [ ] 3枚のカードが表示される（Apple・Notion・Stripe）
- [ ] 各カードがブランドの背景色で着色されている
- [ ] カラースウォッチが表示されている
- [ ] フィルターに「All」と3カテゴリが表示される
- [ ] フィルターボタンが機能する（「Fintech & Crypto」→ Stripeのみ表示）

- [ ] **ステップ3: モーダル — ランディングページタブを確認する**

Stripeカードをクリック:
- [ ] モーダルが開く
- [ ] 「ランディングページ」タブがアクティブ
- [ ] iframeにパープルアクセントのランディングページが表示される
- [ ] ナビ・ヒーロー・フィーチャー・CTAの各セクションが見える
- [ ] 「デザイントークン」タブをクリック → トークンパネルが表示される
- [ ] Stripeのパープルパレットがスウォッチで表示される
- [ ] デモボタンがStripeカラーでスタイルされている

- [ ] **ステップ4: モーダル — エッジケースを確認する**

- [ ] Escキー → モーダルが閉じる
- [ ] モーダル外クリック → モーダルが閉じる
- [ ] Appleカードを開く → 白/ライト背景が正常に描画される

- [ ] **ステップ5: 見つかった表示問題を修正する**

よくある問題と対処:
- ランディングページのフォントが想定と違う: カスタムフォントはWebフォントでないため表示されないのは正常。フォールバックチェーン（`-apple-system, BlinkMacSystemFont, 'Inter', sans-serif`）が機能していれば問題なし。
- カードのテキストが読みにくい: `fetch-data.js` の `pickCardColors()` における `textColor` の計算を確認する。
- モーダルiframeが空白: ブラウザコンソール（F12）でCSPエラーを確認する。`srcdoc` 属性はCORSを回避するため通常は発生しない。

- [ ] **ステップ6: 修正があればコミットする**

```bash
git add -A
git commit -m "fix: phase 1 visual adjustments"
```

---

## フェーズ2 — 全71ブランドに展開

---

### タスク9: 全ブランドの `data.js` を生成する

- [ ] **ステップ1: ブランド指定なしで fetch-data.js を実行する**

実行: `node fetch-data.js`

期待: `✓ Generated data.js with 71 brands`

- [ ] **ステップ2: ブラウザで確認する**

`http://localhost:3000` をリロードする

- [ ] 「All」表示で71枚のカードが表示される
- [ ] すべてのカテゴリフィルターが揃っている
- [ ] ブラウザコンソール（F12）にJavaScriptエラーがない
- [ ] 目視確認: Teslaカード → ダーク/ミニマルなランディングページ
- [ ] 目視確認: Spotifyカード → グリーンアクセントのランディングページ
- [ ] 目視確認: Ferrariカード → レッドアクセントのランディングページ

- [ ] **ステップ3: カラーが取れていないブランドを修正する**

カードで白背景に白テキスト、またはスウォッチが空のブランドがある場合:
1. 実行: `grep -A 15 '"slug": "SLUG"' data.js`（SLUGをブランド名に置換）
2. `colors` 配列が空であれば `node_modules/getdesign/templates/SLUG.md` を直接開いて内容を確認する
3. 必要に応じて `fetch-data.js` の `CATEGORY_MAP` 相当の上書きオブジェクトを追加する

- [ ] **ステップ4: 最終data.jsをコミットする**

```bash
git add data.js
git commit -m "feat: generate full data.js for all 71 brands"
```

---

### タスク10: 最終整備とGitHub Pages準備

- [ ] **ステップ1: `.gitignore` を追加する**

```
node_modules/
```

- [ ] **ステップ2: GitHub Pages互換性を確認する**

`index.html`・`style.css`・`app.js`・`data.js` がリポジトリルートにあることを確認:

実行: `ls *.html *.css *.js`

期待: `app.js  data.js  fetch-data.js  index.html  style.css`

補足: `fetch-data.js` がGitHub Pages上に存在しても無害（nodeで実行しない限り何も起きない）。

- [ ] **ステップ3: 最終コミット**

```bash
git add .gitignore
git commit -m "chore: add gitignore, ready for GitHub Pages"
```

---

## 更新フロー（将来の運用）

awesome-design-md に新ブランドが追加・更新されたとき:

```bash
cd C:\Users\nshot\projects\design-gallery
npm install getdesign@latest   # 最新テンプレートを取得
node fetch-data.js             # data.js を再生成
# ブラウザで確認してから:
git add data.js package-lock.json
git commit -m "chore: update design data to getdesign@latest"
```
