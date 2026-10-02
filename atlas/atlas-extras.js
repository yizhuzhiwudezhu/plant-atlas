(function(global){
 'use strict';
 const api={
  gamePhysics:{pointerRadius:220*2/3,pointerStrength:48,damping:.13,center:.008,alpha:.3,hoverAlpha:.3,restitution:.72,extent:1.8,maxSpeed:12},
  sankeyFrame(width,height,crossSize,steps,vertical,labelWidth){
   const left=vertical?55:22,right=vertical?25:labelWidth,top=vertical?24:30,bottom=vertical?Math.min(height*.25,Math.max(50,labelWidth*.8)):20;
   const W=Math.max(80,width-left-right),H=Math.max(80,height-top-bottom),cross=crossSize-70;
   const along=Math.max(steps*150,cross*(vertical?H/W:W/H)),scale=Math.min(1.35,(vertical?W:H)/cross,(vertical?H:W)/along);
   return {extent:[[30,35],[30+along,crossSize-35]],nodeWidth:Math.min(along/steps*.45,12/scale),fit:{x:vertical?35:30,y:vertical?30:35,w:vertical?cross:along,h:vertical?along:cross,left,right,top,bottom}};
  },
  stretchTree(h,width,height,vertical,minGap){
   const nodes=h.descendants(),breadth=Math.max(...nodes.map(n=>n.x))-Math.min(...nodes.map(n=>n.x));
   if(!h.height||breadth<1)return;
   const ratio=Math.max(.65,Math.min(2.6,(width-80)/(height-80))),depth=h.height*minGap;
   const cross=Math.max(breadth,vertical?depth*ratio:depth/ratio),along=vertical?cross/ratio:cross*ratio;
   for(const n of nodes){n.x*=cross/breadth;n.y=n.depth*along/h.height;}
  },
  plantRadius(id,base){
   let hash=2166136261;for(const c of id){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}
   return Math.max(5,Math.min(42,base*(.5+(hash>>>0)%10000/10000*1.15)));
  },
  jumpTarget(node,pointer,bounds,radius,scale=1){
   let dx=pointer.x-node.x,dy=pointer.y-node.y,length=Math.hypot(dx,dy);
   if(length<1){dx=0;dy=-1;length=1;}
   // Follow the click direction past the packed swarm's rim, then clamp to the field.
   const ux=dx/length,uy=dy/length,projection=node.x*ux+node.y*uy;
   const rim=(bounds.clusterRadius||0)+radius+12/scale;
   const exit=-projection+Math.sqrt(Math.max(0,projection*projection+rim*rim-node.x*node.x-node.y*node.y));
   const distance=Math.min(length,Math.max(70,Math.min(bounds.w,bounds.h)*.32,exit));
   let x=node.x+dx/length*distance,y=node.y+dy/length*distance;
   // Keep the waiting plant inside both the field and the current zoomed viewport.
   const margin=radius+10/scale,minX=Math.max(-bounds.w/2+margin,bounds.minX+margin),maxX=Math.min(bounds.w/2-margin,bounds.maxX-margin),minY=Math.max(-bounds.h/2+margin,bounds.minY+margin),maxY=Math.min(bounds.h/2-margin,bounds.maxY-margin);
   const clamp=(value,min,max)=>min>max?(min+max)/2:Math.max(min,Math.min(max,value));
   return {x:clamp(x,minX,maxX),y:clamp(y,minY,maxY)};
  },
  releasePlants(nodes){
   for(const n of nodes){n.active=false;n.phase='ordinary';n.r=n.baseR;n.fx=null;n.fy=null;}
  },
  jumpPosition(start,end,progress){
   const t=Math.max(0,Math.min(1,progress)),ease=1-(1-t)**3;
   return {x:start.x+(end.x-start.x)*ease,y:start.y+(end.y-start.y)*ease};
  },
  pointerRepulsion(pointer){
   let nodes=[];
   function force(alpha){
    if(!pointer.active)return;
    for(const n of nodes){
     if(n.active)continue;
     let dx=n.x-pointer.x,dy=n.y-pointer.y,d=Math.hypot(dx,dy),range=pointer.radius+n.r;
     if(d>=range)continue;
     if(d<.01){const angle=n.index*2.399963;dx=Math.cos(angle);dy=Math.sin(angle);d=1;}
     const push=(1-d/range)*pointer.strength*alpha;
     n.vx+=dx/d*push;n.vy+=dy/d*push;
    }
   }
   force.initialize=value=>{nodes=value;};return force;
  },
  elasticCollision(restitution=.82){
   let nodes=[];
   function force(){
    // D3's collide separates overlap; this impulse also preserves a lively rebound.
    const size=Math.max(1,...nodes.map(n=>n.r*2+2)),bins=new Map();
    for(let i=0;i<nodes.length;i++){const n=nodes[i],key=Math.floor(n.x/size)+','+Math.floor(n.y/size);if(!bins.has(key))bins.set(key,[]);bins.get(key).push(i);}
    // Only neighboring cells can touch: keep a large database responsive.
    for(let i=0;i<nodes.length;i++){
     const a=nodes[i],cx=Math.floor(a.x/size),cy=Math.floor(a.y/size);
     for(let gx=cx-1;gx<=cx+1;gx++)for(let gy=cy-1;gy<=cy+1;gy++)for(const j of bins.get(gx+','+gy)||[]){
     if(j<=i)continue;const b=nodes[j];let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
     const contact=a.r+b.r+2;if(d>contact)continue;
     if(d<.001){dx=1;dy=0;d=1;}
     const nx=dx/d,ny=dy/d,avx=a.active?(a.impactVx||0):a.vx,avy=a.active?(a.impactVy||0):a.vy,bvx=b.active?(b.impactVx||0):b.vx,bvy=b.active?(b.impactVy||0):b.vy;
     const relative=(bvx-avx)*nx+(bvy-avy)*ny;if(relative>=0)continue;
     const ma=a.active?0:1/(a.r*a.r),mb=b.active?0:1/(b.r*b.r);if(!ma&&!mb)continue;
     const impulse=-(1+restitution)*relative/(ma+mb);
     a.vx-=impulse*ma*nx;a.vy-=impulse*ma*ny;b.vx+=impulse*mb*nx;b.vy+=impulse*mb*ny;
     }
    }
   }
   force.initialize=value=>{nodes=value;};return force;
  },
  softReturn(halfWidth,halfHeight,maxSpeed=24){
   let nodes=[];
   function force(){for(const n of nodes){
    if(n.active)continue;
    // No wall reflection or position clamp: distant balls are gently drawn home.
    if(Math.abs(n.x)>halfWidth)n.vx-=Math.sign(n.x)*(Math.abs(n.x)-halfWidth)*.025;
    if(Math.abs(n.y)>halfHeight)n.vy-=Math.sign(n.y)*(Math.abs(n.y)-halfHeight)*.025;
    const speed=Math.hypot(n.vx,n.vy);if(speed>maxSpeed){n.vx*=maxSpeed/speed;n.vy*=maxSpeed/speed;}
   }}
   force.initialize=value=>{nodes=value;};return force;
  },
  labelLines(label,width,height,font=12,force=false){
   // Width and height are screen pixels, so zooming creates room for names.
   const capacity=width/font,rows=Math.floor(height/(font*1.22));
   if(!force&&(capacity<1||rows<1))return [];
   const columns=Math.max(1,capacity),limit=force?Infinity:Math.max(1,rows),measure=text=>Array.from(text).reduce((sum,c)=>sum+(/\s/.test(c)?.34:/[\x00-\x7f]/.test(c)?.62:c==='·'?.5:1),0);
   // Keep numbers and short Latin words together rather than splitting 300 into 3 / 00.
   const tokens=label.match(/[A-Za-z0-9._-]+|./gu)||[],pieces=tokens.flatMap(token=>measure(token)>columns?Array.from(token):[token]);
   const lines=[];let line='',used=0,index=0;
   for(;index<pieces.length;index++){
    const piece=pieces[index],size=measure(piece);
    if(line&&used+size>columns){lines.push(line);line='';used=0;if(lines.length===limit)break;}
    line+=piece;used+=size;
   }
   if(line)lines.push(line);
   if(index<pieces.length){let last=lines.at(-1)||'';while(last&&measure(last+'…')>columns)last=Array.from(last).slice(0,-1).join('');lines[lines.length-1]=last+'…';}
   return lines;
  },
  centerPlant(nodes,id,radius){
   for(const n of nodes){const active=n.speciesIds[0]===id;n.active=active;n.r=active?radius:n.baseR;n.fx=active?0:null;n.fy=active?0:null;if(active){n.x=0;n.y=0;n.vx=0;n.vy=0;}}
  },
  centerRepulsion(){
   let nodes=[];
   function force(alpha){const center=nodes.find(n=>n.active);if(!center)return;for(const n of nodes){if(n===center)continue;let dx=n.x-center.x,dy=n.y-center.y,d=Math.hypot(dx,dy);if(d<.01){dx=Math.cos(n.index*2.4);dy=Math.sin(n.index*2.4);d=1;}const clearance=center.r+n.r+14;if(d<clearance){const push=(clearance-d)*.35*alpha;n.vx+=dx/d*push;n.vy+=dy/d*push;}}}
   force.initialize=value=>{nodes=value;};return force;
  },
  bubbleLayout(h,d3,diameter,padding){
   // Flatten only the visible terminal nodes; never double-count ancestors.
   const flat=d3.hierarchy({children:h.leaves().map(n=>n.data)},n=>n.children)
    .sum(n=>n.children?.length?0:n.count);
   d3.pack().size([diameter,diameter]).padding(padding)(flat);
   return flat.leaves();
  },
  speciesPool(taxa,matched,scopeIds){
   const scope=new Set(scopeIds);
   return taxa.filter(t=>matched.has(t.id)&&scope.has(t.id));
  },
  nextPlant(pool,seen,random=Math.random){
   const remaining=pool.filter(t=>!seen.has(t.id));
   if(!remaining.length)return null;
   return remaining[Math.min(remaining.length-1,Math.floor(random()*remaining.length))];
  },
  boundsForce(halfWidth,halfHeight){
   let nodes=[];
   function force(){for(const n of nodes){
    const xLimit=Math.max(0,halfWidth-n.r),yLimit=Math.max(0,halfHeight-n.r);
    if(Math.abs(n.x+n.vx)>xLimit){n.x=Math.max(-xLimit,Math.min(xLimit,n.x));n.vx=-Math.sign(n.x+n.vx)*Math.abs(n.vx)*.55;}
    if(Math.abs(n.y+n.vy)>yLimit){n.y=Math.max(-yLimit,Math.min(yLimit,n.y));n.vy=-Math.sign(n.y+n.vy)*Math.abs(n.vy)*.55;}
   }}
   force.initialize=value=>{nodes=value;};
   return force;
  }
 };
 if(typeof module==='object'&&module.exports)module.exports=api;else global.AtlasExtras=api;
})(typeof window==='object'?window:globalThis);
