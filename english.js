'use strict';
window.FieldLanguages = (() => {
  const lang=window.FieldLanguagePreference.current;
  const en=lang==='en';
  let words={}, loadState='idle';
  const featured=new Set();
  const archives=new Map(window.LIBRARY.plants.map(p=>[p.id,p]));
  const complete=new Set();
  const cjk=/[\u3400-\u9fff]/;
  const groups={'被子植物':'Flowering plants','裸子植物':'Gymnosperms','蕨类植物':'Ferns','石松类':'Lycophytes','绿藻':'Green algae','真菌':'Fungi'};
  const rankNames={kingdom:'Kingdom',phylum:'Phylum',class:'Class',subclass:'Subclass',order:'Order',family:'Family',genus:'Genus',species:'Species',variety:'Variety',subspecies:'Subspecies',form:'Form'};
  function languageURL(which) {
    return window.FieldLanguagePreference.languageURL(which);
  }
  function openChinese() { location.assign(languageURL('zh')); }
  function translate(id,source,path) { return (path ? window.EnglishRecordFields?.[id]?.[path] : undefined) ?? words[id]?.[source] ?? source ?? ''; }
  function registerTables() {
    words=window.EnglishFieldNotes;
    for(const id of window.EnglishFeaturedRecords || [])featured.add(id);
    for(const [id,table] of Object.entries(words)) {
      const p=archives.get(id);
      if(!p || (window.EnglishRecordStatus && window.EnglishRecordStatus[id]!=='synced'))continue;
      const companions=p.relatedPlants||[];
      const displayed=[p.summary,p.coverCaption,p.classificationDisplayNote||p.taxonomyNote,p.taxonomyTranslation,p.sourceText,p.horticulturalSource?.scope,
        ...(p.chapters||[]).flatMap(x=>[x.heading,x.text,x.caption]),...(p.photos||[]).map(x=>x.caption),
        ...(p.drawings||[]).map(x=>x.caption),...(p.references||[]).map(x=>x.title),
        ...(p.observations||[]).flatMap(x=>[x.title,x.text,x.location]),
        companions.length?p.companionIntro:p.videoOtherVarieties,
        ...companions.flatMap(x=>[x.note,x.identificationStatus])];
      if(displayed.every(s=>!s||!cjk.test(s)||(typeof table[s]==='string' && table[s].trim() && table[s]!==s)))complete.add(id);
    }
  }
  function ready(main,render) {
    if(!en||loadState==='ready')return true;
    if(loadState==='idle') {
      loadState='loading';
      const script=document.createElement('script');
      script.src='english-content.js';
      script.onload=()=>{if(!window.EnglishFieldNotes){script.onerror();return;}registerTables();loadState='ready';render();};
      script.onerror=()=>{loadState='failed';render();};
      document.head.append(script);
    }
    if(loadState==='failed'){
      main.innerHTML='<div class="empty"><h1>English notes could not be loaded</h1><button type="button">Try again</button></div>';
      main.querySelector('button').onclick=()=>{loadState='idle';render();};
    }else{
      main.innerHTML='<p role="status">Loading field notes…</p>';
    }
    return false;
  }
  const hasTranslation=id=>complete.has(id);
  const titleFor=p=>p.scientificName||p.name;
  const http=value=>/^https?:\/\//i.test(value||'');
  function anchor(url,label,attributes='') {
    return http(url)?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" ${attributes}>${esc(label)} ↗</a>`:esc(label);
  }
  function updateShell() {
    document.documentElement.lang=en?'en':'zh-CN';
    document.querySelector('main').removeAttribute('lang');
    const switches=document.querySelector('.language-switch');
    switches.setAttribute('aria-label',en?'Reading language':'阅读语言');
    for(const link of switches.querySelectorAll('a')) {
      const choice=link.dataset.lang;
      link.href=languageURL(choice).href;
      link.toggleAttribute('data-active',choice===lang);
      if(choice===lang)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');
    }
    if(!en)return false;
    const set=(selector,message)=>{document.querySelector(selector).textContent=message;};
    const attr=(selector,key,message)=>{document.querySelector(selector).setAttribute(key,message);};
    set('.skip','Skip to content');set('.brand small','Plant observation archive');attr('.brand','lang','zh-CN');attr('.brand small','lang','en');
    set('.nav-index','Home');set('.nav-classification','Taxonomy');set('.nav-atlas','Atlas');set('.nav-bilibili','Bilibili ↗');
    attr('.topbar nav','aria-label','Main navigation');
    attr('.nav-classification','title','Search the taxonomy database');attr('.nav-atlas','title','Explore the interactive atlas');
    set('footer>span','一株植物的株 · Start observing with a plant nearby');
    const license=document.querySelector('.footer-links a');
    license.href='license-en.html';license.textContent='Copyright';
    set('footer a[href="#statistics"]','Visitor statistics');
    attr('.footer-links','aria-label','Site information');
    attr('meta[name="description"]','content','Photographic plant records by 一株植物的株. Explore plants and fungi by taxonomy, with field notes, photographs and sketches.');
    set('#viewer-fit','Fit');set('#viewer-title','Image gallery');set('#viewer-error','This image could not be loaded. You can still browse the rest of the gallery.');
    set('.viewer-hint','Scroll to zoom · Drag to pan · Swipe to browse');set('.rail-heading','Images in this record');
    attr('#lightbox','aria-label','Image gallery');attr('.viewer-stage','aria-label','Image area');
    attr('#viewer-fit','title','Fit image (0)');attr('#viewer-zoom','aria-label','Zoom level');
    attr('#viewer-rail-toggle','aria-label','Toggle thumbnails');attr('#viewer-rail-toggle','title','Toggle thumbnails');attr('#viewer-fullscreen','aria-label','Toggle full screen');attr('#viewer-fullscreen','title','Full screen');
    attr('#lightbox .close','aria-label','Close gallery');attr('#lightbox .close','title','Close (Esc)');
    attr('#viewer-prev','aria-label','Previous image');attr('#viewer-prev','title','Previous image');attr('#viewer-next','aria-label','Next image');attr('#viewer-next','title','Next image');
    attr('.viewer-rail','aria-label','All images in this record');
    return true;
  }
  function companionSection(p) {
    const others=p.relatedPlants||[];
    if(!others.length&&!p.videoOtherVarieties)return '';
    const t=(s,path)=>translate(p.id,s,path);
    const cards=others.map((o,i)=>{
      const record=archives.get(o.archiveId);
      const note=o.note?'<p>'+esc(t(o.note,'relatedPlants.'+i+'.note'))+'</p>':'';
      const status=o.identificationStatus?'<p class="companion-status">'+esc(t(o.identificationStatus,'relatedPlants.'+i+'.identificationStatus'))+'</p>':'';
      const source=o.source?.url?anchor(o.source.url,o.source.provider||'Name reference'):'';
      return `<article><h3><span lang="zh-CN">${esc(o.name)}</span></h3>
        ${o.scientific?`<p class="companion-scientific">${esc(o.scientific)}</p>`:''}
        ${record?`<a class="companion-archive" href="#plant/${esc(record.id)}">Read the species record ↗</a>`:''}
        ${note}${status}${source}</article>`;
    });
    return `<section id="companions" class="detail-section companion-section"><p class="eyebrow">IN THIS VIDEO</p>
      <h2>Also in this observation</h2><p>${esc(t(p.companionIntro||p.videoOtherVarieties,p.companionIntro?'companionIntro':'videoOtherVarieties'))}</p>
      ${cards.length?`<div class="companion-list">${cards.join('')}</div>`:''}</section>`;
  }
  function taxonomy(p) {
    const rows=[...p.ranks,...(p.additionalRanks||[])];
    return `<section class="detail-section" id="taxonomy"><p class="eyebrow">CLASSIFICATION</p><h2>Taxonomy</h2>
      <div class="taxonomy-table-wrap"><table class="taxonomy-table"><thead><tr><th scope="col">Rank</th><th scope="col">Chinese name</th><th scope="col">Scientific name</th></tr></thead>
      <tbody>${rows.map(r=>`<tr><th scope="row">${esc(rankNames[r.rank]||r.rank)}</th><td lang="zh-CN">${esc(r.chinese||'—')}</td><td>${esc(r.scientific||(r.rank==='species'&&p.horticulturalName?'Parent species undetermined':'Not provided by the source'))}</td></tr>`).join('')}</tbody></table></div></section>`;
  }
  function sources(p,full) {
    const t=(s,path)=>translate(p.id,s,path);
    const refs=full?(p.references||[]):[];
    const note=p.classificationDisplayNote||p.taxonomyNote;
    const nameRef=full&&p.nameSource;
    const horticulture=full&&p.horticulturalSource;
    return `<section class="detail-section" id="sources"><p class="eyebrow">SOURCES</p><h2>Sources and credits</h2>
      <h3>Classification</h3><p>${anchor(p.taxonomySource,p.taxonomyProvider)}${p.taxonomyChecked?' · Checked '+esc(p.taxonomyChecked):''}</p>
      ${p.taxonomyRecord?`<p>Source record: ${esc(p.taxonomyRecord)}</p>`:''}
      ${full?`<p>${esc(t(p.taxonomyTranslation,'taxonomyTranslation'))}</p>${note?`<p>${esc(t(note,p.classificationDisplayNote?'classificationDisplayNote':'taxonomyNote'))}</p>`:''}`:''}
      ${nameRef?`<p>Name in the manuscript: ${esc(nameRef.scientificName)} · ${anchor(nameRef.url,'Name record')}</p>`:''}
      ${horticulture?`<p>Horticultural name: ${esc(p.horticulturalName||p.scientificName)} · ${anchor(horticulture.url,'Name source')}${horticulture.scope?' · '+esc(t(horticulture.scope,'horticulturalSource.scope')):''}</p>`:''}
      ${refs.length?`<h3>References</h3><ol class="references">${refs.map((r,i)=>`<li>${anchor(r.url,t(r.title,'references.'+i+'.title'))}${r.author||r.year?`<span>${[r.author,r.year].filter(Boolean).map(esc).join(' · ')}</span>`:''}${t(r.title,'references.'+i+'.title')!==r.title?`<details><summary>Original title</summary><span lang="zh-CN">${esc(r.title)}</span></details>`:''}</li>`).join('')}</ol>`:''}
      <h3>Images and field notes</h3><p>${esc(full?t(p.sourceText,'sourceText'):'The materials were compiled from the video and the author’s manuscript.')}
      ${anchor(p.video,'Watch the video (Chinese)',`data-video-archive="${esc(p.id)}" data-video-position="资料来源"`)}</p></section>`;
  }
  function detail(main,p) {
    if(!p){document.title='Record not found';main.innerHTML='<div class="empty"><h1>Record not found</h1><a href="#">Return to the index</a></div>';return;}
    const full=hasTranslation(p.id),t=(s,path)=>translate(p.id,s,path),title=titleFor(p);
    const paragraphs=(s,path)=>String(t(s,path)||'').split(/\n+/).filter(Boolean).map(x=>'<p>'+esc(x)+'</p>').join('');
    const figure=(src,caption)=>`<figure>${photoButton(src,caption)}<figcaption>${esc(caption)}</figcaption></figure>`;
    const used=new Set([p.cover,...p.chapters.map(c=>c.image)]);
    const photos=full?p.photos.filter(x=>{if(!x.image||used.has(x.image))return false;used.add(x.image);return true;}):[];
    const drawings=full?p.drawings:[];
    const sections=[['notes','Field notes',full?p.chapters.length:null],...(photos.length?[['photos','Photographs',photos.length]]:[]),
      ...(drawings.length?[['drawings','Drawings',drawings.length]]:[]),['taxonomy','Taxonomy',null],
      ...(full&&(p.relatedPlants?.length||p.videoOtherVarieties)?[['companions','Also in this video',null]]:[]),['sources','Sources',null]];
    const videoLinkAttrs=`data-video-archive="${esc(p.id)}" data-video-position="页头按钮"`;
    const chineseURL=languageURL('zh');chineseURL.hash='plant/'+encodeURIComponent(p.id)+'/notes';
    document.title=title+' · 一株植物的株';
    main.innerHTML=`<div class="detail en-detail"><a class="back" href="#">← Species index</a>
      <p class="breadcrumb">${(p.ranks||[]).map(r=>r.scientific).filter(Boolean).map(esc).join(' › ')}</p>
      <section class="detail-hero"><div class="detail-cover">${p.cover?photoButton(p.cover,full?t(p.coverCaption,'coverCaption')||title:title):''}</div><div class="detail-heading">
      <div class="heading-top"><div><p class="eyebrow">SPECIES RECORD · ${esc(p.id)}</p><h1>${esc(title)}</h1></div>
      ${p.video?`<div class="video-access"><a class="video-qr" data-video-archive="${esc(p.id)}" data-video-position="二维码链接" href="${esc(p.video)}" target="_blank" rel="noopener noreferrer"><img src="assets/${esc(p.id)}/video-qr.png" alt="QR code for the video"></a><a class="video-link" ${videoLinkAttrs} href="${esc(p.video)}" target="_blank" rel="noopener noreferrer">▷ Watch video ↗</a></div>`:''}</div>
      <p class="en-original-name" lang="zh-CN">${esc(p.name)}</p>
      <p class="class-group">${esc(groups[p.group]||p.group)}</p>${full?`<p class="detail-summary">${esc(t(p.summary,'summary'))}</p>`:''}
      <dl>${[['Order',p.orderLatin],['Family',p.familyLatin],['Genus',p.genusLatin],['Video date',p.videoPublishedDate]].filter(x=>x[1]).map(([a,b])=>`<div><dt>${a}</dt><dd>${esc(b)}</dd></div>`).join('')}
      ${full&&p.aliases?.some(a=>a!==p.name&&a!==p.speciesLatin&&a!==p.scientificName)?`<div><dt>Other names in the source</dt><dd>${p.aliases.filter(a=>a!==p.name&&a!==p.speciesLatin&&a!==p.scientificName).map(a=>esc(featured.has(p.id)?t(a):a)).join(', ')}</dd></div>`:''}</dl></div></section>
      <nav class="detail-nav" aria-label="Record sections">${sections.map(([id,label,n])=>`<a href="#plant/${esc(p.id)}/${id}">${label}${n!==null?` <small>${n}</small>`:''}</a>`).join('')}</nav>
      <div class="detail-columns"><div><section id="notes" class="detail-section"><p class="eyebrow">FIELD NOTES</p><h2>${full?'Meet this species':'Read the original observation'}</h2>
      ${full?`<p class="translation-credit">Translated from the author’s field notes. <a href="${esc(chineseURL.href)}" data-read-zh>Read the Chinese original</a></p>`:''}
      ${full?p.chapters.map((c,i)=>`<article class="story-chapter ${c.image?'with-image':'text-only'}" id="chapter-${i+1}"><div class="story-copy"><div class="chapter-title"><span>${String(i+1).padStart(2,'0')}</span><h3>${esc(t(c.heading,'chapters.'+i+'.heading'))}</h3></div><div class="chapter-text">${paragraphs(c.text,'chapters.'+i+'.text')}</div></div>${c.image?figure(c.image,t(c.caption,'chapters.'+i+'.caption')||t(c.heading,'chapters.'+i+'.heading')):''}</article>`).join('')+
        (p.observations||[]).map((o,i)=>`<article class="observation"><p>${esc(o.date||'')} ${esc(t(o.location,'observations.'+i+'.location'))}</p><h3>${esc(t(o.title,'observations.'+i+'.title'))}</h3>${paragraphs(o.text,'observations.'+i+'.text')}</article>`).join(''):
        `<p class="language-notice">The field notes, photographs and drawings for this record are available in the Chinese edition. <a href="${esc(chineseURL.href)}" data-read-zh>Read in Chinese ↗</a></p>`}</section>
      ${photos.length?`<section id="photos" class="detail-section"><h2>Field photographs</h2><div class="gallery">${photos.map(x=>figure(x.image,t(x.caption,'photos.'+p.photos.indexOf(x)+'.caption')||title)).join('')}</div></section>`:''}
      ${drawings.length?`<section id="drawings" class="detail-section"><h2>Nature sketches</h2><div class="sketches">${drawings.map((x,i)=>figure(x.image,t(x.caption,'drawings.'+i+'.caption')||'Nature sketch '+(i+1))).join('')}</div></section>`:''}
      ${taxonomy(p)}${full?companionSection(p):''}${sources(p,full)}</div></div></div>`;
  }
  return {updateShell,ready,detail,hasTranslation,translate,titleFor,index:(main,plants)=>window.EnglishIndex.render({main,plants,hasTranslation,translate,titleFor,openChinese})};
})();
