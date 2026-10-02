'use strict';
// Report content height so the website has one page scroll, including on phones.
const atlasMain=document.querySelector('main');
let atlasHeightFrame=0,lastAtlasHeight=0;
function reportAtlasHeight(){
  cancelAnimationFrame(atlasHeightFrame);
  atlasHeightFrame=requestAnimationFrame(()=>{
    const height=Math.ceil(atlasMain.getBoundingClientRect().height);
    if(height===lastAtlasHeight)return;
    lastAtlasHeight=height;
    if(window.parent!==window)window.parent.postMessage({type:'atlas-height',height},location.origin);
  });
}
new ResizeObserver(reportAtlasHeight).observe(atlasMain);
window.addEventListener('load',reportAtlasHeight);
