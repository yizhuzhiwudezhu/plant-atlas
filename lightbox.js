'use strict';
(() => {
  const viewer=document.querySelector('#lightbox'),G=window.PlantViewerGeometry;
  const image=viewer.querySelector('#viewer-image'),stage=viewer.querySelector('.viewer-stage');
  const caption=viewer.querySelector('#viewer-caption'),count=viewer.querySelector('#viewer-count');
  const previous=viewer.querySelector('#viewer-prev'),next=viewer.querySelector('#viewer-next');
  const error=viewer.querySelector('#viewer-error'),thumbs=viewer.querySelector('#viewer-thumbnails');
  const railToggle=viewer.querySelector('#viewer-rail-toggle'),fullscreen=viewer.querySelector('#viewer-fullscreen');
  let album=[],position=0,opener=null,savedScroll=0,savedOverflow='',savedPadding='';
  let base={w:1,h:1},transform={scale:1,x:0,y:0},gesture=null;
  const pointers=new Map(),identity=src=>new URL(src,document.baseURI).href;
  const compact=()=>matchMedia('(max-width: 900px), (max-height: 560px)').matches;
  const local=p=>{const r=stage.getBoundingClientRect();return {x:p.x-r.left-r.width/2,y:p.y-r.top-r.height/2};};
  const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2}),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function paint(){
    transform=G.bounds(transform,base,stage.clientWidth,stage.clientHeight);
    image.style.transform=`translate(-50%, -50%) translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
    viewer.querySelector('#viewer-zoom').textContent=Math.round(transform.scale*100)+'%';
    stage.classList.toggle('is-zoomed',transform.scale>1.01);
  }
  const defaultScale=()=>matchMedia('(orientation: landscape) and (max-height: 560px)').matches?1:.9;
  function fit(scale=defaultScale()){
    transform={scale,x:0,y:0};
    if(image.naturalWidth&&image.naturalHeight){base=G.fit(image.naturalWidth,image.naturalHeight,stage.clientWidth,stage.clientHeight);image.style.width=base.w+'px';image.style.height=base.h+'px';}
    paint();
  }
  function zoom(target,anchor={x:0,y:0}){transform=G.zoom(transform,target,anchor);paint();}
  function chrome(show=true){viewer.classList.toggle('is-chrome-hidden',!show);}
  function rail(show){viewer.classList.toggle('rail-open',show);railToggle.setAttribute('aria-expanded',String(show));requestAnimationFrame(()=>{if(viewer.open)fit();});}
  function selection(){
    [...thumbs.children].forEach((button,i)=>{button.classList.toggle('selected',i===position);button.setAttribute('aria-current',i===position?'true':'false');});
    const selected=thumbs.children[position];
    if(selected){const top=selected.offsetTop-thumbs.offsetTop;if(top<thumbs.scrollTop)thumbs.scrollTop=top;else if(top+selected.offsetHeight>thumbs.scrollTop+thumbs.clientHeight)thumbs.scrollTop=top+selected.offsetHeight-thumbs.clientHeight;}
  }
  function show(index){
    if(!album.length)return;position=(index+album.length)%album.length;
    const item=album[position];gesture=null;error.hidden=true;image.hidden=false;image.style.visibility='hidden';
    transform={scale:defaultScale(),x:0,y:0};paint();image.alt=item.caption;image.src=item.src;
    caption.textContent=item.caption;count.textContent=`${position+1} / ${album.length}`;
    previous.disabled=next.disabled=album.length<2;selection();chrome();
    if(image.complete&&image.naturalWidth){fit();image.style.visibility='visible';}
  }
  function open(button){
    const detail=button.closest('.detail');if(!detail)return;
    const seen=new Set();album=[...detail.querySelectorAll('[data-photo]')].filter(el=>{const key=identity(el.dataset.photo);if(seen.has(key))return false;seen.add(key);return true;}).map(el=>({src:el.dataset.photo,caption:el.dataset.caption||''}));
    if(!album.length)return;opener=button;savedScroll=window.scrollY;savedOverflow=document.body.style.overflow;savedPadding=document.body.style.paddingRight;
    const gap=window.innerWidth-document.documentElement.clientWidth;if(gap)document.body.style.paddingRight=(parseFloat(getComputedStyle(document.body).paddingRight)+gap)+'px';document.body.style.overflow='hidden';
    viewer.querySelector('#viewer-title').textContent=`${detail.querySelector('h1')?.textContent||'物种'} · 图片浏览`;
    thumbs.replaceChildren();album.forEach((item,i)=>{
      const button=document.createElement('button');button.className='viewer-thumb';button.setAttribute('aria-label',`查看第 ${i+1} 张图片：${item.caption}`);
      const preview=document.createElement('img');preview.src=item.src;preview.alt='';preview.loading='lazy';
      const number=document.createElement('span');number.textContent=String(i+1).padStart(2,'0');button.append(preview,number);button.addEventListener('click',()=>show(i));thumbs.append(button);
    });
    rail(!compact());viewer.showModal();show(album.findIndex(item=>identity(item.src)===identity(button.dataset.photo)));viewer.querySelector('.close').focus({preventScroll:true});requestAnimationFrame(()=>fit());
  }
  document.addEventListener('click',event=>{const button=event.target.closest('[data-photo]');if(button&&!viewer.open)open(button);});
  previous.addEventListener('click',()=>show(position-1));next.addEventListener('click',()=>show(position+1));
  viewer.querySelector('.close').addEventListener('click',()=>viewer.close());
  viewer.querySelector('#viewer-fit').addEventListener('click',()=>{fit(1);chrome();});
  railToggle.addEventListener('click',()=>rail(!viewer.classList.contains('rail-open')));
  fullscreen.hidden=!document.fullscreenEnabled;
  fullscreen.addEventListener('click',async()=>{try{if(document.fullscreenElement===viewer)await document.exitFullscreen();else await viewer.requestFullscreen();}catch{caption.textContent='当前浏览器未开启全屏；仍可缩放查看图片。';}});
  document.addEventListener('fullscreenchange',()=>{if(viewer.open)requestAnimationFrame(()=>fit());});
  viewer.addEventListener('focusin',()=>chrome());
  viewer.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();show(position+(event.key==='ArrowLeft'?-1:1));}
    else if(event.key==='0'){event.preventDefault();fit(1);chrome();}
    else if(['+','=','-'].includes(event.key)){event.preventDefault();zoom(transform.scale*(event.key==='-'?.8:1.25));chrome();}
  });
  viewer.addEventListener('close',()=>{
    if(document.fullscreenElement===viewer)document.exitFullscreen().catch(()=>{});
    document.body.style.overflow=savedOverflow;document.body.style.paddingRight=savedPadding;pointers.clear();gesture=null;
    if(opener?.isConnected){opener.focus({preventScroll:true});window.scrollTo({top:savedScroll,behavior:'instant'});}album=[];thumbs.replaceChildren();
  });
  window.addEventListener('hashchange',()=>{if(viewer.open){opener=null;viewer.close();}});
  window.addEventListener('resize',()=>{if(viewer.open){if(compact())rail(false);fit();}});
  image.addEventListener('load',()=>{if(viewer.open){fit();image.style.visibility='visible';}});
  image.addEventListener('error',()=>{image.hidden=true;error.hidden=false;});
  stage.addEventListener('wheel',event=>{
    if(!viewer.open||image.hidden)return;event.preventDefault();const unit=event.deltaMode===1?16:event.deltaMode===2?stage.clientHeight:1;
    zoom(transform.scale*Math.exp(-Math.max(-200,Math.min(200,event.deltaY*unit))*.0025),local({x:event.clientX,y:event.clientY}));
  },{passive:false});
  stage.addEventListener('dblclick',event=>{zoom(transform.scale>1.01?1:2.5,local({x:event.clientX,y:event.clientY}));chrome();});
  stage.addEventListener('pointerdown',event=>{
    if(event.button!==0||image.hidden)return;stage.setPointerCapture(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size===1)gesture={type:'single',start:{x:event.clientX,y:event.clientY},last:{x:event.clientX,y:event.clientY},time:Date.now(),pan:transform.scale>1.01,moved:false};
    else{const [a,b]=[...pointers.values()];gesture={type:'pinch',distance:distance(a,b),mid:mid(a,b)};}
  });
  stage.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId)||!gesture)return;const point={x:event.clientX,y:event.clientY};pointers.set(event.pointerId,point);
    if(pointers.size>=2){
      const [a,b]=[...pointers.values()],center=mid(a,b),d=distance(a,b);
      if(gesture.type==='pinch'&&gesture.distance>0){transform=G.zoom(transform,transform.scale*d/gesture.distance,local(gesture.mid));transform.x+=center.x-gesture.mid.x;transform.y+=center.y-gesture.mid.y;paint();}
      gesture={type:'pinch',distance:d,mid:center};
    }else if(gesture.type==='single'){
      if(distance(point,gesture.start)>8)gesture.moved=true;
      if(gesture.pan){transform.x+=point.x-gesture.last.x;transform.y+=point.y-gesture.last.y;paint();}gesture.last=point;
    }
  });
  function finish(event,cancelled=false){
    if(!pointers.has(event.pointerId))return;const old=gesture;pointers.delete(event.pointerId);
    if(pointers.size){const p=[...pointers.values()][0];gesture={type:'single',start:p,last:p,time:Date.now(),pan:transform.scale>1.01,moved:true};return;}
    gesture=null;if(cancelled||old?.type!=='single')return;
    if(!old.pan&&old.moved){const d=G.swipe(event.clientX-old.start.x,event.clientY-old.start.y,Date.now()-old.time);if(d)show(position+d);}
    else if(!old.moved)chrome(viewer.classList.contains('is-chrome-hidden'));
  }
  stage.addEventListener('pointerup',event=>finish(event));stage.addEventListener('pointercancel',event=>finish(event,true));
})();
