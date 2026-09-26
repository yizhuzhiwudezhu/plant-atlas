'use strict';
const plants = window.PLANTS;
const groups = ['被子植物', '蕨类植物', '石松类', '真菌'];
const state = { query: '', group: '', family: '', view: 'cards', drawings: false };
const main = document.querySelector('main');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link = p => `#plant/${encodeURIComponent(p.id)}`;
const count = group => plants.filter(p => p.group === group).length;
const lightbox = document.querySelector('#lightbox');
function photoButton(src, alt, cls = '') {
  return `<button class="photo-button ${cls}" data-photo="${esc(src)}" data-caption="${esc(alt)}" aria-label="放大：${esc(alt)}"><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy"><span>查看大图 ↗</span></button>`;
}
function indexPage() {
  document.title = '植物观察 · 一株植物的株';
  main.innerHTML = `<section class="intro"><div><p class="eyebrow">一份持续生长的自然观察档案</p><h1>从一株植物，<br class="mobile-break">认识一片自然。</h1><p class="intro-text">那些路过、停留、认真看过的植物，都记录在这里。</p></div><div class="stats"><div><strong>${plants.length.toString().padStart(2, '0')}</strong><span>物种档案</span></div><div><strong>${new Set(plants.map(p => p.family)).size.toString().padStart(2, '0')}</strong><span>科</span></div><div><strong>${plants.filter(p => p.drawings.length).length.toString().padStart(2, '0')}</strong><span>附有手绘</span></div></div></section>
    <div class="workspace"><aside class="sidebar"><p class="eyebrow">浏览目录</p><h2>沿着分类寻找</h2><button class="category all-category" data-group=""><span>全部物种</span><span>${plants.length.toString().padStart(2, '0')}</span></button><p class="kingdom-label">植物界</p>${groups.map((g, i) => `${i === 3 ? '<p class="kingdom-label separate">真菌界</p>' : ''}<button class="category" data-group="${g}"><span>${g}</span><span>${count(g).toString().padStart(2,'0')}</span></button><div class="family-links">${[...new Set(plants.filter(p => p.group === g).map(p => p.family))].map(f => `<button data-family="${f}" data-family-group="${g}">${f}</button>`).join('')}</div>`).join('')}<div class="sidebar-note"><span>关于这份档案</span><p>来自视频中的真实相遇，包含植物，也收录沿途遇见的真菌。</p><p>分类与观察信息持续整理中。</p></div></aside>
    <section class="catalog" aria-label="物种索引"><form class="search" role="search"><span aria-hidden="true">⌕</span><label class="sr-only" for="search">搜索名称、学名、科属或观察关键词</label><input id="search" type="search" value="${esc(state.query)}" placeholder="搜索名称、学名、科属或观察关键词…" autocomplete="off"><kbd>/</kbd></form><div class="toolbar"><div><h2 id="result-heading">全部物种</h2><span id="result-count" role="status" aria-live="polite"></span></div><div class="view-switch" role="group" aria-label="浏览方式"><button data-view="cards">▦ 图鉴</button><button data-view="tree">☷ 分类树</button></div></div><div class="filter-line"><label><input type="checkbox" id="drawings" ${state.drawings ? 'checked' : ''}> 有手绘记录</label><button id="reset">重置筛选</button></div><div id="results"></div></section></div>`;
  main.querySelector('form').addEventListener('submit', e => e.preventDefault());
  main.querySelector('#search').addEventListener('input', e => { state.query = e.target.value; results(); });
  main.querySelector('#drawings').addEventListener('change', e => { state.drawings = e.target.checked; results(); });
  main.querySelector('#reset').addEventListener('click', () => { Object.assign(state, {query:'',group:'',family:'',drawings:false}); indexPage(); });
  main.querySelectorAll('[data-group]').forEach(b => b.addEventListener('click', () => { state.group = b.dataset.group; state.family = ''; results(); }));
  main.querySelectorAll('[data-family]').forEach(b => b.addEventListener('click', () => { state.family = b.dataset.family; state.group = b.dataset.familyGroup; results(); }));
  main.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { state.view = b.dataset.view; results(); }));
  results();
}
function results() {
  const terms = state.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const filtered = plants.filter(p => (!state.group || p.group === state.group) && (!state.family || p.family === state.family) && (!state.drawings || p.drawings.length) && terms.every(term => [p.name,p.scientificName,...p.aliases,p.family,p.genus,p.group,...p.tags,p.summary,...p.highlights].join(' ').toLocaleLowerCase().includes(term)));
  document.querySelector('#result-heading').textContent = state.family || state.group || '全部物种';
  document.querySelector('#result-count').textContent = `${filtered.length} / ${plants.length} 个档案`;
  main.querySelectorAll('[data-group]').forEach(b => { const active = b.dataset.group === state.group && !state.family; b.classList.toggle('active',active); b.setAttribute('aria-pressed',active); });
  main.querySelectorAll('[data-family]').forEach(b => { const active = b.dataset.family === state.family; b.classList.toggle('selected',active); b.setAttribute('aria-pressed',active); });
  main.querySelectorAll('[data-view]').forEach(b => { const active = b.dataset.view === state.view; b.classList.toggle('active',active); b.setAttribute('aria-pressed',active); });
  const container = document.querySelector('#results');
  if (!filtered.length) { container.innerHTML = '<div class="empty"><h3>没有找到相符的记录</h3><p>试试名称、科属或“孢子”等观察关键词，也可以重置筛选。</p></div>'; return; }
  if (state.view === 'tree') {
    container.innerHTML = `<div class="tree">${['植物界','真菌界'].map(k => { const kp = filtered.filter(p => p.kingdom === k); return kp.length ? `<section><h3>${k}<span>${kp.length} 个档案</span></h3>${groups.map(g => { const gp = kp.filter(p => p.group === g); return gp.length ? `<details open><summary>${g} <small>${gp.length}</small></summary>${[...new Set(gp.map(p => p.family))].map(f => `<div class="tree-family"><h4>${f}</h4>${gp.filter(p => p.family === f).map(p => `<a href="${link(p)}"><span class="tree-genus">${esc(p.genus)}</span><span><strong>${esc(p.name)}</strong><i>${esc(p.scientificName)}</i></span><span aria-hidden="true">↗</span></a>`).join('')}</div>`).join('')}</details>` : ''; }).join('')}</section>` : ''; }).join('')}</div>`;
  } else {
    container.innerHTML = `<div class="cards">${filtered.map(p => `<a class="plant-card" href="${link(p)}"><div class="card-image"><img src="${esc(p.cover)}" alt="${esc(p.name)}实拍" loading="lazy"><span class="image-label">${esc(p.group)}</span>${p.drawings.length ? '<span class="drawing-label">附手绘</span>' : ''}</div><div class="card-body"><p class="card-family">${esc(p.family)} <span>/</span> ${esc(p.genus)}</p><h3>${esc(p.name)}<span aria-hidden="true">↗</span></h3><p class="latin">${esc(p.scientificName)}</p><p class="card-description">${esc(p.summary)}</p><div class="tags">${p.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div></div></a>`).join('')}</div>`;
  }
}
function detailPage(id) {
  const p = plants.find(p => p.id === id);
  if (!p) { document.title = '档案未找到 · 植物观察'; main.innerHTML = '<div class="empty"><h1>这份档案还没有收录</h1><a href="#">返回物种索引</a></div>'; return; }
  document.title = `${p.name} · 一株植物的株`;
  main.innerHTML = `<div class="detail"><a class="back" href="#">← 返回物种索引</a><p class="breadcrumb">${esc(p.kingdom)} / ${esc(p.group)} / ${esc(p.family)} / ${esc(p.genus)}</p><section class="detail-hero"><div class="detail-cover">${photoButton(p.photos[0],`${p.name} · 实拍影像`)}</div><div class="detail-heading"><p class="eyebrow">物种观察档案 · ${String(plants.indexOf(p)+1).padStart(3,'0')}</p><h1>${esc(p.name)}</h1><p class="scientific">${esc(p.scientificName)}</p><p class="detail-summary">${esc(p.summary)}</p><dl><div><dt>科 / 属</dt><dd>${esc(p.family)} / ${esc(p.genus)}</dd></div><div><dt>常用名 / 别名</dt><dd>${p.aliases.map(esc).join('、') || '暂未整理'}</dd></div><div><dt>观察地点</dt><dd>${esc(p.observations[0]?.location || '待补充')}</dd></div></dl><a class="video-link" href="${esc(p.video)}" target="_blank" rel="noopener noreferrer">▷ 在 Bilibili 看这期视频 <span>↗</span></a></div></section><nav class="detail-nav" aria-label="档案章节"><a href="#plant/${p.id}/notes">观察笔记</a><a href="#plant/${p.id}/photos">实拍影像 <small>${p.photos.length}</small></a>${p.drawings.length ? `<a href="#plant/${p.id}/drawings">自然手绘 <small>${p.drawings.length}</small></a>` : ''}<a href="#plant/${p.id}/sources">资料来源</a></nav>
    <div class="detail-columns"><div><section id="notes" class="detail-section"><p class="eyebrow">01 / FIELD NOTES</p><h2>值得停下来看一看</h2><div class="highlights">${p.highlights.map((h,i) => `<div><span>0${i+1}</span><p>${esc(h)}</p></div>`).join('')}</div><h3 class="record-title">我的观察记录</h3>${p.observations.map(o => `<article class="observation"><p class="observation-meta">${esc(o.date || '日期待补充')} · ${esc(o.season || '季节待补充')}</p><h3>${esc(o.title)}</h3><p>${esc(o.text)}</p>${o.location ? `<p>地点：${esc(o.location)}</p>` : ''}</article>`).join('')}</section><section id="photos" class="detail-section"><p class="eyebrow">02 / IN THE FIELD</p><h2>实拍影像 <span>${p.photos.length}</span></h2><div class="gallery">${p.photos.map((src,i) => photoButton(src,`${p.name} · 视频静帧 ${i+1}`)).join('')}</div></section>${p.drawings.length ? `<section id="drawings" class="detail-section"><p class="eyebrow">03 / NATURE SKETCHES</p><h2>用画笔，再认识一次</h2><div class="sketches">${p.drawings.map((src,i) => photoButton(src,`${p.name} · 手绘 ${i+1}`)).join('')}</div></section>` : ''}<section id="sources" class="detail-section"><p class="eyebrow">SOURCE / 原始资料</p><h2>从记录到档案</h2><p>本页观察摘要整理自作者提供的《${esc(p.sourceDocument)}》，实拍影像与手绘来自同一素材文件夹。摘要经过整理，完整文稿保留如下，尚未经作者逐条审校。</p><details class="transcript"><summary>展开原始文稿</summary><pre>${esc(p.transcript)}</pre></details></section></div><aside class="detail-aside"><h3>关于分类与记录</h3><p>${esc(p.taxonomyNote)}</p>${p.taxonomySource ? `<a href="${esc(p.taxonomySource)}" target="_blank" rel="noopener noreferrer">查看分类依据（NCBI）↗</a>` : ''}<hr><p>时间、地点以原稿明确记录为准。未注明的信息保留为待补充。</p><p class="small">这是一份自然观察档案，不是标本鉴定结论。</p></aside></div><section class="more"><h2>继续认识身边的自然</h2><div>${plants.filter(x => x.id !== p.id).slice(0,3).map(x => `<a href="${link(x)}"><img src="${esc(x.cover)}" alt="${esc(x.name)}" loading="lazy"><span>${esc(x.name)}<small>${esc(x.family)}</small></span><span aria-hidden="true">↗</span></a>`).join('')}</div></section></div>`;
}
let currentId;
function route() {
  if (location.hash === '#main') { main.focus({preventScroll:true}); return; }
  const parts = location.hash.slice(1).split('/');
  if (parts[0] === 'plant') {
    let id; try { id = decodeURIComponent(parts[1] || ''); } catch { id = ''; }
    if (currentId !== id) { detailPage(id); currentId = id; window.scrollTo(0,0); main.focus({preventScroll:true}); }
    if (parts[2]) document.getElementById(parts[2])?.scrollIntoView({behavior:'smooth'});
  } else { currentId = null; indexPage(); window.scrollTo(0,0); }
}
document.addEventListener('click', event => {
  const button = event.target.closest('[data-photo]');
  if (button) { lightbox.querySelector('img').src = button.dataset.photo; lightbox.querySelector('img').alt = button.dataset.caption; lightbox.querySelector('p').textContent = button.dataset.caption; lightbox.showModal(); }
});
lightbox.querySelector('.close').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.close(); });
document.addEventListener('keydown', e => { if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName) && document.querySelector('#search')) { e.preventDefault(); document.querySelector('#search').focus(); } });
window.addEventListener('hashchange', route);
route();
