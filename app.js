'use strict';
const plants = window.LIBRARY.plants;
const state = { query: '', kingdom: '', order: '', family: '', genus: '', drawings: false, page: 1, view: 'cards', pageSize: 20 };
const Home = window.HomeModel;
const main = document.querySelector('main');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link = p => `#plant/${encodeURIComponent(p.id)}`;
const lightbox = document.querySelector('#lightbox');

// One rank mapping feeds the tree, breadcrumb and full classification table.
function taxonomyRows(p) {
  return [['界','Kingdom',p.kingdom,p.kingdomLatin],['门','Phylum',p.phylumName,p.phylumLatin],['纲','Class',p.className,p.classLatin],['亚纲','Subclass',p.subclassName,p.subclassLatin],['目','Order',p.orderName,p.orderLatin],['科','Family',p.family,p.familyLatin],['属','Genus',p.genus,p.genusLatin],['种','Species',p.name,p.speciesLatin]].filter(r=>r[2]||r[3]);
}
function taxonHighlight(value,query,selected=false){
  const text=String(value||'');
  if(selected)return `<mark class="taxonomy-filter-hit" title="当前分类筛选">${esc(text)}</mark>`;
  const lower=text.toLocaleLowerCase();const ranges=[];
  for(const term of query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)){let pos=0;while((pos=lower.indexOf(term,pos))!==-1){ranges.push([pos,pos+term.length]);pos+=term.length;}}
  ranges.sort((a,b)=>a[0]-b[0]);const merged=[];for(const range of ranges){const last=merged[merged.length-1];if(last&&range[0]<=last[1])last[1]=Math.max(last[1],range[1]);else merged.push([...range]);}
  let out='',at=0;for(const [start,end] of merged){out+=esc(text.slice(at,start))+`<mark class="taxonomy-search-hit">${esc(text.slice(start,end))}</mark>`;at=end;}return out+esc(text.slice(at));
}
function taxonomyTree(items,openThrough=3,query='',filters={}) {
  const root={children:new Map()};
  for(const p of items){let node=root;const rows=taxonomyRows(p);const selectedRanks={'界':'kingdom','目':'order','科':'family','属':'genus'};const selectedDepth=rows.reduce((last,row,i)=>filters[selectedRanks[row[0]]]?i:last,-1);const target=Math.max(Home.searchDepth(rows,query,[p.scientificName,...(p.aliases||[])]),selectedDepth);rows.forEach((row,depth)=>{const key=row[0]+':'+(row[3]||row[2]);if(!node.children.has(key))node.children.set(key,{row,children:new Map(),count:0,searchOpen:false,filterHit:false});node=node.children.get(key);node.count++;const matchers={'界':['kingdom',Home.kingdomKey],'目':['order',Home.orderKey],'科':['family',Home.familyKey],'属':['genus',Home.genusKey]};const matcher=matchers[row[0]];if(matcher&&filters[matcher[0]]&&filters[matcher[0]]===matcher[1](p))node.filterHit=true;if(depth<target)node.searchOpen=true;});node.plant=p;}
  function render(node,depth=0,path=''){return [...node.children.values()].map(n=>n.plant?`<a class="taxonomy-leaf" href="${link(n.plant)}"><span>${taxonHighlight(n.plant.name,query)}</span><i>${taxonHighlight(n.row[3],query)}</i><span>↗</span></a>`:`<details class="taxonomy-node" data-tree-key="${esc(path+'/'+n.row[0]+':'+(n.row[3]||n.row[2]))}" ${(query.trim()?n.searchOpen:depth<openThrough)?'open':''}><summary><span>${taxonHighlight(n.row[2]||n.row[3],query,n.filterHit)}</span><i class="tree-latin">${taxonHighlight(n.row[3],query,n.filterHit)}</i><small>${esc(n.row[0])} · ${n.count} 个档案</small></summary><div>${render(n,depth+1,path+'/'+n.row[0]+':'+(n.row[3]||n.row[2]))}</div></details>`).join('');}
  return `<div class="taxonomy-tree">${render(root)}</div>`;
}
function taxonomySection(p) {
  const safe=url=>/^https?:\/\//i.test(url||'');
  return `<section id="taxonomy" class="detail-section"><p class="eyebrow">CLASSIFICATION / 分类</p><h2>它在${p.kingdom==='真菌界'?'真菌':'植物'}世界中的位置</h2><div class="taxonomy-table-wrap"><table class="taxonomy-table"><thead><tr><th scope="col">等级</th><th scope="col">中文名称 / 辅助对照</th><th scope="col">来源科学名称</th></tr></thead><tbody>${taxonomyRows(p).map(r=>`<tr><th scope="row">${esc(r[0])}<small>${r[1]}</small></th><td>${esc(r[2]||'—')}</td><td lang="la">${esc(r[3]||'—')}</td></tr>`).join('')}</tbody></table></div><div class="taxonomy-citation"><p>分类来源：${safe(p.taxonomySource)?`<a href="${esc(p.taxonomySource)}" target="_blank" rel="noopener noreferrer">${esc(p.taxonomyProvider||'原始记录')} ↗</a>`:esc(p.taxonomyProvider||'待补充')}</p><p>记录编号：${esc(p.taxonomyRecord||'—')}<br>核对日期：${esc(p.taxonomyChecked||'—')}</p><p>${esc(p.taxonomyTranslation||'中文为辅助对照。')}</p>${p.taxonomyNote?`<p>${esc(p.taxonomyNote)}</p>`:''}<p>辅助类群：${esc(p.group)}${safe(p.groupSource)?` · <a href="${esc(p.groupSource)}" target="_blank" rel="noopener noreferrer">核对依据 ↗</a>`:''}（独立于原文等级）</p></div></section>`;
}

