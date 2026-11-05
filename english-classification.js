'use strict';
(() => {
  const ranks = {
    kingdom: 'Kingdom', phylum: 'Phylum', class: 'Class', subclass: 'Subclass',
    order: 'Order', family: 'Family', genus: 'Genus', species: 'Species',
    variety: 'Variety', subspecies: 'Subspecies', form: 'Form', cultivar: 'Cultivar'
  };
  const groups = {
    '被子植物': 'Flowering plants', '裸子植物': 'Gymnosperms', '石松类': 'Lycophytes',
    '蕨类植物': 'Ferns', '真菌': 'Fungi', '绿藻': 'Green algae'
  };
  const alphabet = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
  const normalize = value => String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[char]);
  const joined = fields => normalize(fields.filter(Boolean).join(' '));
  const distinct = values => [...new Set(values.filter(Boolean))];
  const sourceLabel = p => {
    const provider = p.taxonomyProvider || p.source?.provider || '';
    if (provider.startsWith('Species Fungorum')) return 'Species Fungorum';
    return provider || 'Other sources';
  };

  function marked(value, terms) {
    const text = String(value ?? '');
    if (!terms.length) return escape(text);
    const positions = [];
    let simplified = '', offset = 0;
    for (const ch of text) {
      const folded = normalize(ch);
      for (let i = 0; i < folded.length; i++) positions.push({start:offset, end:offset+ch.length});
      simplified += folded;
      offset += ch.length;
    }
    const hits = [];
    for (const term of terms) {
      let start = simplified.indexOf(term);
      while (start !== -1) {
        hits.push([positions[start].start, positions[start+term.length-1].end]);
        start = simplified.indexOf(term, start+term.length);
      }
    }
    let result = '', index = 0;
    const ranges = [];
    for (const hit of hits.sort((a,b) => a[0]-b[0])) {
      const last = ranges[ranges.length-1];
      if (last && hit[0] <= last[1]) last[1] = Math.max(last[1], hit[1]);
      else ranges.push(hit);
    }
    for (const [a,b] of ranges) {
      result += escape(text.slice(index,a))+'<mark class="taxonomy-search-hit">'+escape(text.slice(a,b))+'</mark>';
      index=b;
    }
    return result+escape(text.slice(index));
  }

  function prepare(p) {
    const table = window.EnglishFieldNotes?.[p.id] || {};
    const names = distinct([p.name,table[p.name],p.scientificName,p.acceptedScientificName,...(p.aliases||[])]);
    const related = (p.relatedPlants||[]).flatMap(o => [o,...(o.cultivars||[])])
      .map(o => ({name:o.name||'',scientific:o.scientific||'',english:table[o.name]||''}));
    const formal = [...(p.ranks||[]), ...(p.additionalRanks||[])].filter(r => r.scientific);
    // The last item in the tree represents a video. Show a formal species or variety
    // above it when the video documents a distinct cultivar or infraspecific name.
    const path = formal.filter(r => r.rank!=='species' || p.rank!=='species')
      .map(r => ({rank:r.rank,scientific:r.scientific,chinese:r.chinese || ''}));
    const date = [p.videoPublishedDate,p.videoPublishedTime,p.id].join(' ');
    const group = groups[p.group] || p.group || '';
    const extras = distinct([p.id,...names, group, p.group, ...(p.originalVideoTitles||[]), p.videoOtherVarieties]);
    const search = joined([...extras,...related.flatMap(o=>[o.name,o.scientific,o.english]),
      ...formal.flatMap(r=>[r.chinese,r.scientific,ranks[r.rank]])]);
    return {p,path,names,related,group,date,search,source:sourceLabel(p)};
  }

  function tree(records, terms, sorting, options = {}) {
    const root = {branches:new Map(), leaves:[]};
    const selected = options.selectedRanks || new Set();
    const direction = options.direction || (['count','date'].includes(sorting) ? 'desc' : 'asc');
    for (const r of records) {
      // A name, alias, ID, or companion search should reach the record itself.
      const leafWords = joined([...r.names,r.p.id,...(r.p.originalVideoTitles||[]),
        ...r.related.flatMap(o=>[o.name,o.scientific,o.english]),r.p.videoOtherVarieties]);
      const filterDepth = r.path.reduce((last,row,i)=>selected.has(row.rank)?i:last,-1);
      let through = filterDepth;
      if (terms.length) {
        for (const term of terms) {
          let depth = -1;
          r.path.forEach((row,i) => {
            if (joined([row.scientific,row.chinese,ranks[row.rank]]).includes(term)) depth=i;
          });
          if (leafWords.includes(term) || depth < 0) depth=r.path.length;
          through=Math.max(through,depth);
        }
      }
      let node = root;
      r.path.forEach((row,depth) => {
        const key=row.rank+'|'+row.scientific;
        if (!node.branches.has(key)) node.branches.set(key,{
          row,branches:new Map(),leaves:[],count:0,newest:'',open:false
        });
        node=node.branches.get(key);
        node.count++;
        if (!node.newest || (direction==='asc' ? r.date<node.newest : r.date>node.newest)) node.newest=r.date;
        if (terms.length ? depth<through : depth < Math.max(1,filterDepth+2)) node.open=true;
      });
      node.leaves.push(r);
    }
    const compare=(a,b) => {
      const sign = direction === 'desc' ? -1 : 1;
      if (sorting==='count' && a.count !== b.count) return sign*(a.count-b.count);
      if (sorting==='date' && a.newest !== b.newest) return sign*a.newest.localeCompare(b.newest);
      return alphabet.compare(a.label,b.label)*(sorting==='name'||sorting==='taxonomy'?sign:1);
    };
    function leaf(r) {
      const p=r.p;
      const hints=[];
      if (terms.length) {
        for (const o of r.related) {
          const values=distinct([o.name,o.scientific]);
          if (!o.name || !terms.some(term=>joined([...values,o.english]).includes(term))) continue;
          if (o.english && o.english!==o.name) values.push(o.english);
          hints.push('Also featured in this video: '+values.map(v=>marked(v,terms)).join(' · '));
        }
        const aliases=r.names.filter(n=>n!==p.name && n!==p.scientificName && terms.some(term=>normalize(n).includes(term)));
        if (aliases.length) hints.push('Matching name: '+distinct(aliases).map(n=>marked(n,terms)).join(' · '));
        if (terms.some(t=>normalize(p.id).includes(t))) hints.push('Record ID: '+marked(p.id,terms));
        const titles=(p.originalVideoTitles||[]).filter(v=>terms.some(t=>normalize(v).includes(t)));
        if (titles.length) hints.push('Video: '+titles.map(v=>marked(v,terms)).join(' · '));
        if (terms.some(t=>joined([r.group,p.group]).includes(t))) {
          hints.push('Group: '+distinct([r.group,p.group]).map(v=>marked(v,terms)).join(' · '));
        }
      }
      return `<a class="taxonomy-leaf" href="#plant/${encodeURIComponent(p.id)}"><span>${marked(p.scientificName||p.name,terms)}</span>
        <small lang="zh-CN">${marked(p.name,terms)}</small><span aria-hidden="true">↗</span>
        ${distinct(hints).map(h=>'<small class="companion-hit">'+h+'</small>').join('')}</a>`;
    }
    function children(node,path='') {
      const entries=[
        ...[...node.branches.values()].map(branch=>({branch,label:branch.row.scientific,count:branch.count,newest:branch.newest})),
        ...node.leaves.map(record=>({record,label:record.p.scientificName||record.p.name,count:1,newest:record.date}))
      ].sort(compare);
      return entries.map(entry=>{
        if (entry.record) return leaf(entry.record);
        const n=entry.branch, row=n.row;
        const branchPath=path+'/'+row.rank+':'+row.scientific;
        const label=value=>selected.has(row.rank)?'<mark class="taxonomy-filter-hit">'+escape(value)+'</mark>':marked(value,terms);
        return `<details class="taxonomy-node" data-tree-key="${escape(branchPath)}" ${n.open?'open':''}><summary><span>${label(row.scientific)}</span>
          <span class="en-chinese-rank" lang="zh-CN">${label(row.chinese)}</span>
          <small>${marked(ranks[row.rank]||row.rank,terms)} · ${n.count} ${n.count===1?'record':'records'}</small></summary>
          <div>${children(n,branchPath)}</div></details>`;
      }).join('');
    }
    return '<div class="taxonomy-tree">'+children(root)+'</div>';
  }

  function render(main, plants) {
    document.title='Taxonomy database · 一株植物的株';
    main.lang='en';
    const records=plants.map(prepare);
    const countFungi=records.filter(r=>r.p.kingdomLatin==='Fungi').length;
    const countPlants=records.filter(r=>r.p.kingdomLatin==='Plantae').length;
    const summaries=[countPlants+' plant records',countFungi+' fungal records'];
    const other=records.length-countPlants-countFungi;
    if(other) summaries.push(other+' other records');
    function options(values) {
      return distinct(values).sort(alphabet.compare).map(x=>`<option value="${escape(x)}">${escape(x)}</option>`).join('');
    }
    main.innerHTML=`<section class="classification-intro classification-compact"><p class="eyebrow">CLASSIFICATION</p>
      <h1 class="en-database-title">Taxonomy database</h1></section>
      <section class="classification-database database-compact en-taxonomy" aria-label="Taxonomy database">
      <p>${records.length} observation records · ${summaries.join(' · ')}</p>
      <form class="search" role="search"><span aria-hidden="true">⌕</span>
      <label class="sr-only" for="taxonomy-search">Search the taxonomy database</label>
      <input type="search" id="taxonomy-search" autocomplete="off" placeholder="Search a name, taxonomic group or record ID…"></form>
      <div class="sort-line"><label>Group <select data-group><option value="">All groups</option>${options(records.map(r=>r.group))}</select></label>
      <label>Source <select data-source><option value="">All sources</option>${options(records.map(r=>r.source))}</select></label>
      <label>Sort <select data-sort><option value="name">Scientific name (A–Z)</option><option value="count">Most records</option><option value="date">Newest video</option></select></label></div>
      <div class="database-actions"><span data-count role="status" aria-live="polite"></span>
      <button type="button" data-expand>Expand all</button><button type="button" data-collapse>Collapse all</button>
      <a href="taxonomy.json" download>Download JSON</a><a href="plant-taxonomy.sqlite" download>Download SQLite</a><a href="plant-taxonomy.csv" download>Download CSV</a></div>
      <div class="en-taxonomy-results"></div></section>
      <details class="classification-source"><summary>Sources and downloads</summary>
      <p>Plant records follow <a href="https://powo.science.kew.org/about-wcvp" target="_blank" rel="noopener noreferrer">Plants of the World Online / WCVP</a> at Kew. Fungal records follow <a href="https://www.speciesfungorum.org/" target="_blank" rel="noopener noreferrer">Species Fungorum</a>. Marine algae are referenced to <a href="https://www.marinespecies.org/" target="_blank" rel="noopener noreferrer">WoRMS</a> and <a href="https://www.algaebase.org/" target="_blank" rel="noopener noreferrer">AlgaeBase</a>.</p>
      <p>Scientific names and ranks follow the linked source for each record. Chinese names are shown alongside them. The group filter helps browse the collection. Downloads include all records and retain the original Chinese fields.</p></details>`;
    const search=main.querySelector('#taxonomy-search'), group=main.querySelector('[data-group]');
    const source=main.querySelector('[data-source]'), sorting=main.querySelector('[data-sort]');
    const results=main.querySelector('.en-taxonomy-results');
    function update() {
      const terms=normalize(search.value).trim().split(/\s+/).filter(Boolean);
      const matches=records.filter(r=>(!group.value||r.group===group.value) &&
        (!source.value||r.source===source.value) && terms.every(t=>r.search.includes(t)));
      main.querySelector('[data-count]').textContent=matches.length+' of '+records.length+' records';
      results.innerHTML=matches.length?tree(matches,terms,sorting.value):
        '<p class="empty">No matching records. Try another name or change the filters.</p>';
    }
    main.querySelector('form').addEventListener('submit',e=>e.preventDefault());
    search.addEventListener('input',update);
    [group,source,sorting].forEach(select=>select.addEventListener('change',update));
    for (const [selector,open] of [['[data-expand]',true],['[data-collapse]',false]]) {
      main.querySelector(selector).addEventListener('click',()=>results.querySelectorAll('details').forEach(n=>{n.open=open;}));
    }
    update();
  }
  window.EnglishClassification={render,prepare,tree,marked};
})();
