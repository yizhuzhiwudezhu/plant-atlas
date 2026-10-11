'use strict';
(function(root){
 const compare=(a,b)=>String(a||'').localeCompare(String(b||''),'zh-Hans-CN-u-co-pinyin',{numeric:true});
 const dateKey=p=>[p.videoPublishedDate||'',p.videoPublishedTime||'',p.id].join(' ');
 const family=p=>p.familyLatin||p.family||'未提供';
 function sort(items,mode='newest',direction,countRank='family'){
  const branch=p=>countRank==='species'?p.id:countRank==='genus'?[family(p),p.genusLatin||p.genus||'未提供'].join('/'):family(p);
  const counts=new Map();items.forEach(p=>counts.set(branch(p),(counts.get(branch(p))||0)+1));
  const path=p=>(p.ranks||[]).filter(r=>r.rank!=='species'&&r.scientific).map(r=>r.chinese||r.scientific).join('/');
  return [...items].sort((a,b)=>{
   let result=0;
   if(mode==='newest'||mode==='oldest')result=compare(dateKey(a),dateKey(b))*(mode==='newest'?-1:1);
   if(mode==='taxonomy')result=compare(path(a),path(b));
   if(mode==='count')result=counts.get(branch(b))-counts.get(branch(a))||compare(branch(a),branch(b));
   result=result||compare(a.name,b.name)||compare(a.id,b.id);
   const defaultDirection=(mode==='newest'||mode==='count')?'desc':'asc';
   return direction && direction!==defaultDirection ? -result : result;
  });
 }
 function companions(p,query){
  const terms=String(query||'').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if(!terms.length)return [];
  return (p.relatedPlants||[]).filter(o=>terms.some(t=>[o.name,o.scientific,...(o.cultivars||[]).flatMap(c=>[c.name,c.scientific])].join(' ').toLowerCase().includes(t))).map(o=>o.name);
 }
 function recommendations(items,p){
  const all=sort(items,'oldest'),at=all.findIndex(x=>x.id===p.id);
  return [...all.slice(0,at).reverse(),...all.slice(at+1)].slice(0,3);
 }
 root.CatalogModel={sort,companions,recommendations};
 if(typeof module!=='undefined')module.exports=root.CatalogModel;
})(typeof window!=='undefined'?window:globalThis);
