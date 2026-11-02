/* Portfolio rebuild — original implementation of a multi-cursor construction scene.
 * The renderer snapshots this site's own DOM. No third-party animation engine is used.
 */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const launcher = document.createElement('button');
  launcher.className = 'swarm-launch';
  launcher.type = 'button';
  launcher.textContent = '✦ Replay rebuild';
  launcher.hidden = true;
  document.body.append(launcher);
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, {granularity:'grapheme'}) : null;
  const letters = text => segmenter ? [...segmenter.segment(text)].map(s => s.segment) : Array.from(text);
  const clamp = n => Math.min(1, Math.max(0, n));
  const smooth = n => n*n*(3-2*n);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const palette = ['#ffc400','#5c92ff','#47ddb0','#ff879b','#c3a1ff','#79dcf3'];
  let session = null;

  // Freeze appearance into independent, inert paint nodes, including local pseudo-elements.
  function copyStyle(source, target, pseudo) {
    const css = getComputedStyle(source, pseudo);
    for (const key of css) target.style.setProperty(key, css.getPropertyValue(key));
    target.style.animation = 'none';
    target.style.transition = 'none';
    target.style.pointerEvents = 'none';
    return css;
  }
  function decoration(source, pseudo) {
    const css = getComputedStyle(source, pseudo);
    if (css.content === 'none' || css.content === 'normal') return null;
    const node = document.createElement('span');
    copyStyle(source, node, pseudo);
    if (/^["']/.test(css.content)) node.textContent = css.content.slice(1,-1);
    return node;
  }
  function paintCopy(source, deep = true) {
    if (source.nodeType === Node.TEXT_NODE) return document.createTextNode(source.data);
    if (source.nodeType !== Node.ELEMENT_NODE || source.matches('script,style,link,iframe,canvas,video')) return document.createTextNode('');
    if (source.tagName.toLowerCase() === 'svg') {
      const svg = source.cloneNode(true);
      svg.setAttribute('xmlns','http://www.w3.org/2000/svg');
      const originalNodes=[source,...source.querySelectorAll('*')],copyNodes=[svg,...svg.querySelectorAll('*')];
      copyNodes.forEach((n,i)=>{copyStyle(originalNodes[i],n);for(const a of [...n.attributes])if(/^on/i.test(a.name))n.removeAttribute(a.name);});
      const image=document.createElement('img');
      image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg));
      copyStyle(source,image);return image;
    }
    const node = source.cloneNode(false);
    node.removeAttribute('class');
    for (const attr of [...node.attributes]) {
      if (/^on/i.test(attr.name) || ['id','href','tabindex','autofocus','contenteditable','for'].includes(attr.name)) node.removeAttribute(attr.name);
    }
    copyStyle(source, node);
    if (source instanceof HTMLImageElement) { node.src = source.currentSrc || source.src; node.loading = 'eager'; }
    const before = decoration(source, '::before');
    if (before) node.append(before);
    if (deep) for (const child of source.childNodes) node.append(paintCopy(child));
    const after = decoration(source, '::after');
    if (after) node.append(after);
    return node;
  }
  function normalisePaint(node) {
    Object.assign(node.style, {position:'relative',inset:'auto',margin:'0',width:'100%',height:'100%',boxSizing:'border-box',transform:'none',opacity:'1'});
  }
  const transparent = value => value === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(value);
  const hasInk = css => !transparent(css.backgroundColor) || css.backgroundImage !== 'none' || css.boxShadow !== 'none' || ['Top','Right','Bottom','Left'].some(side => parseFloat(css['border'+side+'Width']) > 0 && !transparent(css['border'+side+'Color']));
  const atomic = 'p,h1,h2,h3,h4,h5,h6,a,button,span,mark,small,strong,em,b,sup,.tag,.role,.clip,.tool,.battery,.sticker,.focus,.play';
  const repeated = '.card,.stat,.svc,.trk,.tool,.meter';

  function makeBlueprint(owner) {
    const tasks = [], originals = new Map(), guides = new Map();
    const full = {left:0,top:0,right:innerWidth,bottom:document.documentElement.scrollHeight};
    function add(element, type, bounds, css, parent, fixed, clip, z, source) {
      const item = document.createElement('div');
      item.className = 'piece';
      item.hidden = true;
      Object.assign(item.style, {left:bounds.left+'px',top:bounds.top+'px',width:bounds.width+'px',height:bounds.height+'px',zIndex:z});
      const crop = [Math.max(0,clip.top-bounds.top),Math.max(0,bounds.right-clip.right),Math.max(0,bounds.bottom-clip.bottom),Math.max(0,clip.left-bounds.left)];
      item.style.clipPath = `inset(${crop.map(v=>v+'px').join(' ')})`;
      const shell = document.createElement('div'); shell.className = 'scaffold';
      shell.style.borderRadius = css.borderRadius;
      const ink = paintCopy(element, type !== 'box' && type !== 'duplicate' && type !== 'line');
      normalisePaint(ink);
      ink.classList.add('paint');
      item.append(shell, ink);
      (fixed ? owner.fixed : owner.world).append(item);
      const text = [];
      if (type === 'text') {
        const walker = document.createTreeWalker(ink, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode, chars = letters(node.data);
          text.push({node, chars}); node.data = '';
        }
      }
      const total = text.reduce((sum,t)=>sum+t.chars.length,0);
      item.dataset.kind=type;item.dataset.characters=String(total);
      const task = {id:tasks.length,type,element,bounds,parent,fixed,item,shell,ink,text,total,source,state:'waiting',shown:-1};
      tasks.push(task);
      return task;
    }
    function walk(element, parent, inheritedFixed, inheritedClip, z) {
      if (element.matches('script,style,link,meta,.modal,.swarm-launch,[data-build-ignore]')) return;
      const css = getComputedStyle(element);
      if (css.display === 'none' || css.visibility === 'hidden' || Number(css.opacity) === 0) return;
      const rect = element.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1 || rect.left >= innerWidth || rect.right <= 0) return;
      const fixed = inheritedFixed || css.position === 'fixed';
      const offset = fixed ? 0 : scrollY;
      const bounds = {left:rect.left,top:rect.top+offset,width:rect.width,height:rect.height,right:rect.right,bottom:rect.bottom+offset};
      const clip = fixed ? {left:0,top:0,right:innerWidth,bottom:innerHeight} : inheritedClip;
      if (bounds.bottom <= clip.top || bounds.top >= clip.bottom || bounds.right <= clip.left || bounds.left >= clip.right) return;
      const depth = z + (Number.parseInt(css.zIndex,10) || 0);
      let type = element.matches('img,svg') ? 'image' : (element.matches(atomic) || [...element.childNodes].some(n=>n.nodeType===3&&n.data.trim())) && element.textContent.trim() ? 'text' : hasInk(css) ? 'box' : null;
      if (element.matches('.battery,.focus,.play,.sticker,.portrait .frame')) type = 'image';
      if (type === 'box' && (bounds.height < 5 || bounds.width < 5 || element.matches('hr,.corner'))) type = 'line';
      let source = null;
      if (type === 'box' && element.matches(repeated)) {
        const family = [...element.classList].find(c=>['card','stat','svc','trk','tool','meter'].includes(c));
        source = originals.get(family);
        if (source) type = 'duplicate';
      }
      let current = parent;
      if (type) {
        if (type === 'text' && element.matches('h1,h2') && !fixed) {
          const section = element.closest('section,header');
          if (!guides.has(section)) {
            const guide = {id:tasks.length,type:'guide',bounds,parent,fixed:false,state:'waiting'};
            tasks.push(guide); guides.set(section,guide); current=guide;
          }
        }
        current = add(element,type,bounds,css,current,fixed,clip,depth,source);
        if (type === 'box' && element.matches(repeated)) {
          const family=[...element.classList].find(c=>['card','stat','svc','trk','tool','meter'].includes(c));
          if (!originals.has(family)) originals.set(family,current);
        }
        if (type === 'image' || type === 'text' || element.matches('.battery,.focus,.play,.sticker,.portrait .frame')) return;
      }
      const nextClip = {...clip};
      if (['hidden','clip','auto','scroll'].includes(css.overflowX)) { nextClip.left=Math.max(clip.left,bounds.left);nextClip.right=Math.min(clip.right,bounds.right); }
      if (['hidden','clip','auto','scroll'].includes(css.overflowY)) { nextClip.top=Math.max(clip.top,bounds.top);nextClip.bottom=Math.min(clip.bottom,bounds.bottom); }
      for (const child of element.children) walk(child,current,fixed,nextClip,depth);
    }
    for (const element of document.body.children) walk(element,null,false,full,0);
    return tasks;
  }

  class RebuildScene {
    constructor() {
      this.closed=false; this.ready=false; this.tasks=[]; this.finished=0; this.speed=1; this.tour=false;this.muted=false;
      this.elapsed=0;this.last=0;this.raf=0;this.pointer={x:innerWidth/2,y:innerHeight/2,at:0};
      this.startY=scrollY;this.width=innerWidth;this.wasInert=document.body.inert;this.focusBefore=document.activeElement;
      this.host=document.createElement('portfolio-rebuild');
      this.host.style.cssText='position:fixed;inset:0;z-index:2147483600;background:#0b0b0d;display:block;isolation:isolate;';
      this.host.setAttribute('aria-label','Portfolio construction animation');
      this.root=this.host.attachShadow({mode:'open'});
      this.root.innerHTML=`<style>
        :host{font:12px system-ui,sans-serif;color:#f2f0ea}*{box-sizing:border-box}button{font:inherit;cursor:pointer}button:focus-visible{outline:2px solid #ffc400;outline-offset:3px}[hidden]{display:none!important}
        .stage,.fixed,canvas{position:absolute;inset:0;overflow:hidden;pointer-events:none}.stage{z-index:0}.fixed{z-index:1}canvas{z-index:2}.logo,.caption{z-index:3}.toolbar{z-index:4}.world{position:absolute;left:0;top:0;width:100%}.piece{position:absolute;pointer-events:none}.paint{visibility:hidden}.scaffold{position:absolute;inset:0;background:#272a34;border:1px solid #555c6b;transform-origin:top left}.piece.ready .paint{visibility:visible}.piece.ready .scaffold{display:none}
        canvas{width:100%;height:100%}.logo{position:absolute;left:50%;top:45%;transform:translate(-50%,-50%);width:54px;height:54px;display:grid;place-items:center;border-radius:14px;color:#0b0b0d;background:#ffc400;font:bold 34px system-ui}.caption{position:absolute;top:calc(45% + 45px);width:100%;text-align:center;letter-spacing:.18em;font:10px monospace;color:#a7a7b0}
        .toolbar{position:absolute;bottom:max(16px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);max-width:calc(100vw - 24px);display:flex;align-items:center;gap:8px;padding:10px;border:1px solid #393941;border-radius:12px;background:#17171cf5;box-shadow:0 8px 25px #0008}
        .readout{min-width:140px;font:11px monospace;line-height:1.6;color:#aaaab5}.readout strong{display:block;color:#ffc400;font-size:10px;letter-spacing:.12em}.toolbar button{border:1px solid #42424c;border-radius:6px;background:#24242c;color:#eee;padding:10px;white-space:nowrap}.toolbar button[aria-pressed=true]{border-color:#ffc400;color:#ffc400}.toolbar .live{background:#ffc400;color:#111;border-color:#ffc400}.track{height:2px;background:#38383f;margin-top:4px}.fill{width:0;height:100%;background:#ffc400}
        @media(max-width:640px){.toolbar{width:max-content;flex-wrap:wrap;justify-content:center;gap:6px;padding:8px}.readout{width:100%;text-align:center}.readout strong{display:inline;margin-right:10px}.toolbar button{padding:10px 9px}.track{margin-top:6px}}
      </style><div class="stage"><div class="world"></div></div><div class="fixed"></div><canvas aria-hidden="true"></canvas><div class="logo" aria-hidden="true">F</div><div class="caption">PREPARING YOUR CANVAS</div><div class="toolbar" role="group" aria-label="Rebuild controls"><div class="readout"><strong>BUILDING THE PORTFOLIO</strong><span class="status">Preparing…</span><div class="track"><div class="fill"></div></div></div><button data-command="tour" aria-pressed="false">Tour</button><button data-command="speed">1×</button><button data-command="sound" aria-pressed="true">Sound on</button><button data-command="replay" hidden>Replay</button><button class="live" data-command="live">Go live</button></div>`;
      this.world=this.root.querySelector('.world');this.fixed=this.root.querySelector('.fixed');this.canvas=this.root.querySelector('canvas');this.ctx=this.canvas.getContext('2d');
      this.world.parentElement.inert=true;this.fixed.inert=true;this.world.parentElement.setAttribute('aria-hidden','true');this.fixed.setAttribute('aria-hidden','true');this.canvas.setAttribute('aria-hidden','true');
      if(!this.ctx) throw new Error('Canvas unavailable');
      const dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=innerWidth*dpr;this.canvas.height=innerHeight*dpr;this.ctx.scale(dpr,dpr);
      this.workers=Array.from({length:innerWidth<600?7:12},(_,i)=>({color:palette[i%palette.length],x:innerWidth/2,y:innerHeight*.45,job:null}));
      this.abort=new AbortController();const opts={signal:this.abort.signal};
      this.root.addEventListener('click',event=>{
        const command=event.target.closest('button')?.dataset.command;if(!command)return;
        if(command==='live') {this.close();return;}
        if(command==='replay'){const y=this.startY;this.close();scrollTo({top:y,behavior:'instant'});start();return;}
        if(command==='speed'){this.speed=this.speed%3+1;event.target.textContent=this.speed+'×';}
        if(command==='tour'){this.tour=!this.tour;event.target.setAttribute('aria-pressed',String(this.tour));event.target.textContent=this.tour?'Touring':'Tour';}
        if(command==='sound'){this.muted=!this.muted;event.target.setAttribute('aria-pressed',String(!this.muted));event.target.textContent=this.muted?'Sound off':'Sound on';}
        this.unlockAudio();this.wake();
      },opts);
      addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();this.close();}else this.unlockAudio();},opts);
      addEventListener('pointermove',event=>{this.pointer={x:event.clientX,y:event.clientY,at:performance.now()};this.wake();},{...opts,passive:true});
      addEventListener('scroll',()=>this.wake(),{...opts,passive:true});
      addEventListener('resize',()=>this.close(),opts);
      document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(this.raf);this.raf=0;}else {this.last=0;this.wake();}},opts);
      document.documentElement.append(this.host);document.body.inert=true;launcher.hidden=true;
      this.wake();
    }
    unlockAudio(){
      if(this.muted)return;
      try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;this.audio??=new Audio();if(this.audio.state==='suspended')this.audio.resume().catch(()=>{});}catch{}
    }
    sound(text=false){
      const a=this.audio;if(this.muted||!a||a.state!=='running'||a.currentTime-(this.lastSound||0)<.07)return;
      this.lastSound=a.currentTime;
      const tone=a.createOscillator(),volume=a.createGain();tone.type=text?'square':'sine';tone.frequency.setValueAtTime(text?170:420,a.currentTime);tone.frequency.exponentialRampToValueAtTime(text?90:260,a.currentTime+.035);
      volume.gain.setValueAtTime(.012,a.currentTime);volume.gain.exponentialRampToValueAtTime(.0001,a.currentTime+.045);tone.connect(volume).connect(a.destination);tone.start();tone.stop(a.currentTime+.05);
    }
    async prepare(){
      // The page remains covered while reveal-on-scroll content and counters settle.
      this.preparingStyle=document.createElement('style');
      this.preparingStyle.textContent='.reveal{opacity:1!important;transform:none!important;transition:none!important}.hero h1 .line span{transform:none!important;animation:none!important}.portrait .frame{animation:none!important;clip-path:none!important}.marquee .track,.portrait .sticker{animation-play-state:paused!important}';
      document.head.append(this.preparingStyle);
      for(const image of document.querySelectorAll('img[loading="lazy"]'))image.loading='eager';
      const max=document.documentElement.scrollHeight-innerHeight;
      for(let y=0;y<=max && !this.closed;y+=Math.max(400,innerHeight*.85)){
        scrollTo({top:y,behavior:'instant'});await wait(32);
      }
      if(this.closed)return;
      scrollTo({top:this.startY,behavior:'instant'});
      await Promise.race([Promise.allSettled([...document.images].map(i=>i.decode())),wait(1800)]);
      await wait(1250);
      if(this.closed)return;
      this.tasks=makeBlueprint(this);
      if(!this.tasks.length)throw new Error('Empty blueprint');
      this.preparingStyle.remove();this.preparingStyle=null;
      this.ready=true;this.elapsed=0;this.world.style.height=document.documentElement.scrollHeight+'px';
      this.root.querySelector('.caption').textContent='A LITTLE TEAM. A BIG BUILD.';
      this.host.dataset.tasks=String(this.tasks.length);this.host.dataset.types=[...new Set(this.tasks.map(t=>t.type))].join(',');
      this.last=0;this.wake();
    }
    wake(){if(!this.closed&&!this.raf&&!document.hidden)this.raf=requestAnimationFrame(t=>this.tick(t));}
    screen(task){const r=task.bounds;return {...r,top:r.top-(task.fixed?0:scrollY),bottom:r.bottom-(task.fixed?0:scrollY)};}
    pick(){
      const ceiling=scrollY+innerHeight>=document.documentElement.scrollHeight-2?Infinity:scrollY+innerHeight-100;
      return this.tasks.filter(t=>t.state==='waiting'&&(t.fixed||t.bounds.top<ceiling)&&(!t.parent||t.parent.state==='done')&&(!t.source||t.source.state==='done')).sort((a,b)=>Math.abs((a.fixed?scrollY:a.bounds.top)-scrollY)-Math.abs((b.fixed?scrollY:b.bounds.top)-scrollY))[0];
    }
    begin(worker,task){
      task.state='active';task.time=0;task.duration=task.type==='text'?Math.min(3.4,.85+task.total*.013):task.type==='guide'?.75:task.type==='duplicate'?1.2:1.05;
      worker.job=task;worker.from={x:worker.x,y:worker.y};task.item&&(task.item.hidden=false);
      if(task.type==='duplicate'&&task.source){const r=this.screen(task.source);worker.from={x:r.left+r.width,y:r.top};}
    }
    reveal(task,p){
      if(task.type==='guide')return;
      if(p<.25){task.shell.style.transform='scale(0)';return;}
      const progress=clamp((p-.25)/.75);
      if(task.type==='text'){
        task.shell.style.transform='none';task.shell.style.opacity=progress<.08?'1':'0';task.ink.style.visibility='visible';
        let remaining=Math.floor(task.total*progress);
        if(remaining!==task.shown){task.shown=remaining;for(const part of task.text){const count=Math.min(remaining,part.chars.length);part.node.data=part.chars.slice(0,Math.max(0,count)).join('');remaining-=count;}this.sound(true);}
        if(task.element.matches('h1,h2')) {task.ink.style.transformOrigin='top left';task.ink.style.transform=`scale(${.35+.65*smooth(progress)})`;}
      }else if(task.type==='image'){
        task.shell.style.transform=`scale(${Math.min(1,progress*3)})`;task.ink.style.visibility='visible';task.ink.style.clipPath=`inset(0 0 ${(1-progress)*100}% 0)`;
      }else{
        task.shell.style.transform=`scale(${progress},${task.type==='line'?1:progress})`;
        if(progress>.85)task.ink.style.visibility='visible';
      }
      if(task.type==='duplicate'){
        const from=this.screen(task.source),to=this.screen(task),k=1-smooth(progress);
        task.item.style.transform=`translate(${(from.left-to.left)*k}px,${(from.top-to.top)*k}px)`;
      }
    }
    finish(task){
      task.state='done';this.finished++;
      if(task.item){task.item.style.transform='';task.item.classList.add('ready');task.ink.style.visibility='visible';task.ink.style.transform='none';task.ink.style.clipPath='none';for(const t of task.text)t.node.data=t.chars.join('');}
      this.sound();
    }
    drawTask(task,worker,p){
      const c=this.ctx,r=this.screen(task),k=clamp((p-.25)/.75),travel=smooth(clamp(p/.25));
      let x=r.left+r.width*k,y=task.type==='text'?r.top+Math.min(r.height,22):r.top+Math.min(r.height,innerHeight*.6)*k;
      if(task.type==='guide'){x=r.left;y=50+(r.top-50)*smooth(p);}
      if(task.type==='duplicate'){const from=this.screen(task.source);x=from.left+(r.left-from.left)*smooth(p);y=from.top+(r.top-from.top)*smooth(p);}
      worker.x=worker.from.x+(x-worker.from.x)*travel;worker.y=worker.from.y+(y-worker.from.y)*travel;
      c.strokeStyle=worker.color;c.lineWidth=1;
      if(task.type==='guide'){
        c.strokeStyle='#ff6973';c.setLineDash([5,4]);c.beginPath();c.moveTo(0,y);c.lineTo(innerWidth,y);c.moveTo(x,0);c.lineTo(x,innerHeight);c.stroke();c.setLineDash([]);return;
      }
      const w=r.width*(p<.25?travel:1),h=Math.min(r.height,innerHeight*.65)*(p<.25?travel:1);
      c.globalAlpha=.8;c.strokeRect(r.left,r.top,w,h);c.fillStyle=worker.color;
      for(const [a,b] of [[r.left,r.top],[r.left+w,r.top],[r.left+w,r.top+h],[r.left,r.top+h]])c.fillRect(a-2,b-2,4,4);
      if(task.type==='text'&&p>.25){c.beginPath();c.moveTo(x,y-15);c.lineTo(x,y+3);c.stroke();}
      c.font='10px monospace';const label=task.type==='duplicate'?'DUPLICATE':`${Math.round(w)} × ${Math.round(h)}`;
      c.fillRect(Math.max(0,r.left),Math.max(20,r.top-20),label.length*6+12,16);c.fillStyle='#101014';c.fillText(label,Math.max(0,r.left)+6,Math.max(20,r.top-20)+12);c.globalAlpha=1;
    }
    cursor(worker){
      const c=this.ctx;c.save();c.translate(worker.x,worker.y);c.strokeStyle='#111';c.fillStyle=worker.color;c.lineWidth=1.5;
      if(worker.job?.type==='text'){
        c.strokeStyle=worker.color;c.lineWidth=2;c.beginPath();c.moveTo(-4,-8);c.lineTo(4,-8);c.moveTo(0,-8);c.lineTo(0,8);c.moveTo(-4,8);c.lineTo(4,8);c.stroke();
      }else if(worker.job && ['box','image','line'].includes(worker.job.type)){
        c.strokeStyle=worker.color;c.lineWidth=2;c.beginPath();c.moveTo(-8,0);c.lineTo(8,0);c.moveTo(0,-8);c.lineTo(0,8);c.stroke();
      }else{
        c.beginPath();c.moveTo(0,0);c.lineTo(2,21);c.lineTo(8,15);c.lineTo(13,25);c.lineTo(18,22);c.lineTo(12,12);c.lineTo(21,11);c.closePath();c.fill();c.stroke();
      }
      c.restore();
    }
    tick(now){
      this.raf=0;if(this.closed)return;
      if(this.last && now-this.last<30){this.wake();return;}
      const dt=this.last?Math.min((now-this.last)/1000,.09):0;this.last=now;
      this.ctx.clearRect(0,0,innerWidth,innerHeight);
      if(this.ready)this.elapsed+=dt*this.speed;
      const intro=!this.ready||this.elapsed<1.1;
      this.root.querySelector('.logo').hidden=!intro;this.root.querySelector('.caption').hidden=!intro;
      if(intro){
        this.workers.forEach((w,i)=>{const a=now*.001+i*Math.PI*2/this.workers.length;w.x=innerWidth/2+Math.cos(a)*110;w.y=innerHeight*.45+Math.sin(a)*75;this.cursor(w);});this.wake();return;
      }
      this.world.style.transform=`translateY(${-scrollY}px)`;
      // Rulers stay visible while the cursors work, with world coordinates on the left.
      const c=this.ctx;c.fillStyle='#1b1c23';c.fillRect(0,0,innerWidth,18);c.fillRect(0,0,18,innerHeight);c.fillStyle='#8c92a2';c.font='8px monospace';
      for(let x=50;x<innerWidth;x+=50){c.fillRect(x,12,1,6);c.fillText(String(x),x+3,9);}
      for(let y=50;y<innerHeight;y+=50){c.fillRect(12,y,6,1);}
      for(const worker of this.workers){
        if(!worker.job){const task=this.pick();if(task)this.begin(worker,task);}
        if(worker.job){const task=worker.job;task.time+=dt*this.speed;const p=clamp(task.time/task.duration);this.reveal(task,p);this.drawTask(task,worker,p);if(p===1){this.finish(task);worker.job=null;}}
        else {const i=this.workers.indexOf(worker),angle=now*.0005+i*2*Math.PI/this.workers.length;worker.x+=(this.pointer.x+Math.cos(angle)*75-worker.x)*.12;worker.y+=(this.pointer.y+Math.sin(angle)*45-worker.y)*.12;}
        this.cursor(worker);
      }
      const complete=this.finished===this.tasks.length;
      this.host.dataset.done=String(this.finished);this.host.dataset.complete=String(complete);
      this.root.querySelector('.fill').style.width=(this.finished/this.tasks.length*100)+'%';
      this.root.querySelector('.status').textContent=`${this.finished} / ${this.tasks.length} layers${complete?' · Complete':!this.workers.some(w=>w.job)?' · Scroll to build':''}`;
      this.root.querySelector('.readout strong').textContent=complete?'PORTFOLIO REBUILT':'BUILDING THE PORTFOLIO';
      this.root.querySelector('[data-command="replay"]').hidden=!complete;
      if(this.tour&&!complete){
        const pending=this.tasks.some(t=>t.state!=='done'&&(t.fixed||t.bounds.top<scrollY+innerHeight-110));
        if(!pending)scrollTo({top:Math.min(document.documentElement.scrollHeight-innerHeight,scrollY+dt*this.speed*360),behavior:'instant'});
      }
      if(!complete||now-this.pointer.at<1500)this.wake();
    }
    close(){
      if(this.closed)return;this.closed=true;cancelAnimationFrame(this.raf);this.abort.abort();
      this.host.remove();this.preparingStyle?.remove();document.body.inert=this.wasInert;
      if(!this.ready)scrollTo({top:this.startY,behavior:'instant'});
      this.audio?.close().catch(()=>{});launcher.hidden=reduced.matches;session=null;
      if(this.focusBefore instanceof HTMLElement && this.focusBefore!==document.body)this.focusBefore.focus({preventScroll:true});
    }
  }
  function start(){
    if(session||reduced.matches||document.querySelector('.modal.open'))return;
    try {const scene=new RebuildScene();session=scene;scene.prepare().catch(error=>{console.error('Portfolio rebuild could not initialise',error);scene.close();});}
    catch(error){session?.close();launcher.hidden=reduced.matches;console.error('Portfolio rebuild unavailable',error);}
  }
  launcher.addEventListener('click',()=>{scrollTo({top:0,behavior:'instant'});start();});
  reduced.addEventListener('change',()=>{if(reduced.matches)session?.close();launcher.hidden=reduced.matches;});
  addEventListener('pagehide',()=>session?.close());
  Promise.race([Promise.allSettled([window.portfolioMediaReady,document.fonts.ready,document.querySelector('.portrait img')?.decode()]),wait(3000)]).then(start);
})();
