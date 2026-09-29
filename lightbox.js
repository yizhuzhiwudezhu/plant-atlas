'use strict';
(() => {
  const viewer=document.querySelector('#lightbox');
  const image=viewer.querySelector('#viewer-image');
  const caption=viewer.querySelector('#viewer-caption');
  const count=viewer.querySelector('#viewer-count');
  const previous=viewer.querySelector('#viewer-prev');
  const next=viewer.querySelector('#viewer-next');
  const stage=viewer.querySelector('.viewer-stage');
  const error=viewer.querySelector('#viewer-error');
  let album=[],position=0,opener=null,savedScroll=0,savedOverflow='',touchStart=null;
  const identity=src=>new URL(src,document.baseURI).href;
  function show(index) {
    if(!album.length)return;
    position=(index+album.length)%album.length;
    const item=album[position];
    error.hidden=true;
    image.hidden=false;
    image.alt=item.caption;
    image.src=item.src;
    caption.textContent=item.caption;
    count.textContent=`${position+1} / ${album.length}`;
    previous.disabled=next.disabled=album.length<2;
  }
  function open(button) {
    const detail=button.closest('.detail');
    if(!detail)return;
    const seen=new Set();
    album=[...detail.querySelectorAll('[data-photo]')].filter(el=>{
      const key=identity(el.dataset.photo);
      if(seen.has(key))return false;
      seen.add(key);return true;
    }).map(el=>({src:el.dataset.photo,caption:el.dataset.caption||''}));
    opener=button;
    savedScroll=window.scrollY;
    savedOverflow=document.body.style.overflow;
    viewer.querySelector('#viewer-title').textContent=`${detail.querySelector('h1')?.textContent||'物种'} · 图片浏览`;
    show(album.findIndex(item=>identity(item.src)===identity(button.dataset.photo)));
    document.body.style.overflow='hidden';
    viewer.showModal();
    viewer.querySelector('.close').focus({preventScroll:true});
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-photo]');
    if(button&&!viewer.open)open(button);
  });
  previous.addEventListener('click',()=>show(position-1));
  next.addEventListener('click',()=>show(position+1));
  viewer.querySelector('.close').addEventListener('click',()=>viewer.close());
  viewer.addEventListener('click',event=>{if(event.target===viewer)viewer.close();});
  viewer.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
      event.preventDefault();show(position+(event.key==='ArrowLeft'?-1:1));
    }
  });
  viewer.addEventListener('close',()=>{
    document.body.style.overflow=savedOverflow;
    touchStart=null;
    if(opener?.isConnected){opener.focus({preventScroll:true});window.scrollTo({top:savedScroll,behavior:'instant'});}
    album=[];
  });
  window.addEventListener('hashchange',()=>{if(viewer.open){opener=null;viewer.close();}});
  image.addEventListener('error',()=>{image.hidden=true;error.hidden=false;});
  stage.addEventListener('touchstart',event=>{
    touchStart=event.touches.length===1?{x:event.touches[0].clientX,y:event.touches[0].clientY,time:Date.now()}:null;
  },{passive:true});
  stage.addEventListener('touchmove',event=>{if(event.touches.length!==1)touchStart=null;},{passive:true});
  stage.addEventListener('touchcancel',()=>{touchStart=null;},{passive:true});
  stage.addEventListener('touchend',event=>{
    if(!touchStart||event.touches.length||!event.changedTouches.length)return;
    const dx=event.changedTouches[0].clientX-touchStart.x,dy=event.changedTouches[0].clientY-touchStart.y;
    if(Date.now()-touchStart.time<900&&Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.4)show(position+(dx<0?1:-1));
    touchStart=null;
  },{passive:true});
})();
