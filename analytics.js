/* Content analytics: no identity, local storage, search text or private data. */
(function () {
  'use strict';
  const host = 'yizhuzhiwudezhu.github.io';
  const views = {sankey:'桑基图',radial:'放射树',tree:'分类树',pack:'圆形打包',bubble:'气泡图',sunburst:'旭日图',force:'力导向图',icicle:'冰柱图',treemap:'矩形树图',game:'碰撞漫游'};
  let lastSpecies = null, lastPage = null, lastGraph = null, timer = null, attempts = 0;
  const queue = [];
  const production = () => window.location.hostname === host;
  const topLevel = () => window.self === window.top;
  const plant = id => {
    const data = window.LIBRARY;
    const canonical = data?.legacyAliases?.[id] || id;
    return data?.plants?.find(p => p.id === canonical);
  };
  function flush() {
    timer = null;
    if (!queue.length) return;
    if (typeof window.umami?.track === 'function') {
      for (const item of queue.splice(0)) {
        try { Promise.resolve(window.umami.track(item.name,item.data)).catch(()=>{}); } catch (_) {}
      }
      attempts = 0;
    } else if (++attempts < 80) timer = window.setTimeout(flush,250);
    else queue.length = 0;
  }
  function send(prefix,label,data) {
    if (!production() || !topLevel()) return;
    const name = Array.from(prefix+'｜'+label).slice(0,50).join('');
    if (queue.length < 100) queue.push({name,data});
    if (timer === null) { attempts = 0; flush(); }
  }
  function graph(view,mode) {
    if (!production() || !Object.hasOwn(views,view) || !['default','switch'].includes(mode)) return;
    if (lastGraph === view) return;
    lastGraph = view;
    if (!topLevel()) {
      window.parent.postMessage({type:'atlas-analytics',view,mode},window.location.origin);
      return;
    }
    send(mode === 'default'?'图谱默认':'图谱切换',views[view],{图谱:views[view],打开方式:mode === 'default'?'默认展示':'主动切换'});
  }
  window.AtlasAnalytics = {
    species(id) {
      const p = plant(id);
      if (!p) { lastSpecies = null; return; }
      if (lastSpecies === p.id) return;
      lastSpecies = p.id;
      send('物种浏览',p.name,{档案编号:p.id,物种名称:p.name});
    },
    leaveSpecies() { lastSpecies = null; },
    graph
  };
  // Page views retain canonical archive URLs, while section jumps do not inflate views.
  window.atlasAnalyticsBeforeSend = function (type,payload) {
    if (!production() || !topLevel()) return false;
    if (type === 'event' && !payload.name && typeof payload.url === 'string') {
      let url;
      try { url = new URL(payload.url,window.location.origin); } catch (_) { return false; }
      const parts = url.hash.slice(1).split('/');
      if (parts[0] === 'plant') {
        let id; try { id = decodeURIComponent(parts[1] || ''); } catch (_) { id = ''; }
        const p = plant(id);
        if (p) { url.hash = 'plant/'+encodeURIComponent(p.id); payload = {...payload,title:p.name+' · 一株植物的株'}; }
      }
      url.search = '';
      const path = url.pathname+(url.hash === '#'?'':url.hash);
      if (lastPage === path) return false;
      lastPage = path;
      return {...payload,url:path};
    }
    return payload;
  };
  document.addEventListener('click',event => {
    const a = event.target?.closest?.('a[data-video-archive]');
    if (!a) return;
    const p = plant(a.dataset.videoArchive);
    if (!p || a.getAttribute('href') !== p.video) return;
    send('视频点击',p.name,{档案编号:p.id,物种名称:p.name,按钮位置:a.dataset.videoPosition || '详情页'});
  });
  window.addEventListener('message',event => {
    const frame = document.getElementById('atlas-frame');
    if (!production() || !topLevel() || !frame || event.source !== frame.contentWindow || event.origin !== window.location.origin || window.location.hash !== '#atlas') return;
    const data = event.data;
    if (data?.type !== 'atlas-analytics' || !Object.hasOwn(views,data.view) || !['default','switch'].includes(data.mode)) return;
    send(data.mode === 'default'?'图谱默认':'图谱切换',views[data.view],{图谱:views[data.view],打开方式:data.mode === 'default'?'默认展示':'主动切换'});
  });
})();
