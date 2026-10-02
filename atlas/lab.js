'use strict';
(async function(){
 const $=s=>document.querySelector(s),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const views={sankey:['桑基图','带宽表示收录物种数量，层级从左到右或从上到下展开。'],tree:['分类树','读清每一个分类名称。选择节点后可展开、收起；双击进入该分支。'],sunburst:['旭日图','从中心走向外圈，分类逐级细分；扇区角度表示物种占比。'],force:['力导向图','拖动节点探索连接。节点位置和距离不表示分类等级、进化时间或亲缘距离。'],icicle:['冰柱图','用一层层矩形阅读分类。分支宽度表示物种数量，点击查看完整路径。'],treemap:['矩形树图','把物种数量变成面积。适合比较分支大小；完整归属可在下方查看。']};
 Object.assign(views,{radial:['放射树','沿着圆周阅读分类分支，可选择逐层放射或末端对齐。'],pack:['圆形打包','嵌套圆表示分类包含关系。双击圆进入分支；外圈含留白，精确数量以数字为准。'],bubble:['气泡图','每个气泡是一条当前可见的末端分支，面积按收录物种数量计算。'],game:['碰撞漫游','鼠标推开普通物种球；随机抽中的物种换色跃出，停下来等待点击。']});
 const rankLabels=['界','门','纲','亚纲','目','科','属','种'],colorKeys=['Magnoliidae','Polypodiinae','Lycopodiidae','Equisetidae','Pinidae','Cycadidae','Ginkgoidae','Fungi','Gnetidae'];
 const palettes={branch:['#66986e','#6593a2','#8aa06a','#7d879b','#aaa06c','#ad9561','#87a67e','#bd8966'],blue:['#397e91','#6a91ba','#5fa896','#817ba6','#547db1','#719ca3','#77a7b4','#c49472'],earth:['#8b965d','#b49a6b','#789279','#9c7c6e','#aa9752','#b27c4e','#808963','#bf8279'],contrast:['#0072b2','#009e73','#cc79a7','#e69f00','#8064a2','#b85120','#427638','#a84257'],quiet:['#6c9676','#6c9676','#6c9676','#6c9676','#6c9676','#6c9676','#6c9676','#bd8966']};
 for(const [key,color] of Object.entries({branch:'#8e79a8',blue:'#588691',contrast:'#985d8a',earth:'#91745c',quiet:'#6c9676'}))palettes[key].push(color);
 palettes.contrast2=['#c34b25','#167c59','#864b9c','#af8614','#237bad','#c0476a','#4d7d28','#6854a2','#258983','#95621f','#b03747','#597033'];
 const state={view:'game',layout:'default',depth:4,hiddenThrough:2,sort:'count',density:'comfortable',labels:'chinese',labelPolicy:'auto',lines:'curve',palette:'branch',query:'',kind:'all',scope:'life',selected:null,collapsed:new Set(),transform:d3.zoomIdentity};
 let taxa,map,root,orderColors,matched=new Set(),svg,layer,zoom,width,height,forceDrag=false,searchTimer,activeSimulation,labelFrame,treeFit;
 const forcePositions=new Map(),gameSeen=new Set(),gamePositions=new Map();
 let gamePaused=matchMedia('(prefers-reduced-motion: reduce)').matches,gameNodes=[],gameGroups,gamePool=[],gameChosenId=null,gameOpenedId=null,gameFrame=null,gameJump=null,gameBounds;
 const gamePointer={x:0,y:0,active:false,radius:220*2/3,strength:48};
 const gamePhysics=AtlasExtras.gamePhysics;
 try{
  const responses=await Promise.all([fetch('taxonomy.json'),fetch('graph-data.json')]);if(responses.some(r=>!r.ok))throw Error('无法读取分类数据');
  const [data,graph]=await Promise.all(responses.map(r=>r.json()));taxa=data.taxa;$('#kind option[value="all"]').textContent=`全部${taxa.length}条记录`;$('#reference-count').textContent=taxa.filter(t=>t.recordKind==='reference').length+'条';map=new Map(graph.nodes.map(n=>[n.id,{...n,children:[]}])) ;
  root={id:'life',chinese:'收录物种',scientific:'Recorded species',rank:'root',depth:-1,count:taxa.length,speciesIds:taxa.map(t=>t.id),parent:null,children:[]};map.set(root.id,root);
  for(const n of graph.nodes){const item=map.get(n.id);if(n.parent)map.get(n.parent).children.push(item);else{item.parent=root.id;root.children.push(item);}}
  orderColors=new Map([...map.values()].filter(n=>n.rank==='order').sort((a,b)=>a.scientific.localeCompare(b.scientific,'en')).map((n,i)=>[n.scientific,i]));
  svg=d3.select('#chart');layer=svg.append('g').attr('class','graph-layer');
  zoom=d3.zoom().scaleExtent([.005,32]).filter(event=>!forceDrag&&(state.view!=='game'||event.type==='wheel')&&(!event.ctrlKey||event.type==='wheel')&&!event.button).on('zoom',event=>{state.transform=state.view==='game'?d3.zoomIdentity.translate(width/2,height/2).scale(event.transform.k):event.transform;layer.attr('transform',state.transform);$('#zoom-value').textContent=Math.round(event.transform.k*100)+'%';scheduleLabels();});
  svg.call(zoom).on('dblclick.zoom',null).attr('tabindex',0).on('keydown.pan',event=>{const direction={ArrowLeft:[1,0],ArrowRight:[-1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[event.key];if(direction&&event.target===svg.node()){event.preventDefault();if(state.view!=='game')svg.call(zoom.translateBy,direction[0]*width/5/state.transform.k,direction[1]*height/5/state.transform.k);}});
  bindControls();updateSearch();render(true);$('#loading').hidden=true;
  let resizeTimer;new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>render(true),120);}).observe($('#stage'));
  document.addEventListener('visibilitychange',()=>{if(state.view!=='game')return;if(document.hidden)activeSimulation?.stop();else if(!gamePaused)activeSimulation?.alpha(.3).alphaTarget(.3).restart();});
 }catch(error){$('#loading').textContent='加载失败：'+error.message+'。请通过“打开3.8.3版.cmd”启动，不要直接双击HTML文件。';console.error(error);}

 function nodeLabel(n){return state.labels==='scientific'?n.scientific:(n.chinese||n.scientific);}
 function lineage(n){const path=[];while(n){path.unshift(n);n=n.parent?map.get(n.parent):null;}return path;}
 function nodeColor(n){if(n.id==='life')return '#234e3e';const path=lineage(n),key=path.some(p=>p.scientific==='Fungi')?'Fungi':path.find(p=>p.rank==='subclass')?.scientific;if(state.palette==='contrast2'){const order=path.find(p=>p.rank==='order'),index=order?orderColors.get(order.scientific):Math.max(0,colorKeys.indexOf(key));return palettes[state.palette][index%palettes[state.palette].length];}return palettes[state.palette][colorKeys.indexOf(key)]||palettes[state.palette][0];}
 function activeIds(){return state.selected?new Set(map.get(state.selected).speciesIds):matched;}
 function nodeMatches(n){const ids=activeIds();return n.speciesIds.some(id=>ids.has(id));}
 function filtering(){return Boolean(state.query||state.kind!=='all'||state.selected);}
 function className(n){if(state.view==='game')return 'graph-node'+(n.active?' selected':'')+((state.query||state.kind!=='all')&&!n.speciesIds.some(id=>matched.has(id))?' dim':'');return 'graph-node'+(n.id===state.selected?' selected':'')+(filtering()?(nodeMatches(n)?' matched':' dim'):'');}
 function linkClass(n){return 'graph-link'+(filtering()&&!nodeMatches(n)?' dim':'');}
 function hierarchy(){
  const top=map.get(state.scope),limit=Math.max(state.depth,top.depth);
  const context=AtlasModel.contextTree(root,top,map,limit,state.collapsed,['tree','radial'].includes(state.view),state.sort,state.hiddenThrough);
  const tree=d3.hierarchy(context,n=>n.children.length?n.children:null);
  tree.sum(n=>!n.children.length?n.count:0);
  return tree;
 }
 function updateSearch(){
  const terms=state.query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  matched=new Set(taxa.filter(t=>(state.kind==='all'||t.recordKind===state.kind)&&terms.every(term=>[t.name,t.scientificName,t.group,...(t.aliases||[]),...t.ranks.flatMap(r=>[r.chinese,r.scientific])].join(' ').toLocaleLowerCase().includes(term))).map(t=>t.id));
  $('#result-count').textContent=`匹配 ${matched.size} 种 / 全库 ${taxa.length} 种`;
  $('#focus-matches').disabled=!(state.query||state.kind!=='all')||matched.size===0;
  $('#empty').hidden=matched.size>0;
  $('#species-list').innerHTML=taxa.filter(t=>matched.has(t.id)).map(t=>`<button data-species="${escape(t.id)}" class="${state.selected===speciesNode(t.id)?.id?'selected':''}"><span>${escape(t.name)} <span class="badge">${t.recordKind==='observation'?'观察':'参考'}</span></span><small>${escape(t.scientificName)}</small></button>`).join('')||'<p class="small-note">没有匹配的物种。</p>';
  $('#species-list').querySelectorAll('button').forEach(b=>b.onclick=()=>{const n=speciesNode(b.dataset.species);if(!isInsideScope(n))state.scope='life';state.depth=7;$('#depth').value='7';for(const p of lineage(n))state.collapsed.delete(p.id);selectNode(n);render(true);});
 }
 function speciesNode(id){return [...map.values()].find(n=>n.rank==='species'&&n.speciesIds.includes(id));}
 function isInsideScope(n){return lineage(n).some(p=>p.id===state.scope);}
 function selectNode(n){state.selected=n.id;if(state.view==='game'&&n.rank==='species')gameOpenedId=n.speciesIds[0];updateSelection();refreshHighlight();updateSearch();if(state.view==='game')updateGame();}
 function refreshHighlight(){layer.selectAll('.graph-node').attr('class',d=>className(d.data||d));layer.selectAll('.graph-link').attr('class',d=>linkClass(d.target.data||d.target));scheduleLabels();}
 function updateSelection(){
  const n=map.get(state.selected);if(!n){$('#focus').disabled=true;$('#toggle-branch').hidden=true;$('#selection-copy').innerHTML='<p class="eyebrow">'+(state.query||state.kind!=='all'?'当前匹配 '+matched.size+' 个物种':'选择一个节点')+'</p><h3>从一个名字，走进它的分支。</h3><p>点击图中节点或左侧物种，查看中英文分类、数量与来源。</p>';return;}
  const species=n.rank==='species'?taxa.find(t=>t.id===n.speciesIds[0]):null;
  if(state.view==='game'&&species?.id===gameChosenId&&gameOpenedId!==species.id){$('#focus').disabled=true;$('#toggle-branch').hidden=true;$('#selection-copy').innerHTML='<p class="eyebrow">随机认识一个物种</p><h3>找到那颗换了颜色的物种球。</h3><p>它跃出后会停在原地，点击它查看物种档案。其它球会给鼠标让路。</p>';return;}
  const matchCount=n.speciesIds.filter(id=>matched.has(id)).length;
  $('#selection-copy').innerHTML=`<p class="eyebrow">${escape(rankLabels[n.depth]||'全库')} / ${species?(species.recordKind==='observation'?'原有观察档案':'图谱测试参考记录'):'分类节点'}</p><h3>${escape(n.chinese)}</h3><p class="scientific">${escape(species?.scientificName||n.scientific)}</p><p>收录 ${n.count} 种${state.query||state.kind!=='all'?` · 当前搜索匹配 ${matchCount} 种`:''}。${species&&species.recordKind==='reference'?'仅有分类记录，尚无观察文稿、视频或影像。':''}</p><div class="taxonomy-path">${lineage(n).filter(p=>p.depth>=0).map(p=>`<span>${rankLabels[p.depth]} · ${escape(p.chinese)} <i>${escape(p.scientific)}</i></span>`).join('')}</div>${species?.recordKind==='observation'?`<p><a href="../#plant/${encodeURIComponent(species.id)}" target="_parent">查看观察档案 ↗</a></p>`:''}${species?.originalVideoTitles?.length?`<div class="original-video-titles"><p>原视频标题</p><ul>${species.originalVideoTitles.map(title=>`<li>${escape(title)}</li>`).join('')}</ul></div>`:''}${species?`<p>分类来源：<a href="${escape(species.source.url)}" target="_blank" rel="noopener noreferrer">${escape(species.source.provider)} ↗</a> · 核对 ${escape(species.source.checked)}</p>${species.chineseNameSources?.length?`<p>中文属名${species.chineseNameSources[0].status==='verified'?'参考':'待核对'}：<a href="${escape(species.chineseNameSources[0].url)}" target="_blank" rel="noopener noreferrer">植物智（iPlant） ↗</a>；科学分类仍采用 POWO / WCVP。</p>`:''}${species.evidence?.higherClassificationURL?`<p>上级分类：<a href="${escape(species.evidence.higherClassificationURL)}" target="_blank" rel="noopener noreferrer">POWO记录 ↗</a> · WCVP快照 ${escape(species.evidence.datasetRelease?.replace(' (official directory last-modified)',''))}</p>`:''}`:'<p>点击末端物种，可查看它对应的分类记录来源。中文名称为辅助对照。</p>'}`;
  $('#focus').disabled=n.id===state.scope;$('#toggle-branch').hidden=!['tree','radial'].includes(state.view)||!n.children.length;
  $('#toggle-branch').textContent=state.collapsed.has(n.id)||state.depth<=n.depth?'展开下一层':'收起此分支';
 }
 function enterScope(n){n=map.get(n.id);state.scope=n.id;state.selected=n.id;if(n.depth>=state.depth&&n.depth<7){state.depth=Math.min(7,n.depth+2);$('#depth').value=String(state.depth);}state.collapsed.delete(n.id);updateSearch();updateSelection();render(true);}
 function bindNode(selection){
  selection.attr('class',d=>className(d.data||d)).attr('tabindex',0).attr('role','button').attr('aria-label',d=>{const n=d.data||d;return `${n.chinese} ${n.scientific}，${n.count}种，点击查看，双击进入分支`;})
   .on('click',(event,d)=>{event.stopPropagation();selectNode(d.data||d);})
   .on('dblclick',(event,d)=>{event.stopPropagation();enterScope(d.data||d);})
   .on('keydown',(event,d)=>{if(event.key==='Enter'){event.preventDefault();selectNode(d.data||d);}if(event.key===' '){event.preventDefault();enterScope(d.data||d);}})
   .on('pointermove',(event,d)=>{const n=d.data||d;if(state.view==='game'&&!gameSeen.has(n.speciesIds[0]))return;const bounds=$('#stage').getBoundingClientRect();$('#tooltip').hidden=false;$('#tooltip').textContent=`${n.chinese}\n${n.scientific}\n${rankLabels[n.depth]||'全库'} · 收录 ${n.count} 种${filtering()?` · 匹配 ${n.speciesIds.filter(id=>matched.has(id)).length} 种`:''}`;$('#tooltip').style.left=Math.max(8,Math.min(bounds.width-225,event.clientX-bounds.left+14))+'px';$('#tooltip').style.top=Math.max(8,Math.min(bounds.height-110,event.clientY-bounds.top+14))+'px';})
   .on('pointerleave',()=>{$('#tooltip').hidden=true;});
 }
 function render(resetFit=false){
  if(!svg)return;if(gameFrame)cancelAnimationFrame(gameFrame);gameFrame=null;gameJump=null;gamePointer.active=false;svg.on('.plant-game',null);activeSimulation?.stop();activeSimulation=null;width=$('#stage').clientWidth; height=$('#chart').clientHeight;svg.attr('data-view',state.view).attr('data-palette',state.palette);svg.attr('viewBox',`0 0 ${width} ${height}`);layer.selectAll('*').remove();$('#tooltip').hidden=true;
  treeFit=null;const h=hierarchy();({sankey:drawSankey,tree:drawTree,radial:drawTree,pack:drawPack,bubble:drawBubble,game:drawGame,sunburst:drawSunburst,force:drawForce,icicle:drawIcicle,treemap:drawTreemap}[state.view])(h);
  $('#game-tools').hidden=state.view!=='game';$('#hiddenThrough').disabled=state.view==='game';$('#depth').disabled=state.view==='game';
  $('#palette-buttons').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.palette===state.palette)));svg.attr('aria-label',views[state.view][0]+'：'+views[state.view][1]);
  $('#breadcrumb').innerHTML=lineage(map.get(state.scope)).map(n=>`<button data-scope="${n.id}">${escape(n.chinese)}</button>`).join('<span>›</span>');$('#breadcrumb').querySelectorAll('button').forEach(b=>b.onclick=()=>enterScope(map.get(b.dataset.scope)));
  $('#legend').innerHTML=(state.palette==='quiet'?[['植物',palettes.quiet[0]],['真菌',palettes.quiet[7]]]:colorKeys.map((key,i)=>[[...map.values()].find(n=>n.scientific===key)?.chinese,palettes[state.palette][i]]).filter(([name])=>name)).map(([name,color])=>`<span class="legend-item"><i class="legend-dot" style="background:${color}"></i>${escape(name)}</span>`).join('')+'<span class="legend-item"><i class="legend-dot" style="background:#b8c2ba"></i>灰色：其它分支</span>';
  if(state.palette==='contrast2')$('#legend').innerHTML='<span>高对比2 · 按目配色，科属种沿用；颜色循环使用，同色不代表同一目。</span><span>其它分支降低明暗与透明度显示。</span>';
  $('#context-note').textContent=(state.hiddenThrough>=0?'隐藏界至'+rankLabels[state.hiddenThrough]+'，从'+rankLabels[state.hiddenThrough+1]+'展示；完整归属保留在路径和详情中。':'所有分类等级可见。')+(state.scope==='life'?'数量按全库计数。':'旁支以灰色汇总保留数量。');
  if(state.view==='pack')$('#context-note').textContent+=' 嵌套圆的外圈包含留白，不用于精确比较比例。';
  if(state.view==='bubble')$('#context-note').textContent+=' 气泡面积＝当前末端分支收录量；物种级别每种计1。';
  $('#context-note').hidden=state.view==='game';
  $('#gestures').hidden=state.view==='game';
  $('#gestures').textContent='滚轮缩放 · 拖动画布 · 点击查看 · 双击聚焦分支';
  updateSelection();if(resetFit)fit();else layer.attr('transform',state.transform);scheduleLabels();
 }
 function fit(){if(state.view==='game'){svg.call(zoom.transform,d3.zoomIdentity.translate(width/2,height/2));return;}if(treeFit){const {x,y,w,h,left,right,top,bottom}=treeFit,W=width-left-right,H=height-top-bottom,k=Math.min(1.35,W/Math.max(1,w),H/Math.max(1,h));svg.call(zoom.transform,d3.zoomIdentity.translate(left+(W-k*w)/2-k*x,top+(H-k*h)/2-k*y).scale(k));return;}const b=layer.node().getBBox();if(!b.width||!b.height)return;const k=Math.min(1.35,(width-44)/b.width,(height-44)/b.height);svg.call(zoom.transform,d3.zoomIdentity.translate(width/2-k*(b.x+b.width/2),height/2-k*(b.y+b.height/2)).scale(k));}
 function text(selection,label,x,y,anchor='start'){selection.append('text').attr('x',x).attr('y',y).attr('text-anchor',anchor).text(label);}
 function drawSankey(h){
  if(!h.children){drawSingle(h);return;}
  const vertical=state.layout==='vertical',W=Math.max(760,width),steps=h.height+1;
  const columns=d3.rollup(h.descendants(),nodes=>nodes.length,n=>n.depth),rows=Math.max(...columns.values());
  const padding=state.density==='compact'?5:rows>25?10:20;
  // Reserve positive flow space after inter-node gaps, even at 300 species.
  const crossSize=Math.max(vertical?W:height,70+(rows-1)*padding+root.count*2);
  const labelWidth=Math.min(width*.28,Math.max(85,...h.leaves().map(n=>nodeLabel(n.data).length*(state.labels==='scientific'?7:12)+40))),frame=AtlasExtras.sankeyFrame(width,height,crossSize,steps,vertical,labelWidth);treeFit=frame.fit;
  const input=AtlasModel.sankeyInput(h);
  const result=d3.sankey().nodeId(n=>n.id).nodeWidth(frame.nodeWidth).nodePadding(padding).nodeSort((a,b)=>a.order-b.order).linkSort((a,b)=>a.target.order-b.target.order).nodeAlign(d3.sankeyLeft).extent(frame.extent)(input);
  const box=n=>vertical?{x:n.y0,y:n.x0,w:n.y1-n.y0,h:n.x1-n.x0}:{x:n.x0,y:n.y0,w:n.x1-n.x0,h:n.y1-n.y0};
  layer.append('g').selectAll('path').data(result.links).join('path').attr('class',l=>linkClass(l.target)).attr('fill','none').attr('stroke',l=>nodeColor(l.target)).attr('stroke-opacity',.3).attr('stroke-width',l=>l.width).attr('d',l=>vertical?`M${l.y0},${l.source.x1} C${l.y0},${(l.source.x1+l.target.x0)/2} ${l.y1},${(l.source.x1+l.target.x0)/2} ${l.y1},${l.target.x0}`:d3.sankeyLinkHorizontal()(l));
  const nodes=layer.append('g').selectAll('g').data(result.nodes).join('g').attr('transform',n=>`translate(${box(n).x},${box(n).y})`);bindNode(nodes);
  nodes.append('rect').attr('width',n=>box(n).w).attr('height',n=>box(n).h).attr('rx',2).attr('fill',nodeColor);
  nodes.append('text').attr('class','node-label').attr('x',vertical?0:18).attr('y',n=>vertical?0:box(n).h/2+3).attr('transform',n=>vertical?`translate(${box(n).w/2},${box(n).h+18})${box(n).w<90?' rotate(-45)':''}`:null).attr('text-anchor',n=>vertical?(box(n).w<90?'end':'middle'):'start').text(n=>`${nodeLabel(n)} ${n.count}`);
  const layers=[...new Set(result.nodes.map(n=>n.depth))];layers.forEach(i=>{const n=result.nodes.find(n=>n.depth===i);const b=box(n);layer.append('text').attr('class','rank-heading').attr('data-rank-y',b.y).attr('x',vertical?12:b.x).attr('y',vertical?b.y+9:15).text(n.rank==='root'?'全库':rankLabels[map.get(n.id).depth]);});
 }
 function radialLabelTransform(n){
  // Translate outwards on both halves before flipping left-side text upright.
  // Keep a visible gap from the circle even when labels resist zooming out.
  const offset=6+7/state.transform.k;
  return `rotate(${n.x*180/Math.PI-90}) translate(${offset},0) rotate(${n.x>Math.PI?180:0})`;
 }
 function drawTree(h){
  const compact=state.density==='compact';d3.tree().nodeSize([compact?27:38,state.labels==='scientific'?235:160])(h);
  const radial=state.view==='radial'||state.layout==='radial',vertical=!radial&&state.layout==='vertical';
  if(!radial)AtlasExtras.stretchTree(h,width,height,vertical,state.labels==='scientific'?235:160);
  if(radial)(state.layout==='cluster'?d3.cluster():d3.tree()).size([2*Math.PI,Math.max(260,h.height*(compact?85:140)*(state.labels==='scientific'?1.4:1))]).separation((a,b)=>(a.parent===b.parent?1:1.8)/Math.max(1,a.depth))(h);
  const point=n=>radial?[Math.sin(n.x)*n.y,-Math.cos(n.x)*n.y]:vertical?[n.x,n.y]:[n.y,n.x];
  if(!radial){const points=h.descendants().map(point),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),labelWidth=Math.min(width*.28,Math.max(65,...h.leaves().map(n=>nodeLabel(n.data).length*(state.labels==='scientific'?7:12)+40)));treeFit={x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys),left:vertical?labelWidth/2+10:44,right:vertical?labelWidth/2+10:labelWidth,top:vertical?48:22,bottom:vertical?30:22};}
  layer.append('g').selectAll('path').data(h.links()).join('path').attr('class',d=>linkClass(d.target.data)).attr('fill','none').attr('stroke',d=>nodeColor(d.target.data)).attr('stroke-opacity',.48).attr('stroke-width',1.4).attr('d',d=>{const a=point(d.source),b=point(d.target);if(radial){if(state.lines==='curve')return d3.linkRadial().angle(n=>n.x).radius(n=>n.y)(d);const bend=(d.source.y+d.target.y)/2;return d3.lineRadial().angle(p=>p[0]).radius(p=>p[1])([[d.source.x,d.source.y],[d.source.x,bend],[d.target.x,bend],[d.target.x,d.target.y]]);}if(state.lines==='elbow')return vertical?`M${a}V${(a[1]+b[1])/2}H${b[0]}V${b[1]}`:`M${a}H${(a[0]+b[0])/2}V${b[1]}H${b[0]}`;return vertical?d3.linkVertical().source(()=>a).target(()=>b)(d):d3.linkHorizontal().source(()=>a).target(()=>b)(d);});
  const nodes=layer.append('g').selectAll('g').data(h.descendants()).join('g').attr('transform',n=>`translate(${point(n)})`);bindNode(nodes);
  if(!radial)nodes.insert('rect',':first-child').attr('class','node-hit').attr('x',n=>radial&&n.x>Math.PI?-nodeLabel(n.data).length*11-40:vertical?-nodeLabel(n.data).length*6-20:-9).attr('y',vertical?-26:-14).attr('width',n=>nodeLabel(n.data).length*11+50).attr('height',40);
  nodes.append('circle').attr('r',n=>n.data.id==='life'?34:n.children?6:4.5).attr('fill',n=>state.collapsed.has(n.data.id)?'white':nodeColor(n.data)).attr('stroke',n=>nodeColor(n.data)).attr('stroke-width',n=>n.data.id==='life'?3:1.5);
  nodes.filter(n=>n.data.id!=='life').append('text').attr('class','node-label').attr('x',n=>radial?0:9).attr('y',vertical?-12:4).attr('transform',n=>radial?radialLabelTransform(n):null).attr('text-anchor',n=>radial&&n.x>Math.PI?'end':vertical?'middle':'start').text(n=>`${nodeLabel(n.data)} · ${n.data.count}${n.data.contextStub||state.collapsed.has(n.data.id)?' ＋':''}`);
  const core=nodes.filter(n=>n.data.id==='life');core.append('text').attr('class','root-label').attr('text-anchor','middle').attr('y',-4).text('收录物种');core.append('text').attr('class','root-label root-count').attr('text-anchor','middle').attr('y',16).text(root.count);
 }
 function drawSunburst(h){
  const radius=Math.max(210,Math.min(width,height)/2-25);d3.partition().size([2*Math.PI,radius])(h);const group=layer.append('g');
  const arc=d3.arc().startAngle(n=>n.x0).endAngle(n=>n.x1).padAngle(n=>Math.min(.003,(n.x1-n.x0)*.12)).padRadius(radius/2).innerRadius(n=>n.y0).outerRadius(n=>Math.max(n.y0,n.y1-.6));
  const nodes=group.selectAll('g').data(h.descendants()).join('g');bindNode(nodes);nodes.append('path').attr('d',arc).attr('fill',n=>nodeColor(n.data)).attr('fill-opacity',n=>n.depth===0?.2:Math.max(.48,1-n.depth*.07));
  nodes.filter(n=>n.depth>0).append('text').attr('class','area-label').attr('data-label-kind','arc').attr('transform',n=>{const angle=(n.x0+n.x1)/2*180/Math.PI,r=(n.y0+n.y1)/2;return `rotate(${angle-90}) translate(${r},0) rotate(${angle<180?0:180})`;}).attr('text-anchor','middle');
  group.append('text').attr('class','sunburst-center').attr('text-anchor','middle').attr('y',-3).attr('fill','#234e3e').attr('pointer-events','none').text(h.data.chinese);group.append('text').attr('class','sunburst-center center-count').attr('text-anchor','middle').attr('y',17).attr('fill','#6f8176').attr('pointer-events','none').text(`${h.data.count} 种`);
 }
 function drawIcicle(h){
  const vertical=state.layout==='vertical',W=Math.max(760,width),H=Math.max(500,height);
  // No geometric gaps: a one-species cell must retain its area at 300 records.
  d3.partition().size([vertical?W:H,vertical?H:Math.max(W,150*(h.height+1))]).padding(0)(h);
  const box=n=>vertical?{x:n.x0,y:n.y0,w:n.x1-n.x0,h:n.y1-n.y0}:{x:n.y0,y:n.x0,w:n.y1-n.y0,h:n.x1-n.x0};
  const nodes=layer.selectAll('g').data(h.descendants()).join('g').attr('transform',n=>`translate(${box(n).x},${box(n).y})`);bindNode(nodes);
  nodes.each(n=>{n.labelBox=box(n);});
  nodes.append('rect').attr('width',n=>box(n).w).attr('height',n=>box(n).h).attr('fill',n=>nodeColor(n.data)).attr('fill-opacity',.42).attr('stroke','#fcfdfb').attr('stroke-width',.45).attr('vector-effect','non-scaling-stroke');
  nodes.append('text').attr('class','area-label').attr('data-label-kind','box');
 }
 function drawTreemap(h){
  const W=Math.max(650,width),H=Math.max(470,height);d3.treemap().tile(state.layout==='slice'?d3.treemapSliceDice:d3.treemapSquarify).size([W,H]).paddingOuter(n=>Math.min(4,Math.min(n.x1-n.x0,n.y1-n.y0)*.03)).paddingInner(0).paddingTop(n=>Math.min(n.children?22:2,(n.y1-n.y0)*(n.children?.15:.03)))(h);
  const nodes=layer.selectAll('g').data(h.descendants()).join('g').attr('transform',n=>`translate(${n.x0},${n.y0})`);bindNode(nodes);
  nodes.each(n=>{n.labelBox={w:n.x1-n.x0,h:n.children?Math.min(22,(n.y1-n.y0)*.15):n.y1-n.y0};});
  nodes.append('rect').attr('width',n=>Math.max(0,n.x1-n.x0)).attr('height',n=>Math.max(0,n.y1-n.y0)).attr('fill',n=>nodeColor(n.data)).attr('fill-opacity',n=>n.children?.1:.38).attr('stroke','#fff').attr('stroke-width',1).attr('rx',3);
  nodes.append('text').attr('class','area-label').attr('data-label-kind','box');
 }
 function circleText(nodes,withCount=true){
  // Every leaf owns a label from the start; visibility is recalculated on zoom.
  nodes.append('text').attr('class','bubble-label area-label').attr('data-label-kind','circle').attr('data-count',String(withCount)).attr('text-anchor','middle');
 }
 function drawPack(h){
  const diameter=Math.max(340,Math.min(width,height)-36);
  d3.pack().size([diameter,diameter]).padding(n=>n.height?(state.density==='compact'?3:6):(state.density==='compact'?1:2))(h);
  const nodes=layer.selectAll('g').data(h.descendants()).join('g').attr('transform',n=>`translate(${n.x-diameter/2},${n.y-diameter/2})`);bindNode(nodes);
  nodes.append('circle').attr('r',n=>n.r).attr('fill',n=>n.data.id==='life'?'#edf3e7':nodeColor(n.data)).attr('fill-opacity',n=>n.children?.13:.83).attr('stroke',n=>n.data.id==='life'?'#b8c9b4':nodeColor(n.data)).attr('stroke-opacity',.65).attr('stroke-width',1.2);
  nodes.filter(n=>n.children).append('text').attr('class','pack-heading area-label').attr('data-label-kind','heading').attr('text-anchor','middle');
  circleText(nodes.filter(n=>!n.children));
 }
 function drawBubble(h){
  const diameter=Math.max(340,Math.min(width,height)-50),packed=AtlasExtras.bubbleLayout(h,d3,diameter,state.density==='compact'?5:12);
  const bubbles=packed.map(n=>({...n.data,x:n.x-diameter/2,y:n.y-diameter/2,r:n.r}));
  const nodes=layer.selectAll('g').data(bubbles).join('g').attr('transform',n=>`translate(${n.x},${n.y})`);bindNode(nodes);
  nodes.append('circle').attr('r',n=>n.r).attr('fill',nodeColor).attr('fill-opacity',.9).attr('stroke','white').attr('stroke-width',2);
  circleText(nodes);
  if(state.layout==='floating'){
   const simulation=d3.forceSimulation(bubbles).force('collide',d3.forceCollide(n=>n.r+5).iterations(4)).force('x',d3.forceX(0).strength(.02)).force('y',d3.forceY(0).strength(.02)).velocityDecay(.35).stop();activeSimulation=simulation;
   simulation.on('tick',()=>nodes.attr('transform',n=>`translate(${n.x},${n.y})`));
   nodes.call(d3.drag().on('start',(event,n)=>{event.sourceEvent.stopPropagation();forceDrag=true;n.fx=n.x;n.fy=n.y;simulation.alpha(.5).alphaTarget(.12).restart();}).on('drag',(event,n)=>{n.fx=event.x;n.fy=event.y;}).on('end',(event,n)=>{n.fx=null;n.fy=null;forceDrag=false;simulation.alphaTarget(0);}));
  }
 }

 function updateGame(){
  if(!gameGroups)return;
  gamePool=AtlasExtras.speciesPool(taxa,matched,map.get(state.scope).speciesIds);
  const count=gamePool.filter(t=>gameSeen.has(t.id)).length,active=gameNodes.find(n=>n.active);
  $('#game-status').textContent=gamePool.length?`已抽取 ${count} / ${gamePool.length} 种 · ${active?(active.phase==='jumping'?active.chinese+'正在跃出…':'点击换色的'+active.chinese):'鼠标推开球群，随机抽取一颗'}`:'当前范围没有可抽取的物种';
  $('#game-random').disabled=!gamePool.length||count===gamePool.length;
  $('#game-random').textContent=count===gamePool.length&&gamePool.length?'本轮已全部抽取':'随机认识一个物种 ↗';
  gameGroups.attr('data-plant-id',n=>n.speciesIds[0]).attr('data-game-active',n=>String(Boolean(n.active))).attr('data-game-phase',n=>n.phase).attr('tabindex',n=>n.active&&n.phase==='waiting'?0:null).attr('role',n=>n.active&&n.phase==='waiting'?'button':'img').attr('aria-label',n=>`${n.chinese} ${n.scientific}，${n.active?(n.phase==='jumping'?'正在跃出':'抽中的物种，点击查看'):'普通物种球，随鼠标避让'}`);
  gameGroups.select('circle').attr('r',n=>n.r).attr('fill',n=>n.active?'#ca3f65':nodeColor(n)).attr('stroke',n=>n.active?'#8c2346':'#fff').attr('stroke-width',n=>n.active?2.5:1);
  gameGroups.filter(n=>n.active).raise();scheduleLabels();
 }
 function positionGame(){
  gameGroups.attr('transform',n=>`translate(${n.x},${n.y})`);
  for(const n of gameNodes)gamePositions.set(n.speciesIds[0],{x:n.x,y:n.y});
 }
 function finishGameJump(){
  if(!gameJump)return;
  if(gameFrame)cancelAnimationFrame(gameFrame);gameFrame=null;
  const {node,end}=gameJump;node.fx=node.x=end.x;node.fy=node.y=end.y;node.vx=node.vy=node.impactVx=node.impactVy=0;node.phase='waiting';gameJump=null;
  positionGame();updateGame();
 }
 function beginGameJump(id,event){
  const node=gameNodes.find(n=>n.speciesIds[0]===id);if(!node||!activeSimulation)return;
  if(gameFrame)cancelAnimationFrame(gameFrame);gameFrame=null;gameJump=null;
  AtlasExtras.releasePlants(gameNodes);gameChosenId=id;gameOpenedId=null;gameSeen.add(id);state.selected=node.id;
  // A draw returns to the playing field when a zoomed/panned view would hide the ball.
  if(state.transform.k>2||!gameNodes.some(n=>{const p=state.transform.apply([n.x,n.y]);return p[0]>0&&p[0]<width&&p[1]>0&&p[1]<height;}))fit();
  const point=event?.detail?d3.pointer(event,svg.node()):(()=>{const b=$('#game-random').getBoundingClientRect();return d3.pointer({clientX:b.x+b.width/2,clientY:b.y+b.height/2},svg.node());})();
  const pointer=state.transform.invert(point),visibleA=state.transform.invert([0,0]),visibleB=state.transform.invert([width,height]);
  const radius=Math.max(node.baseR,Math.min(42,Math.max(34,width*.05))),start={x:node.x,y:node.y};
  const end=AtlasExtras.jumpTarget(node,{x:pointer[0],y:pointer[1]},{...gameBounds,minX:visibleA[0],minY:visibleA[1],maxX:visibleB[0],maxY:visibleB[1]},radius,state.transform.k);
  node.active=true;node.phase='jumping';node.r=radius;node.fx=node.x;node.fy=node.y;node.vx=node.vy=0;
  gameJump={node,start,end,startTime:performance.now(),duration:500};gamePointer.active=false;
  activeSimulation.force('collide').radius(n=>n.r+1.5);activeSimulation.alpha(.65).alphaTarget(.3);
  updateGame();refreshHighlight();updateSearch();updateSelection();
  if(gamePaused){finishGameJump();activeSimulation.tick(100);positionGame();return;}
  activeSimulation.restart();
  function animate(time){
   if(!gameJump)return;
   const progress=(time-gameJump.startTime)/gameJump.duration,point=AtlasExtras.jumpPosition(gameJump.start,gameJump.end,progress);
   node.impactVx=Math.max(-gamePhysics.maxSpeed,Math.min(gamePhysics.maxSpeed,point.x-node.x));node.impactVy=Math.max(-gamePhysics.maxSpeed,Math.min(gamePhysics.maxSpeed,point.y-node.y));node.fx=node.x=point.x;node.fy=node.y=point.y;node.vx=node.vy=0;positionGame();
   if(progress>=1)finishGameJump();else gameFrame=requestAnimationFrame(animate);
  }
  gameFrame=requestAnimationFrame(animate);
 }
 function drawGame(){
  const W=width*gamePhysics.extent,H=height*gamePhysics.extent,scopeIds=new Set(map.get(state.scope).speciesIds);
  gameBounds={w:W,h:H};
  const plants=taxa.filter(t=>scopeIds.has(t.id));
  const base=Math.max(5,Math.min(30,Math.sqrt(width*height/(Math.max(1,plants.length)*Math.PI))*.33)),seeds=plants.map(t=>({r:AtlasExtras.plantRadius(t.id,base)+1}));d3.packSiblings(seeds);
  gameBounds.clusterRadius=Math.max(0,...seeds.map(n=>Math.hypot(n.x,n.y)+n.r));
  gameNodes=plants.map((t,i)=>{const radius=seeds[i].r-1;return {...speciesNode(t.id),baseR:radius,r:radius,x:gamePositions.get(t.id)?.x??seeds[i].x,y:gamePositions.get(t.id)?.y??seeds[i].y,vx:0,vy:0,homeX:seeds[i].x,homeY:seeds[i].y,phase:'ordinary',active:false};});
  const active=gameNodes.find(n=>n.speciesIds[0]===gameChosenId&&matched.has(gameChosenId));
  if(active){active.active=true;active.phase='waiting';active.r=Math.max(active.baseR,Math.min(42,Math.max(34,width*.05)));active.fx=active.x;active.fy=active.y;}
  else{gameChosenId=null;gameOpenedId=null;}
  for(const n of gameNodes){const mx=Math.max(0,W/2-n.r-10),my=Math.max(0,H/2-n.r-10);n.x=Math.max(-mx,Math.min(mx,n.x));n.y=Math.max(-my,Math.min(my,n.y));if(n.active){n.fx=n.x;n.fy=n.y;}}
  gameGroups=layer.append('g').selectAll('g').data(gameNodes).join('g');bindNode(gameGroups);
  function openPlant(event,n){event.stopPropagation();if(n.active&&n.phase==='waiting'){selectNode(map.get(n.id));$('.selection').scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}}
  gameGroups.on('dblclick',event=>event.stopPropagation()).on('click',openPlant).on('keydown',(event,n)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openPlant(event,n);}}).on('pointermove',null);
  gameGroups.append('circle').attr('r',n=>n.r).attr('fill',nodeColor).attr('fill-opacity',.94).attr('stroke','white').attr('stroke-width',1).attr('vector-effect','non-scaling-stroke');circleText(gameGroups,false);
  const simulation=d3.forceSimulation(gameNodes).force('pointer',AtlasExtras.pointerRepulsion(gamePointer)).force('elastic',AtlasExtras.elasticCollision(gamePhysics.restitution)).force('collide',d3.forceCollide(n=>n.r+1.5).strength(1).iterations(3)).force('x',d3.forceX(0).strength(gamePhysics.center)).force('y',d3.forceY(0).strength(gamePhysics.center)).force('return',AtlasExtras.softReturn(W/2,H/2,gamePhysics.maxSpeed)).velocityDecay(gamePhysics.damping).stop();activeSimulation=simulation;
  simulation.on('tick',positionGame);positionGame();
  // The pointer is a force field, not a draggable or selectable plant.
  svg.on('pointermove.plant-game',event=>{
   if(gamePaused||event.pointerType==='touch')return;
   const point=state.transform.invert(d3.pointer(event,svg.node()));gamePointer.x=point[0];gamePointer.y=point[1];gamePointer.radius=gamePhysics.pointerRadius/state.transform.k;gamePointer.strength=gamePhysics.pointerStrength/state.transform.k;gamePointer.active=true;simulation.alpha(Math.max(.4,simulation.alpha())).alphaTarget(gamePhysics.hoverAlpha).restart();
  }).on('pointerleave.plant-game pointercancel.plant-game',()=>{gamePointer.active=false;if(!gamePaused)simulation.alphaTarget(.3);});
  if(!gamePaused)simulation.alpha(.3).alphaTarget(.3).restart();updateGame();
 }
 function drawForce(h){
  const nodes=h.descendants().map(n=>({...n.data,...forcePositions.get(n.data.id)})),links=h.links().map(l=>({source:l.source.data.id,target:l.target.data.id}));
  const radius=n=>n.id==='life'?32:4+Math.sqrt(n.count)*1.5;
  const simulation=d3.forceSimulation(nodes).randomSource(d3.randomLcg(.38)).force('link',d3.forceLink(links).id(n=>n.id).distance(l=>l.source.id==='life'?125:state.density==='compact'?58:98).strength(.65)).force('charge',d3.forceManyBody().strength(n=>n.id==='life'?-650:state.density==='compact'?-95:-220)).force('collide',d3.forceCollide(n=>radius(n)+9)).force('x',d3.forceX(0).strength(n=>n.id==='life'?.09:.015)).force('y',d3.forceY(0).strength(n=>n.id==='life'?.09:.015)).velocityDecay(.45).stop();
  if(!nodes.every(n=>forcePositions.has(n.id)))for(let i=0;i<240;i++)simulation.tick();activeSimulation=simulation;
  const edges=layer.append('g').selectAll('line').data(links).join('line').attr('class',l=>linkClass(l.target)).attr('stroke',l=>nodeColor(l.target)).attr('stroke-opacity',.4).attr('stroke-width',1.2);
  const circles=layer.append('g').selectAll('g').data(nodes).join('g');bindNode(circles);circles.append('circle').attr('r',radius).attr('fill',nodeColor).attr('fill-opacity',n=>n.id==='life'?1:.85).attr('stroke',n=>n.id==='life'?'#c9d6c2':'none').attr('stroke-width',3);circles.filter(n=>n.id!=='life').append('text').attr('class','node-label').attr('x',n=>radius(n)+7).attr('y',4).text(n=>nodeLabel(n)+(n.contextStub?' ＋':''));
  const core=circles.filter(n=>n.id==='life');core.append('text').attr('class','root-label').attr('text-anchor','middle').attr('y',-4).text('收录物种');core.append('text').attr('class','root-label root-count').attr('text-anchor','middle').attr('y',16).text(root.count);
  function position(){edges.attr('x1',l=>l.source.x).attr('y1',l=>l.source.y).attr('x2',l=>l.target.x).attr('y2',l=>l.target.y);circles.attr('transform',n=>`translate(${n.x},${n.y})`);for(const n of nodes)forcePositions.set(n.id,{x:n.x,y:n.y,vx:0,vy:0});scheduleLabels();}position();simulation.on('tick',position);
  circles.call(d3.drag().on('start',(event,n)=>{event.sourceEvent.stopPropagation();forceDrag=true;n.fx=n.x;n.fy=n.y;simulation.alphaTarget(.16).alpha(Math.max(.35,simulation.alpha())).restart();}).on('drag',(event,n)=>{n.fx=event.x;n.fy=event.y;}).on('end',(event,n)=>{n.fx=null;n.fy=null;simulation.alphaTarget(0);forceDrag=false;}));
 }
 function scheduleLabels(){if(labelFrame)cancelAnimationFrame(labelFrame);labelFrame=requestAnimationFrame(resolveLabels);}
 function resolveLabels(){
  labelFrame=null;const k=state.transform.k,radial=state.view==='radial'||state.view==='tree'&&state.layout==='radial',smart=['force','sankey','tree','radial'].includes(state.view),labels=layer.selectAll('.node-label');
  if(smart){layer.selectAll('.graph-node').filter(d=>(d.data||d).id==='life').select('circle').attr('r',32/k);layer.selectAll('.root-label').style('font-size',`${12/k}px`).attr('y',function(){return this.classList.contains('root-count')?16/k:-4/k;});}
  labels.style('display',null).style('font-size',smart?`${12/k}px`:null);
  if(state.view==='sankey'){
   const vertical=state.layout==='vertical';
   if(vertical)labels.attr('transform',n=>`translate(${(n.y1-n.y0)/2},${n.x1-n.x0+14/k})${(n.y1-n.y0)*k<90?' rotate(-45)':''}`).attr('text-anchor',n=>(n.y1-n.y0)*k<90?'end':'middle');else labels.attr('x',n=>n.x1-n.x0+6/k);
   layer.selectAll('.rank-heading').style('font-size',`${10/k}px`).attr('text-anchor',vertical?'end':'start').attr('x',function(){return vertical?35-8/k:d3.select(this).attr('x');}).attr('y',function(){return vertical?Number(this.dataset.rankY)+10/k:35-12/k;});
  }
  if(radial)labels.attr('transform',radialLabelTransform).attr('y',4/k);
  layer.selectAll('.sunburst-center').style('font-size',`${12/k}px`).attr('y',function(){return this.classList.contains('center-count')?17/k:-3/k;});
  layer.selectAll('.area-label').each(function(n){
   const element=d3.select(this),kind=this.dataset.labelKind,data=n.data||n,font=state.view==='game'&&!n.active?Math.min(12,Math.max(6,n.r*k*.85)):12;
   let w,h,x=0,y=0,anchor='middle',label=nodeLabel(data),forced=state.labelPolicy==='all';
   if(kind==='circle'){
    w=h=n.r*Math.SQRT2*k-6;
    if(state.view==='game'&&!n.active){w=Math.max(font,w);h=Math.max(font*1.22,h);}
    if(this.dataset.count==='true'&&data.count>1)label+=' · '+data.count;
   }else if(kind==='heading'){
    w=n.r*1.35*k-12;h=Math.min(30,n.r*k*.32);y=-n.r+16/k;if(data.count>1)label+=' · '+data.count;
   }else if(kind==='arc'){
    w=(n.y1-n.y0)*k-5;h=(n.x1-n.x0)*(n.y0+n.y1)/2*k-5;
   }else{
    w=n.labelBox.w*k-10;h=n.labelBox.h*k-6;anchor='start';x=5/k;y=3/k;label+=' · '+data.count;
   }
   let lines=AtlasExtras.labelLines(label,w,h,font,forced);
   if(state.view==='game'&&!n.active&&lines.some(line=>line.includes('…'))&&lines.length===1)lines=[Array.from(label)[0]];
   element.attr('data-full-label',label).attr('text-anchor',anchor).attr('x',x).attr('y',y).style('font-size',`${font/k}px`).style('display',lines.length?null:'none');
   element.selectAll('tspan').data(lines).join('tspan').attr('x',x).attr('y',(line,i)=>kind==='box'?y+(font+i*font*1.22)/k:y+((i-(lines.length-1)/2)*font*1.22+font*.32)/k).text(line=>line);
  });
  if(!smart||state.labelPolicy==='all')return;
  const visible=[];layer.selectAll('.root-label').each(function(){visible.push(this.getBoundingClientRect());});
  const nodes=labels.nodes().sort((a,b)=>{const x=a.__data__.data||a.__data__,y=b.__data__.data||b.__data__;const priority=n=>(n.id===state.selected?1000:filtering()&&nodeMatches(n)?100:0)-n.depth+Math.log2(n.count+1);return priority(y)-priority(x);});
  for(const label of nodes){const b=label.getBoundingClientRect();const collision=visible.some(a=>a.right+4>b.left&&b.right+4>a.left&&a.bottom+2>b.top&&b.bottom+2>a.top);if(collision)label.style.display='none';else visible.push(b);}
 }
 function drawSingle(h){const group=layer.append('g').datum(h);bindNode(group);group.append('circle').attr('r',35).attr('fill',nodeColor(h.data)).attr('fill-opacity',.35);text(group,nodeLabel(h.data),0,60,'middle');text(group,h.data.count+' 种',0,5,'middle');}
 function setLayoutOptions(){const options=state.view==='tree'?[['horizontal','横向树'],['vertical','纵向树'],['radial','放射树']]:state.view==='radial'?[['radial','逐层放射'],['cluster','末端对齐']]:state.view==='bubble'?[['floating','拖动碰撞'],['packed','静态打包']]:['sankey','icicle'].includes(state.view)?[['horizontal','从左向右'],['vertical','从上向下']]:state.view==='treemap'?[['balanced','均衡矩形'],['slice','条带矩形']]:[['default',state.view==='sunburst'?'同心圆环':state.view==='pack'?'层层嵌套':state.view==='game'?'鼠标避让与跃出':'自由网络']];state.layout=options[0][0];$('#layout').innerHTML=options.map(([value,label])=>`<option value="${value}">${label}</option>`).join('');$('#layout').disabled=options.length===1;$('#lines').disabled=!['tree','radial'].includes(state.view);}
 function bindControls(){
  const paletteNames={branch:['自然色','植物自然色'],blue:['蓝绿色','清爽蓝绿'],contrast:['高对比','高对比配色'],contrast2:['高对比2','高对比2 · 按目配色']};
  $('#palette-buttons').innerHTML=Object.entries(paletteNames).map(([key,[shortName,name]])=>{
   const samples=[...new Set(palettes[key])],gradient=samples.map((color,i)=>`${color} ${i/samples.length*100}%,${color} ${(i+1)/samples.length*100}%`).join(',');
   return `<button class="palette-choice" data-palette="${key}" aria-label="${name}" aria-pressed="${key===state.palette}"><span class="palette-swatch" aria-hidden="true" style="background:linear-gradient(90deg,${gradient})"></span><span>${shortName}</span></button>`;
  }).join('');
  $('#palette-buttons').querySelectorAll('button').forEach(button=>button.onclick=()=>{state.palette=button.dataset.palette;render(false);});
  setLayoutOptions();$('.view-tabs').querySelectorAll('button[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;$('.view-tabs').querySelectorAll('button[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));setLayoutOptions();render(true);});
  $('#search').oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{const oldDepth=state.depth,oldScope=state.scope;state.query=$('#search').value.trim();state.scope='life';state.selected=null;if(state.query){let deepest=0;for(const t of taxa)for(let i=0;i<t.ranks.length;i++)if(state.query.toLowerCase().split(/\s+/).some(term=>[t.ranks[i].chinese,t.ranks[i].scientific].some(s=>s.toLowerCase().includes(term))))deepest=Math.max(deepest,i);state.depth=Math.max(4,deepest,state.hiddenThrough+1);$('#depth').value=String(state.depth);state.collapsed.clear();}updateSearch();render(state.depth!==oldDepth||state.scope!==oldScope);},160);};
  $('#kind').onchange=()=>{state.kind=$('#kind').value;state.selected=null;state.scope='life';updateSearch();render(true);};
  for(const key of ['layout','depth','hiddenThrough','sort','labels','labelPolicy','lines'])$('#'+key).onchange=()=>{state[key]=['depth','hiddenThrough'].includes(key)?Number($('#'+key).value):$('#'+key).value;if(key==='hiddenThrough'&&state.hiddenThrough>=state.depth){state.depth=state.hiddenThrough+1;$('#depth').value=String(state.depth);}if(key==='depth'&&state.depth<=state.hiddenThrough){state.hiddenThrough=state.depth-1;$('#hiddenThrough').value=String(state.hiddenThrough);}if(key==='depth'||key==='hiddenThrough')state.collapsed.clear();render(true);};
  $('#settings-toggle').onclick=()=>{const open=$('#settings').hidden;$('#settings').hidden=!open;$('#settings-toggle').setAttribute('aria-expanded',String(open));$('#settings-toggle').textContent=open?'显示设置 ⌃':'显示设置 ⌄';};
  $('#zoom-in').onclick=()=>svg.call(zoom.scaleBy,1.25);$('#zoom-out').onclick=()=>svg.call(zoom.scaleBy,.8);$('#fit').onclick=fit;
  $('#game-random').onclick=event=>{const plant=AtlasExtras.nextPlant(gamePool,gameSeen);if(plant)beginGameJump(plant.id,event);};
  $('#game-restart').onclick=()=>{gameSeen.clear();state.selected=null;gameChosenId=gameOpenedId=null;gamePositions.clear();updateSearch();render(true);};
  $('#reset').onclick=()=>{gameChosenId=gameOpenedId=null;state.scope='life';state.selected=null;state.collapsed.clear();state.query='';state.kind='all';state.depth=4;state.hiddenThrough=2;$('#hiddenThrough').value='2';$('#search').value='';$('#kind').value='all';$('#depth').value='4';$('#selection-copy').innerHTML='<p class="eyebrow">回到全库</p><h3>'+taxa.length+'个名字，一张共同的地图。</h3><p>点击节点查看分类路径，或查找一个感兴趣的物种。</p>';$('#focus').disabled=true;$('#toggle-branch').hidden=true;updateSearch();render(true);};
  $('#expand-all').onclick=()=>{state.scope='life';state.depth=7;state.hiddenThrough=-1;state.collapsed.clear();$('#depth').value='7';$('#hiddenThrough').value='-1';render(true);};
  $('#focus').onclick=()=>{if(state.selected)enterScope(map.get(state.selected));};
  $('#clear-selection').onclick=()=>{gameChosenId=gameOpenedId=null;state.selected=null;state.scope='life';$('#selection-copy').innerHTML='<p class="eyebrow">取消选中</p><h3>回到当前搜索结果。</h3><p>搜索条件保留，点击节点继续查看。</p>';$('#toggle-branch').hidden=true;updateSearch();render(true);};
  $('#focus-matches').onclick=()=>{const paths=[...matched].map(id=>lineage(speciesNode(id)));let common=root;for(let i=0;i<paths[0].length;i++){const candidate=paths[0][i];if(paths.every(path=>path[i]?.id===candidate.id))common=candidate;else break;}enterScope(common);};
  $('#toggle-branch').onclick=()=>{const n=map.get(state.selected);if(!n)return;if(state.depth<=n.depth){state.depth=Math.min(7,n.depth+1);$('#depth').value=String(state.depth);state.collapsed.delete(n.id);}else if(state.collapsed.has(n.id))state.collapsed.delete(n.id);else state.collapsed.add(n.id);render(true);};
  $('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('.visual-panel').requestFullscreen();}catch{$('#context-note').textContent='当前浏览器未允许全屏；仍可使用缩放和拖动查看图谱。';}};document.addEventListener('fullscreenchange',()=>{$('#fullscreen').textContent=document.fullscreenElement?'退出全屏':'全屏';render(true);});
 }
})();
