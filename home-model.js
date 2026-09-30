(function(root,factory){const model=factory();if(typeof module==='object'&&module.exports)module.exports=model;else root.HomeModel=model;})(typeof window==='object'?window:this,function(){
  const PAGE_SIZE=24;
  const kingdomKey=p=>p.kingdomLatin||p.kingdom||'';
  const orderKey=p=>(p.orderLatin||p.orderName)?kingdomKey(p)+'|'+(p.orderLatin||p.orderName):'';
  const familyKey=p=>(p.familyLatin||p.family)?orderKey(p)+'|'+(p.familyLatin||p.family):'';
  const genusKey=p=>(p.genusLatin||p.genus)?familyKey(p)+'|'+(p.genusLatin||p.genus):'';
  const normalize=value=>String(value||'').toLocaleLowerCase();
  function options(items,rank){const out=new Map();const key=rank==='kingdom'?kingdomKey:rank==='order'?orderKey:rank==='family'?familyKey:genusKey;const cn=rank==='kingdom'?'kingdom':rank==='order'?'orderName':rank==='family'?'family':'genus';const latin=rank==='kingdom'?'kingdomLatin':rank==='order'?'orderLatin':rank==='family'?'familyLatin':'genusLatin';for(const p of items){const k=key(p);if(!k)continue;if(!out.has(k))out.set(k,{key:k,name:p[cn]||p[latin],latin:p[latin]||'',count:0});out.get(k).count++;}return [...out.values()].sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));}
  const byKingdom=(items,state)=>items.filter(p=>!state.kingdom||kingdomKey(p)===state.kingdom);
  const byOrder=(items,state)=>byKingdom(items,state).filter(p=>!state.order||orderKey(p)===state.order);
  const byFamily=(items,state)=>byOrder(items,state).filter(p=>!state.family||familyKey(p)===state.family);
  function filter(items,state){const terms=normalize(state.query).trim().split(/\s+/).filter(Boolean);return byFamily(items,state).filter(p=>(!state.genus||genusKey(p)===state.genus)&&(!state.drawings||(p.drawings||[]).length)&&terms.every(t=>normalize(p.searchText).includes(t)));}
  function searchDepth(rows,query,speciesKeywords=[]){const terms=normalize(query).trim().split(/\s+/).filter(Boolean);let depth=-1;rows.forEach((r,i)=>{if(terms.some(t=>[r[2],r[3]].some(v=>normalize(v).includes(t))))depth=i;});if(terms.some(t=>speciesKeywords.some(v=>normalize(v).includes(t))))depth=rows.length-1;return depth<0?rows.length-1:depth;}
  function page(items,number,requestedSize=PAGE_SIZE){const size=[10,20,24,50].includes(Number(requestedSize))?Number(requestedSize):PAGE_SIZE;const totalPages=Math.max(1,Math.ceil(items.length/size));const current=Math.min(totalPages,Math.max(1,Number(number)||1));return {items:items.slice((current-1)*size,current*size),current,totalPages,total:items.length,start:items.length?(current-1)*size+1:0,end:Math.min(current*size,items.length)};}
  return {PAGE_SIZE,kingdomKey,orderKey,familyKey,genusKey,options,byKingdom,byOrder,byFamily,filter,searchDepth,page};
});
