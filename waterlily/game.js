(function () {
  'use strict';

  const W = 420, H = 218, WATER = 174, FLIGHT_X = 85;
  const beeSprite = [
    '     ii    ii       ',
    '    ihhi  ihhi      ',
    '    ihhhiihhhi   i  ',
    '     ihhihhhi   i   ',
    '      iiiiii  i  i  ',
    '    iiiiiyyyiiiyi   ',
    '  iiyyiiiyyiyyyyyi  ',
    ' iyyykiiyykiyykyyi  ',
    'iiiyykiiiykiyyiwwyi ',
    '  iyykiiiyyiyyiikyi ',
    '   iykiiiyyiiyyyyyi ',
    '    iiiiyyiiiooyyi  ',
    '      iiiiioiiii    ',
    '       i  i  i      ',
  ];
  const wingUp = [
    '      ii    ii      ',
    '     ihhi  ihhi     ',
    '     ihhhiihhhi     ',
    '      ihhihhhi   i  ',
    '       iiiiii   i   ',
  ];
  const wingDown = [
    '                    ',
    '                    ',
    '       iii   ii     ',
    '     iihhhiiihhi i  ',
    '     iihhhhhhhiii   ',
  ];
  const beeColours = { i:'#392e47', k:'#514054', y:'#ffc853', o:'#d18639', h:'#b9e7eb', w:'#fff9cf' };
  const petals = [
    [-1, 2, -25,-11, -20, 4, -10, 8],
    [ 1, 3,  25,-11,  20, 4,  10, 8],
    [-2, 2, -16,-17, -17,-3, -10, 5],
    [ 2, 2,  16,-17,  17,-3,  10, 5],
    [-2, 1,  -7,-19, -11,-8,  -7, 2],
    [ 2, 1,   7,-19,  11,-8,   7, 2],
  ];
  const sin = Math.sin;
  const rounded = Math.round;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, progress) => a + (b-a)*progress;
  function noise(n) { const v = sin(n*91.271+8.531)*43758.241; return v-Math.floor(v); }

  function createBeeGame(canvas, onEvent = () => {}) {
    canvas.width = W;
    canvas.height = H;
    canvas.style.imageRendering = 'pixelated';
    const ctx = canvas.getContext('2d', {alpha:false});
    ctx.imageSmoothingEnabled = false;
    const gradient = ctx.createLinearGradient(0, 0, 0, WATER);
    gradient.addColorStop(0,'#36375f');
    gradient.addColorStop(.42,'#686090');
    gradient.addColorStop(.73,'#ba8d9e');
    gradient.addColorStop(1,'#f1bd9b');
    const waterGradient = ctx.createLinearGradient(0, WATER, 0, H);
    waterGradient.addColorStop(0,'#688292');
    waterGradient.addColorStop(.36,'#4c7585');
    waterGradient.addColorStop(1,'#2d586c');
    let phase, mode, score, carrying, bee, distance, seconds, targets, nextCourse, grip, particles;
    let frameId = 0, prevTime = null, accumulator = 0, readyTime = 0;
    const rect = (colour, x,y,w,h) => {
      ctx.fillStyle = colour; ctx.fillRect(rounded(x),rounded(y),Math.max(1,rounded(w)),Math.max(1,rounded(h)));
    };
    function poly(colour, points) {
      ctx.fillStyle = colour;
      ctx.beginPath(); ctx.moveTo(rounded(points[0]),rounded(points[1]));
      for(let i=2;i<points.length;i+=2) ctx.lineTo(rounded(points[i]),rounded(points[i+1]));
      ctx.closePath(); ctx.fill();
    }
    function stepLine(colour, x1,y1,x2,y2, thickness = 1) {
      const count = Math.max(Math.abs(x2-x1), Math.abs(y2-y1), 1);
      for(let i=0;i<=count;i++) rect(colour,mix(x1,x2,i/count),mix(y1,y2,i/count),thickness,thickness);
    }
    function sprite(x,y,t,scale=1,hasPollen=false) {
      const flapRows = Math.floor(t*13)%2 ? wingUp : wingDown;
      const left = rounded(x-10*scale), top = rounded(y-7*scale);
      for(let r=0;r<beeSprite.length;r++) {
        const row = r<5 ? flapRows[r] : beeSprite[r];
        for(let c=0;c<row.length;c++) {
          const col = beeColours[row[c]];
          if(col) {
            const ax=rounded(c*scale), ay=rounded(r*scale);
            const width=rounded((c+1)*scale)-ax, height=rounded((r+1)*scale)-ay;
            if(width&&height) rect(col,left+ax,top+ay,width,height);
          }
        }
      }
      if(hasPollen) {
        rect('#966247',left+3*scale,top+11*scale,5*scale,3*scale);
        rect('#ffcf55',left+3*scale,top+11*scale,3*scale,2*scale);
        rect('#fff2a0',left+3*scale,top+10*scale,2*scale,2*scale);
        rect('#ffe699',left+8*scale,top+12*scale,2*scale,2*scale);
      }
    }
    function paintSky(d,t) {
      ctx.fillStyle = gradient; ctx.fillRect(0,0,W,WATER);
      for(let i=0;i<45;i++) {
        const x = (noise(i)*W-d*.022%(W)+W)%W, y = noise(i+51)*84+4;
        const twinkle = sin(t*.85+i*4)>.58;
        rect(twinkle?'#e9d2be':'#b1a5ad',x,y,1,1);
        if(i%12===1 && twinkle) {
          rect('#cfc0bd',x-1,y,3,1); rect('#cfc0bd',x,y-1,1,3);
        }
      }
      const moonX=W-71-d*.012%28;
      for(let iy=-10;iy<=10;iy++) for(let ix=-10;ix<=10;ix++) {
        if(ix*ix+iy*iy<102 && (ix-4)*(ix-4)+(iy+3)*(iy+3)>82)
          rect('#f9e6bb',moonX+ix,35+iy,1,1);
      }
      for(let i=0;i<4;i++) {
        const x=((i*131+27-d*.055)%(W+90)+(W+90))%(W+90)-44;
        const y=54+noise(i+1)*30;
        rect('#ad93a6',x,y,38,2);rect('#ad93a6',x+8,y-2,15,3);
        rect('#ad93a6',x+19,y-3,8,4);rect('#ad93a6',x+32,y+1,14,2);
        rect('#c1a1a9',x+11,y+2,38,1);
      }
      for(let x=0;x<W;x+=3) {
        const f=x+d*.12;
        const ridge=141+6*sin(f*.019)+4*sin(f*.042);
        rect('#92819a',x,ridge,3,WATER-ridge);
        const near=153+5*sin((x+d*.19)*.025+1)+2*sin((x+d*.19)*.11);
        rect('#756e88',x,near,3,WATER-near);
      }
      for(let j=-1;j<10;j++) {
        const k = Math.floor(d*.15/61)+j;
        const x=k*61-d*.15+noise(k+20)*18;
        const h=3+noise(k+71)*8;
        stepLine('#696d81',x,171,x-2,171-h);
        stepLine('#696d81',x+2,171,x+5,170-h);
        rect('#696d81',x-3,168-h,2,4);
      }
      rect('#b4a3a2',0,WATER-2,W,2);
      ctx.fillStyle=waterGradient;ctx.fillRect(0,WATER,W,H-WATER);
      for(let i=0;i<64;i++) {
        const depth=noise(i+90);
        const x=((noise(i+140)*(W+20)-d*(.12+depth*.16))%(W+20)+W+20)%(W+20)-10;
        const y=WATER+1+depth*(H-WATER-2);
        const colour=i%5===0?'#93aba9': i%3===0?'#74969c':'#528090';
        rect(colour,x+sin(t*.65+i)*1.8,y,3+noise(i+58)*13,1);
      }
      for(let i=-1;i<6;i++) {
        const k=Math.floor(d*.46/94)+i;
        const x=k*94+noise(k+16)*21-d*.46;
        const y=WATER+8+noise(k+15)*29;
        const w=11+noise(k+11)*13;
        poly('#416c70',[x-w,y, x-w+5,y-2, x+w-2,y-2,x+w,y,x+w-3,y+2,x+3,y+2,x-1,y,x-3,y+2,x-w+4,y+2]);
        rect('#729487',x-w+5,y-2,w,1);
      }
      for(let i=-1;i<4;i++) {
        const k=Math.floor(d*.48/151)+i;
        const x=k*151+noise(k+112)*55-d*.48;
        const y=H-6+noise(k+43)*5;
        for(let leaf=0;leaf<6;leaf++) {
          const side=leaf%2?1:-1, base=x+side*noise(k+leaf+13)*10;
          const tip=base+side*(4+noise(k+leaf)*8), h=5+noise(k+leaf+71)*11;
          poly(leaf%3===0?'#315e64':'#3e7070',[base,y,tip,y-h,tip-side*3,y-4,base+3,y]);
          stepLine('#648984',base,y-1,tip,y-h);
        }
        rect('#70928d',x-13,y+1,26,1);
      }
    }
    function flowerTop(x,y,t) {
      return y+rounded(sin(t*1.9+x*.017)*.6);
    }
    function flower(x,y,type,done,t) {
      const occupied = type==='occupied', donor=type==='donor';
      y=flowerTop(x,y,t);
      const foot=WATER+5;
      stepLine('#365f66',x+1,y+5,x-2,foot,3);
      stepLine('#719a88',x+1,y+5,x-2,foot,1);
      rect('#a4b0a2',x-11,foot+1,19,1);rect('#7a9394',x-6,foot+3,15,1);
      for(let i=0;i<petals.length;i++) {
        const points=petals[i], absolute=points.map((p,j)=>p+(j%2?y:x));
        poly(i<2?'#c78fa8':'#dbafbb',absolute);
        const a=absolute.slice();
        a[2]+=i%2?-1:1; a[3]+=1; a[4]+=i%2?-2:2; a[5]-=2;
        poly(i<2?'#e3bbcc':'#f8e3d6',a);
        stepLine('#f6dcd4',absolute[2],absolute[3]+1,absolute[0],absolute[1]);
      }
      poly('#c98fa8',[x-23,y+1,x-15,y+2,x-9,y+7,x,y+9,x+10,y+7,x+16,y+1,x+23,y,x+17,y+7,x+7,y+12,x-6,y+12,x-18,y+8]);
      poly('#f2cbd0',[x-22,y,x-13,y+2,x-4,y+7,x+3,y+7,x+16,y+1,x+22,y,x+13,y+6,x+5,y+10,x-5,y+10,x-14,y+6]);
      if(donor) {
        rect('#a57454',x-9,y-1,19,3);
        for(let i=-2;i<=2;i++) {
          const ax=x+i*3, h=4+(2-Math.abs(i))*1.5;
          rect('#b48f54',ax,y-h,1,h+1);
          rect(done?'#cdad77':'#e9a847',ax-1,y-h-3,3,4);
          if(!done) rect('#fff1a3',ax-1,y-h-3,2,2);
        }
      } else {
        rect('#648f85',x-10,y-1,21,3);rect(done?'#9fa785':'#7cd3be',x-8,y-3,17,3);
        rect(done?'#c3bc91':'#d1f4d9',x-4,y-3,8,1);
      }
      if(occupied) sprite(x+1,y-8,t+.5,.85,true);
      if(!done&&!occupied) {
        const markerY=y-26+rounded(sin(t*3)*1.1);
        if(donor) {
          for(const [dx,dy] of [[0,-2],[-3,1],[3,1]]) {
            rect('#ad805f',x+dx-1,markerY+dy-1,3,3);rect('#ffdf7d',x+dx,markerY+dy-1,2,2);
          }
        } else {
          poly('#4e8e91',[x,markerY-5,x+4,markerY+1,x+3,markerY+4,x-3,markerY+4,x-4,markerY+1]);
          poly('#adf0d8',[x,markerY-4,x+3,markerY+1,x+2,markerY+3,x-2,markerY+3,x-3,markerY+1]);
          rect('#e3f9dd',x-1,markerY,1,2);
        }
      }
    }
    function stalk(x,y) {
      const foot=WATER+9;
      rect('#344f59',x-3,y+3,6,foot-y-3);
      rect('#739382',x-2,y+3,2,foot-y-3);
      rect('#506d64',x,y+4,2,foot-y-4);
      poly('#435e5b',[x-7,y+1,x-5,y-6,x-2,y-8,x+2,y-7,x+5,y-3,x+5,y+2,x+2,y+6,x-2,y+5]);
      poly('#8d9a74',[x-6,y,x-4,y-5,x-1,y-6,x+3,y-4,x+3,y,x,y+2]);
      rect('#bfad83',x-4,y-4,2,1);rect('#4f6761',x+1,y-3,1,2);
      for(let i=0;i<5;i++) rect('#ada381',x+(i%2?2:-3),y+8+i*6,2,1);
      rect('#96a8a1',x-8,foot+1,17,1);
    }
    function birdPosition(target) {
      const glide=seconds*2.1+target.x*.021;
      return {x:target.x-distance+sin(glide*.75)*5,y:target.y+sin(glide)*7};
    }
    function bird(target) {
      const pos=birdPosition(target), x=rounded(pos.x), y=rounded(pos.y);
      const wingLift=rounded(4+5*sin(seconds*5.3+target.x));
      poly('#47425f',[x-9,y-1,x-5,y-4,x+1,y-3,x+8,y,x+14,y-2,x+10,y+3,x+13,y+5,x+3,y+4,x-3,y+5,x-7,y+3]);
      poly('#4f4a68',[x-1,y,x+3,y-4,x+9,y-6-wingLift,x+14,y-5-wingLift,x+11,y-2-wingLift,x+7,y+1]);
      stepLine('#ae96aa',x+5,y-3,x+12,y-5-wingLift);
      poly('#685f7c',[x-1,y+1,x+5,y+2,x+8,y+6+wingLift/2,x+5,y+6,x+2,y+4]);
      rect('#ac8f94',x-7,y+2,5,2);rect('#e4b293',x-10,y,3,1);
      rect('#f2ceab',x-6,y-2,2,1);
    }
    function render() {
      const backdrop = phase==='preview'?seconds*7:distance;
      paintSky(backdrop,seconds);
      for(const target of targets) {
        const x=target.x-distance;
        if(x < -30 || x>W+30) continue;
        if(target.type==='bird') bird(target);
        else if(target.type==='stalk') stalk(x,target.y);
        else flower(x,target.y,target.type,target.done,seconds);
      }
      for (const p of particles) {
        const alpha=Math.min(1,p.life*4);
        ctx.globalAlpha=alpha;
        rect(p.colour,p.x-distance,p.y,p.size,p.size);
      }
      ctx.globalAlpha=1;
      const y=phase==='preview'?bee.y+sin(seconds*2.25)*3:bee.y;
      sprite(bee.x,y,seconds,1.45,carrying);
    }
    function status() { onEvent('status',{score,carrying,mode}); }
    function layout() {
      const cycle=nextCourse++;
      const base=cycle*478;
      const row=[
        ['donor',190,135],
        ['occupied',309,150],
        ['bird',360,58],
        ['stalk',413,128],
        ['receiver',539,140],
      ];
      for(const [type,x,y] of row) {
        const change=cycle===0?0:Math.round((noise(cycle*17+x)-.5)*14);
        targets.push({type,x:base+x,y:y+change,done:false});
      }
    }
    function reset(nextMode) {
      mode=nextMode==='endless'?'endless':'single';
      score=0;carrying=false;distance=0;seconds=0;readyTime=0;
      bee={x:FLIGHT_X,y:92,vy:0};targets=[];grip=null;particles=[];nextCourse=0;
      layout();layout();
    }
    function burst(target,colour) {
      for(let i=0;i<10;i++) {
        const a=i*2.399;
        particles.push({x:target.x+Math.cos(a)*3,y:target.y-6,
          dx:Math.cos(a)*15,dy:-12-noise(i+score)*18,life:.42+noise(i)*.28,
          colour:i%3===0?'#fff2be':colour,size:i%3===0?2:1});
      }
    }
    function finish(win, reason) {
      phase='ended';render();
      onEvent('end',{score,win,reason,mode});
    }
    function visit(target) {
      if(target.type==='occupied') return finish(false,'这朵花上已经有蜜蜂了。');
      if(target.type==='receiver'&&!carrying) return finish(false,'还没有花粉，先到金色花药上采粉。');
      if(target.type==='donor'&&carrying) return finish(false,'已经带着花粉了，要送到青绿色的柱头上。');
      target.done=true;carrying=target.type==='donor';
      burst(target,carrying?'#efbb58':'#9be3cc');
      grip={target,elapsed:0,startX:bee.x,startY:bee.y};
      bee.vy=0;
      if(!carrying) score++;
      status();
    }
    function tick(dt) {
      seconds+=dt;
      if(phase==='preview') return;
      readyTime+=dt;
      const speed=48+Math.min(score,7)*1.2;
      distance+=speed*dt;
      for(const p of particles) {p.x+=p.dx*dt;p.y+=p.dy*dt;p.dy+=26*dt;p.life-=dt;}
      particles=particles.filter(p=>p.life>0);
      if(targets[targets.length-1].x-distance < W+140) layout();
      if(targets[0].x-distance < -60) targets.shift();
      if(grip) {
        grip.elapsed+=dt;
        const blend=clamp(grip.elapsed/.18,0,1);
        bee.x=mix(grip.startX,grip.target.x-distance,blend);
        bee.y=mix(grip.startY,grip.target.y-7,blend);
        if(grip.elapsed>=.42) {
          if(mode==='single'&&score===1) return finish(true,'花粉落上了另一朵花的柱头！');
          grip=null;bee.vy=-65;
        }
        return;
      }
      bee.x=mix(bee.x,FLIGHT_X,Math.min(1,dt*5));
      // Give first-time players a short glide before gravity takes full effect.
      bee.vy=Math.min(72,bee.vy+dt*(readyTime<.65?19:100));
      bee.y+=bee.vy*dt;
      if(bee.y<10) {bee.y=10;bee.vy=Math.max(0,bee.vy);}
      if(bee.y+6>=WATER) return finish(false,'小蜜蜂碰到水面了。');
      for(const target of targets) {
        const dx=target.x-distance-bee.x;
        if(dx>36) break;
        if(dx< -28) continue;
        if(target.type==='bird') {
          const pos=birdPosition(target);
          if(Math.abs(pos.x-bee.x)<16 && Math.abs(pos.y-bee.y)<9)
            return finish(false,'碰到在高处飞过的小鸟了。');
          continue;
        }
        if(target.type==='stalk') {
          if(Math.abs(dx)<10 && bee.y+4>=target.y-7)
            return finish(false,'撞到伸出水面的莲茎了。');
          continue;
        }
        const x=target.x-distance;
        const top=flowerTop(x,target.y,seconds);
        // The stalk becomes visible below the lowest petal and leans left at the waterline.
        if(bee.y+4>=top+12) {
          const fraction=clamp((bee.y-top-5)/(WATER-top),0,1);
          const stemX=mix(x+2,x-1,fraction);
          if(Math.abs(bee.x-stemX)<9) return finish(false,'撞到睡莲花下方的花茎了。');
        }
        if(target.done) continue;
        const correct=target.type===(carrying?'receiver':'donor');
        const above=top-bee.y;
        if(correct && Math.abs(dx)<21 && above>=-5 && above<=21)
          return visit(target);
        if(!correct && Math.abs(dx)<16 && above<=9 && above>=-7)
          return visit(target);
      }
    }
    function run(timestamp) {
      frameId=0;
      if(phase!=='running'&&phase!=='preview') return;
      if(prevTime!==null) accumulator+=clamp((timestamp-prevTime)/1000,0,.075);
      prevTime=timestamp;
      while(accumulator>=1/60&&(phase==='running'||phase==='preview')) {
        accumulator-=1/60;tick(1/60);
      }
      if(phase==='running'||phase==='preview') {render();frameId=requestAnimationFrame(run);}
    }
    function schedule() {
      if(frameId) cancelAnimationFrame(frameId);
      prevTime=null;accumulator=0;render();frameId=requestAnimationFrame(run);
    }
    function start(nextMode='single') { reset(nextMode);phase='running';schedule();status(); }
    function flap() {
      if(phase!=='running'||grip) return;
      bee.vy=-56;
    }
    function pause() {
      if(phase!=='running') return;
      phase='paused';if(frameId) cancelAnimationFrame(frameId);frameId=0;
      onEvent('pause',{});
    }
    function resume() {
      if(phase!=='paused') return;
      phase='running';schedule();
    }
    function stop() {
      phase='stopped';if(frameId) cancelAnimationFrame(frameId);
      frameId=0;prevTime=null;accumulator=0;
    }
    function preview() { reset('single');phase='preview';schedule(); }
    function getState() {
      return {phase,mode,score,carrying,distance,docked:!!grip,bee:{...bee},
        targets:targets.filter(p=>p.x-distance>=-28&&p.x-distance<W+30)
          .map(p=>({type:p.type,...(p.type==='bird'?birdPosition(p):{x:p.x-distance,y:p.y}),done:p.done}))};
    }
    preview();
    return {start,flap,pause,resume,stop,preview,getState};
  }
  window.createBeeGame=createBeeGame;
})();
