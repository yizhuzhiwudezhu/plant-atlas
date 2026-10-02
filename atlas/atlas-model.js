(function(global){
 'use strict';
 const api={
  contextTree(root,focus,map,depth,collapsed,folding,sort,hiddenThrough=-1){
   const ancestors=new Set();let p=focus;while(p){ancestors.add(p.id);p=p.parent?map.get(p.parent):null;}
   const compare=sort==='name'?(a,b)=>a.chinese.localeCompare(b.chinese,'zh-CN'):(a,b)=>b.count-a.count||a.scientific.localeCompare(b.scientific);
   function visit(n,inside){
    inside=inside||n.id===focus.id;
    const onPath=ancestors.has(n.id),stub=!inside&&!onPath;
    const stop=(stub&&n.depth>hiddenThrough)||(inside&&(n.depth>=depth||(folding&&n.depth>hiddenThrough&&collapsed.has(n.id))));
    return {...n,contextStub:stub,children:stop?[]:[...n.children].sort(compare).map(child=>visit(child,inside))};
   }
   const tree=visit(root,false);
   function visibleChildren(n){return n.children.flatMap(child=>child.depth<=hiddenThrough?visibleChildren(child):[child]);}
   tree.children=visibleChildren(tree);
   return tree;
  },
  sankeyInput(hierarchy){
   const nodes=[];hierarchy.eachBefore(n=>nodes.push({...n.data,order:nodes.length}));
   return {nodes,links:hierarchy.links().map(l=>({source:l.source.data.id,target:l.target.data.id,value:l.target.data.count}))};
  }
 };
 if(typeof module==='object'&&module.exports)module.exports=api;else global.AtlasModel=api;
})(typeof window==='object'?window:globalThis);
