'use strict';
(() => {
  const el = id => document.getElementById(id);
  const {t, flowerUnit, scoreAnnouncement} = window.PondLanguage;
  const icon = name => '<svg class="ico" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  const video = el('lessonVideo');
  const chapters = Array.from(document.querySelectorAll('.chapter'));
  const starts = [0, 3.25, 10.95];
  let currentChapter = -1;
  let viewingGame = false;
  let game, mode = 'single', phase = 'menu', playerName = '', lastHeldFlap = 0, freshId = 0;
  const panels = [el('menuScreen'), el('pauseScreen'), el('endScreen')];
  const rankKey = 'pondlab.continuous.ranks.v1';

  function showChapter(index) {
    if (currentChapter === index) return;
    currentChapter = index;
    chapters.forEach((chapter, i) => {
      const selected = i === index;
      chapter.classList.toggle('chosen', selected);
      chapter.querySelector('button').setAttribute('aria-expanded', String(selected));
      chapter.querySelector('p').hidden = !selected;
    });
  }
  function syncVideo() {
    const t = video.currentTime || 0;
    el('elapsed').textContent = '0:' + String(Math.floor(t + 0.001)).padStart(2, '0');
    el('scrub').value = t;
    el('scrub').style.setProperty('--v', Math.min(100, t / 15 * 100) + '%');
    showChapter(t >= starts[2] ? 2 : t >= starts[1] ? 1 : 0);
  }
  function showPlayback() {
    const paused = video.paused || video.ended;
    el('bigPlay').hidden = !paused;
    el('play').innerHTML = icon(paused ? 'play' : 'pause');
    el('play').setAttribute('aria-label', t(paused ? '播放动画' : '暂停动画'));
  }
  function playVideo() {
    if (video.ended) video.currentTime = 0;
    video.play().catch(() => { video.controls = true; showPlayback(); });
  }
  function toggleVideo() { if (video.paused) playVideo(); else video.pause(); }
  for (const id of ['bigPlay', 'play']) el(id).addEventListener('click', toggleVideo);
  video.addEventListener('click', toggleVideo);
  for (const ev of ['timeupdate', 'seeked', 'loadedmetadata']) video.addEventListener(ev, syncVideo);
  for (const ev of ['play', 'pause', 'ended']) video.addEventListener(ev, showPlayback);
  let seekableSource, latestSeek = 0;
  const originalVideo = video.src;
  function waitForMetadata() {
    if (video.readyState >= 1) return Promise.resolve();
    return new Promise((ok, fail) => {
      function cleanup() { video.removeEventListener('loadedmetadata', ready); video.removeEventListener('error', broken); }
      function ready() { cleanup(); ok(); }
      function broken() { cleanup(); fail(new Error('video metadata')); }
      video.addEventListener('loadedmetadata', ready); video.addEventListener('error', broken);
    });
  }
  async function prepareSeek() {
    await waitForMetadata();
    const ranges = video.seekable;
    if (location.protocol === 'file:' || (ranges.length && ranges.end(ranges.length-1) >= video.duration-.05)) return;
    // Basic static servers can deliver the MP4 without byte-range support.
    // The 15-second clip then needs a local seekable copy for chapter jumps.
    if (!seekableSource) seekableSource = (async () => {
      const response = await fetch(originalVideo);
      if (!response.ok) throw new Error('video download');
      const url = URL.createObjectURL(await response.blob());
      const resumeVideo = !video.paused;
      video.src = url;
      video.load();
      await waitForMetadata();
      if (resumeVideo && !viewingGame) playVideo();
    })().catch(() => { seekableSource = null; });
    await seekableSource;
  }
  async function seek(t) {
    const version = ++latestSeek;
    try { await prepareSeek(); } catch { video.controls = true; return; }
    if (version !== latestSeek) return;
    video.currentTime = t; syncVideo();
  }
  chapters.forEach((row, index) => row.querySelector('button').addEventListener('click', () => { showChapter(index); seek(starts[index]); }));
  el('scrub').addEventListener('input', event => seek(Number(event.target.value)));
  el('expand').addEventListener('click', async () => {
    const player = el('player');
    if (player.classList.contains('expanded')) { player.classList.remove('expanded'); return; }
    if (document.fullscreenElement) { await document.exitFullscreen(); return; }
    if (player.requestFullscreen) { try { await player.requestFullscreen(); return; } catch {} }
    player.classList.add('expanded');
  });
  function ranks() {
    try {
      const data = JSON.parse(localStorage.getItem(rankKey) || '[]');
      return Array.isArray(data) ? data.filter(row => row && typeof row.name === 'string' && Number.isSafeInteger(row.score) && row.score >= 0) : [];
    } catch { return []; }
  }
  let sessionRanks = ranks();
  function refreshRanks() {
    const root = el('leaders');
    root.replaceChildren();
    sessionRanks.slice(0,5).forEach(row => {
      const entry=document.createElement('li'), name=document.createElement('span'), score=document.createElement('b');
      name.textContent=row.name;score.textContent=row.score+' '+flowerUnit(row.score);entry.append(name,score);root.append(entry);
    });
    el('rankEmpty').hidden = sessionRanks.length > 0;
  }
  function saveRank(score) {
    const list = sessionRanks.slice();
    const old = list.find(row => row.name === playerName);
    if (old) old.score = Math.max(score,old.score); else list.push({name:playerName,score});
    list.sort((a,b) => b.score-a.score);
    sessionRanks = list.slice(0,60);
    try { localStorage.setItem(rankKey,JSON.stringify(sessionRanks)); } catch {}
    refreshRanks();
  }
  function chooseMode(selected) {
    mode = selected;
    const endless = mode === 'endless';
    el('nickRow').hidden = !endless;
    el('modeNote').textContent = t(endless ? '反复取粉和授粉，比比谁送达的花朵更多。' : '完成一次取粉和授粉即可过关。');
    document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.mode === mode)));
    el('modeLabel').textContent = t(endless ? '连续授粉' : '单次授粉');
  }
  function panel(which) {
    panels.forEach(p => p.hidden = p !== which);
    el('pauseBtn').disabled = phase !== 'running';
  }
  function gameEvent(type,data) {
    if(type === 'status'){
      el('hudScore').textContent = data.score;
      el('hudUnit').textContent = flowerUnit(data.score);
      el('goalChip').textContent = t(data.carrying ? '已携粉 · 寻找受粉花' : '目标 · 寻找散粉花');
      el('announce').textContent = scoreAnnouncement(el('goalChip').textContent, data.score, true);
    } else if(type === 'end'){
      phase = 'end';
      el('endTitle').textContent = t(data.win ? '授粉成功！' : '本次飞行结束');
      el('reason').textContent = t(data.reason);
      el('endScore').textContent = data.score;
      el('endUnit').textContent = flowerUnit(data.score);
      if(data.mode === 'endless') saveRank(data.score);
      panel(el('endScreen'));el('again').focus({preventScroll:true});
      el('announce').textContent = scoreAnnouncement(el('reason').textContent, data.score, false);
    } else if(type === 'pause'){
      phase = 'paused';panel(el('pauseScreen'));el('resume').focus({preventScroll:true});
    }
  }
  function showMenu() {
    if(!game) game=window.createBeeGame(el('pond'),gameEvent);
    else game.preview();
    phase='menu';el('hudScore').textContent='0';el('hudUnit').textContent=flowerUnit(0);el('goalChip').textContent=t('目标 · 寻找散粉花');
    chooseMode(mode);refreshRanks();panel(el('menuScreen'));
  }
  function startGame() {
    if(!game || !viewingGame) return;
    if(mode === 'endless') {
      const typed = el('nickname').value.trim();
      if(typed) playerName=typed;
      else {
        do { freshId++; playerName=t('蜜蜂')+' '+String(freshId).padStart(2,'0'); } while(sessionRanks.some(row => row.name===playerName));
      }
    }
    phase='running';panel(null);game.start(mode);el('pond').focus({preventScroll:true});
  }
  function resume() { if(phase==='paused'){phase='running';panel(null);game.resume();el('pond').focus({preventScroll:true});} }
  function pause() { if(game && phase==='running') game.pause(); }
  document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>chooseMode(button.dataset.mode)));
  el('start').addEventListener('click',startGame);el('again').addEventListener('click',startGame);
  el('pauseBtn').addEventListener('click',pause);el('resume').addEventListener('click',resume);
  document.querySelectorAll('.show-menu').forEach(button=>button.addEventListener('click',()=>{showMenu();el('start').focus({preventScroll:true});}));
  el('pond').addEventListener('pointerdown',event=>{if(phase==='running'){event.preventDefault();game.flap();el('pond').focus({preventScroll:true});}});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      el('player').classList.remove('expanded');
      if(viewingGame){if(phase==='running')pause();else if(phase==='paused')resume();}
      return;
    }
    if(!viewingGame || (event.code!=='Space'&&event.key!==' ') || (event.target instanceof HTMLInputElement))return;
    if(phase==='running'){
      event.preventDefault();
      if(!event.repeat || performance.now()-lastHeldFlap>150){game.flap();lastHeldFlap=performance.now();}
    }else if(!event.repeat && !event.target.closest('button,a,summary')){
      event.preventDefault();
      if(phase==='menu'||phase==='end')startGame();else if(phase==='paused')resume();
    }
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();video.pause();}});
  window.addEventListener('blur',pause);
  function route(){
    const hash=location.hash;
    const next=hash==='#game';
    if(next && !viewingGame){
      video.pause();viewingGame=true;el('learnView').hidden=true;el('gameView').hidden=false;showMenu();
      window.scrollTo({top:0,behavior:'instant'});
    }else if(!next){
      if(viewingGame&&game)game.stop();
      viewingGame=false;el('gameView').hidden=true;el('learnView').hidden=false;
      if(hash==='#sources')el('sources').open=true;
      if(hash==='#mechanism'||hash==='#sources')requestAnimationFrame(()=>document.querySelector(hash).scrollIntoView({block:'start'}));
      else if(hash==='#learn')window.scrollTo({top:0,behavior:'instant'});
    }
    for(const [id,on] of [['navGame',next],['navLearn',!next&&hash!=='#sources'],['navSources',hash==='#sources']]){
      const item=el(id);item.classList.toggle('active',on);if(on)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current');
    }
  }
  window.addEventListener('hashchange',route);
  document.querySelectorAll('a[href="#sources"]').forEach(a=>a.addEventListener('click',()=>{el('sources').open=true;}));
  route();showPlayback();syncVideo();
})();