function photoButton(src, alt, cls = '') {
  return `<button class="photo-button ${cls}" data-photo="${esc(src)}" data-caption="${esc(alt)}" aria-label="放大：${esc(alt)}"><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy"><span>查看大图 ↗</span></button>`;
}
const searchPlants=plants.map(p=>({...p,searchText:[p.name,p.scientificName,...taxonomyRows(p).flat(),...(p.aliases||[]),p.group,...(p.tags||[]),p.summary,...p.chapters.map(c=>c.heading)].join(' ')}));
const homeTreeState=new Map();
let homeTreeFilter='';
function rememberHomeTree(){main.querySelectorAll('#results .taxonomy-node').forEach(n=>homeTreeState.set(n.dataset.treeKey,n.open));}
function indexPage() {
  document.title = '植物观察 · 一株植物的株';
  main.innerHTML = `<section class="intro"><div><p class="eyebrow">一份持续生长的自然观察档案</p><h1>从一株植物，<br class="mobile-break">认识一片自然。</h1><p class="intro-text">那些路过、停留、认真看过的植物，都记录在这里。</p></div><div class="intro-overview"><div class="stats"><div><strong>${String(plants.length).padStart(2,'0')}</strong><span>个物种，持续记录中</span></div></div><button id="random-species" class="random-species" ${plants.some(p=>p.kingdom==='植物界')?'':'disabled'} title="从植物档案中随机认识一种">随机认识一种植物 <span aria-hidden="true">↗</span></button></div></section>
  <div class="workspace home-workspace"><aside class="sidebar home-sidebar" id="home-filters" aria-label="分类筛选"><p class="eyebrow">浏览目录</p><h2>按分类筛选</h2><button class="category" data-kingdom=""><span>全部物种</span><span>${plants.length}</span></button>${Home.options(plants,'kingdom').sort((a,b)=>(a.key==='Plantae'?-1:a.key==='Fungi'?0:1)-(b.key==='Plantae'?-1:b.key==='Fungi'?0:1)).map(k=>`<button class="category" data-kingdom="${esc(k.key)}"><span>${esc(k.name)}</span><span>${k.count}</span></button>`).join('')}
  <div class="rank-filter"><label for="order-select">目 <small>Order</small></label><input type="search" id="order-search" aria-label="查找目" placeholder="查找目名称或科学名称"><select id="order-select" aria-label="按目筛选"></select></div>
  <div class="rank-filter"><label for="family-select">科 <small>Family</small></label><input type="search" id="family-search" aria-label="查找科" placeholder="查找科名称或科学名称"><select id="family-select" aria-label="按科筛选"></select></div>
  <div class="rank-filter"><label for="genus-select">属 <small>Genus</small></label><input type="search" id="genus-search" aria-label="查找属" placeholder="查找属名称或科学名称"><select id="genus-select" aria-label="按属筛选"></select></div>
  <a class="full-taxonomy-link" href="#classification">查看完整分类与数据库 ↗</a><button class="mobile-filter-done" id="filter-done">查看结果</button></aside>
  <section class="catalog" aria-label="物种索引"><form class="search" role="search"><span aria-hidden="true">⌕</span><label class="sr-only" for="search">搜索名称、学名、科属或观察关键词</label><input id="search" type="search" value="${esc(state.query)}" placeholder="搜索名称、学名、科属或观察关键词…" autocomplete="off"><kbd>/</kbd></form>
  <div class="toolbar"><div><h2 id="result-heading">全部物种</h2><span id="result-count" role="status" aria-live="polite"></span></div><div class="catalog-controls"><div class="view-switch" role="group" aria-label="浏览方式"><button data-view="cards">▦ 图鉴</button><button data-view="tree">☷ 分类树</button></div><button class="mobile-filter-toggle" id="filter-toggle" aria-controls="home-filters" aria-expanded="false">筛选</button></div></div><div id="active-filters" class="active-filters" aria-label="当前筛选条件"></div><div class="filter-line"><label><input type="checkbox" id="drawings" ${state.drawings?'checked':''}> 有手绘记录</label><button id="reset">重置筛选</button></div><div class="view-options"><div id="tree-controls" hidden><button id="home-tree-expand">全部展开</button><button id="home-tree-collapse">全部收起</button></div></div><div id="results"></div><nav id="pagination" class="pagination" aria-label="物种列表分页"><label id="page-size-control">每页 <select id="page-size" aria-label="每页图鉴数量">${[10,20,50].map(n=>`<option value="${n}" ${n===state.pageSize?'selected':''}>${n}</option>`).join('')}</select> 个</label><div id="pagination-buttons" class="pagination-buttons"></div></nav></section></div>`;
  main.querySelector('#random-species').addEventListener('click',()=>{const pool=plants.filter(p=>p.kingdom==='植物界');if(pool.length)location.hash=link(pool[Math.floor(Math.random()*pool.length)]);});
  main.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.view;results();}));
  main.querySelector('#page-size').addEventListener('change',e=>{state.pageSize=Number(e.target.value);state.page=1;results();});
  main.querySelector('#home-tree-expand').addEventListener('click',()=>main.querySelectorAll('#results .taxonomy-node').forEach(n=>n.open=true));
  main.querySelector('#home-tree-collapse').addEventListener('click',()=>main.querySelectorAll('#results .taxonomy-node').forEach(n=>n.open=false));
  main.querySelector('form').addEventListener('submit',e=>e.preventDefault());
  main.querySelector('#search').addEventListener('input',e=>{state.query=e.target.value;state.page=1;results();});
  main.querySelector('#drawings').addEventListener('change',e=>{state.drawings=e.target.checked;state.page=1;results();});
  main.querySelector('#reset').addEventListener('click',()=>{Object.assign(state,{query:'',kingdom:'',order:'',family:'',genus:'',drawings:false,page:1});main.querySelector('#search').value='';main.querySelector('#drawings').checked=false;main.querySelector('#order-search').value='';main.querySelector('#family-search').value='';main.querySelector('#genus-search').value='';results();});
  main.querySelectorAll('[data-kingdom]').forEach(b=>b.addEventListener('click',()=>{state.kingdom=b.dataset.kingdom;state.order='';state.family='';state.genus='';state.page=1;main.querySelector('#order-search').value='';main.querySelector('#family-search').value='';main.querySelector('#genus-search').value='';results();}));
  main.querySelector('#order-select').addEventListener('change',e=>{state.order=e.target.value;state.family='';state.genus='';state.page=1;main.querySelector('#family-search').value='';main.querySelector('#genus-search').value='';results();});
  main.querySelector('#family-select').addEventListener('change',e=>{state.family=e.target.value;state.genus='';main.querySelector('#genus-search').value='';state.page=1;results();});
  main.querySelector('#genus-select').addEventListener('change',e=>{state.genus=e.target.value;state.page=1;results();});
  for(const rank of ['order','family','genus'])main.querySelector('#'+rank+'-search').addEventListener('input',()=>rankOptions(rank));
  main.querySelector('#filter-toggle').addEventListener('click',e=>{const open=e.currentTarget.getAttribute('aria-expanded')!=='true';e.currentTarget.setAttribute('aria-expanded',open);main.querySelector('.home-workspace').classList.toggle('filters-open',open);});
  function closeFilters(){main.querySelector('.home-workspace').classList.remove('filters-open');main.querySelector('#filter-toggle').setAttribute('aria-expanded','false');main.querySelector('#filter-toggle').focus();}
  main.querySelector('#filter-done').addEventListener('click',closeFilters);
  main.querySelector('#home-filters').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeFilters();}});
  main.querySelector('#pagination').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(!b||b.disabled)return;state.page=Number(b.dataset.page);results();main.querySelector('.search').scrollIntoView({behavior:'smooth',block:'start'});});
  main.querySelector('#active-filters').addEventListener('click',e=>{const b=e.target.closest('[data-clear]');if(!b)return;const key=b.dataset.clear;state[key]='';if(key==='kingdom')state.order=state.family=state.genus='';if(key==='order')state.family=state.genus='';if(key==='family')state.genus='';state.page=1;main.querySelector('#order-search').value='';main.querySelector('#family-search').value='';main.querySelector('#genus-search').value='';results();});
  results();
}
function rankOptions(rank) {
  const base=rank==='order'?Home.byKingdom(plants,state):rank==='family'?Home.byOrder(plants,state):Home.byFamily(plants,state);
  const options=Home.options(base,rank);const query=main.querySelector('#'+rank+'-search').value.trim().toLocaleLowerCase();
  const select=main.querySelector('#'+rank+'-select');const matches=options.filter(o=>o.key===state[rank]||[o.name,o.latin].join(' ').toLocaleLowerCase().includes(query));
  select.innerHTML=`<option value="">全部${rank==='order'?'目':rank==='family'?'科':'属'}（${options.length}）</option>${matches.map(o=>`<option value="${esc(o.key)}">${esc(o.name)} · ${o.count}</option>`).join('')}${query&&!matches.length?'<option disabled>没有匹配项</option>':''}`;select.value=state[rank];
}
function results() {
  rememberHomeTree();
  const filterKey=JSON.stringify([state.query,state.kingdom,state.order,state.family,state.genus,state.drawings]);
  if(filterKey!==homeTreeFilter){homeTreeState.clear();homeTreeFilter=filterKey;}
  rankOptions('order');rankOptions('family');rankOptions('genus');
  const filtered=Home.filter(searchPlants,state);const page=Home.page(filtered,state.page,state.pageSize);state.page=page.current;
  const labels=[['kingdom','界',Home.options(plants,'kingdom')],['order','目',Home.options(plants,'order')],['family','科',Home.options(plants,'family')],['genus','属',Home.options(plants,'genus')]].map(([key,rank,options])=>({key,rank,item:options.find(o=>o.key===state[key])})).filter(x=>x.item);
  main.querySelector('#result-heading').textContent=labels.length?labels[labels.length-1].item.name:'全部物种';
  main.querySelector('#result-count').textContent=`${filtered.length} / ${plants.length} 个档案`;
  main.querySelector('#active-filters').innerHTML=labels.map(x=>`<button data-clear="${x.key}" aria-label="取消${x.rank}筛选：${esc(x.item.name)}">${x.rank} · ${esc(x.item.name)} <span aria-hidden="true">×</span></button>`).join('');
  main.querySelectorAll('[data-kingdom]').forEach(b=>{const active=b.dataset.kingdom===state.kingdom;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});
  const container=main.querySelector('#results');
  main.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===state.view;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});
  main.querySelector('#page-size-control').hidden=state.view!=='cards';
  main.querySelector('#tree-controls').hidden=state.view!=='tree';
  main.querySelector('#pagination').hidden=state.view==='tree';
  if(state.view==='tree'){container.innerHTML=filtered.length?taxonomyTree(filtered,state.genus?8:state.family?7:state.order?6:state.kingdom?2:1,state.query,state):'<div class="empty">没有找到相符的记录，试试其它关键词或重置筛选。</div>';container.querySelectorAll('.taxonomy-node').forEach(n=>{if(homeTreeState.has(n.dataset.treeKey))n.open=homeTreeState.get(n.dataset.treeKey);});main.querySelector('#pagination-buttons').innerHTML='';return;}
  container.innerHTML=page.total?`<div class="cards">${page.items.map(p=>`<a class="plant-card" href="${link(p)}"><div class="card-image"><img src="${esc(p.cover)}" alt="${esc(p.name)}实拍" loading="lazy"><span class="image-label">${esc(p.group)}</span>${p.drawings.length?'<span class="drawing-label">附手绘</span>':''}</div><div class="card-body"><p class="card-family">${[p.orderName,p.family,p.genus].filter(Boolean).map(esc).join(' <span>/</span> ')}</p><h3>${esc(p.name)}<span aria-hidden="true">↗</span></h3><p class="latin">${esc(p.scientificName)}</p><p class="card-description">${esc(p.summary)}</p><div class="tags">${p.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div></div></a>`).join('')}</div>`:'<div class="empty"><h3>没有找到相符的记录</h3><p>试试名称、科属或观察关键词，也可以重置筛选。</p></div>';
  main.querySelector('#pagination-buttons').innerHTML=page.total?`<button data-page="${page.current-1}" ${page.current===1?'disabled':''}>上一页</button><span>${page.current} / ${page.totalPages}</span><button data-page="${page.current+1}" ${page.current===page.totalPages?'disabled':''}>下一页</button>`:'';
}
function detailPage(id) {
  const p = plants.find(p => p.id === id);
  if (!p) { document.title = '档案未找到 · 植物观察'; main.innerHTML = '<div class="empty"><h1>这份档案还没有收录</h1><a href="#">返回物种索引</a></div>'; return; }
  const used = new Set([p.cover, ...p.chapters.map(c=>c.image)]);
  const photos = (p.photos || []).filter(photo => { if (!photo.image || used.has(photo.image)) return false; used.add(photo.image); return true; });
  const paragraphs = text => String(text || '').split(/\n+/).filter(Boolean).map(t=>`<p>${esc(t)}</p>`).join('');
  document.title = `${p.name} · 一株植物的株`;
  main.innerHTML = `<div class="detail"><a class="back" href="#">← 返回物种索引</a><p class="breadcrumb">${taxonomyRows(p).map(r=>esc(r[2]||r[3])).join(' › ')}</p>
  <section class="detail-hero"><div class="detail-cover">${p.cover?photoButton(p.cover,`${p.name} · 实拍影像`):''}</div><div class="detail-heading"><div class="heading-top"><div><p class="eyebrow">物种观察档案 · ${String(plants.indexOf(p)+1).padStart(3,'0')}</p><h1>${esc(p.name)}</h1></div>${p.video?`<div class="video-access"><a class="video-qr" href="${esc(p.video)}" target="_blank" rel="noopener noreferrer"><img src="assets/${esc(p.id)}/video-qr.png" alt="${esc(p.name)}视频二维码"></a><a class="video-link" href="${esc(p.video)}" target="_blank" rel="noopener noreferrer">▷ 看这期视频 ↗</a></div>`:''}</div><p class="scientific">${esc(p.scientificName)}</p><p class="class-group">类群 · ${esc(p.group)}</p><p class="detail-summary">${esc(p.summary)}</p><dl>${[['目',p.orderName,p.orderLatin],['科',p.family,p.familyLatin],['属',p.genus,p.genusLatin]].filter(([,cn,latin])=>cn||latin).map(([rank,cn,latin])=>`<div><dt>${rank}</dt><dd><span>${esc(cn)}</span>${latin?`<span class="taxon-latin">${esc(latin)}</span>`:''}</dd></div>`).join('')}${p.aliases.length?`<div><dt>常用名 / 别名</dt><dd>${p.aliases.map(esc).join('、')}</dd></div>`:''}</dl></div></section>
  <nav class="detail-nav" aria-label="档案章节"><a href="#plant/${p.id}/notes">观察笔记 <small>${p.chapters.length}</small></a>${photos.length?`<a href="#plant/${p.id}/photos">实拍影像 <small>${photos.length}</small></a>`:''}${p.drawings.length?`<a href="#plant/${p.id}/drawings">自然手绘 <small>${p.drawings.length}</small></a>`:''}<a href="#plant/${p.id}/taxonomy">分类</a><a href="#plant/${p.id}/sources">资料来源</a></nav>
  <div class="detail-columns"><div><section id="notes" class="detail-section"><p class="eyebrow">FIELD NOTES / 观察笔记</p><h2>一起认识它</h2>${p.chapters.map((c,i)=>`<article class="story-chapter ${c.image ? 'with-image' : 'text-only'}"><div class="story-copy"><div class="chapter-title"><span>${String(i+1).padStart(2,'0')}</span><h3>${esc(c.heading)}</h3></div><div class="chapter-text">${paragraphs(c.text)}</div></div>${c.image?`<figure>${photoButton(c.image, c.caption || `${p.name} · ${c.heading}`)}${c.caption?`<figcaption>${esc(c.caption)}</figcaption>`:''}</figure>`:''}</article>`).join('')}${p.observations.length?`<h3 class="record-title">再一次相遇</h3>${p.observations.map(o=>`<article class="observation">${o.date||o.location?`<p class="observation-meta">${[o.date,o.location].filter(Boolean).map(esc).join(' · ')}</p>`:''}<h3>${esc(o.title)}</h3>${paragraphs(o.text)}</article>`).join('')}`:''}</section>
  ${photos.length?`<section id="photos" class="detail-section"><p class="eyebrow">IN THE FIELD / 实拍影像</p><h2>再多看几眼 <span>${photos.length}</span></h2><div class="gallery">${photos.map(photo=>`<figure>${photoButton(photo.image,photo.caption||p.name)}${photo.caption?`<figcaption>${esc(photo.caption)}</figcaption>`:''}</figure>`).join('')}</div></section>`:''}
  ${p.drawings.length?`<section id="drawings" class="detail-section"><p class="eyebrow">NATURE SKETCHES / 自然手绘</p><h2>用画笔，再认识一次</h2><div class="sketches">${p.drawings.map((d,i)=>`<figure>${photoButton(d.image,d.caption || `${p.name} · 手绘 ${i+1}`)}${d.caption?`<figcaption>${esc(d.caption)}</figcaption>`:''}</figure>`).join('')}</div></section>`:''}
  ${taxonomySection(p)}
  <section id="sources" class="detail-section"><p class="eyebrow">SOURCE / 资料来源</p><h2>从记录到档案</h2>${paragraphs(p.sourceText)}${p.references?.length?`<h3>参考文献</h3><ol class="references">${p.references.map(r=>`<li>${r.url && /^https?:\/\//i.test(r.url)?`<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.title)} ↗</a>`:esc(r.title)}${r.author||r.year?`<span>${[r.author,r.year].filter(Boolean).map(esc).join(' · ')}</span>`:''}</li>`).join('')}</ol>`:''}${p.video?`<a class="source-link" href="${esc(p.video)}" target="_blank" rel="noopener noreferrer">观看我的原视频 ↗</a>`:''}${p.taxonomySource && /^https?:\/\//i.test(p.taxonomySource)?`<p class="taxonomy-source"><a href="${esc(p.taxonomySource)}" target="_blank" rel="noopener noreferrer">分类依据：${esc(p.taxonomyProvider || "原始记录")} ↗</a></p>`:''}<p class="source-license"><a href="license.html">版权与素材使用说明 ↗</a></p></section></div>
  </div>
  <section class="more"><h2>继续认识身边的自然</h2><div>${plants.filter(x=>x.id!==p.id).slice(0,3).map(x=>`<a href="${link(x)}">${x.cover?`<img src="${esc(x.cover)}" alt="${esc(x.name)}" loading="lazy">`:''}<span>${esc(x.name)}<small>${esc(x.family)}</small></span><span aria-hidden="true">↗</span></a>`).join('')}</div></section></div>`;
  main.querySelectorAll('.story-chapter').forEach((el,i)=>el.id=`chapter-${i+1}`);
  main.querySelectorAll('.detail-nav a').forEach(a=>a.addEventListener('click',e=>{
    if(a.hash===location.hash){e.preventDefault();document.getElementById(a.hash.split('/')[2])?.scrollIntoView({behavior:'smooth'});}
  }));
}

