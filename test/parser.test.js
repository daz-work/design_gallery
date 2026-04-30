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
