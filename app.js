/* app.js: Chamzas site. Shared behaviour lives in core.js. */
(function () {
  'use strict';

  const { $, $$, esc, clamp, t } = Core;
  const root = document.documentElement;
  const TAU = Math.PI * 2;

  // Parse any CSS color into [r, g, b]
  const colorCtx = document.createElement('canvas').getContext('2d');
  function rgb(css) {
    colorCtx.fillStyle = '#000';
    colorCtx.fillStyle = css;
    const v = colorCtx.fillStyle;
    if (v[0] === '#') return [1, 3, 5].map(i => parseInt(v.slice(i, i + 2), 16));
    return v.match(/[\d.]+/g).slice(0, 3).map(Number);
  }
  const rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  const mix = (a, b, k) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * k));
  const themeColors = () => ({
    brand: rgb(Core.cssVar('--brand')), accent: rgb(Core.cssVar('--accent')), ink: rgb(Core.cssVar('--ink')),
    muted: rgb(Core.cssVar('--muted')), bg: rgb(Core.cssVar('--bg')), surface: rgb(Core.cssVar('--surface')), line: rgb(Core.cssVar('--line'))
  });

  /* ---------- email ---------- */

  // Assembled at runtime to keep it away from scrapers
  const email = ['chamzas', 'ee.duth.gr'].join('@');
  const emailLink = $('#email');
  emailLink.href = 'mailto:' + email;
  emailLink.textContent = email;
  const copyEmail = () => Core.copy(email, t('Email copied', 'Το email αντιγράφηκε'));
  $('#copy-email').addEventListener('click', copyEmail);

  /* ---------- patents ---------- */

  const PATENTS = [
    { us: '4,873,577', id: 'US4873577A', ep: 'EP0325372', date: 'Oct 10, 1989', inv: 'C. Chamzas',
      title: 'Edge decomposition for the transmission of high resolution facsimile images' },
    { us: '4,870,497', id: 'US4870497A', ep: 'EP0325373', date: 'Sep 26, 1989', inv: 'C. Chamzas, D. L. Duttweiler',
      title: 'Progressive transmission of high resolution two-tone facsimile images' },
    { us: '4,973,961', id: 'US4973961A', ep: 'EP0443255', date: 'Nov 27, 1990', inv: 'C. Chamzas, D. L. Duttweiler',
      title: 'Method and apparatus for carry-over control in arithmetic entropy coding' },
    { us: '4,979,049', id: 'US4979049A', ep: 'EP0400240', date: 'Dec 18, 1990', inv: 'C. Chamzas, D. L. Duttweiler',
      title: 'Efficient encoding/decoding in the decomposition and recomposition of a high resolution image utilizing its low resolution replica' },
    { us: '5,023,611', id: 'US5023611A', ep: 'EP0410060', date: 'Jun 11, 1991', inv: 'C. Chamzas, D. L. Duttweiler',
      title: 'Entropy encoder/decoder including a context extractor' },
    { us: '5,031,053', id: 'US5031053A', ep: 'EP0402016', date: 'Jul 9, 1991', inv: 'C. Chamzas, D. L. Duttweiler',
      title: 'Efficient encoding/decoding in the decomposition and recomposition of a high resolution image utilizing pixel clusters' }
  ];
  $('#patent-list').innerHTML = PATENTS.map((p, i) =>
    '<li class="fx-card tilt"><span class="num" aria-hidden="true">' + (i + 1) + '</span><div><div class="t">' + p.title + '</div>' +
    '<div class="m">' + p.inv + ' &middot; U.S. ' + p.us + ' (' + p.date + ') &middot; ' + p.ep + '</div></div>' +
    '<a href="https://patents.google.com/patent/' + p.id + '/en" target="_blank" rel="noopener">Google Patents &rarr;</a></li>'
  ).join('');

  $$('.tags li, .bento .tile').forEach(el => el.classList.add('fx-card'));
  $$('.tags li').forEach(el => el.classList.add('tilt'));

  /* ---------- publications data ---------- */

  const GIVEN = new Set(['george', 'christos', 'christodoulos', 'nestor', 'fotis', 'anestis', 'sofia', 'takis']);
  const ALIAS = {
    ionnakis: 'ioannakis', papantarkos: 'papamarkos', tsiafaki: 'tsiafakis', bakalides: 'bakalidis', tsoukas: 'tsioukas',
    'κεκκερησ': 'kekkeris', 'μπακαλιδησ': 'bakalidis', 'χαμζασ': 'chamzas'
  };
  const SELF = 'chamzas';
  function authorKeys(str) {
    const out = [];
    str.replace(/\bet\.?\s*al\.?/gi, '').split(/,|;|\band\b/).forEach(chunk => {
      const cands = chunk.replace(/\./g, '. ').split(/\s+/)
        .map(tok => tok.replace(/([a-z])[A-Z]$/, '$1'))
        .filter(tok => tok.length >= 2 && !tok.endsWith('.') && !GIVEN.has(tok.toLowerCase()));
      if (!cands.length) return;
      const raw = Core.norm(cands.sort((a, b) => b.length - a.length)[0]).replace(/[^a-zα-ω-]/g, '');
      if (raw) out.push(ALIAS[raw] || raw);
    });
    return Array.from(new Set(out));
  }
  const cap = k => k.charAt(0).toUpperCase() + k.slice(1).replace(/-(\w)/g, (m, c) => '-' + c.toUpperCase());

  const PUBS = (window.PUBS || []).map(p => {
    p.group = p.kind === 'journal' || p.kind === 'conference' ? p.kind : 'other';
    p.hay = Core.norm([p.title, p.authors, p.venue, p.year].join(' '));
    p.keys = authorKeys(p.authors);
    return p;
  });
  const YEARS = PUBS.map(p => p.year).filter(Boolean);
  const Y0 = Math.min.apply(null, YEARS), Y1 = Math.max.apply(null, YEARS);

  const state = { kind: 'all', q: '', y0: null, y1: null, author: null };

  const LABELS = {
    en: { journal: 'Journal', conference: 'Conference', chapter: 'Chapter', submitted: 'Submitted',
          undated: 'Undated', scholar: 'Find on Scholar', copy: 'Copy citation', copied: 'Copied',
          none: 'No publications match your search.', showing: (n, tt) => 'Showing ' + n + ' of ' + tt + ' publications',
          years: 'Years', coauthor: 'Co-author', papers: n => n + (n === 1 ? ' paper' : ' papers') },
    el: { journal: 'Περιοδικό', conference: 'Συνέδριο', chapter: 'Κεφάλαιο', submitted: 'Υποβληθέν',
          undated: 'Χωρίς έτος', scholar: 'Αναζήτηση στο Scholar', copy: 'Αντιγραφή αναφοράς', copied: 'Αντιγράφηκε',
          none: 'Δεν βρέθηκαν δημοσιεύσεις.', showing: (n, tt) => n + ' από ' + tt + ' δημοσιεύσεις',
          years: 'Έτη', coauthor: 'Συν-συγγραφέας', papers: n => n + (n === 1 ? ' εργασία' : ' εργασίες') }
  };
  const L = () => LABELS[Core.lang()];

  function highlight(text, terms) {
    let out = esc(text);
    terms.forEach(tm => {
      const re = new RegExp('(' + tm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      out = out.replace(re, '<mark>$1</mark>');
    });
    return out;
  }
  function boldSelf(html) {
    return html.replace(/((?:C\.\s*C\.|C\.|Christos|Χ\.)\s*(?:Chamzas|Χαμζάς)|(?:Chamzas|Χαμζάς),?\s*(?:C\.|Χ\.)?)/g, '<b>$1</b>');
  }
  const citation = p => p.authors + ', "' + p.title + '", ' + p.venue + '.';

  // Filter predicates, so each view can ignore its own dimension
  const termsOf = () => Core.norm(state.q).split(/\s+/).filter(Boolean);
  const okQ = (p, terms) => terms.every(tm => p.hay.includes(tm));
  const okYear = p => state.y0 === null || (p.year >= state.y0 && p.year <= state.y1);
  const okAuthor = p => !state.author || p.keys.includes(state.author);
  const okKind = p => state.kind === 'all' || p.group === state.kind;

  /* ---------- publication list ---------- */

  function renderPubs() {
    const lab = L();
    const terms = termsOf();
    const hlTerms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    const shown = PUBS.filter(p => okKind(p) && okQ(p, terms) && okYear(p) && okAuthor(p));

    const groups = {}, order = [];
    shown.forEach(p => {
      const y = p.year || lab.undated;
      if (!groups[y]) { groups[y] = []; order.push(y); }
      groups[y].push(p);
    });
    order.sort((a, b) => (typeof b === 'number' ? b : -1) - (typeof a === 'number' ? a : -1));

    $('#pub-list').innerHTML = order.length ? order.map(y =>
      '<div class="year-group"><h3>' + y + '</h3><div>' + groups[y].map(p => {
        const q = encodeURIComponent('"' + p.title + '" Chamzas');
        return '<div class="pub" id="pub-' + p.n + '">' +
          '<div class="title"><span class="badge ' + p.kind + '">' + lab[p.kind] + '</span>' + highlight(p.title, hlTerms) + '</div>' +
          '<div class="authors">' + boldSelf(highlight(p.authors, hlTerms)) + '</div>' +
          '<div class="venue">' + highlight(p.venue, hlTerms) + '</div>' +
          '<div class="actions"><a href="https://scholar.google.com/scholar?q=' + q + '" target="_blank" rel="noopener">' + lab.scholar + '</a>' +
          '<a href="#" data-cite="' + p.n + '">' + lab.copy + '</a></div>' +
          '</div>';
      }).join('') + '</div></div>'
    ).join('') : '<p class="empty">' + lab.none + '</p>';

    $('#pub-count').textContent = lab.showing(shown.length, PUBS.length);

    const c = { all: 0, journal: 0, conference: 0, other: 0 };
    PUBS.forEach(p => { if (okQ(p, terms) && okYear(p) && okAuthor(p)) { c.all++; c[p.group]++; } });
    $$('.chip').forEach(b => { $('em', b).textContent = c[b.dataset.kind]; });

    const f = [];
    if (state.y0 !== null) {
      const r = state.y0 === state.y1 ? state.y0 : state.y0 + '–' + state.y1;
      f.push('<button type="button" class="fchip" data-clear="year">' + lab.years + ' ' + r + '</button>');
    }
    if (state.author) f.push('<button type="button" class="fchip" data-clear="author">' + lab.coauthor + ': ' + esc(net.label(state.author)) + '</button>');
    $('#pub-filters').innerHTML = f.join('');

    hist.render();
    net.setActive(new Set([].concat.apply([], shown.map(p => p.keys))));
  }

  $('#pub-filters').addEventListener('click', e => {
    const b = e.target.closest('[data-clear]');
    if (!b) return;
    if (b.dataset.clear === 'year') state.y0 = state.y1 = null; else state.author = null;
    renderPubs();
  });

  $('#pub-list').addEventListener('click', e => {
    const a = e.target.closest('[data-cite]');
    if (!a) return;
    e.preventDefault();
    const p = PUBS.find(x => x.n === +a.dataset.cite);
    Core.copy(citation(p), t('Citation copied', 'Η αναφορά αντιγράφηκε'));
    a.textContent = L().copied;
    setTimeout(() => { a.textContent = L().copy; }, 1400);
  });

  $$('.chip').forEach(b => b.addEventListener('click', () => {
    $$('.chip').forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', x === b); });
    state.kind = b.dataset.kind;
    renderPubs();
  }));
  $$('.chip').forEach(b => b.setAttribute('aria-pressed', b.classList.contains('active')));

  let debounce;
  $('#pub-search').addEventListener('input', e => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.q = e.target.value.trim(); renderPubs(); }, 120);
  });

  function resetFilters() {
    state.kind = 'all'; state.q = ''; state.y0 = state.y1 = null; state.author = null;
    $('#pub-search').value = '';
    $$('.chip').forEach(x => { x.classList.toggle('active', x.dataset.kind === 'all'); x.setAttribute('aria-pressed', x.dataset.kind === 'all'); });
  }
  function jumpToPub(p) {
    if (!$('#pub-' + p.n)) { resetFilters(); renderPubs(); }
    const el = $('#pub-' + p.n);
    el.scrollIntoView({ behavior: Core.reduced ? 'auto' : 'smooth', block: 'center' });
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }

  /* ---------- year histogram with brushing ---------- */

  const hist = (function () {
    const svg = $('#hist');
    const years = [];
    for (let y = Y0; y <= Y1; y++) years.push(y);
    const perYear = {};
    PUBS.forEach(p => { perYear[p.year] = (perYear[p.year] || 0) + 1; });
    const maxAll = Math.max.apply(null, Object.values(perYear));
    const pad = { l: 24, r: 6, t: 26, b: 22 };
    let W = 0, H = 0, bw = 0, drag = null, hoverY = null, cursor = null, anchor = null;
    svg.classList.add('intro');
    setTimeout(() => svg.classList.remove('intro'), 2000);

    const xOf = y => pad.l + (y - Y0) * bw;
    function yearAt(clientX) {
      const r = svg.getBoundingClientRect();
      return years[clamp(Math.floor((clientX - r.left - pad.l) / bw), 0, years.length - 1)];
    }
    function setRange(a, b, commit) {
      state.y0 = Math.min(a, b); state.y1 = Math.max(a, b);
      if (commit) renderPubs(); else render();
    }

    function render() {
      const r = svg.getBoundingClientRect();
      W = Math.max(200, r.width); H = Math.max(120, r.height);
      bw = (W - pad.l - pad.r) / years.length;
      const ih = H - pad.t - pad.b;
      const terms = termsOf();
      const base = PUBS.filter(p => okQ(p, terms) && okAuthor(p));
      const cnt = {};
      base.forEach(p => { (cnt[p.year] = cnt[p.year] || { journal: 0, conference: 0, other: 0 })[p.group]++; });
      const sy = v => (v / maxAll) * ih;
      let s = '';
      [5, 10].forEach(v => {
        if (v > maxAll) return;
        const y = pad.t + ih - sy(v);
        s += '<line class="grid" x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + y + '" y2="' + y + '"/>' +
          '<text class="axis" x="' + (pad.l - 6) + '" y="' + (y + 3) + '" text-anchor="end">' + v + '</text>';
      });
      if (state.y0 !== null) {
        s += '<rect class="brush" rx="4" x="' + (xOf(state.y0) - 1) + '" y="' + (pad.t - 8) + '" width="' + ((state.y1 - state.y0 + 1) * bw + 2) + '" height="' + (ih + 8) + '"/>';
      }
      years.forEach((y, i) => {
        const c = cnt[y];
        if (!c) return;
        let acc = 0;
        const outside = state.y0 !== null && (y < state.y0 || y > state.y1);
        ['journal', 'conference', 'other'].forEach(g => {
          if (!c[g]) return;
          const h = sy(c[g]);
          const dim = outside || (state.kind !== 'all' && state.kind !== g);
          s += '<rect class="bar b-' + g + (dim ? ' dim' : '') + '" style="--k:' + i + '" x="' + (xOf(y) + bw * 0.14).toFixed(1) +
            '" y="' + (pad.t + ih - acc - h).toFixed(1) + '" width="' + Math.max(1, bw * 0.72).toFixed(1) + '" height="' + Math.max(0.5, h - 1).toFixed(1) + '" rx="1.5"/>';
          acc += h;
        });
      });
      const step = bw < 14 ? 10 : 5;
      years.forEach(y => {
        if (y % step) return;
        s += '<text class="axis" x="' + (xOf(y) + bw / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + y + '</text>';
      });
      if (cursor !== null && document.activeElement === svg) {
        s += '<rect class="cursor" rx="3" x="' + (xOf(cursor) + 0.5) + '" y="' + (pad.t - 6) + '" width="' + (bw - 1) + '" height="' + (ih + 6) + '"/>';
      }
      const tipY = hoverY !== null ? hoverY : (document.activeElement === svg ? cursor : null);
      if (tipY !== null) {
        const c = cnt[tipY], n = c ? c.journal + c.conference + c.other : 0;
        const label = tipY + ' · ' + L().papers(n);
        const tw = label.length * 6.3 + 14;
        const tx = clamp(xOf(tipY) + bw / 2 - tw / 2, 2, W - tw - 2);
        s += '<g class="tip"><rect x="' + tx + '" y="2" width="' + tw + '" height="20" rx="10"/><text x="' + (tx + tw / 2) + '" y="16" text-anchor="middle">' + label + '</text></g>';
      }
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.innerHTML = s;
    }

    svg.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      svg.setPointerCapture(e.pointerId);
      const y = yearAt(e.clientX);
      drag = { start: y, moved: false, prev: [state.y0, state.y1] };
      if (e.shiftKey && state.y0 !== null) { drag.start = Math.abs(y - state.y0) < Math.abs(y - state.y1) ? state.y1 : state.y0; drag.moved = true; }
      setRange(drag.start, y);
    });
    svg.addEventListener('pointermove', e => {
      const y = yearAt(e.clientX);
      if (drag) {
        if (y !== drag.start) drag.moved = true;
        hoverY = y;
        setRange(drag.start, y);
      } else if (hoverY !== y) { hoverY = y; render(); }
    });
    svg.addEventListener('pointerup', () => {
      if (!drag) return;
      const d = drag;
      drag = null;
      if (!d.moved && d.prev[0] === d.start && d.prev[1] === d.start) state.y0 = state.y1 = null;
      renderPubs();
    });
    svg.addEventListener('pointerleave', () => { if (!drag) { hoverY = null; render(); } });
    svg.addEventListener('focus', () => { if (cursor === null) cursor = state.y0 !== null ? state.y0 : Y1; render(); });
    svg.addEventListener('blur', render);
    svg.addEventListener('keydown', e => {
      if (cursor === null) cursor = state.y0 !== null ? state.y0 : Y1;
      const dir = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
      if (dir) {
        e.preventDefault();
        if (e.shiftKey) {
          if (anchor === null) anchor = state.y0 !== null ? state.y0 : cursor;
          cursor = clamp(cursor + dir, Y0, Y1);
          setRange(anchor, cursor, true);
        } else { cursor = clamp(cursor + dir, Y0, Y1); anchor = null; render(); }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); anchor = cursor; setRange(cursor, cursor, true);
      } else if (e.key === 'Escape' && state.y0 !== null) {
        e.preventDefault(); e.stopPropagation(); state.y0 = state.y1 = null; anchor = null; renderPubs();
      }
    });
    let rz;
    window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(render, 80); });
    return { render };
  })();

  /* ---------- co-author network ---------- */

  const net = (function () {
    const canvas = $('#net');
    const counts = new Map();
    PUBS.forEach(p => p.keys.forEach(k => { if (k !== SELF) counts.set(k, (counts.get(k) || 0) + 1); }));
    const top = Array.from(counts).filter(e => e[1] >= 2).sort((a, b) => b[1] - a[1]).slice(0, 30);
    const maxC = top.length ? top[0][1] : 1;
    // Co-author clock: angle follows the mean year of joint work, radius shrinks with the number of joint papers
    const yearsOf = k => PUBS.filter(p => p.keys.includes(k)).map(p => p.year);
    const A0 = -Math.PI / 2 + 0.42, SPAN = TAU - 0.84;
    const angleOf = y => A0 + ((y - Y0) / (Y1 - Y0)) * SPAN;
    const nodes = [{ key: SELF, count: PUBS.length, self: true, x: 0, y: 0 }]
      .concat(top.map(e => {
        const ys = yearsOf(e[0]), my = ys.reduce((x, y) => x + y, 0) / ys.length;
        const th = angleOf(my), r = 0.97 - 0.52 * Math.sqrt(e[1] / maxC);
        return { key: e[0], count: e[1], year: my, tx: Math.cos(th) * r, ty: Math.sin(th) * r, x: Math.cos(th) * r, y: Math.sin(th) * r };
      }));
    const index = new Map(nodes.map((n, i) => [n.key, i]));
    const ew = new Map();
    PUBS.forEach(p => {
      const ks = p.keys.filter(k => k !== SELF && index.has(k)).map(k => index.get(k));
      for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
        const id = Math.min(ks[i], ks[j]) + '|' + Math.max(ks[i], ks[j]);
        ew.set(id, (ew.get(id) || 0) + 1);
      }
    });
    const edges = Array.from(ew).map(e => { const ij = e[0].split('|'); return { a: +ij[0], b: +ij[1], w: e[1] }; });
    const maxW = Math.max(1, ...edges.map(e => e.w));
    const nbr = nodes.map(() => new Set());
    edges.forEach(e => { nbr[e.a].add(e.b); nbr[e.b].add(e.a); });

    // Relax overlaps while staying near the chronological target
    for (let it = 0; it < 240; it++) {
      for (let i = 1; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const A = nodes[i], B = nodes[j], dx = A.x - B.x, dy = A.y - B.y, d = Math.hypot(dx, dy) || 0.001;
        if (d < 0.15) { const f = (0.15 - d) * 0.25; A.x += dx / d * f; A.y += dy / d * f; B.x -= dx / d * f; B.y -= dy / d * f; }
      }
      for (let i = 1; i < nodes.length; i++) { const n = nodes[i]; n.x += (n.tx - n.x) * 0.04; n.y += (n.ty - n.y) * 0.04; }
    }

    let hover = -1, active = null, colors = themeColors(), geo = null;
    const label = k => (k === SELF ? Core.tx('C. C. Chamzas', 'Χ. Χ. Χαμζάς') : cap(k));
    const radius = n => (n.self ? 9 : 2.6 + Math.sqrt(n.count) * 1.35);

    function pos(n, i, now) {
      const g = geo;
      const wob = Core.reduced || n.self ? 0 : 2.2;
      return [
        g.cx + n.x * g.sx + Math.sin(now * 0.0005 + i * 1.7) * wob,
        g.cy + n.y * g.sy + Math.cos(now * 0.00043 + i * 2.3) * wob
      ];
    }
    function draw(now) {
      const f = Core.fitCanvas(canvas);
      const ctx = f.ctx;
      geo = { cx: f.w / 2, cy: f.h / 2 + 4, sx: f.w / 2 - 62, sy: f.h / 2 - 30 };
      ctx.clearRect(0, 0, f.w, f.h);
      const P = nodes.map((n, i) => pos(n, i, now));
      const hl = hover >= 0 ? new Set([hover].concat(Array.from(nbr[hover]))) : null;
      const sel = state.author ? index.get(state.author) : -1;
      const isOn = i => (!active || nodes[i].self || active.has(nodes[i].key)) && (!hl || hl.has(i) || nodes[i].self);
      const font = Core.cssVar('--sans'), mono = Core.cssVar('--mono');

      // Arrow of time around the clock
      ctx.strokeStyle = rgba(colors.muted, 0.28); ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.ellipse(geo.cx, geo.cy, geo.sx * 1.06, geo.sy * 1.06, 0, A0, A0 + SPAN); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '600 10px ' + mono; ctx.fillStyle = rgba(colors.muted, 0.9); ctx.textBaseline = 'middle';
      const yl = geo.cy - geo.sy * 1.06;
      ctx.textAlign = 'left'; ctx.fillText(String(Y0) + ' \u2192', geo.cx + 10, yl - 2);
      ctx.textAlign = 'right'; ctx.fillText(String(Y1), geo.cx - 10, yl - 2);

      ctx.lineCap = 'round';
      for (let i = 1; i < nodes.length; i++) {
        const strong = hover === i || sel === i;
        ctx.strokeStyle = rgba(strong ? colors.accent : colors.muted, strong ? 0.6 : isOn(i) ? 0.1 : 0.03);
        ctx.lineWidth = strong ? 1.4 : 1;
        ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); ctx.lineTo(P[i][0], P[i][1]); ctx.stroke();
      }
      edges.forEach(e => {
        const strong = hl && (e.a === hover || e.b === hover);
        const on = isOn(e.a) && isOn(e.b);
        const mx = (P[e.a][0] + P[e.b][0]) / 2, my = (P[e.a][1] + P[e.b][1]) / 2;
        ctx.strokeStyle = rgba(strong ? colors.accent : colors.brand, strong ? 0.8 : on ? 0.07 + 0.3 * e.w / maxW : 0.025);
        ctx.lineWidth = strong ? 1.2 + 2 * e.w / maxW : 0.7 + 1.6 * e.w / maxW;
        ctx.beginPath(); ctx.moveTo(P[e.a][0], P[e.a][1]);
        ctx.quadraticCurveTo(geo.cx + (mx - geo.cx) * 0.45, geo.cy + (my - geo.cy) * 0.45, P[e.b][0], P[e.b][1]);
        ctx.stroke();
      });
      nodes.forEach((n, i) => {
        const r = radius(n), on = isOn(i);
        ctx.beginPath(); ctx.arc(P[i][0], P[i][1], r, 0, TAU);
        ctx.fillStyle = n.self ? rgba(colors.accent, 1) : rgba(hover === i || sel === i ? colors.accent : colors.brand, on ? 0.92 : 0.16);
        ctx.fill();
        if (sel === i || n.self) {
          ctx.lineWidth = 2; ctx.strokeStyle = rgba(colors.accent, n.self ? 0.22 : 0.9);
          ctx.beginPath(); ctx.arc(P[i][0], P[i][1], r + (n.self ? 6 : 3.5), 0, TAU); ctx.stroke();
        }
      });

      // Labels, placed greedily without overlaps; hovered, selected and neighbours win
      ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      const boxes = [];
      const free = b => boxes.every(o => b[0] > o[2] || b[2] < o[0] || b[1] > o[3] || b[3] < o[1]);
      const order = nodes.map((n, i) => i).sort((a, b) => {
        const pr = i => (nodes[i].self ? 4 : i === hover ? 3 : i === sel ? 2 : hl && hl.has(i) ? 1 : 0);
        return pr(b) - pr(a) || nodes[b].count - nodes[a].count;
      });
      order.forEach(i => {
        const n = nodes[i];
        if (hl && !hl.has(i) && !n.self && i !== sel) return;
        if (!isOn(i) && i !== sel) return;
        const r = radius(n), big = n.self || i === hover;
        ctx.font = (big ? '700 ' : '560 ') + (n.self ? 12 : 11) + 'px ' + font;
        const txt = label(n.key) + (i === hover ? ' \u00b7 ' + n.count : '');
        const tw = ctx.measureText(txt).width;
        const right = n.self || P[i][0] >= geo.cx;
        const tx = n.self ? P[i][0] - tw / 2 : right ? P[i][0] + r + 5 : P[i][0] - r - 5 - tw;
        const ty = n.self ? P[i][1] + r + 16 : P[i][1];
        const box = [tx - 3, ty - 8, tx + tw + 3, ty + 8];
        if (!free(box) && !(n.self || i === hover || i === sel)) return;
        boxes.push(box);
        ctx.textAlign = 'left';
        ctx.lineWidth = 4; ctx.strokeStyle = rgba(colors.surface, 0.95); ctx.strokeText(txt, tx, ty);
        ctx.fillStyle = rgba(i === hover || i === sel ? colors.accent : colors.ink, 1); ctx.fillText(txt, tx, ty);
      });
      geo.P = P;
    }
    const loop = Core.animate(canvas, draw);

    function hit(e) {
      if (!geo || !geo.P) return -1;
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      let best = -1, bd = 1e9;
      nodes.forEach((n, i) => {
        if (n.self) return;
        const d = Math.hypot(geo.P[i][0] - x, geo.P[i][1] - y);
        if (d < radius(n) + 9 && d < bd) { bd = d; best = i; }
      });
      return best;
    }
    canvas.addEventListener('pointermove', e => {
      const h = hit(e);
      if (h !== hover) { hover = h; canvas.style.cursor = h >= 0 ? 'pointer' : 'default'; loop.kick(); }
    });
    canvas.addEventListener('pointerleave', () => { hover = -1; loop.kick(); });
    canvas.addEventListener('click', e => {
      const h = hit(e);
      if (h < 0) return;
      state.author = state.author === nodes[h].key ? null : nodes[h].key;
      renderPubs();
      loop.kick();
    });
    Core.onTheme(() => { colors = themeColors(); loop.kick(); });
    Core.onLang(() => loop.kick());

    return {
      label,
      setActive: s => { active = s; loop.kick(); },
      nodes
    };
  })();

  /* ---------- hero: dithered wave interference, refined progressively ---------- */

  (function heroField() {
    const canvas = $('#hero-canvas');
    const hero = canvas.parentElement;
    const buf = document.createElement('canvas');
    const bctx = buf.getContext('2d');
    const BAYER = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
      3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21].map(v => (v + 0.5) / 64);
    let W = 0, H = 0, cell = 6, img = null, color = [0, 0, 0], alpha = 0.2, born = performance.now();
    const ptr = { x: -1e3, y: -1e3, s: 0, target: 0 };

    function resize() {
      const r = canvas.getBoundingClientRect();
      cell = r.width < 700 ? 5 : 6;
      W = Math.ceil(r.width / cell); H = Math.ceil(r.height / cell);
      if (W < 1 || H < 1) return;
      buf.width = W; buf.height = H;
      img = bctx.createImageData(W, H);
    }
    function recolor() {
      color = rgb(Core.cssVar('--brand'));
      alpha = Core.isDark() ? 0.3 : 0.2;
      born = performance.now();
    }
    hero.addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      ptr.x = (e.clientX - r.left) / cell; ptr.y = (e.clientY - r.top) / cell; ptr.target = 1;
    });
    hero.addEventListener('pointerleave', () => { ptr.target = 0; });

    function draw(now) {
      if (!img) resize();
      if (!img) return;
      const f = Core.fitCanvas(canvas);
      if (Math.ceil(f.w / cell) !== W || Math.ceil(f.h / cell) !== H) resize();
      const tt = Core.reduced ? 4000 : now;
      // Progressive intro: block size 16 -> 8 -> 4 -> 2 -> 1, like resolution layers arriving
      const age = Core.reduced ? 1e9 : now - born;
      const B = age < 300 ? 16 : age < 600 ? 8 : age < 900 ? 4 : age < 1200 ? 2 : 1;
      ptr.s += (ptr.target - ptr.s) * 0.06;
      const s1x = W * (0.78 + 0.07 * Math.sin(tt * 0.00021)), s1y = H * (0.32 + 0.14 * Math.cos(tt * 0.00017));
      const s2x = W * (1.02 + 0.05 * Math.cos(tt * 0.00013)), s2y = H * (0.95 + 0.1 * Math.sin(tt * 0.00019));
      const s3x = W * (0.5 + 0.1 * Math.sin(tt * 0.00011)), s3y = -H * 0.25;
      const ph = tt * 0.0016, d = img.data;
      const k1 = 0.21, k2 = 0.17, k3 = 0.13;
      for (let by = 0; by < H; by += B) {
        for (let bx = 0; bx < W; bx += B) {
          const x = bx + B / 2, y = by + B / 2;
          let v = Math.cos(Math.hypot(x - s1x, y - s1y) * k1 - ph) +
                  Math.cos(Math.hypot(x - s2x, y - s2y) * k2 - ph * 0.8) +
                  Math.cos(Math.hypot(x - s3x, y - s3y) * k3 - ph * 0.6);
          if (ptr.s > 0.01) {
            const dp = Math.hypot(x - ptr.x, y - ptr.y);
            v += ptr.s * 2.2 * Math.cos(dp * 0.5 - tt * 0.006) * Math.exp(-dp / 14);
          }
          let n = 0.5 + v / 7;
          n = n * n * 1.1;
          const thr = BAYER[((by / B) & 7) * 8 + ((bx / B) & 7)];
          const on = n > thr ? 255 : 0;
          for (let yy = by; yy < Math.min(H, by + B); yy++) {
            let o = (yy * W + bx) * 4;
            for (let xx = bx; xx < Math.min(W, bx + B); xx++, o += 4) {
              d[o] = color[0]; d[o + 1] = color[1]; d[o + 2] = color[2]; d[o + 3] = on;
            }
          }
        }
      }
      bctx.putImageData(img, 0, 0);
      const ctx = f.ctx;
      ctx.clearRect(0, 0, f.w, f.h);
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = alpha;
      ctx.drawImage(buf, 0, 0, W * cell, H * cell);
      ctx.globalAlpha = 1;
    }
    recolor();
    const loop = Core.animate(canvas, draw);
    Core.onTheme(() => { recolor(); loop.kick(); });
    window.addEventListener('resize', () => { img = null; loop.kick(); });
  })();

  /* ---------- bento tile art ---------- */

  (function tileArt() {
    const years = [];
    for (let y = Y0; y <= Y1; y++) years.push(y);
    const per = years.map(y => PUBS.filter(p => p.year === y).length);
    const max = Math.max.apply(null, per);
    // Smoothed area sparkline
    const sm = per.map((v, i) => (0.25 * (per[i - 1] !== undefined ? per[i - 1] : v) + 0.5 * v + 0.25 * (per[i + 1] !== undefined ? per[i + 1] : v)));
    const pts = sm.map((v, i) => [(i / (years.length - 1)) * 400, 100 - (v / max) * 92]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    $('#art-pubs').innerHTML =
      '<svg viewBox="0 0 400 100" preserveAspectRatio="none"><defs><linearGradient id="spark-g" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="var(--accent)" stop-opacity=".35"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + line + ' L400 100 L0 100 Z" fill="url(#spark-g)"/>' +
      '<path class="spark-line" pathLength="1" d="' + line + '" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round"/></svg>';

    // Year ticks: one per year, height by publication count
    $('#art-years').innerHTML = '<svg viewBox="0 0 ' + years.length * 10 + ' 40" preserveAspectRatio="none">' + per.map((v, i) =>
      '<rect x="' + (i * 10 + 3) + '" y="' + (40 - Math.max(2, (v / max) * 34)) + '" width="4" height="' + Math.max(2, (v / max) * 34) + '" rx="2" fill="var(--brand)" opacity="' + (v ? 0.28 : 0.08) + '"/>'
    ).join('') + '</svg>';

    // Ordered-dither gradient: a bilevel image of a smooth ramp
    const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    let dots = '';
    for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) {
      if ((x + 0.5) / 16 > (B4[(y & 3) * 4 + (x & 3)] + 0.5) / 16) dots += '<rect x="' + x * 6 + '" y="' + y * 6 + '" width="5" height="5"/>';
    }
    $('#art-std').innerHTML = '<svg viewBox="0 0 96 72" preserveAspectRatio="xMaxYMid slice"><g fill="var(--brand)" opacity=".16">' + dots + '</g></svg>';

    // Six rows of bits, one per patent
    let bits = '', seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let r = 0; r < 6; r++) for (let c = 0; c < 12; c++) {
      if (rnd() > 0.5) bits += '<rect x="' + c * 8 + '" y="' + r * 12 + '" width="6" height="8" rx="1.5" style="--r:' + r + '"/>';
    }
    $('#art-pat').innerHTML = '<svg viewBox="0 0 96 72" preserveAspectRatio="xMaxYMid slice"><g class="bitrows" fill="var(--accent)">' + bits + '</g></svg>';
  })();

  /* ---------- 3D amphora point cloud ---------- */

  (function amphora() {
    const canvas = $('#amphora');
    if (!canvas) return;
    canvas.tabIndex = 0;
    // Profile (height, radius), bottom to top
    const PROF = [[-1, 0.17], [-0.97, 0.2], [-0.92, 0.11], [-0.82, 0.13], [-0.6, 0.34], [-0.3, 0.5], [0, 0.53], [0.25, 0.46],
      [0.42, 0.3], [0.52, 0.17], [0.7, 0.13], [0.86, 0.14], [0.93, 0.2], [0.97, 0.21], [1, 0.18]];
    function cr(p0, p1, p2, p3, u) {
      const u2 = u * u, u3 = u2 * u;
      return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
    }
    function prof(u) {
      const n = PROF.length - 1, f = u * n, i = Math.min(n - 1, Math.floor(f)), k = f - i;
      const g = j => PROF[clamp(j, 0, n)];
      return [cr(g(i - 1)[0], g(i)[0], g(i + 1)[0], g(i + 2)[0], k), cr(g(i - 1)[1], g(i)[1], g(i + 1)[1], g(i + 2)[1], k)];
    }
    const NH = 64, NA = 84;
    const P = [];
    const rings = [];
    for (let a = 0; a <= NH; a++) {
      const u = a / NH, [h, r] = prof(u);
      const [h2, r2] = prof(Math.min(1, u + 0.004)), [h1, r1] = prof(Math.max(0, u - 0.004));
      let nr = h2 - h1, nh = -(r2 - r1);
      const nl = Math.hypot(nr, nh) || 1; nr /= nl; nh /= nl;
      const ring = [];
      for (let b = 0; b < NA; b++) {
        const th = (b / NA) * TAU + (a % 2) * (Math.PI / NA);
        const c = Math.cos(th), s = Math.sin(th);
        ring.push(P.length);
        P.push({ x: r * c, y: h, z: r * s, nx: nr * c, ny: nh, nz: nr * s, h });
      }
      rings.push(ring);
    }
    // Two handles: tubes along a cubic Bezier in the (radius, height) plane
    const handles = [];
    [0, Math.PI].forEach(phi => {
      const c = Math.cos(phi), s = Math.sin(phi);
      const Q = [[0.42, 0.28], [0.7, 0.5], [0.52, 0.88], [0.16, 0.8]];
      const path = [];
      for (let i = 0; i <= 40; i++) {
        const u = i / 40, m = 1 - u;
        const R = m * m * m * Q[0][0] + 3 * m * m * u * Q[1][0] + 3 * m * u * u * Q[2][0] + u * u * u * Q[3][0];
        const Hh = m * m * m * Q[0][1] + 3 * m * m * u * Q[1][1] + 3 * m * u * u * Q[2][1] + u * u * u * Q[3][1];
        path.push([R, Hh]);
      }
      const line = [];
      path.forEach((pt, i) => {
        const nx0 = path[Math.min(40, i + 1)], pv = path[Math.max(0, i - 1)];
        let tr = nx0[0] - pv[0], th = nx0[1] - pv[1];
        const tl = Math.hypot(tr, th) || 1; tr /= tl; th /= tl;
        const pr = -th, ph = tr;
        for (let k = 0; k < 14; k++) {
          const a = (k / 14) * TAU, ca = Math.cos(a) * 0.035, sa = Math.sin(a) * 0.035;
          const R = pt[0] + pr * ca, Hh = pt[1] + ph * ca;
          const sideX = -s * sa, sideZ = c * sa;
          const nr = pr * Math.cos(a), nh = ph * Math.cos(a);
          P.push({ x: R * c + sideX, y: Hh, z: R * s + sideZ, nx: nr * c - s * Math.sin(a), ny: nh, nz: nr * s + c * Math.sin(a), h: Hh });
        }
        line.push([pt[0] * c, pt[1], pt[0] * s]);
      });
      handles.push(line);
    });

    let yaw = 0.6, pitch = -0.32, vYaw = 0, mode = 'points', drag = null, colors = themeColors();
    let scanStart = performance.now(), firstPass = true;
    const BUCKETS = 14;

    function draw(now, dt) {
      const f = Core.fitCanvas(canvas);
      const ctx = f.ctx, w = f.w, h = f.h;
      ctx.clearRect(0, 0, w, h);
      if (!drag) {
        if (!Core.reduced) yaw += 0.00035 * dt;
        yaw += vYaw; vYaw *= 0.94;
      }
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const scale = Math.min(w * 0.62, h * 0.4), cx0 = w / 2, cy0 = h * 0.5, cam = 3.4;
      const lx = -0.45, ly = 0.62, lz = -0.64;
      // Scanner plane sweeps up; on the first pass the cloud is "captured" behind it
      const period = 5200, sc = Core.reduced ? 2 : -1.15 + ((now - scanStart) % period) / period * 2.5;
      if (!Core.reduced && now - scanStart > period * 0.8) firstPass = false;
      const project = (x, y, z) => {
        const x1 = x * cy - z * sy, z1 = x * sy + z * cy;
        const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
        const k = cam / (cam + z2);
        return [cx0 + x1 * scale * k, cy0 - y2 * scale * k, z2, k];
      };
      const bg = colors.surface, acc = colors.accent, ink = colors.ink;

      if (mode === 'points') {
        const back = [], front = [];
        for (let i = 0; i < BUCKETS; i++) { back.push([]); front.push([]); }
        const hot = [];
        for (let i = 0; i < P.length; i++) {
          const p = P[i];
          if (firstPass && p.h > sc) continue;
          const pr = project(p.x, p.y, p.z);
          const nx1 = p.nx * cy - p.nz * sy, nz1 = p.nx * sy + p.nz * cy;
          const ny2 = p.ny * cp - nz1 * sp, nz2 = p.ny * sp + nz1 * cp;
          const facing = nz2 < 0.05;
          const lam = Math.max(0, nx1 * lx + ny2 * ly + nz2 * lz);
          const b = Math.min(BUCKETS - 1, Math.floor((0.12 + 0.88 * lam) * BUCKETS));
          if (Math.abs(p.h - sc) < 0.025) hot.push(pr);
          (facing ? front : back)[b].push(pr);
        }
        const drawSet = (set, isFront) => set.forEach((pts, b) => {
          if (!pts.length) return;
          const k = b / (BUCKETS - 1);
          ctx.fillStyle = isFront ? 'rgb(' + mix(mix(bg, acc, 0.35), mix(acc, [255, 240, 220], 0.35), k).join(',') + ')' : rgba(mix(bg, ink, 0.35), 0.35);
          ctx.beginPath();
          const sz = isFront ? 1.7 : 1.1;
          pts.forEach(q => { const s = sz * q[3]; ctx.rect(q[0] - s / 2, q[1] - s / 2, s, s); });
          ctx.fill();
        });
        drawSet(back, false);
        drawSet(front, true);
        if (hot.length && !Core.reduced) {
          ctx.fillStyle = rgba(colors.brand, 0.95);
          ctx.beginPath();
          hot.forEach(q => ctx.rect(q[0] - 1.3, q[1] - 1.3, 2.6, 2.6));
          ctx.fill();
        }
      } else {
        const segs = [[], []];
        const addLine = idx => {
          for (let i = 0; i < idx.length - 1; i++) {
            const a = P[idx[i]], b = P[idx[i + 1]];
            if (firstPass && a.h > sc) continue;
            const pa = project(a.x, a.y, a.z), pb = project(b.x, b.y, b.z);
            segs[(pa[2] + pb[2]) / 2 < 0 ? 1 : 0].push(pa, pb);
          }
        };
        rings.forEach((ring, a) => { if (a % 4 === 0) addLine(ring.concat([ring[0]])); });
        for (let b = 0; b < NA; b += 6) addLine(rings.map(r => r[b]));
        handles.forEach(line => {
          for (let i = 0; i < line.length - 1; i++) {
            const pa = project(...line[i]), pb = project(...line[i + 1]);
            segs[1].push(pa, pb);
          }
        });
        [[0, 0.16, 0.8], [1, 0.85, 1.3]].forEach(([which, alphaV, lw]) => {
          ctx.strokeStyle = rgba(which ? acc : ink, alphaV);
          ctx.lineWidth = lw;
          ctx.beginPath();
          const s = segs[which];
          for (let i = 0; i < s.length; i += 2) { ctx.moveTo(s[i][0], s[i][1]); ctx.lineTo(s[i + 1][0], s[i + 1][1]); }
          ctx.stroke();
        });
      }
      // Scanner line
      if (!Core.reduced && sc < 1.05) {
        const rr = 0.62;
        ctx.strokeStyle = rgba(colors.brand, 0.5);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= 48; i++) {
          const th = (i / 48) * TAU, q = project(Math.cos(th) * rr, sc, Math.sin(th) * rr);
          i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
        }
        ctx.stroke();
      }
    }
    const loop = Core.animate(canvas, draw);

    canvas.addEventListener('pointerdown', e => {
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      yaw += dx * 0.01; vYaw = dx * 0.004;
      pitch = clamp(pitch + dy * 0.006, -1.1, 0.9);
      loop.kick();
    });
    const end = () => { drag = null; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('keydown', e => {
      const m = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] }[e.key];
      if (!m) return;
      e.preventDefault();
      yaw += m[0]; pitch = clamp(pitch + m[1], -1.1, 0.9);
      loop.kick();
    });
    $$('#amphora-mode button').forEach(b => b.addEventListener('click', () => {
      mode = b.dataset.mode;
      $$('#amphora-mode button').forEach(x => x.setAttribute('aria-pressed', x === b));
      loop.kick();
    }));
    Core.onTheme(() => { colors = themeColors(); loop.kick(); });
  })();

  /* ---------- progressive bilevel coding demo ---------- */

  const jbig = (function () {
    const N = 256, LAYERS = 5, SIZE = [16, 32, 64, 128, 256];
    const canvas = $('#jbig-canvas'), ctx = canvas.getContext('2d');
    const slider = $('#jbig-layer'), playBtn = $('#jbig-play');
    const PAPER = [243, 238, 228], INK = [20, 26, 36];
    const PLAY = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg>';
    const PAUSE = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z"/></svg>';
    const REPLAY = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 8a5 5 0 1 0 1.6-3.7"/><path d="M3 2.5V5h2.5"/></svg>';
    let gray = null, mode = 'dither', layers = [], est = [], layerCanvas = [], shown = -1, anim = null, playing = false;

    function setPlayIcon() {
      playBtn.innerHTML = playing ? PAUSE : shown >= LAYERS - 1 ? REPLAY : PLAY;
      playBtn.dataset.labelEn = playing ? 'Pause' : 'Play transmission';
      playBtn.dataset.labelEl = playing ? 'Παύση' : 'Αναπαραγωγή μετάδοσης';
      const v = Core.lang() === 'el' ? playBtn.dataset.labelEl : playBtn.dataset.labelEn;
      playBtn.setAttribute('aria-label', v); playBtn.title = v;
    }

    function toGray(d) {
      const g = new Float32Array(N * N);
      for (let i = 0; i < N * N; i++) g[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
      const sorted = Array.from(g).sort((a, b) => a - b);
      const lo = sorted[Math.floor(N * N * 0.02)], hi = sorted[Math.floor(N * N * 0.98)];
      for (let i = 0; i < N * N; i++) g[i] = Math.pow(clamp((g[i] - lo) / (hi - lo || 1), 0, 1), 0.78);
      return g;
    }
    function fromImage(src) {
      return new Promise((resolve, reject) => {
        if (!src) { reject(new Error('no source')); return; }
        const im = new Image();
        im.onload = () => {
          try {
            const c = document.createElement('canvas');
            c.width = c.height = N;
            const x = c.getContext('2d');
            const s = Math.min(im.naturalWidth, im.naturalHeight);
            x.drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, 0, 0, N, N);
            resolve(toGray(x.getImageData(0, 0, N, N).data));
          } catch (err) { reject(err); }
        };
        im.onerror = reject;
        im.src = src;
      });
    }
    // Fallback: a classic test pattern (Siemens star over a ramp)
    function testPattern() {
      const g = new Float32Array(N * N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const dx = x - N / 2 + 0.5, dy = y - N / 2 + 0.5, r = Math.hypot(dx, dy) / (N / 2), th = Math.atan2(dy, dx);
        let v = x / N;
        if (r < 0.78) v = Math.sin(th * 18) > 0 ? 0.05 : 0.95;
        if (r < 0.78 && r > 0.74) v = 0.1;
        if (r < 0.16) v = 0.5 + 0.5 * Math.cos(r * 60);
        g[y * N + x] = v;
      }
      return g;
    }

    function otsu(g) {
      const hist = new Array(256).fill(0);
      g.forEach(v => hist[Math.min(255, Math.floor(v * 256))]++);
      let sum = 0, sumB = 0, wB = 0, best = 0, thr = 128;
      for (let i = 0; i < 256; i++) sum += i * hist[i];
      for (let i = 0; i < 256; i++) {
        wB += hist[i]; if (!wB) continue;
        const wF = g.length - wB; if (!wF) break;
        sumB += i * hist[i];
        const mB = sumB / wB, mF = (sum - sumB) / wF, between = wB * wF * (mB - mF) * (mB - mF);
        if (between > best) { best = between; thr = i; }
      }
      return thr / 256;
    }
    // 1 = black
    function binarize(g) {
      const out = new Uint8Array(N * N);
      if (mode === 'threshold') {
        const thr = otsu(g);
        for (let i = 0; i < N * N; i++) out[i] = g[i] < thr ? 1 : 0;
        return out;
      }
      const e = Float32Array.from(g);
      for (let y = 0; y < N; y++) {
        const ltr = !(y & 1);
        for (let k = 0; k < N; k++) {
          const x = ltr ? k : N - 1 - k, i = y * N + x, dir = ltr ? 1 : -1;
          const v = e[i] < 0.5 ? 0 : 1, err = e[i] - v;
          out[i] = v ? 0 : 1;
          if (x + dir >= 0 && x + dir < N) e[i + dir] += err * 7 / 16;
          if (y + 1 < N) {
            if (x - dir >= 0 && x - dir < N) e[i + N - dir] += err * 3 / 16;
            e[i + N] += err * 5 / 16;
            if (x + dir >= 0 && x + dir < N) e[i + N + dir] += err * 1 / 16;
          }
        }
      }
      return out;
    }
    // JBIG-style resolution reduction (simplified): weighted 3x3 high-res window plus feedback from reduced pixels
    function reduce(hi, W) {
      const w = W >> 1, lo = new Uint8Array(w * w);
      const Hh = (x, y) => (x < 0 || y < 0 || x >= W || y >= W ? 0 : hi[y * W + x]);
      const Ll = (x, y) => (x < 0 || y < 0 || x >= w ? 0 : lo[y * w + x]);
      for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
        const cx = 2 * x + 1, cy = 2 * y + 1;
        const s = 4 * Hh(cx, cy) + 2 * (Hh(cx - 1, cy) + Hh(cx + 1, cy) + Hh(cx, cy - 1) + Hh(cx, cy + 1)) +
          Hh(cx - 1, cy - 1) + Hh(cx + 1, cy - 1) + Hh(cx - 1, cy + 1) + Hh(cx + 1, cy + 1) -
          3 * (Ll(x - 1, y) + Ll(x, y - 1)) - Ll(x - 1, y - 1);
        lo[y * w + x] = s > 4.5 ? 1 : 0;
      }
      return lo;
    }
    // Ideal code length of an adaptive binary arithmetic coder (KT estimator) under a context model
    function codeLength(img, w, ctxOf, nctx) {
      const c0 = new Uint32Array(nctx), c1 = new Uint32Array(nctx);
      let bits = 0;
      for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
        const c = ctxOf(x, y), v = img[y * w + x];
        const p = ((v ? c1[c] : c0[c]) + 0.5) / (c0[c] + c1[c] + 1);
        bits -= Math.log2(p);
        if (v) c1[c]++; else c0[c]++;
      }
      return bits;
    }
    function estimate() {
      const out = [];
      const base = layers[0], w0 = SIZE[0];
      const P0 = (x, y) => (x < 0 || y < 0 || x >= w0 ? 0 : base[y * w0 + x]);
      const T = [[-1, -2], [0, -2], [1, -2], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [-2, 0], [-1, 0]];
      out.push(codeLength(base, w0, (x, y) => T.reduce((a, d, i) => a | (P0(x + d[0], y + d[1]) << i), 0), 1024));
      for (let k = 1; k < LAYERS; k++) {
        const hi = layers[k], lo = layers[k - 1], W = SIZE[k], w = W >> 1;
        const Hh = (x, y) => (x < 0 || y < 0 || x >= W ? 0 : hi[y * W + x]);
        const Ll = (x, y) => (x < 0 || y < 0 || x >= w || y >= w ? 0 : lo[y * w + x]);
        out.push(codeLength(hi, W, (x, y) => {
          const lx = x >> 1, ly = y >> 1;
          return Hh(x - 1, y) | Hh(x - 1, y - 1) << 1 | Hh(x, y - 1) << 2 | Hh(x + 1, y - 1) << 3 |
            Ll(lx, ly) << 4 | Ll(lx + 1, ly) << 5 | Ll(lx, ly + 1) << 6 | Ll(lx - 1, ly) << 7 | Ll(lx, ly - 1) << 8 |
            (x & 1) << 9 | (y & 1) << 10;
        }, 2048));
      }
      return out;
    }

    function build() {
      const top = binarize(gray);
      layers = new Array(LAYERS);
      layers[LAYERS - 1] = top;
      for (let k = LAYERS - 1; k > 0; k--) layers[k - 1] = reduce(layers[k], SIZE[k]);
      est = estimate();
      layerCanvas = layers.map((L, k) => {
        const w = SIZE[k], c = document.createElement('canvas');
        c.width = c.height = w;
        const x = c.getContext('2d'), id = x.createImageData(w, w);
        for (let i = 0; i < w * w; i++) {
          const col = L[i] ? INK : PAPER;
          id.data[i * 4] = col[0]; id.data[i * 4 + 1] = col[1]; id.data[i * 4 + 2] = col[2]; id.data[i * 4 + 3] = 255;
        }
        x.putImageData(id, 0, 0);
        return c;
      });
      $('#jbig-pyr').innerHTML = SIZE.map((s, k) =>
        '<li><button type="button" data-k="' + k + '" aria-label="' + s + ' × ' + s + '"><canvas width="' + s + '" height="' + s + '" style="width:' + (20 + k * 9) + 'px;height:' + (20 + k * 9) + 'px"></canvas></button></li>'
      ).join('');
      $$('#jbig-pyr canvas').forEach((c, k) => c.getContext('2d').drawImage(layerCanvas[k], 0, 0));
    }

    const fmt = n => Math.round(n).toLocaleString(Core.lang() === 'el' ? 'el-GR' : 'en-US');
    function stats(k) {
      const raw = SIZE.slice(0, k + 1).reduce((a, s) => a + s * s, 0);
      const coded = est.slice(0, k + 1).reduce((a, b) => a + b, 0);
      const full = SIZE.reduce((a, s) => a + s * s, 0);
      $('#js-layer').textContent = (k + 1) + ' / ' + LAYERS;
      $('#js-res').textContent = SIZE[k] + ' × ' + SIZE[k];
      $('#js-raw').textContent = fmt(raw);
      $('#js-coded').textContent = '≈ ' + fmt(coded);
      $('#bits-raw').style.width = (raw / full * 100).toFixed(1) + '%';
      $('#bits-coded').style.width = (coded / full * 100).toFixed(1) + '%';
      $('#jbig-badge').textContent = SIZE[k] + ' × ' + SIZE[k];
      slider.value = k;
      slider.setAttribute('aria-valuetext', SIZE[k] + ' × ' + SIZE[k]);
      $$('#jbig-pyr button').forEach((b, i) => { b.classList.toggle('sent', i <= k); b.setAttribute('aria-current', i === k); });
    }

    function paint(under, over, frac) {
      const S = canvas.width;
      ctx.imageSmoothingEnabled = false;
      if (under < 0) { ctx.fillStyle = 'rgb(' + PAPER.join(',') + ')'; ctx.fillRect(0, 0, S, S); }
      else ctx.drawImage(layerCanvas[under], 0, 0, S, S);
      if (over === undefined || frac <= 0) return;
      // Sweep the new layer in stripe by stripe, top to bottom
      const rows = SIZE[over], y = Math.round(frac * rows) / rows * S;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, S, y); ctx.clip();
      ctx.drawImage(layerCanvas[over], 0, 0, S, S);
      ctx.restore();
      if (frac < 1) {
        const g = ctx.createLinearGradient(0, y - 18, 0, y + 2);
        g.addColorStop(0, 'rgba(242,155,115,0)'); g.addColorStop(1, 'rgba(242,155,115,.85)');
        ctx.fillStyle = g; ctx.fillRect(0, y - 18, S, 20);
      }
    }
    function show(k) { cancel(); shown = k; paint(k); stats(k); setPlayIcon(); }
    function cancel() { if (anim) cancelAnimationFrame(anim); anim = null; }

    // Transmit layers from+1 .. to with a stripe sweep each
    function transmit(from, to, done) {
      cancel();
      if (Core.reduced) { show(to); if (done) done(); return; }
      let k = from + 1, t0 = performance.now();
      const dur = k => 500 + k * 160, hold = 380;
      stats(Math.max(0, k));
      const step = now => {
        const e = now - t0, d = dur(k);
        const frac = clamp(e / d, 0, 1);
        paint(k - 1, k, 1 - Math.pow(1 - frac, 2));
        if (e >= d + hold) {
          shown = k;
          if (k >= to) { anim = null; stats(k); if (done) done(); setPlayIcon(); return; }
          k++; t0 = now; stats(k);
        }
        anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    }
    function play() {
      playing = true; setPlayIcon();
      const from = shown >= LAYERS - 1 ? -1 : shown;
      transmit(from, LAYERS - 1, () => { playing = false; setPlayIcon(); });
    }
    function stop() { playing = false; cancel(); if (shown >= 0) show(shown); setPlayIcon(); }

    playBtn.addEventListener('click', () => (playing ? stop() : play()));
    slider.addEventListener('input', () => {
      playing = false;
      const k = +slider.value;
      if (k > shown && k - shown === 1) transmit(shown, k, setPlayIcon); else show(k);
    });
    $('#jbig-pyr').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      playing = false; show(+b.dataset.k);
    });
    $$('#jbig-mode button').forEach(b => b.addEventListener('click', () => {
      if (mode === b.dataset.mode || !gray) return;
      mode = b.dataset.mode;
      $$('#jbig-mode button').forEach(x => x.setAttribute('aria-pressed', x === b));
      playing = false; cancel(); build(); show(Math.max(0, shown));
    }));
    Core.onLang(() => { if (shown >= 0) stats(shown); setPlayIcon(); });

    const SRC = {
      file: t('Source: his portrait, img/chamzas.jpg.', 'Πηγή: το πορτρέτο του, img/chamzas.jpg.'),
      embedded: t('Source: his portrait (img/chamzas.jpg, embedded in the page so the canvas may read it when opened as a local file).',
        'Πηγή: το πορτρέτο του (img/chamzas.jpg, ενσωματωμένο στη σελίδα ώστε ο καμβάς να το διαβάζει και ως τοπικό αρχείο).'),
      pattern: t('Your browser blocked reading the local photo, so this shows a procedural test pattern instead.',
        'Ο browser απέκλεισε την ανάγνωση της τοπικής φωτογραφίας, οπότε εμφανίζεται ένα διαδικαστικό μοτίβο δοκιμής.')
    };
    function ready(g, source) {
      gray = g;
      canvas.dataset.source = source;
      $('#jbig-src').innerHTML = SRC[source];
      build();
      paint(-1);
      shown = -1;
      stats(0);
      setPlayIcon();
      if (Core.reduced) { show(LAYERS - 1); return; }
      // Auto-play the first time the demo scrolls into view
      const io = new IntersectionObserver(es => {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        setTimeout(play, 300);
      }, { threshold: 0.45 });
      io.observe(canvas);
    }
    fromImage('img/chamzas.jpg').then(g => ready(g, 'file'))
      .catch(() => fromImage(window.PORTRAIT_SRC).then(g => ready(g, 'embedded')))
      .catch(() => ready(testPattern(), 'pattern'));

    return { play: () => { Core.scrollToEl($('#progressive')); setTimeout(play, 600); } };
  })();

  /* ---------- init ---------- */

  $('#stat-pubs').textContent = PUBS.length;
  $('#stat-pubs').dataset.count = PUBS.length;

  Core.init({
    keys: { lang: 'lang', theme: 'theme' },
    reveal: '.bento .tile, .section > .wrap > h2, .two-col > h2, .prose p, .timeline li, .research-grid .card, .tags li, .sub, ' +
      '.jbig-stage, .jbig-panel, .patents li, .explorer-card, .courses li, .contact, #patents .muted',
    palette: {
      placeholder: ['Search sections, actions and publications', 'Αναζήτηση ενοτήτων, ενεργειών και δημοσιεύσεων'],
      extraSections: [
        { html: t('Progressive coding demo', 'Επίδειξη προοδευτικής κωδικοποίησης'), hay: 'jbig demo progressive bilevel', run: () => Core.scrollToEl($('#progressive')) },
        { html: t('3D amphora', 'Τρισδιάστατος αμφορέας'), hay: 'amphora 3d pottery point cloud', run: () => Core.scrollToEl($('.r-3d')) },
        { html: t('Co-author network', 'Δίκτυο συν-συγγραφέων'), hay: 'coauthors network graph', run: () => Core.scrollToEl($('.pub-explorer')) }
      ],
      actions: [
        { group: ['Actions', 'Ενέργειες'], icon: '@', html: t('Copy email address', 'Αντιγραφή διεύθυνσης email'), hint: email, hay: 'email mail contact', run: copyEmail },
        { group: ['Actions', 'Ενέργειες'], icon: '▶', html: t('Play the progressive coding demo', 'Αναπαραγωγή της επίδειξης κωδικοποίησης'), hay: 'jbig play demo', run: () => jbig.play() },
        { group: ['Actions', 'Ενέργειες'], icon: '↗', html: t('Open Google Scholar profile', 'Άνοιγμα προφίλ Google Scholar'), hay: 'scholar citations', run: () => window.open('https://scholar.google.gr/citations?user=bjpi_U8AAAAJ&hl=en', '_blank', 'noopener') }
      ],
      search: (q, terms) => {
        const out = [];
        const lab = L();
        net.nodes.slice(1).forEach(n => {
          if (out.length < 3 && terms.every(tm => n.key.includes(tm))) {
            out.push({ group: ['Co-authors', 'Συν-συγγραφείς'], icon: '◎', html: esc(cap(n.key)), hint: lab.papers(n.count),
              run: () => { resetFilters(); state.author = n.key; renderPubs(); Core.scrollToEl($('#publications')); } });
          }
        });
        PUBS.filter(p => okQ(p, terms)).slice(0, 8).forEach(p => out.push({
          group: ['Publications', 'Δημοσιεύσεις'], icon: '¶', html: esc(p.title), hint: String(p.year), run: () => jumpToPub(p)
        }));
        return out;
      }
    }
  });

  Core.onLang(() => renderPubs());
  Core.onTheme(() => hist.render());
  renderPubs();
})();