function classificationPage() {
  document.title = '分类与数据库 · 一株植物的株';
  main.innerHTML = `<section class="classification-intro classification-compact"><p class="eyebrow">CLASSIFICATION / 分类与数据库</p><p>采用英国皇家植物园邱园 <a href="https://powo.science.kew.org/about-wcvp" target="_blank" rel="noopener noreferrer">POWO / WCVP</a> 的植物分类记录；真菌采用 <a href="https://www.speciesfungorum.org/" target="_blank" rel="noopener noreferrer">Species Fungorum</a>。</p><p>界、门、纲、亚纲、目、科、属、种，按所链接记录保留科学名称和等级。中文名称是辅助对照；另补充类群作为辅助。</p></section>
  <section class="classification-database database-compact" aria-label="物种分类数据库"><p>目前收录 ${plants.length} 个物种档案：${plants.filter(p=>p.kingdom!=='真菌界').length} 种植物、${plants.filter(p=>p.kingdom==='真菌界').length} 种真菌。</p><form class="search" role="search"><span aria-hidden="true">⌕</span><label class="sr-only" for="taxonomy-search">搜索分类数据库</label><input id="taxonomy-search" type="search" placeholder="搜索中文名、科学名称或任意分类等级…" autocomplete="off"></form><div class="database-actions"><span id="taxonomy-count" role="status" aria-live="polite"></span><button id="expand-taxonomy">全部展开</button><button id="collapse-taxonomy">全部收起</button><a href="taxonomy.json" download>下载 JSON</a><a href="plant-taxonomy.sqlite" download>下载 SQLite</a></div><div id="taxonomy-results"></div></section>`;
  const input=main.querySelector('#taxonomy-search');
  function renderDatabase(){const terms=input.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);const items=plants.filter(p=>terms.every(t=>[p.name,p.scientificName,p.group,...p.aliases,...taxonomyRows(p).flat()].join(' ').toLocaleLowerCase().includes(t)));main.querySelector('#taxonomy-count').textContent=`${items.length} / ${plants.length} 个物种档案`;main.querySelector('#taxonomy-results').innerHTML=items.length?taxonomyTree(items,3,input.value):'<p class="empty">没有找到匹配的物种，试试名称或科属。</p>';}
  main.querySelector('form').addEventListener('submit',e=>e.preventDefault());input.addEventListener('input',renderDatabase);
  main.querySelector('#expand-taxonomy').addEventListener('click',()=>main.querySelectorAll('.taxonomy-node').forEach(n=>n.open=true));main.querySelector('#collapse-taxonomy').addEventListener('click',()=>main.querySelectorAll('.taxonomy-node').forEach(n=>n.open=false));renderDatabase();
}
function atlasPage() {
  document.title = '图谱 · 一株植物的株';
  main.innerHTML = '<iframe id="atlas-frame" class="atlas-frame" src="atlas/index.html" title="物种分类图谱与碰撞漫游" allow="fullscreen" allowfullscreen></iframe>';
}
window.addEventListener('message', event => {
  const frame = document.getElementById('atlas-frame');
  if (!frame || event.source !== frame.contentWindow || event.origin !== location.origin || event.data?.type !== 'atlas-height') return;
  const height = Number(event.data.height);
  if (Number.isFinite(height) && height >= 400 && height <= 12000) frame.style.height = Math.ceil(height) + 'px';
});
let currentId;
function route() {
  rememberHomeTree();
  if (location.hash === '#main') { main.focus({preventScroll:true}); return; }
  const parts = location.hash.slice(1).split('/');
  document.querySelector('.nav-index').classList.toggle('current',!['classification','atlas'].includes(parts[0]));
  document.querySelector('.nav-classification').classList.toggle('current',parts[0] === 'classification');
  document.querySelector('.nav-atlas').classList.toggle('current',parts[0] === 'atlas');
  document.body.classList.toggle('atlas-page',parts[0] === 'atlas');
  if (parts[0] === 'atlas') { currentId = null; atlasPage(); window.scrollTo(0,0); return; }
  if (parts[0] === 'classification') { currentId = null; classificationPage(); window.scrollTo(0,0); return; }
  if (parts[0] === 'plant') {
    let id; try { id = decodeURIComponent(parts[1] || ''); } catch { id = ''; }
    if (currentId !== id) { detailPage(id); currentId = id; window.scrollTo(0,0); main.focus({preventScroll:true}); }
    if (parts[2]) document.getElementById(parts[2])?.scrollIntoView({behavior:'smooth'});
  } else { currentId = null; indexPage(); window.scrollTo(0,0); }
}
document.addEventListener('keydown', e => { if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName) && document.querySelector('#search')) { e.preventDefault(); document.querySelector('#search').focus(); } });
window.addEventListener('hashchange', route);
route();
if (location.hostname === '127.0.0.1' && location.port === '8778') {
  const editorLink = document.createElement('a');
  editorLink.href = '/editor';
  editorLink.textContent = '本地编辑 ↗';
  document.querySelector('footer').append(editorLink);
}
