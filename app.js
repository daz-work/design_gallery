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
