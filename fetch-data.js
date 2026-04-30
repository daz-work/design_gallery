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

  const slugs = process.argv.slice(2);
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
