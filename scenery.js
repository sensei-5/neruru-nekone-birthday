/* 地下墓室：固定種子建築，前景獨立燭火與鐵鏈。 */
const Scenery = (() => {
  let W, H, u, L, candles = [];
  const TAU = Math.PI * 2;
  function glow(g, x, y, radius, color) {
    const fill = g.createRadialGradient(x, y, 0, x, y, radius);
    fill.addColorStop(0, color); fill.addColorStop(1, 'rgba(255,179,92,0)');
    g.fillStyle = fill; g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  function arch(g, x, y, w, h) {
    g.beginPath(); g.moveTo(x-w/2,y+h); g.lineTo(x-w/2,y+h*.35); g.quadraticCurveTo(x-w/2,y+h*.15,x,y); g.quadraticCurveTo(x+w/2,y+h*.15,x+w/2,y+h*.35); g.lineTo(x+w/2,y+h); g.closePath();
  }
  function drawBackground(g) {
    let seed = 20261111;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const {cx, groundY: top, altarW: aw} = L, floor = top - 1.8*u, frontY = top + 1.8*u;
    let treads = [], carpetW = 0;
    candles = [];
    const wall = g.createLinearGradient(0,0,0,H); wall.addColorStop(0,'#0b080f'); wall.addColorStop(.7,'#1a1420'); wall.addColorStop(1,'#07050a');
    g.fillStyle = wall; g.fillRect(0,0,W,H);
    for (let y=0,row=0;y<floor;y+=3*u,row++) for(let x=-(row%2)*5*u;x<W;x+=10*u) {
      g.fillStyle=`rgba(185,169,143,${.015+random()*.035})`; g.fillRect(x+1,y+1,10*u-2,3*u-2);
    }
    const wy=H*.36, radius=Math.min(8*u,H*.145), colors=['#7a0f2a','#865127','#25283e','#18382d'];
    g.save(); g.globalCompositeOperation='lighter'; glow(g,cx,wy,radius*1.7,'rgba(185,90,50,.19)'); g.restore();
    for(let ring=1;ring<=3;ring++) for(let i=0;i<16;i++) {
      const a=i*TAU/16,b=(i+1)*TAU/16, fill=g.createRadialGradient(cx,wy,0,cx,wy,radius);
      fill.addColorStop(0,'#e2c78a'); fill.addColorStop(.25,colors[(i+ring)%4]); fill.addColorStop(1,'#140b12');
      g.beginPath(); g.arc(cx,wy,radius*ring/3,a,b); g.arc(cx,wy,radius*(ring-1)/3,b,a,true); g.closePath(); g.fillStyle=fill; g.fill(); g.strokeStyle='#050308'; g.lineWidth=1.5; g.stroke();
    }
    // 窗櫺：放射石條、八個小圓窗與中央花心，讓它看起來是雕花彩窗而不是色盤
    g.strokeStyle='#120d14'; g.lineWidth=Math.max(2,u*.2);
    for(let i=0;i<16;i++){ const a=i*TAU/16; g.beginPath(); g.moveTo(cx+Math.cos(a)*radius*.2,wy+Math.sin(a)*radius*.2); g.lineTo(cx+Math.cos(a)*radius,wy+Math.sin(a)*radius); g.stroke(); }
    for(let i=0;i<8;i++){ const a=(i+.5)*TAU/8, px=cx+Math.cos(a)*radius*.64, py=wy+Math.sin(a)*radius*.64;
      g.beginPath(); g.arc(px,py,radius*.13,0,TAU); g.fillStyle=colors[i%4]; g.fill(); g.lineWidth=Math.max(2,u*.18); g.strokeStyle='#120d14'; g.stroke(); }
    g.beginPath(); g.arc(cx,wy,radius*.19,0,TAU); g.fillStyle='#b8913f'; g.fill(); g.strokeStyle='#120d14'; g.lineWidth=Math.max(2,u*.2); g.stroke();
    g.beginPath(); g.arc(cx,wy,radius*.08,0,TAU); g.fillStyle='#ffd98a'; g.fill();
    for(const scale of [1.02,1.12,1.2]) { g.beginPath(); g.arc(cx,wy,radius*scale,0,TAU); g.strokeStyle=scale===1.12?'#3c3336':'#171219'; g.lineWidth=2; g.stroke(); }
    for(const side of [-1,1]) {
      const x=cx+side*Math.min(aw*.8,W*.32), y=wy+radius*.6;
      arch(g,x,y,3*u,12*u); g.fillStyle='#382126'; g.fill(); g.strokeStyle='#050308'; g.lineWidth=2; g.stroke();
      g.strokeStyle='#8a683c'; g.lineWidth=1; g.beginPath(); g.moveTo(x,y+u); g.lineTo(x,y+12*u); g.moveTo(x-u,y+6*u); g.lineTo(x+u,y+6*u); g.stroke();
    }
    g.save(); g.filter=`blur(${u*.6}px)`;
    for(let i=0;i<4;i++) {
      const x=cx+(i-1.5)*radius*.45, beam=g.createLinearGradient(x,wy,cx,top);
      beam.addColorStop(0,i%2?'rgba(150,60,90,.06)':'rgba(255,180,110,.10)'); beam.addColorStop(1,'rgba(255,180,110,0)');
      g.beginPath(); g.moveTo(x,wy); g.lineTo(x+u,wy); g.lineTo(cx+(i-1)*aw*.25,top+5*u); g.lineTo(cx+(i-2)*aw*.25,top+5*u); g.closePath(); g.fillStyle=beam; g.fill();
    } g.restore();
    for(const side of [-1,1]) for(let depth=2;depth>=0;depth--) {
      const x=side<0?u*(3+depth*6):W-u*(3+depth*6), cap=H*(.13+depth*.06), width=u*(3.8-depth*.7);
      const stone=g.createLinearGradient(x-width,0,x+width,0); stone.addColorStop(0,'#09070c'); stone.addColorStop(.5,depth?'#241e29':'#3a3036'); stone.addColorStop(1,'#100c14');
      g.fillStyle=stone; g.fillRect(x-width/2,cap,width,floor-cap+6*u); g.fillRect(x-width*.8,cap,width*1.6,u); g.fillRect(x-width*.8,floor,width*1.6,2*u);
      g.beginPath(); g.moveTo(x,cap); g.quadraticCurveTo(x,H*.02,cx,-u*(2+depth*3)); g.strokeStyle='#050308'; g.lineWidth=width*.8; g.stroke(); g.strokeStyle=depth?'#211b25':'#3a3036'; g.lineWidth=width*.5; g.stroke();
      // 側廊尖拱的暗洞與石框，向深處逐層縮小。
      arch(g, x + side * width, cap + 2*u, width * 2, floor - cap);
      g.fillStyle='#07050a'; g.fill(); g.strokeStyle=depth?'#211b25':'#3a3036'; g.lineWidth=2; g.stroke();
      if(depth>0){ ossuary(g,x+side*width,cap+2*u,width*2,floor-cap,depth===1?.85:.6); arch(g,x+side*width,cap+2*u,width*2,floor-cap); g.strokeStyle=depth?'#211b25':'#3a3036'; g.lineWidth=2; g.stroke(); }
    }
    wallProps();
    const paving=g.createLinearGradient(0,floor,0,H); paving.addColorStop(0,'#100c14'); paving.addColorStop(1,'#302831'); g.fillStyle=paving; g.fillRect(0,floor,W,H-floor);
    g.strokeStyle='rgba(185,169,143,.09)'; g.lineWidth=1;
    for(let i=-8;i<=8;i++) { g.beginPath(); g.moveTo(cx+i*u*2,floor); g.lineTo(cx+i*u*18,H); g.stroke(); }
    for(let i=0;i<9;i++) { const y=floor+(H-floor)*(i/8)**2; g.beginPath(); g.moveTo(0,y); g.lineTo(W,y); g.stroke(); }
    glow(g,cx,top+2*u,aw,'rgba(255,179,92,.10)');
    dais();
    floorProps();
    plinths();
    function candle(x,base,height) {
      const width=u*.55,wax=g.createLinearGradient(x-width,0,x+width,0); wax.addColorStop(0,'#6d5640'); wax.addColorStop(.5,'#d9c5a0'); wax.addColorStop(1,'#8a7153');
      g.fillStyle=wax; g.beginPath(); g.ellipse(x,base,width,u*.16,0,0,TAU); g.fill(); g.fillRect(x-width/2,base-height,width,height); g.fillStyle='#ece3d0'; g.fillRect(x-width/2,base-height,width*.18,height*.4); candles.push({x,y:base-height,phase:random()*TAU,s:1});
    }
    for(const side of [-1,1]) {
      const x=cx+side*aw*.8,base=top+5*u;
      g.strokeStyle='#080609'; g.lineWidth=2; g.beginPath(); g.moveTo(x,base); g.lineTo(x,base-12*u); g.moveTo(x-2*u,base); g.lineTo(x+2*u,base); g.stroke();
      for(let i=-2;i<=2;i++) { const y=base-10*u+Math.abs(i)*u; g.beginPath(); g.moveTo(x,base-5*u); g.quadraticCurveTo(x+i*1.5*u,base-5*u,x+i*1.5*u,y); g.stroke(); candle(x+i*1.5*u,y,2*u); }
      for(const t of treads) for(let k=0;k<2;k++) {
        const x0=carpetW/2+1.6*u, x=cx+side*(x0+(t.w/2-x0-1.4*u)*(.1+.8*random())), h=(.8+random()*1.7)*u;
        if(side>0 && t.y>top+3*u && x<cx+aw*.5) continue; // 小羊站的地方（右下階面）不放蠟燭，火焰才不會疊在牠臉上
        candle(x,t.y+(random()-.5)*u*.4,h);
      }
    }
    const mist=g.createLinearGradient(0,top-u,0,top+8*u); mist.addColorStop(0,'rgba(185,169,143,0)'); mist.addColorStop(.5,'rgba(185,169,143,.035)'); mist.addColorStop(1,'rgba(185,169,143,0)'); g.fillStyle=mist; g.fillRect(0,top-u,W,9*u); lightingPass();
    /* ---------- 哥德陳設 v2：受光、顆粒、陰影，去掉粗黑描邊；最後用一層「光照遮罩」把所有東西統一在燭光與彩窗之下 ---------- */
    function flame(x, y, s) { candles.push({ x, y, phase: random() * TAU, s }); }
    // 柔和的接觸陰影（貼地／貼牆）
    function softShadow(g, draw, blur, alpha, dx, dy) {
      g.save(); g.filter = `blur(${blur}px)`; g.globalAlpha = alpha; g.fillStyle = '#000'; g.translate(dx, dy); draw(); g.restore();
    }
    function grain(g, x, y, w, h, n, a, sz) {
      for (let i = 0; i < n; i++) {
        g.fillStyle = random() < .5 ? `rgba(255,240,220,${a * random()})` : `rgba(0,0,0,${a * 1.7 * random()})`;
        g.fillRect(x + random() * w, y + random() * h, sz * (1 + random() * 1.6), sz * (1 + random() * 1.6));
      }
    }
    // 在 clip 內呼叫：石頭底色漸層 + 顆粒 + 左上受光 + 底部變暗（k = 座標縮放倍率）
    function litStone(g, x, y, w, h, c0, c1, k = 1) {
      const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, c0); gr.addColorStop(1, c1);
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      grain(g, x, y, w, h, Math.floor(w * h * k * k / 70), .08, 1 / k);
      const hi = g.createLinearGradient(x, y, x + w * .55, y); hi.addColorStop(0, 'rgba(255,235,210,.13)'); hi.addColorStop(1, 'rgba(255,235,210,0)');
      g.fillStyle = hi; g.fillRect(x, y, w, h);
      const lo = g.createLinearGradient(0, y + h * .45, 0, y + h); lo.addColorStop(0, 'rgba(0,0,0,0)'); lo.addColorStop(1, 'rgba(0,0,0,.4)');
      g.fillStyle = lo; g.fillRect(x, y, w, h);
    }
    function skull(g, x, y, s, a) {
      g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate((random() - .5) * .55);
      const t = random(), c0 = t < .33 ? '#d8ccae' : t < .66 ? '#bfb394' : '#a89c7e';
      g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.ellipse(s * .05, s * .1, s * .56, s * .52, 0, 0, TAU); g.fill();
      const cr = g.createRadialGradient(-s * .16, -s * .22, s * .04, 0, 0, s * .6); cr.addColorStop(0, c0); cr.addColorStop(.7, '#7d7258'); cr.addColorStop(1, '#3d3629');
      g.fillStyle = cr; g.beginPath(); g.ellipse(0, 0, s * .5, s * .47, 0, 0, TAU); g.fill();
      const jw = g.createLinearGradient(0, s * .3, 0, s * .6); jw.addColorStop(0, '#8a7f64'); jw.addColorStop(1, '#4a4231');
      g.fillStyle = jw; g.beginPath(); g.moveTo(-s * .27, s * .3); g.lineTo(s * .27, s * .3); g.lineTo(s * .2, s * .58); g.lineTo(-s * .2, s * .58); g.closePath(); g.fill();
      for (const sx of [-1, 1]) {
        const ey = g.createRadialGradient(sx * s * .19, 0, 0, sx * s * .19, 0, s * .17); ey.addColorStop(0, '#030203'); ey.addColorStop(.7, 'rgba(8,5,4,.95)'); ey.addColorStop(1, 'rgba(30,24,16,0)');
        g.fillStyle = ey; g.beginPath(); g.ellipse(sx * s * .19, 0, s * .17, s * .19, 0, 0, TAU); g.fill();
      }
      g.fillStyle = 'rgba(5,3,3,.9)'; g.beginPath(); g.moveTo(0, s * .1); g.lineTo(-s * .07, s * .27); g.lineTo(s * .07, s * .27); g.closePath(); g.fill();
      g.fillStyle = 'rgba(224,214,188,.75)'; for (let i = -2; i <= 2; i++) g.fillRect(i * s * .09 - s * .035, s * .36, s * .06, s * .13);
      g.restore();
    }
    function bone(g, x, y, len, ang, a) {
      g.save(); g.translate(x, y); g.rotate(ang); g.globalAlpha = a;
      g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(len * .03, len * .05, len * .5, len * .05, 0, 0, TAU); g.fill();
      const sh = g.createLinearGradient(0, -len * .05, 0, len * .05); sh.addColorStop(0, '#d9ccae'); sh.addColorStop(1, '#6e6450');
      g.fillStyle = sh; g.beginPath(); g.moveTo(-len / 2, -len * .035); g.lineTo(len / 2, -len * .035); g.lineTo(len / 2, len * .035); g.lineTo(-len / 2, len * .035); g.closePath(); g.fill();
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) { g.beginPath(); g.arc(sx * len / 2, sy * len * .05, len * .062, 0, TAU); g.fillStyle = sh; g.fill(); }
      g.restore();
    }
    // 側廊暗拱裡的納骨牆：骷髏緊密疊放（下排壓在上排前面）、夾著橫放的長骨，越上面越暗
    function ossuary(g, x, y, w, h, a) {
      g.save(); arch(g, x, y, w, h); g.clip();
      g.fillStyle = '#060407'; g.fillRect(x - w / 2, y, w, h);
      const sk = Math.max(9, w * .27), step = sk * .78, rows = Math.floor(h * .7 / step);
      for (let r = rows; r >= 0; r--) {
        const yy = y + h - (r + .4) * step, fade = Math.max(0, 1 - Math.pow(r / rows, 1.1) * .95);
        for (let c = -1; c <= Math.ceil(w / step) + 1; c++) {
          if (random() < .05) continue;
          skull(g, x - w / 2 + (c + (r % 2 ? .5 : 0)) * step + (random() - .5) * step * .25, yy + (random() - .5) * step * .2, sk * (.9 + random() * .22), a * fade);
        }
        if (r % 3 === 2) for (let b = 0; b < 3; b++) bone(g, x - w / 2 + (b + .5) * w / 3 + (random() - .5) * sk, yy + step * .55, w * .62, (random() - .5) * .12, a * fade * .9);
      }
      const side = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0); side.addColorStop(0, 'rgba(0,0,0,.55)'); side.addColorStop(.5, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(0,0,0,.55)');
      g.fillStyle = side; g.fillRect(x - w / 2, y, w, h);
      const warm = g.createLinearGradient(0, y + h, 0, y + h * .3); warm.addColorStop(0, 'rgba(255,150,70,.22)'); warm.addColorStop(1, 'rgba(255,150,70,0)');
      g.fillStyle = warm; g.fillRect(x - w / 2, y, w, h);
      g.restore();
    }
    // 柱頂的兜帽聖像：石底座、垂墜的長袍（褶皺）、兜帽深處是一片暗；雙手合十；被下方燭光向上照亮
    function statue(g, x, y, s) {
      softShadow(g, () => { g.beginPath(); g.ellipse(x + s * 1.5, y - s * 6, s * 4.2, s * 7.5, 0, 0, TAU); g.fill(); }, s * .9, .55, s * 1.2, s * .6);
      g.save(); g.translate(x, y); g.scale(s, s);
      const body = new Path2D(); body.moveTo(-3.6, -3.2); body.bezierCurveTo(-3.4, -5.6, -2.7, -7.6, -1.9, -9.1); body.lineTo(1.9, -9.1); body.bezierCurveTo(2.7, -7.6, 3.4, -5.6, 3.6, -3.2); body.closePath();
      const hood = new Path2D(); hood.ellipse(0, -10.5, 2.05, 2.3, 0, 0, TAU);
      for (const [path, c0, c1] of [[body, '#4a4249', '#1c1720'], [hood, '#463f46', '#1a151c']]) {
        g.save(); g.clip(path);
        const gr = g.createLinearGradient(-3.6, -11, 3.6, -3); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(-5, -13, 10, 11);
        g.restore();
      }
      g.save(); g.clip(body); // 袍子的垂墜褶皺
      for (let i = -4; i <= 4; i++) {
        const x0 = i * .42, x1 = i * .98;
        g.strokeStyle = 'rgba(0,0,0,.42)'; g.lineWidth = .34; g.beginPath(); g.moveTo(x0, -9); g.quadraticCurveTo(x0 * 1.4 + (i % 2 ? .3 : -.3), -6.2, x1, -3.2); g.stroke();
        g.strokeStyle = 'rgba(255,230,200,.13)'; g.lineWidth = .22; g.beginPath(); g.moveTo(x0 + .26, -9); g.quadraticCurveTo(x0 * 1.4 + .3, -6.2, x1 + .3, -3.2); g.stroke();
      }
      const up = g.createLinearGradient(0, -3, 0, -8); up.addColorStop(0, 'rgba(255,150,70,.3)'); up.addColorStop(1, 'rgba(255,150,70,0)'); g.fillStyle = up; g.fillRect(-4, -9.2, 8, 6.2);
      g.restore();
      const face = g.createRadialGradient(0, -10.2, .1, 0, -10.2, 1.7); face.addColorStop(0, '#020103'); face.addColorStop(.75, 'rgba(6,4,8,.96)'); face.addColorStop(1, 'rgba(6,4,8,0)');
      g.fillStyle = face; g.beginPath(); g.ellipse(0, -10.1, 1.2, 1.55, 0, 0, TAU); g.fill();
      g.fillStyle = '#4d444c'; g.beginPath(); g.ellipse(0, -7.5, .95, .65, 0, 0, TAU); g.fill(); // 合十的手
      g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = .18; g.stroke();
      for (const [y0, y1, hh, w0] of [[-3.2, -1.9, 1.3, 4], [-1.9, 0, 1.9, 4.6]]) { // 底座
        g.save(); g.beginPath(); g.rect(-w0, y0, w0 * 2, hh); g.clip(); litStone(g, -w0, y0, w0 * 2, hh, '#4a4249', '#1b161d', s); g.restore();
        g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = .15; g.strokeRect(-w0, y0, w0 * 2, hh);
      }
      g.restore();
    }
    // 牆上懸掛的旗幡：布料皺褶、飄動的邊、金線刺繡、燕尾與流蘇、牆上的投影
    function banner(g, x, y, w, h) {
      const edge = (yy) => Math.sin(yy * .045 + x) * w * .025;
      const shape = (g2, dx = 0, dy = 0) => {
        g2.beginPath(); g2.moveTo(x - w / 2 + dx, y + dy);
        for (let yy = 0; yy <= h; yy += 6) g2.lineTo(x - w / 2 + dx + edge(yy), y + yy + dy);
        g2.lineTo(x + dx, y + h - w * .45 + dy);
        for (let yy = h; yy >= 0; yy -= 6) g2.lineTo(x + w / 2 + dx + edge(yy + 30), y + yy + dy);
        g2.closePath();
      };
      softShadow(g, () => { shape(g); g.fill(); }, u * .5, .6, u * .55, u * .5);
      g.save(); shape(g); g.clip();
      const cl = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      [[0, '#2a040c'], [.12, '#6e1228'], [.26, '#34070f'], [.42, '#7d1630'], [.58, '#3a0811'], [.74, '#6a1126'], [.88, '#2c050d'], [1, '#4a0a19']].forEach(([o, c]) => cl.addColorStop(o, c));
      g.fillStyle = cl; g.fillRect(x - w, y, w * 2, h);
      const vt = g.createLinearGradient(0, y, 0, y + h); vt.addColorStop(0, 'rgba(255,200,170,.1)'); vt.addColorStop(.5, 'rgba(0,0,0,0)'); vt.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = vt; g.fillRect(x - w, y, w * 2, h);
      grain(g, x - w / 2, y, w, h, Math.floor(w * h / 60), .05, 1);
      g.strokeStyle = 'rgba(184,145,63,.55)'; g.lineWidth = 1.2; g.setLineDash([u * .35, u * .18]); // 金線刺繡
      g.beginPath(); g.moveTo(x - w / 2 + u * .55, y + u * .7); g.lineTo(x + w / 2 - u * .55, y + u * .7); g.lineTo(x + w / 2 - u * .55, y + h - u * .7); g.lineTo(x, y + h - w * .45 - u * .7); g.lineTo(x - w / 2 + u * .55, y + h - u * .7); g.closePath(); g.stroke(); g.setLineDash([]);
      const cy = y + h * .4, arm = Math.max(3, w * .08);
      for (const [col, off] of [['rgba(0,0,0,.55)', 1.6], ['#b8913f', 0], ['rgba(255,235,170,.35)', -.8]]) {
        g.strokeStyle = col; g.lineWidth = col === 'rgba(255,235,170,.35)' ? arm * .35 : arm; g.lineCap = 'butt';
        g.beginPath(); g.moveTo(x, cy - h * .2 + off); g.lineTo(x, cy + h * .2 + off); g.moveTo(x - w * .21, cy - h * .06 + off); g.lineTo(x + w * .21, cy - h * .06 + off); g.stroke();
      }
      g.restore();
      g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1; shape(g); g.stroke();
      // 燕尾的金色滾邊與流蘇：流蘇的起點在布的邊緣上，往下垂（先滾邊、再一根根絲線）
      const Lb = { x: x - w / 2 + edge(h), y: y + h }, Nt = { x, y: y + h - w * .45 }, Rb = { x: x + w / 2 + edge(h + 30), y: y + h };
      g.lineCap = 'round'; g.strokeStyle = '#6b5320'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(Lb.x, Lb.y); g.lineTo(Nt.x, Nt.y); g.lineTo(Rb.x, Rb.y); g.stroke();
      g.strokeStyle = '#c9a24a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(Lb.x, Lb.y); g.lineTo(Nt.x, Nt.y); g.lineTo(Rb.x, Rb.y); g.stroke();
      for (const [a, b] of [[Lb, Nt], [Nt, Rb]]) {
        for (let n = 0; n <= 12; n++) {
          const t = n / 12, px = a.x + (b.x - a.x) * t, py = a.y + (b.y - a.y) * t, len = u * (.8 + random() * .35), sw = (random() - .5) * u * .25;
          g.strokeStyle = '#8a6c28'; g.lineWidth = 2; g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + sw * .4, py + len * .5, px + sw, py + len); g.stroke();
          g.strokeStyle = '#d9b45c'; g.lineWidth = 1; g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + sw * .4, py + len * .5, px + sw, py + len); g.stroke();
        }
      }
      const rod = g.createLinearGradient(0, y - u * .35, 0, y + u * .3); rod.addColorStop(0, '#6b5320'); rod.addColorStop(.4, '#d9b45c'); rod.addColorStop(1, '#4a3912');
      g.fillStyle = rod; g.fillRect(x - w * .66, y - u * .32, w * 1.32, u * .6);
      for (const sx of [-1, 1]) { const ball = g.createRadialGradient(x + sx * w * .66 - u * .1, y - u * .15, 0, x + sx * w * .66, y, u * .45); ball.addColorStop(0, '#fff0b8'); ball.addColorStop(1, '#6b5320'); g.fillStyle = ball; g.beginPath(); g.arc(x + sx * w * .66, y - u * .02, u * .42, 0, TAU); g.fill(); }
    }
    // 牆上的火把：鐵托架、木柄、杯口的暗影；牆上被煙燻黑的一道痕跡
    function torch(g, x, y) {
      const soot = g.createLinearGradient(0, y - u * 7, 0, y); soot.addColorStop(0, 'rgba(0,0,0,0)'); soot.addColorStop(1, 'rgba(0,0,0,.4)');
      g.fillStyle = soot; g.beginPath(); g.ellipse(x, y - u * 3.2, u * 1.1, u * 3.6, 0, 0, TAU); g.fill();
      softShadow(g, () => { g.fillRect(x - u * .3, y, u * .6, u * 3.4); }, u * .35, .55, u * .45, u * .35);
      g.save(); g.lineCap = 'round';
      const wd = g.createLinearGradient(x - u * .25, 0, x + u * .25, 0); wd.addColorStop(0, '#2a1d14'); wd.addColorStop(.45, '#7a5c3e'); wd.addColorStop(1, '#2a1d14');
      g.strokeStyle = wd; g.lineWidth = u * .46; g.beginPath(); g.moveTo(x, y + u * 3.5); g.lineTo(x, y); g.stroke();
      const cup = g.createLinearGradient(x - u, 0, x + u, 0); cup.addColorStop(0, '#120d14'); cup.addColorStop(.5, '#4a3f4a'); cup.addColorStop(1, '#17111a');
      g.fillStyle = cup; g.beginPath(); g.moveTo(x - u, y - u * .25); g.lineTo(x + u, y - u * .25); g.lineTo(x + u * .55, y + u * 1.25); g.lineTo(x - u * .55, y + u * 1.25); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,150,70,.35)'; g.beginPath(); g.ellipse(x, y - u * .25, u, u * .22, 0, 0, TAU); g.fill();
      g.restore();
      g.save(); g.globalCompositeOperation = 'lighter'; glow(g, x, y - u, u * 9, 'rgba(255,150,70,.16)'); g.restore();
      flame(x, y - u * .1, 1.7);
    }
    // 吊燈：鐵鏈有高光、鐵環上亮下暗，環上一圈蠟燭
    function chandelier(g, x, ringY, rx) {
      const apex = ringY - 5.5 * u;
      softShadow(g, () => { g.beginPath(); g.ellipse(x, ringY, rx * 1.05, rx * .3, 0, 0, TAU); g.fill(); }, u * .5, .45, u * .5, u * .9);
      g.save(); g.lineCap = 'round';
      for (let y = -u; y < apex; y += u * .7) { g.beginPath(); g.ellipse(x, y, u * .16, u * .34, 0, 0, TAU); g.strokeStyle = '#3a3036'; g.lineWidth = 1.5; g.stroke(); g.strokeStyle = 'rgba(255,220,180,.25)'; g.lineWidth = .7; g.beginPath(); g.arc(x - u * .04, y - u * .12, u * .11, Math.PI, Math.PI * 1.6); g.stroke(); }
      g.strokeStyle = '#1a1318'; g.lineWidth = Math.max(1, u * .12);
      for (const [px, py] of [[x - rx, ringY], [x + rx, ringY], [x, ringY + rx * .22]]) { g.beginPath(); g.moveTo(x, apex); g.lineTo(px, py); g.stroke(); }
      const iron = g.createLinearGradient(0, ringY - rx * .22, 0, ringY + rx * .22); iron.addColorStop(0, '#8a7458'); iron.addColorStop(.5, '#3a2f30'); iron.addColorStop(1, '#0d090c');
      g.beginPath(); g.ellipse(x, ringY, rx, rx * .22, 0, 0, TAU); g.strokeStyle = iron; g.lineWidth = u * .5; g.stroke();
      g.strokeStyle = 'rgba(255,225,170,.3)'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, ringY - u * .08, rx, rx * .22, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      g.fillStyle = '#17101b'; g.beginPath(); g.moveTo(x - u * .6, ringY + rx * .22); g.lineTo(x, ringY + rx * .22 + u * 2.4); g.lineTo(x + u * .6, ringY + rx * .22); g.closePath(); g.fill();
      g.restore();
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; candle(x + Math.cos(a) * rx, ringY + Math.sin(a) * rx * .22, u * 1.1); }
      g.save(); g.globalCompositeOperation = 'lighter'; glow(g, x, ringY, rx * 2.4, 'rgba(255,170,90,.12)'); g.restore();
    }
    function wallProps() {
      const ox = Math.min(aw * .8, W * .32);
      for (const side of [-1, 1]) {
        banner(g, cx + side * ox, H * .2, u * 5, u * 12);
        torch(g, cx + side * u * 23, H * .5);
        chandelier(g, cx + side * u * 32, H * .13, u * 4.2);
        statue(g, side < 0 ? u * 9 : W - u * 9, H * (.13 + .06) + u * .1, u * .62);
        statue(g, side < 0 ? u * 15 : W - u * 15, H * (.13 + .12) + u * .1, u * .46);
      }
    }
    // 地上的石棺：斜投影的完整石箱（前面、頂面、朝向中央的側面共用同一組頂點）。
    // 頂面往上推 d、往畫面中央偏一點；棺蓋是頂面上一塊凹陷的嵌板；前面有凹雕的尖拱
    function sarcophagus(g, x0, y0, w, h, side) {
      const d = h * .3, sx = side < 0 ? d * .9 : -d * .9;
      const A = { x: x0, y: y0 }, B = { x: x0 + w, y: y0 }, C = { x: x0, y: y0 + h }, D = { x: x0 + w, y: y0 + h };
      const A2 = { x: A.x + sx, y: A.y - d }, B2 = { x: B.x + sx, y: B.y - d }, C2 = { x: C.x + sx, y: C.y - d }, D2 = { x: D.x + sx, y: D.y - d };
      const P = (a, b) => ({ x: (A.x + (B.x - A.x) * a) * (1 - b) + (A2.x + (B2.x - A2.x) * a) * b, y: (A.y + (B.y - A.y) * a) * (1 - b) + (A2.y + (B2.y - A2.y) * a) * b });
      const poly = (pts) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); };
      const bbox = (pts) => { const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y); return [Math.min(...xs) - 1, Math.min(...ys) - 1, Math.max(...xs) - Math.min(...xs) + 2, Math.max(...ys) - Math.min(...ys) + 2]; };
      const face = (pts, c0, c1) => { g.save(); poly(pts); g.clip(); litStone(g, ...bbox(pts), c0, c1); g.restore(); };
      softShadow(g, () => { g.beginPath(); g.ellipse(x0 + w * .52 + sx * .5, y0 + h * 1.0, w * .6, h * .1, 0, 0, TAU); g.fill(); }, u * .6, .55, 0, u * .1);
      const side4 = side < 0 ? [B, B2, D2, D] : [A, A2, C2, C];
      face(side4, '#3a3441', '#1a1620');
      face([A, B, B2, A2], '#675f6e', '#463f4e');
      face([A, B, D, C], '#4f4857', '#1d1823');
      // 前面：上緣的棺蓋厚邊與凹雕尖拱
      g.save(); poly([A, B, D, C]); g.clip();
      const lid = g.createLinearGradient(0, y0, 0, y0 + h * .17); lid.addColorStop(0, 'rgba(255,240,215,.18)'); lid.addColorStop(.55, 'rgba(255,240,215,.05)'); lid.addColorStop(1, 'rgba(0,0,0,.55)');
      g.fillStyle = lid; g.fillRect(x0, y0, w, h * .17);
      for (let i = 0; i < 3; i++) {
        const ax = x0 + w * (.2 + .3 * i), ay = y0 + h * .26, aw2 = w * .22, ah = h * .66;
        arch(g, ax, ay, aw2, ah); const inn = g.createLinearGradient(0, ay, 0, ay + ah); inn.addColorStop(0, '#07050a'); inn.addColorStop(1, '#1a1520'); g.fillStyle = inn; g.fill();
        g.save(); g.translate(0, 1.3); arch(g, ax, ay, aw2, ah); g.strokeStyle = 'rgba(255,230,200,.2)'; g.lineWidth = 1.4; g.stroke(); g.restore();
        arch(g, ax, ay, aw2, ah); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.2; g.stroke();
      }
      g.restore();
      // 稜線：所有面共用同一組頂點，所以接得起來
      g.lineJoin = 'round'; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.2;
      for (const pts of [side4, [A, B, B2, A2], [A, B, D, C]]) { poly(pts); g.stroke(); }
      g.strokeStyle = 'rgba(255,238,215,.28)'; g.lineWidth = 1; g.beginPath(); g.moveTo(A.x, A.y + .8); g.lineTo(B.x, B.y + .8); g.stroke();
      // 頂面上凹陷的棺蓋嵌板：外緣一圈暗線、內緣一圈亮線
      const panel = [P(.04, .14), P(.96, .14), P(.96, .86), P(.04, .86)];
      poly(panel); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.2; g.stroke();
      g.save(); g.translate(0, 1.1); poly(panel); g.strokeStyle = 'rgba(255,238,215,.16)'; g.lineWidth = 1; g.stroke(); g.restore();
      const a = P(.8, .5), b = P(.2, .5), cnd = P(.92, .5);
      g.fillStyle = 'rgba(230,215,185,.35)'; for (const p of [a, cnd]) { g.beginPath(); g.ellipse(p.x, p.y + u * .05, u * .8, u * .26, 0, 0, TAU); g.fill(); }
      skull(g, b.x, b.y - u * .55, u * 1.6, .98); candle(cnd.x, cnd.y, u * 2.2); candle(a.x, a.y, u * 1.4);
      // 外側地上的白骨與骷髏
      const bx = x0 + (side < 0 ? w * .55 : w * .45), by = y0 + h * 1.12;
      for (let i = 0; i < 4; i++) bone(g, bx + (random() - .5) * u * 8, by + random() * u * 1.6, u * (2.2 + random()), (random() - .5) * 1.4, .9);
      for (let i = 0; i < 3; i++) skull(g, bx + (random() - .5) * u * 4, by + (random() - .3) * u * 1.2, u * (1.4 + random() * .5), .95);
    }
    function rose(g, x, y, s) {
      softShadow(g, () => { g.beginPath(); g.ellipse(x, y + s * .3, s * 1.2, s * .5, 0, 0, TAU); g.fill(); }, s * .4, .6, s * .15, s * .2);
      g.save(); g.translate(x, y);
      g.fillStyle = '#0d0a0c'; g.beginPath(); g.ellipse(-s * .95, s * .45, s * .7, s * .28, -.5, 0, TAU); g.fill();
      const bud = g.createRadialGradient(-s * .25, -s * .3, 0, 0, 0, s * 1.05); bud.addColorStop(0, '#6a1428'); bud.addColorStop(.6, '#2e0710'); bud.addColorStop(1, '#0d0205');
      g.fillStyle = bud; g.beginPath(); g.arc(0, 0, s, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,170,170,.18)'; g.lineWidth = .8; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(0, 0, s * (.78 - i * .24), i, i + 4.4); g.stroke(); }
      g.restore();
    }
    function floorProps() {
      const wd = W * .125, hd = H * .1;
      sarcophagus(g, W * .012, H * .82, wd, hd, -1);
      sarcophagus(g, W * .988 - wd, H * .82, wd, hd, 1);
      for (const [dx, dy, s] of [[-.3, .87, 1], [-.43, .94, .8], [.5, .965, .85]]) rose(g, cx + aw * dx, H * dy, u * .75 * s);
      for (let i = 0; i < 18; i++) {
        const y = floor + (H - floor) * (.35 + random() * .6), x = cx + (random() - .5) * aw * (.5 + (y - floor) / (H - floor) * .7);
        g.fillStyle = random() < .5 ? 'rgba(90,12,30,.75)' : 'rgba(26,5,10,.85)'; g.beginPath(); g.ellipse(x, y, u * .35, u * .17, random() * 3, 0, TAU); g.fill();
      }
    }
    /* ---------- 台座與台階：棺材站在石砌台座上；三級階梯往外加寬；紅地毯沿階梯爬上來，到棺材腳邊就結束 ---------- */
    function dais() {
      // 同一套透視：所有水平面（台座頂面、階面）的側邊用同一個斜率 m（每往前一像素，半寬增加 m 像素）；
      // 立面是垂直的，所以側邊垂直。整體輪廓因此是連續的梯形，頂面台座也是同樣的梯形（後緣收窄、貼牆）。
      const A = aw * .84, m = .6;
      const rh = 1.5 * u, td = 1.6 * u, k = .43;                  // 立面高、階面深、地毯與階梯的寬度比
      const yb = floor - 1.3 * u, yf = frontY;                    // 台座頂面後緣（貼牆）與前緣
      const hwF = A / 2, hwB = hwF - m * (yf - yb);
      const hwR = [hwF, hwF + m * td, hwF + 2 * m * td, hwF + 3 * m * td]; // 各級立面的半寬（最後一個是最下面階面前緣）
      carpetW = 2 * hwF * k;
      const grainRect = (x, y, w, h, a) => grain(g, x, y, w, h, Math.floor(w * h / 110), a, 1);
      const carpetGrad = (x0, x1, tread) => { const c = g.createLinearGradient(x0, 0, x1, 0); c.addColorStop(0, tread ? '#3a0a14' : '#2a060e'); c.addColorStop(.5, tread ? '#6e1427' : '#4e0c1c'); c.addColorStop(1, tread ? '#3a0a14' : '#2a060e'); return c; };
      // 織金鑲邊：有寬度的金帶，內外各一道亮線，帶子裡排菱形紋樣（間距與寬度跟著透視變大）
      const goldBorder = (ya, h0, yb2, h1) => {
        const f0 = .83, f1 = .965;
        for (const s of [-1, 1]) {
          const P = (t, f) => ({ x: cx + s * (h0 + (h1 - h0) * t) * f, y: ya + (yb2 - ya) * t });
          const band = (g2) => { g2.beginPath(); const a = P(0, f1), b = P(1, f1), c = P(1, f0), d = P(0, f0); g2.moveTo(a.x, a.y); g2.lineTo(b.x, b.y); g2.lineTo(c.x, c.y); g2.lineTo(d.x, d.y); g2.closePath(); };
          const o0 = P(0, 1), o1 = P(1, 1); // 外緣的暗影
          g.strokeStyle = 'rgba(10,2,4,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(o0.x, o0.y); g.lineTo(o1.x, o1.y); g.stroke();
          band(g); const gr = g.createLinearGradient(cx + s * h1 * f0, 0, cx + s * h1 * f1, 0); gr.addColorStop(0, '#8a6a28'); gr.addColorStop(.5, '#d9b45c'); gr.addColorStop(1, '#7a5d22'); g.fillStyle = gr; g.fill();
          for (const [f, col, lw] of [[f0, 'rgba(255,238,190,.75)', 1.1], [f1, 'rgba(255,238,190,.6)', 1.1], [f0 - .012, 'rgba(0,0,0,.45)', 1], [f1 + .012, 'rgba(0,0,0,.5)', 1]]) {
            const a = P(0, f), b = P(1, f); g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
          }
          const len = yb2 - ya, avgH = (h0 + h1) / 2, bw = avgH * (f1 - f0), pitch = Math.max(bw * 1.7, 6), n = Math.max(1, Math.floor(len / pitch));
          for (let i = 0; i < n; i++) {
            const t = (i + .5) / n, c = P(t, (f0 + f1) / 2), sz = ((h0 + (h1 - h0) * t) * (f1 - f0));
            g.beginPath(); g.moveTo(c.x, c.y - sz * .5); g.lineTo(c.x + sz * .34, c.y); g.lineTo(c.x, c.y + sz * .5); g.lineTo(c.x - sz * .34, c.y); g.closePath();
            g.fillStyle = '#3a0812'; g.fill(); g.strokeStyle = 'rgba(255,238,190,.7)'; g.lineWidth = .9; g.stroke();
            g.fillStyle = '#e8c96a'; g.beginPath(); g.arc(c.x, c.y, Math.max(.8, sz * .09), 0, TAU); g.fill();
          }
        }
      };
      // 梯形地毯（上邊半寬 h0、下邊半寬 h1，已乘過寬度比），兩邊鑲金線
      const carpetTrap = (ya, h0, yb2, h1, tread) => {
        g.save(); g.beginPath(); g.moveTo(cx - h0, ya); g.lineTo(cx + h0, ya); g.lineTo(cx + h1, yb2); g.lineTo(cx - h1, yb2); g.closePath(); g.clip();
        g.fillStyle = carpetGrad(cx - Math.max(h0, h1), cx + Math.max(h0, h1), tread); g.fillRect(cx - Math.max(h0, h1), ya, Math.max(h0, h1) * 2, yb2 - ya);
        grainRect(cx - Math.max(h0, h1), ya, Math.max(h0, h1) * 2, yb2 - ya, .06);
        g.restore();
        goldBorder(ya, h0, yb2, h1);
      };

      // 1) 台座頂面：梯形（後緣貼牆、比前緣窄），深色大理石格紋，兩側與前緣鑲金線
      g.save(); g.beginPath(); g.moveTo(cx - hwB, yb); g.lineTo(cx + hwB, yb); g.lineTo(cx + hwF, yf); g.lineTo(cx - hwF, yf); g.closePath(); g.clip();
      litStone(g, cx - hwF, yb, hwF * 2, yf - yb, '#2c2631', '#15111a');
      g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1;
      for (let i = -5; i <= 5; i++) { g.beginPath(); g.moveTo(cx + i * hwB / 5, yb); g.lineTo(cx + i * hwF / 5, yf); g.stroke(); }
      for (let i = 1; i < 4; i++) { const t = (i / 4) ** 1.3, y = yb + (yf - yb) * t; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      const warm = g.createRadialGradient(cx, yf, 0, cx, yf, A * .6); warm.addColorStop(0, 'rgba(255,150,70,.16)'); warm.addColorStop(1, 'rgba(255,150,70,0)'); g.fillStyle = warm; g.fillRect(cx - A, yb, A * 2, yf - yb);
      g.restore();
      // 台座頂面的金線：把台座邊界的梯形「垂直於每條邊」往內偏移，畫成封閉的雙線金框，每一條都和對應的邊完全平行
      const insetPoly = (pts, d) => {
        const n = pts.length, ls = pts.map((p, i) => { const q = pts[(i + 1) % n], dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy); return { x: p.x - dy / l * d, y: p.y + dx / l * d, dx, dy }; });
        return pts.map((_, i) => { const a1 = ls[(i + n - 1) % n], a2 = ls[i], det = a1.dx * a2.dy - a1.dy * a2.dx, t = ((a2.x - a1.x) * a2.dy - (a2.y - a1.y) * a2.dx) / det; return { x: a1.x + a1.dx * t, y: a1.y + a1.dy * t }; });
      };
      const slab = [{ x: cx - hwB, y: yb }, { x: cx + hwB, y: yb }, { x: cx + hwF, y: yf }, { x: cx - hwF, y: yf }];
      for (const [d, col, lw] of [[u * .75, 'rgba(222,184,98,.9)', 1.7], [u * .75 + 4, 'rgba(184,145,63,.5)', 1]]) {
        const q = insetPoly(slab, d); g.beginPath(); q.forEach((p2, i) => (i ? g.lineTo(p2.x, p2.y) : g.moveTo(p2.x, p2.y))); g.closePath(); g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'miter'; g.stroke();
      }
      // 台座頂面上的地毯：只從前緣到棺材腳（棺材後面沒有地毯），跟著同一個斜率收窄
      carpetTrap(top, k * (hwF - m * (yf - top)), yf, k * hwF, true);

      // 2) 三級階梯：立面（垂直、盲拱浮雕）與階面（梯形、受光的稜）
      treads = []; let y = yf;
      for (let i = 0; i < 3; i++) {
        const hr = hwR[i], hf = hwR[i + 1];
        // 立面：矩形，寬度 = 這一級的半寬 × 2
        g.save(); g.beginPath(); g.rect(cx - hr, y, hr * 2, rh); g.clip();
        litStone(g, cx - hr, y, hr * 2, rh, '#3a3340', '#171219');
        const sh = g.createLinearGradient(0, y, 0, y + rh); sh.addColorStop(0, 'rgba(0,0,0,.5)'); sh.addColorStop(.25, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(cx - hr, y, hr * 2, rh);
        const pitch = 4.8 * u, n = Math.floor(hr * 2 / pitch);
        for (let q = 0; q < n; q++) {
          const ax = cx - (n - 1) * pitch / 2 + q * pitch;
          if (Math.abs(ax - cx) < k * hr + 1.2 * u) continue; // 地毯蓋住的地方不雕
          arch(g, ax, y + rh * .16, 3.1 * u, rh * .72); const inn = g.createLinearGradient(0, y, 0, y + rh); inn.addColorStop(0, '#06040a'); inn.addColorStop(1, '#1b1620'); g.fillStyle = inn; g.fill();
          g.save(); g.translate(0, 1.1); arch(g, ax, y + rh * .16, 3.1 * u, rh * .72); g.strokeStyle = 'rgba(255,230,200,.16)'; g.lineWidth = 1.2; g.stroke(); g.restore();
          arch(g, ax, y + rh * .16, 3.1 * u, rh * .72); g.strokeStyle = 'rgba(184,145,63,.55)'; g.lineWidth = 1; g.stroke();
        }
        g.fillStyle = 'rgba(184,145,63,.7)'; g.fillRect(cx - hr, y + rh - 2, hr * 2, 2);
        g.restore();
        g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.strokeRect(cx - hr + .5, y + .5, hr * 2 - 1, rh - 1);
        carpetTrap(y, k * hr, y + rh, k * hr, false);
        y += rh;
        // 階面：梯形（後緣 = 上一個立面的寬，前緣更寬），比立面亮、前緣有一道受光的稜
        g.save(); g.beginPath(); g.moveTo(cx - hr, y); g.lineTo(cx + hr, y); g.lineTo(cx + hf, y + td); g.lineTo(cx - hf, y + td); g.closePath(); g.clip();
        litStone(g, cx - hf, y, hf * 2, td, '#5a5260', '#2c2631');
        g.restore();
        g.fillStyle = 'rgba(255,238,215,.32)'; g.fillRect(cx - hf, y + td - 1.5, hf * 2, 1.5);
        g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - hr, y); g.lineTo(cx - hf, y + td); g.lineTo(cx + hf, y + td); g.lineTo(cx + hr, y); g.stroke();
        carpetTrap(y, k * hr, y + td, k * hf, true);
        treads.push({ y: y + td * .55, w: (hr + hf) });
        y += td;
      }
      // 3) 階梯前的地面：地毯繼續往畫面前方鋪開，沿用同一個斜率往下變寬
      const hw0 = k * hwR[3], hw1 = hw0 + (H - y) * m * k * 1.15;
      g.beginPath(); g.moveTo(cx - hw0, y); g.lineTo(cx + hw0, y); g.lineTo(cx + hw1, H); g.lineTo(cx - hw1, H); g.closePath();
      const fc = g.createLinearGradient(0, y, 0, H); fc.addColorStop(0, '#4e0c1c'); fc.addColorStop(1, '#2a060e'); g.fillStyle = fc; g.fill();
      g.save(); g.clip(); grainRect(cx - hw1, y, hw1 * 2, H - y, .06); g.restore();
      goldBorder(y, hw0, H, hw1);
    }
    // 台座前緣兩端的石座：上面放一顆點著蠟燭的骷髏
    function plinths() {
      for (const side of [-1, 1]) {
        const px = cx + side * (aw * .84 / 2 + 1.3 * u), py = frontY - .2 * u, w = 2.3 * u, h = 2.5 * u, top2 = py - h;
        softShadow(g, () => { g.beginPath(); g.ellipse(px, py, w * .8, u * .3, 0, 0, TAU); g.fill(); }, u * .4, .6, 0, u * .15);
        g.save(); g.beginPath(); g.rect(px - w / 2, top2, w, h); g.clip(); litStone(g, px - w / 2, top2, w, h, '#4a4350', '#1a151f'); g.restore();
        g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.strokeRect(px - w / 2 + .5, top2 + .5, w - 1, h - 1);
        g.fillStyle = 'rgba(184,145,63,.7)'; g.fillRect(px - w / 2, top2 + u * .45, w, 1.5);
        const capY = top2 - u * .5; // 石座頂上的石板
        g.save(); g.beginPath(); g.rect(px - w * .62, capY, w * 1.24, u * .55); g.clip(); litStone(g, px - w * .62, capY, w * 1.24, u * .55, '#6a6370', '#3a3441'); g.restore();
        skull(g, px - w * .28, capY - u * .5, u * 1.25, .98);          // 骷髏在左
        candle(px + w * .3, capY, u * 1.7);                              // 蠟燭在右，站在石板上
      }
    }
    // 最後的光照遮罩：全場先壓暗，再依每一處光源（燭火、火把、彩窗、石台）把亮度挖回來，
    // 所以陳設只在被光照到的地方才清楚，離光越遠越暗，不會像貼上去的圖
    function lightingPass() {
      const cw = g.canvas.width, ch = g.canvas.height, k = cw / W;
      const dk = document.createElement('canvas'); dk.width = cw; dk.height = ch;
      const d = dk.getContext('2d'); d.setTransform(k, 0, 0, k, 0, 0);
      d.fillStyle = 'rgba(3,2,6,.62)'; d.fillRect(0, 0, W, H);
      d.globalCompositeOperation = 'destination-out';
      const hole = (x, y, r, a) => { const gr = d.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(.5, `rgba(0,0,0,${a * .45})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = gr; d.fillRect(x - r, y - r, r * 2, r * 2); };
      for (const c of candles) hole(c.x, c.y, u * 10 * (c.s || 1), .45);
      hole(cx, wy, radius * 3.4, .95);
      hole(cx, top - 6 * u, aw * .85, .65);
      hole(cx, H * .62, W * .5, .3);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(dk, 0, 0); g.restore();
    }
  }
  function resize(w,h,dpr,canvases,layout) {
    W=w; H=h; u=Math.min(W/100,H/56.25); L=layout;
    for(const c of [canvases.bg,canvases.front]) { c.width=Math.round(W*dpr); c.height=Math.round(H*dpr); c.getContext('2d').setTransform(dpr,0,0,dpr,0,0); }
    drawBackground(canvases.bg.getContext('2d'));
  }
  function drawFront(g,time,wind,calm) {
    g.clearRect(0,0,W,H); const t=calm?0:time;
    g.save(); g.globalCompositeOperation='lighter';
    for(const c of candles) {
      const pulse=1+.10*Math.sin(t*6+c.phase)+.05*Math.sin(t*17+c.phase*3), size=u*(c.s||1)*(1+.08*Math.sin(t*4+c.phase)),sway=Math.sin(t*3+c.phase)*u*.12;
      glow(g,c.x,c.y+2*u,size*5,`rgba(255,179,92,${.09*pulse})`); glow(g,c.x,c.y,size*2,`rgba(255,179,92,${.21*pulse})`);
      g.fillStyle=`rgba(255,179,92,${.8*pulse})`; g.beginPath(); g.moveTo(c.x,c.y); g.bezierCurveTo(c.x-size*.6,c.y-size,c.x+sway,c.y-size*2,c.x+sway,c.y-size*2.4); g.bezierCurveTo(c.x+size*.6,c.y-size,c.x+size*.4,c.y,c.x,c.y); g.fill();
      g.fillStyle='#fff2c9'; g.beginPath(); g.ellipse(c.x,c.y-size*.4,size*.16,size*.45,0,0,TAU); g.fill();
    } g.restore();
    // 貼地的低霧：幾團橫向的暗色霧氣緩慢飄過
    for(let i=0;i<6;i++) {
      const span=W+u*60, x=((t*(5+i*1.7)+i*span/6)%span)-u*30, y=H*(.72+(i%3)*.09), rx=u*(20+i*2), ry=u*(2.2+(i%3)*.8);
      g.save(); g.translate(x,y); g.scale(1,ry/rx);
      const f=g.createRadialGradient(0,0,0,0,0,rx); f.addColorStop(0,'rgba(190,175,215,.07)'); f.addColorStop(1,'rgba(190,175,215,0)');
      g.fillStyle=f; g.beginPath(); g.arc(0,0,rx,0,TAU); g.fill(); g.restore();
    }
    g.strokeStyle='rgba(185,169,143,.16)'; g.lineWidth=.7;
    for(const side of [-1,1]) {
      g.save(); g.translate(side<0?0:W,0); g.scale(side<0?1:-1,1);
      for(let i=0;i<=6;i++) { const a=i*Math.PI/12; g.beginPath(); g.moveTo(0,0); g.lineTo(Math.cos(a)*13*u,Math.sin(a)*13*u); g.stroke(); }
      for(let ring=1;ring<=5;ring++) { g.beginPath(); for(let i=0;i<=6;i++) { const a=i*Math.PI/12,d=ring*2.6*u; if(!i) g.moveTo(d,0); else g.quadraticCurveTo(Math.cos(a-.13)*d*.88,Math.sin(a-.13)*d*.88,Math.cos(a)*d,Math.sin(a)*d); } g.stroke(); } g.restore();
    }
  }
  return {resize,drawFront};
})();
