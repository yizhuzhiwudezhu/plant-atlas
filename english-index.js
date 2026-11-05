'use strict';
(function () {
  const rankNames = {kingdom:'Kingdom',group:'Group',subclass:'Subclass',order:'Order',family:'Family',genus:'Genus'};
  const ranks = Object.keys(rankNames);
  const filterRanks = ranks.slice(1);
  const plural = {group:'groups',subclass:'subclasses',order:'orders',family:'families',genus:'genera'};
  const browse = {query:'',drawings:false,translatedOnly:false,size:20,firstPage:1,page:1,view:'cards',
    sort:'newest',direction:'desc',layout:'double',...Object.fromEntries(ranks.map(rank=>[rank,'']))};
  try { if(localStorage.getItem('mobile-card-layout')==='large') browse.layout='large'; } catch {}
  const treeOpen = new Map();
  const alphabet = new Intl.Collator('en',{sensitivity:'base',numeric:true});
  const groups = {
    '被子植物': 'Flowering plants', '裸子植物': 'Gymnosperms', '石松类': 'Lycophytes',
    '蕨类植物': 'Ferns', '真菌': 'Fungi', '绿藻': 'Green algae'
  };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const normalized = value => String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
  const href = p => '#plant/' + encodeURIComponent(p.id);

  function render({main, plants, hasTranslation, translate, titleFor, openChinese}) {
    document.title = 'Species index · 一株植物的株';
    const home = window.HomeModel, taxonomy = window.EnglishClassification;
    const ordered = window.CatalogModel.sort(plants, 'newest', 'desc');
    const records = new Map(ordered.map(p=>[p.id,taxonomy.prepare(p)]));
    const samples = ordered.filter(p => hasTranslation(p.id));
    const searchText = new Map(ordered.map(p => {
      const fields = [records.get(p.id).search,titleFor(p),p.summary,...(p.tags || [])];
      if (hasTranslation(p.id)) {
        fields.push(translate(p.id, p.summary));
        for (const chapter of p.chapters || []) {
          fields.push(translate(p.id, chapter.heading), translate(p.id, chapter.text));
        }
      }
      return [p.id, normalized(fields.join(' '))];
    }));

    function optionName(rank,o) {
      return rank==='group' ? groups[o.key] || o.name : o.latin || 'Not supplied';
    }
    const kingdoms=home.options(plants,'kingdom').sort((a,b)=>
      Number(b.key==='Plantae')-Number(a.key==='Plantae') || alphabet.compare(a.latin,b.latin));
    let words=[];
    main.innerHTML = `<section class="intro"><div><p class="eyebrow">A growing archive of nature observations</p>
      <h1>Discover nature, one plant at a time.</h1>
      <p class="intro-text">The plants we pass by, pause beside and take a closer look at are all recorded here.</p>
      </div><div class="intro-overview"><div class="stats"><div><strong>${ordered.length}</strong><span>species, and counting</span></div></div>
      <button type="button" class="random-species" ${plants.length?'':'disabled'}>Meet a random species <span aria-hidden="true">↗</span></button></div></section>
      <div class="workspace home-workspace en-home-workspace"><aside class="sidebar home-sidebar" id="home-filters" aria-label="Taxonomy filters">
        <p class="eyebrow">BROWSE THE COLLECTION</p><h2>Filter by taxonomy</h2>
        ${[{key:'',name:'All species',count:plants.length},...kingdoms.map(o=>({...o,name:optionName('kingdom',o)}))].map(o=>`<button type="button" class="category" data-kingdom="${escape(o.key)}"><span>${escape(o.name)}</span><span>${o.count}</span></button>`).join('')}
        ${filterRanks.map(rank=>`<div class="rank-filter"><label for="${rank}-select">${rankNames[rank]}</label>
          <input id="${rank}-search" type="search" autocomplete="off" placeholder="Find ${plural[rank]}…" aria-label="Search ${plural[rank]}">
          <select id="${rank}-select" data-rank="${rank}"></select></div>`).join('')}
        <a class="full-taxonomy-link" href="#classification">Open the taxonomy database ↗</a>
        <button type="button" class="mobile-filter-done">Show results</button></aside>
      <section class="catalog en-catalog" aria-label="Species index">
        <form class="search" role="search"><span aria-hidden="true">⌕</span>
          <label class="sr-only" for="search">Search the species index</label>
          <input id="search" type="search" autocomplete="off" placeholder="Search names, taxonomic groups or field notes…" value="${escape(browse.query)}"><kbd>/</kbd></form>
        <div class="toolbar"><div><h2>Species index</h2><span class="en-result-count" role="status"></span></div>
          <div class="catalog-controls"><div class="view-switch" role="group" aria-label="Browse style">
            <button type="button" data-view="cards">Species cards</button><button type="button" data-view="tree">Taxonomy tree</button></div>
            <button type="button" class="mobile-filter-toggle" aria-controls="home-filters" aria-expanded="false">Filters</button></div></div>
        <div class="active-filters" aria-label="Active taxonomy filters"></div>
        <div class="sort-line"><label>Sort by <select id="archive-sort"><option value="newest">Publication date</option><option value="name">Species name</option>
          <option value="taxonomy">Taxonomic name</option><option value="count">Records in branch</option></select></label>
          <label>Order <select id="sort-direction"><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
          <label class="mobile-layout-control">Cards <select id="mobile-layout"><option value="double">Two columns</option><option value="large">Large cards</option></select></label></div>
        <div class="filter-line en-index-controls">
          <label><input type="checkbox" class="en-drawings" ${browse.drawings?'checked':''}> With sketches</label>
          ${samples.length<plants.length?`<label><input type="checkbox" class="en-only" ${browse.translatedOnly ? 'checked' : ''}> English field notes (${samples.length})</label>`:''}
          <button type="button" class="en-reset">Reset filters</button><button type="button" class="en-chinese">Chinese index ↗</button></div>
        <div class="view-options"><div id="tree-controls" hidden><button type="button" data-expand>Expand all</button><button type="button" data-collapse>Collapse all</button></div></div>
        <div class="en-results" id="results"></div>
        <button type="button" id="load-more" aria-controls="results" hidden>Load more</button>
        <nav id="pagination" class="pagination" aria-label="Index pages"><label id="page-size-control">Per page
          <select aria-label="Records per page">${[10,20,50].map(size => `<option value="${size}" ${size === browse.size ? 'selected' : ''}>${size}</option>`).join('')}</select></label>
          <div id="pagination-buttons" class="pagination-buttons"><button type="button" data-step="-1">Previous</button>
            <form class="page-jump"><input type="text" name="page" inputmode="numeric" enterkeyhint="go" autocomplete="off"><span class="page-count"></span><button>Go</button></form>
            <span class="single-page" hidden>1 / 1</span><button type="button" data-step="1">Next</button></div>
        </nav></section></div>`;

    const catalog = main.querySelector('.en-catalog');
    const results = catalog.querySelector('.en-results');
    const more = catalog.querySelector('#load-more');
    const pager = catalog.querySelector('#pagination-buttons');
    const jump = pager.querySelector('.page-jump');
    let lastPage;
    const side = main.querySelector('.home-sidebar');
    function updateOptions(rank) {
      const sources = {group:home.byKingdom,subclass:home.byGroup,order:home.bySubclass,family:home.byOrder,genus:home.byFamily};
      const options = home.options(sources[rank](plants,browse),rank).sort((a,b)=>alphabet.compare(optionName(rank,a),optionName(rank,b)));
      const term=normalized(side.querySelector('#'+rank+'-search').value.trim());
      const matching=options.filter(o=>o.key===browse[rank]||normalized([optionName(rank,o),o.name,o.latin].join(' ')).includes(term));
      const select=side.querySelector('#'+rank+'-select');
      select.innerHTML=`<option value="">All ${plural[rank]} (${options.length})</option>`
        +matching.map(o=>`<option value="${escape(o.key)}">${escape(optionName(rank,o))} · ${o.count}</option>`).join('')
        +(term&&!matching.length?'<option disabled>No matches</option>':'');
      select.value=browse[rank];
    }
    function sorted(items) {
      if (['newest','count'].includes(browse.sort)) {
        return window.CatalogModel.sort(items,browse.sort,browse.direction,browse.genus?'species':browse.family?'genus':'family');
      }
      const key = p => browse.sort==='taxonomy' ? records.get(p.id).path.map(r=>r.scientific).join('/') : titleFor(p);
      return [...items].sort((a,b)=>(alphabet.compare(key(a),key(b))||alphabet.compare(titleFor(a),titleFor(b))||a.id.localeCompare(b.id))*(browse.direction==='asc'?1:-1));
    }
    const hit=value=>taxonomy.marked(value,words);
    function card(p) {
      const title = titleFor(p);
      const summary = hasTranslation(p.id) ? translate(p.id, p.summary) : '';
      const classification = [p.orderLatin, p.familyLatin, p.genusLatin].filter(Boolean).join(' / ');
      const companions=words.length?records.get(p.id).related.filter(o=>words.some(w=>normalized([o.name,o.english,o.scientific].join(' ')).includes(w))):[];
      return `<a class="plant-card" href="${href(p)}"><div class="card-image"><img src="${escape(p.cover)}" alt="${escape(p.scientificName || p.name)}" loading="lazy">
        ${groups[p.group] ? `<span class="image-label">${hit(groups[p.group])}</span>` : ''}
        ${p.drawings?.length ? '<span class="drawing-label">Sketches</span>' : ''}</div>
        <div class="card-body">${companions.map(o=>`<small class="companion-hit">Also featured in this video: ${[...new Set([o.english,o.scientific,o.name].filter(Boolean))].map(hit).join(' · ')}</small>`).join('')}
        <p class="card-family">${hit(classification)}</p><h3>${hit(title)}<span aria-hidden="true">↗</span></h3>
          ${!title.includes(p.name) ? `<p class="en-original-name" lang="zh-CN">${hit(p.name)}</p>` : ''}
          ${title !== p.scientificName ? `<p class="latin">${hit(p.scientificName)}</p>` : ''}
          ${summary && summary !== p.summary ? `<p class="card-description">${hit(summary)}</p>` : ''}
          ${samples.length<plants.length?`<small class="en-note-status">${hasTranslation(p.id) ? 'Field notes in English' : 'Field notes in Chinese'}</small>`:''}</div></a>`;
    }
    function update(append = false) {
      words = normalized(browse.query.trim()).split(/\s+/).filter(Boolean);
      const matched = sorted(home.filter(browse.translatedOnly?samples:ordered,{...browse,query:''})
        .filter(p => words.every(word => searchText.get(p.id).includes(word))));
      filterRanks.forEach(updateOptions);
      const selectedRanks = ranks.filter(rank=>browse[rank]);
      const chips = selectedRanks.map(rank=>({rank,label:rank==='group'?groups[browse.group]||browse.group:
        browse[rank].split('|').at(-1).replace('__empty__','Not supplied')}));
      catalog.querySelector('.active-filters').innerHTML=chips.map(c=>`<button type="button" data-clear="${c.rank}" aria-label="Remove ${rankNames[c.rank]} filter: ${escape(c.label)}">${rankNames[c.rank]} · ${escape(c.label)} ×</button>`).join('');
      catalog.querySelector('.toolbar h2').textContent=chips.at(-1)?.label||'Species index';
      for(const button of side.querySelectorAll('[data-kingdom]')) {
        const active=button.dataset.kingdom===browse.kingdom;
        button.classList.toggle('active',active);button.setAttribute('aria-pressed',active);
      }
      for(const button of catalog.querySelectorAll('[data-view]')) {
        const active=button.dataset.view===browse.view;
        button.classList.toggle('active',active);button.setAttribute('aria-pressed',active);
      }
      const page = window.HomeModel.page(matched, browse.page, browse.size);
      browse.page = page.current;
      browse.firstPage = Math.min(browse.firstPage, browse.page);
      lastPage = page.totalPages;
      catalog.querySelector('.en-result-count').textContent = `${matched.length} of ${ordered.length} records`;
      const isTree = browse.view==='tree';
      catalog.querySelector('#tree-controls').hidden=!isTree;
      catalog.querySelector('#pagination').hidden=isTree||!page.total;
      more.hidden = isTree||!page.total||page.current===lastPage;
      if (isTree && matched.length) {
        results.innerHTML=taxonomy.tree(matched.map(p=>records.get(p.id)),words,browse.sort==='newest'?'date':browse.sort,
          {direction:browse.direction,selectedRanks:new Set(selectedRanks)});
        for (const node of results.querySelectorAll('.taxonomy-node')) {
          if (treeOpen.has(node.dataset.treeKey)) node.open=treeOpen.get(node.dataset.treeKey);
        }
        return;
      } else if (append) {
        results.querySelector('.cards').insertAdjacentHTML('beforeend', page.items.map(card).join(''));
      } else if (page.total) {
        const visible = matched.slice((browse.firstPage - 1) * browse.size, page.end);
        results.innerHTML = `<div class="cards mobile-${browse.layout}">${visible.map(card).join('')}</div>`;
      } else {
        results.innerHTML = '<div class="empty"><h3>No matching records</h3><p>Try another name or reset the filters.</p></div>';
      }
      more.textContent = `Load ${Math.min(browse.size, page.total - page.end)} more`;
      pager.hidden = !page.total;
      pager.querySelector('[data-step="-1"]').disabled = page.current === 1;
      pager.querySelector('[data-step="1"]').disabled = page.current === lastPage;
      pager.querySelector('.single-page').hidden = lastPage > 1;
      jump.hidden = lastPage === 1;
      jump.elements.page.value = page.current;
      jump.elements.page.setAttribute('aria-label', `Go to page, ${lastPage} pages in total`);
      jump.querySelector('.page-count').textContent = '/ ' + lastPage;
    }
    function reset(clearTree = true) {
      if (clearTree) treeOpen.clear();
      browse.firstPage = browse.page = 1;
      update();
    }
    function go(number) {
      const previousTop = pager.getBoundingClientRect().top;
      browse.firstPage = browse.page = number;
      update();
      window.scrollBy({top:pager.getBoundingClientRect().top - previousTop, behavior:'instant'});
    }
    catalog.querySelector('.search').onsubmit = event => event.preventDefault();
    catalog.querySelector('#search').oninput = event => { browse.query = event.target.value; reset(); };
    catalog.querySelector('.en-only')?.addEventListener('change',event=>{browse.translatedOnly=event.target.checked;reset();});
    catalog.querySelector('.en-drawings').onchange = event => { browse.drawings=event.target.checked;reset(); };
    catalog.querySelector('.en-chinese').onclick = () => openChinese();
    catalog.querySelector('#pagination select').onchange = event => { browse.size = Number(event.target.value); reset(false); };
    main.querySelector('.random-species').onclick = () => { if(plants.length) location.hash=href(plants[Math.floor(Math.random()*plants.length)]); };
    function changeRank(rank,value) {
      browse[rank]=value;
      for(const child of ranks.slice(ranks.indexOf(rank)+1)) {
        browse[child]='';
        side.querySelector('#'+child+'-search').value='';
      }
      reset();
    }
    side.querySelectorAll('[data-kingdom]').forEach(b=>b.onclick=()=>changeRank('kingdom',b.dataset.kingdom));
    for(const rank of filterRanks) {
      side.querySelector('#'+rank+'-search').oninput=()=>updateOptions(rank);
      side.querySelector('#'+rank+'-select').onchange=e=>changeRank(rank,e.target.value);
    }
    catalog.querySelector('.active-filters').onclick=e=>{
      const button=e.target.closest('[data-clear]');
      if(button) changeRank(button.dataset.clear,'');
    };
    catalog.querySelector('.en-reset').onclick=()=>{
      Object.assign(browse,{query:'',drawings:false,translatedOnly:false});
      ranks.forEach(rank=>browse[rank]='');
      side.querySelectorAll('input').forEach(input=>input.value='');
      catalog.querySelector('#search').value='';
      catalog.querySelectorAll('input[type="checkbox"]').forEach(input=>input.checked=false);
      reset();
    };
    for(const [id,key] of [['archive-sort','sort'],['sort-direction','direction'],['mobile-layout','layout']]) {
      const control=catalog.querySelector('#'+id);control.value=browse[key];
      control.onchange=e=>{
        browse[key]=e.target.value;
        if(key==='layout') {
          try { localStorage.setItem('mobile-card-layout',browse.layout); } catch {}
          update();
        } else reset(false);
      };
    }
    catalog.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{browse.view=b.dataset.view;update();});
    results.onclick=e=>{
      const summary=e.target.closest('.taxonomy-node>summary');
      if(summary) treeOpen.set(summary.parentElement.dataset.treeKey,!summary.parentElement.open);
    };
    for(const [selector,open] of [['[data-expand]',true],['[data-collapse]',false]]) {
      catalog.querySelector(selector).onclick=()=>results.querySelectorAll('.taxonomy-node').forEach(node=>{
        node.open=open;treeOpen.set(node.dataset.treeKey,open);
      });
    }
    const toggle=catalog.querySelector('.mobile-filter-toggle'),workspace=main.querySelector('.en-home-workspace');
    function setFiltersOpen(open) {
      workspace.classList.toggle('filters-open',open);
      toggle.setAttribute('aria-expanded',open);
      (open?side.querySelector('[data-kingdom]'):toggle).focus({preventScroll:true});
    }
    toggle.onclick=()=>setFiltersOpen(toggle.getAttribute('aria-expanded')!=='true');
    side.querySelector('.mobile-filter-done').onclick=()=>setFiltersOpen(false);
    side.onkeydown=e=>{if(e.key==='Escape'&&workspace.classList.contains('filters-open')){e.preventDefault();setFiltersOpen(false);}};
    pager.onclick = event => {
      const button = event.target.closest('[data-step]');
      if (button && !button.disabled) go(browse.page + Number(button.dataset.step));
    };
    jump.elements.page.onfocus = event => event.target.select();
    jump.onsubmit = event => {
      event.preventDefault();
      const input = jump.elements.page;
      const number = Number(input.value);
      if (!/^[0-9]+$/.test(input.value) || number < 1 || number > lastPage) {
        input.setCustomValidity(`Enter a page number between 1 and ${lastPage}.`);
        input.reportValidity();
        input.setCustomValidity('');
        input.select();
        return;
      }
      go(number);
    };
    more.onclick = () => {
      const grid = results.querySelector('.cards');
      const firstNew = grid.children.length;
      const oldScroll = window.scrollY;
      browse.page += 1;
      update(true);
      grid.children[firstNew]?.focus({preventScroll:true});
      window.scrollTo({top:oldScroll, behavior:'instant'});
    };
    update();
  }
  window.EnglishIndex = {render};
})();
