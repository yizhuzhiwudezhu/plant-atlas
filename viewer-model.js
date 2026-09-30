/* Shared geometry for the viewer, also used by offline gesture checks. */
((root)=>{
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  function bounds(t,base,w,h){
    const maxX=Math.max(0,(base.w*t.scale-w)/2),maxY=Math.max(0,(base.h*t.scale-h)/2);
    return {scale:t.scale,x:clamp(t.x,-maxX,maxX),y:clamp(t.y,-maxY,maxY)};
  }
  function zoom(t,target,anchor){
    const scale=clamp(target,.5,6),ratio=scale/t.scale;
    return {scale,x:anchor.x-(anchor.x-t.x)*ratio,y:anchor.y-(anchor.y-t.y)*ratio};
  }
  function fit(nw,nh,w,h){const ratio=Math.min(w/nw,h/nh);return {w:nw*ratio,h:nh*ratio};}
  function swipe(dx,dy,time){return time<900&&Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.4?(dx<0?1:-1):0;}
  const model={bounds,zoom,fit,swipe};
  if(typeof module==='object'&&module.exports)module.exports=model;else root.PlantViewerGeometry=model;
})(typeof window==='object'?window:globalThis);
