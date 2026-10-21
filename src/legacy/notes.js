let started = null;

/** Highlights and notes. Binds to the markup in notes-ui.html; call refresh() after a chapter is shown. */
export function initNotes(){
  if(started) return started;
  var KEY='jozve-notes', FA='۰۱۲۳۴۵۶۷۸۹', CTX=40, MAXLEN=6000;
  var CNAME={y:'زرد',g:'سبز',b:'آبی',p:'صورتی'};
  function fa(n){return String(n).replace(/[0-9]/g,function(d){return FA[d];});}
  function $(id){return document.getElementById(id);}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  var data={v:1,items:[],last:'y'};
  try{var raw=localStorage.getItem(KEY);if(raw){var d0=JSON.parse(raw);if(d0&&Array.isArray(d0.items)){data=d0;if(!data.last)data.last='y';}}}catch(e){}

  var bar=$('hl-bar'),noteWrap=$('hl-note-wrap'),noteT=$('hl-note-t'),ntWrap=$('nt-wrap'),list=$('nt-list'),btn=$('nt-btn'),toastEl=$('hl-toast');
  if(!bar||!btn) return;

  function save(){
    try{localStorage.setItem(KEY,JSON.stringify(data));}
    catch(e){toast('ذخیره در مرورگر ممکن نشد؛ برای نگه‌داشتن یادداشت‌ها از «پشتیبان JSON» استفاده کنید.');}
    badge(); if(!ntWrap.hidden) render();
  }
  function byId(id){for(var i=0;i<data.items.length;i++)if(data.items[i].id===id)return data.items[i];return null;}
  function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
  function badge(){var b=btn.querySelector('.nt-badge'),n=data.items.length;b.hidden=!n;b.textContent=n>99?'۹۹+':fa(n);}

  /* ---------- text model of a chapter ---------- */
  var SKIP='svg,script,style,textarea,input,button,.hl-ui';
  function ctx(sec){
    var w=document.createTreeWalker(sec,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode:function(n){
      if(n.nodeType===1) return n.matches(SKIP)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_SKIP;
      return NodeFilter.FILTER_ACCEPT;}});
    var nodes=[],pre=[0],parts=[],n;
    while((n=w.nextNode())){nodes.push(n);parts.push(n.data);pre.push(pre[pre.length-1]+n.length);}
    return {sec:sec,nodes:nodes,pre:pre,text:parts.join('')};
  }
  function offsetOf(c,node,off){
    if(node.nodeType===3){var k=c.nodes.indexOf(node);if(k>=0)return c.pre[k]+Math.min(off,node.length);}
    var r=document.createRange();r.setStart(node,off);
    var lo=0,hi=c.nodes.length;
    while(lo<hi){var m=(lo+hi)>>1;if(r.comparePoint(c.nodes[m],0)>=0)hi=m;else lo=m+1;}
    return c.pre[lo];
  }
  function wrap(c,it){
    var s=it.s,e=it.e,tg=[];
    for(var i=0;i<c.nodes.length;i++){var a=c.pre[i],b=c.pre[i+1];if(b<=s)continue;if(a>=e)break;tg.push([c.nodes[i],Math.max(s,a)-a,Math.min(e,b)-a]);}
    var marks=[];
    tg.forEach(function(t){
      var n=t[0],x=t[1],y=t[2];
      if(!/\S/.test(n.data.slice(x,y))) return;
      if(x>0){n=n.splitText(x);y-=x;}
      if(y<n.length) n.splitText(y);
      var m=document.createElement('mark');m.setAttribute('data-hl',it.id);
      n.parentNode.insertBefore(m,n);m.appendChild(n);marks.push(m);
    });
    decorate(it,marks);
    return marks.length;
  }
  function marksOf(id){return [].slice.call(document.querySelectorAll('mark.hl[data-hl="'+id+'"],mark[data-hl="'+id+'"]'));}
  function decorate(it,marks){
    marks=marks||marksOf(it.id);
    marks.forEach(function(m,i){
      m.className='hl hl-'+it.c+(it.n?' has-note':'')+(it.n&&i===marks.length-1?' hl-end':'');
      if(it.n)m.title=it.n;else m.removeAttribute('title');
    });
  }
  function unwrap(id){
    marksOf(id).forEach(function(m){var p=m.parentNode;while(m.firstChild)p.insertBefore(m.firstChild,m);p.removeChild(m);p.normalize();});
  }
  function locate(c,it){
    var T=c.text,q=it.q,L=q.length;
    if(T.substr(it.s,L)===q) return it.s;
    var best=-1,score=-1e9,pos=T.indexOf(q);
    while(pos>=0){
      var sc=0;
      if(it.pre&&T.slice(Math.max(0,pos-it.pre.length),pos)===it.pre)sc+=2;
      if(it.suf&&T.substr(pos+L,it.suf.length)===it.suf)sc+=2;
      sc-=Math.abs(pos-it.s)/1e7;
      if(sc>score){score=sc;best=pos;}
      pos=T.indexOf(q,pos+1);
    }
    return best;
  }
  function apply(items){
    var by={},changed=false;
    items.forEach(function(it){(by[it.ch]=by[it.ch]||[]).push(it);});
    Object.keys(by).forEach(function(ch){
      var sec=document.getElementById(ch);
      if(!sec){if(!CH[ch])by[ch].forEach(function(it){it.lost=true;});return;}
      var c=ctx(sec),minS=Infinity;
      by[ch].sort(function(a,b){return b.s-a.s;}).forEach(function(it){
        var p=locate(c,it);
        if(p<0){it.lost=true;return;}
        delete it.lost;
        if(p!==it.s){it.e=p+(it.e-it.s);it.s=p;changed=true;}
        if(it.e>minS) c=ctx(sec);
        if(!wrap(c,it)) it.lost=true;
        minS=Math.min(minS,it.s);
      });
    });
    if(changed) try{localStorage.setItem(KEY,JSON.stringify(data));}catch(e){}
  }

  /* ---------- selection → toolbar ---------- */
  var cur=null,down=false,selT;
  function headingFor(sec,node){
    var hs=sec.querySelectorAll('h3,h4'),h=null;
    for(var i=0;i<hs.length;i++){if(hs[i].compareDocumentPosition(node)&Node.DOCUMENT_POSITION_FOLLOWING)h=hs[i];else break;}
    if(!h) return '';
    var cl=h.cloneNode(true);[].forEach.call(cl.querySelectorAll('small'),function(s){s.remove();});
    return cl.textContent.replace(/\s+/g,' ').trim().slice(0,90);
  }
  var WS=/[\s‌‎‏]/;
  function selInfo(){
    var sel=window.getSelection();
    if(!sel||!sel.rangeCount||sel.isCollapsed) return null;
    var r=sel.getRangeAt(0),a=r.startContainer,b=r.endContainer;
    var ea=a.nodeType===1?a:a.parentElement,eb=b.nodeType===1?b:b.parentElement;
    if(!ea||!eb||ea.closest('.hl-ui')) return null;
    var sec=ea.closest('section.ch');
    if(!sec||eb.closest('section.ch')!==sec) return null;
    var c=ctx(sec),s=offsetOf(c,a,r.startOffset),e=offsetOf(c,b,r.endOffset);
    while(s<e&&WS.test(c.text[s]))s++;
    while(e>s&&WS.test(c.text[e-1]))e--;
    if(e<=s) return null;
    var rects=r.getClientRects();
    return {sec:sec,s:s,e:e,q:c.text.slice(s,e),pre:c.text.slice(Math.max(0,s-CTX),s),suf:c.text.slice(e,e+CTX),
      h:headingFor(sec,a),first:rects[0]||r.getBoundingClientRect(),last:rects[rects.length-1]||r.getBoundingClientRect()};
  }
  function place(first,last){
    bar.hidden=false;
    var bw=bar.offsetWidth,bh=bar.offsetHeight,vw=document.documentElement.clientWidth,vh=window.innerHeight;
    // always below the selection: browser selection menus (Edge mini menu, mobile menus) sit above it
    var anchor=last;
    var top=last.bottom+14;
    if(top+bh>vh-8) top=Math.max(8,first.top-bh-10);
    if(top+bh>vh-8||top<8) top=Math.max(8,vh-bh-16);
    var left=anchor.left+anchor.width/2-bw/2;
    left=Math.max(8,Math.min(vw-bw-8,left));
    bar.style.top=Math.round(top)+'px';bar.style.left=Math.round(left)+'px';
  }
  function showSel(info){
    cur={mode:'sel',info:info};
    bar.querySelector('[data-act="del"]').hidden=true;
    bar.querySelector('.hl-prev').hidden=true;
    [].forEach.call(bar.querySelectorAll('.sw'),function(b){b.removeAttribute('aria-pressed');});
    place(info.first,info.last);
  }
  function showMark(id,m){
    var it=byId(id);if(!it) return;
    cur={mode:'mark',id:id};
    bar.querySelector('[data-act="del"]').hidden=false;
    var pv=bar.querySelector('.hl-prev');
    pv.hidden=!it.n;pv.textContent=it.n?(it.n.length>300?it.n.slice(0,300)+'…':it.n):'';
    [].forEach.call(bar.querySelectorAll('.sw'),function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-c')===it.c));});
    var ms=marksOf(id),f=(ms[0]||m).getBoundingClientRect(),l=(ms[ms.length-1]||m).getBoundingClientRect();
    if(m){var r=m.getBoundingClientRect();f=r;l=r;}
    place(f,l);
  }
  function hideBar(){bar.hidden=true;cur=null;}
  function checkSel(){
    if(down) return;
    if(!noteWrap.hidden||!ntWrap.hidden) return;
    var info=selInfo();
    if(info){
      if(info.e-info.s>MAXLEN){hideBar();toast('متن انتخاب‌شده برای هایلایت خیلی طولانی است.');return;}
      showSel(info);
    } else if(cur&&cur.mode==='sel') hideBar();
  }
  document.addEventListener('pointerdown',function(e){if(!bar.contains(e.target)){down=true;if(cur&&!e.target.closest('mark.hl'))hideBar();}},true);
  document.addEventListener('pointerup',function(){down=false;setTimeout(checkSel,30);},true);
  document.addEventListener('pointercancel',function(){down=false;},true);
  document.addEventListener('selectionchange',function(){clearTimeout(selT);selT=setTimeout(checkSel,250);});
  document.addEventListener('keyup',function(e){if(e.shiftKey||e.key==='Shift')setTimeout(checkSel,30);});
  bar.addEventListener('pointerdown',function(e){e.preventDefault();});
  bar.addEventListener('mousedown',function(e){e.preventDefault();});
  document.addEventListener('click',function(e){
    var m=e.target.closest&&e.target.closest('mark.hl');
    if(!m||e.target.closest('a')) return;
    var sel=window.getSelection();if(sel&&!sel.isCollapsed) return;
    showMark(m.getAttribute('data-hl'),m);
  });
  window.addEventListener('scroll',function(){
    if(!cur) return;
    if(cur.mode==='mark'){hideBar();return;}
    var info=selInfo();if(info)place(info.first,info.last);else hideBar();
  },{passive:true});
  window.addEventListener('resize',function(){if(cur)hideBar();});

  function create(color){
    var info=cur&&cur.info;if(!info) return null;
    var it={id:uid(),ch:info.sec.id,s:info.s,e:info.e,q:info.q,pre:info.pre,suf:info.suf,h:info.h,c:color,n:'',t:Date.now()};
    if(!wrap(ctx(info.sec),it)) return null;
    data.items.push(it);data.last=color;save();
    var sel=window.getSelection();if(sel)sel.removeAllRanges();
    return it;
  }
  bar.addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b||!cur) return;
    var c=b.getAttribute('data-c'),act=b.getAttribute('data-act'),it;
    if(c){
      if(cur.mode==='sel'){create(c);}
      else{it=byId(cur.id);if(it){it.c=c;decorate(it);data.last=c;save();}}
      hideBar();return;
    }
    if(act==='note'){
      it=cur.mode==='sel'?create(data.last||'y'):byId(cur.id);
      hideBar();if(it)openNote(it);return;
    }
    if(act==='del'){var id=cur.id;hideBar();remove(id);}
  });

  /* ---------- delete with undo ---------- */
  function remove(id){
    var it=byId(id);if(!it) return;
    unwrap(id);data.items=data.items.filter(function(x){return x.id!==id;});save();
    toast(it.n?'هایلایت و یادداشتش حذف شد.':'هایلایت حذف شد.',function(){data.items.push(it);apply([it]);save();});
  }

  /* ---------- note editor ---------- */
  var noteId=null,lastFocus=null;
  function openNote(it){
    noteId=it.id;lastFocus=document.activeElement;
    var q=noteWrap.querySelector('.hl-q');
    q.textContent=it.q.length>260?it.q.slice(0,260)+'…':it.q;
    q.style.borderInlineStartColor='var(--sw-'+it.c+')';
    noteT.value=it.n||'';
    noteWrap.querySelector('[data-act="clear"]').hidden=!it.n;
    noteWrap.hidden=false;noteT.focus();
  }
  function closeNote(){noteWrap.hidden=true;noteId=null;if(lastFocus&&lastFocus.focus&&document.contains(lastFocus))lastFocus.focus({preventScroll:true});}
  function saveNote(v){
    var it=byId(noteId);
    if(it){it.n=v.replace(/\s+$/,'');decorate(it);save();toast(it.n?'یادداشت ذخیره شد.':'یادداشت پاک شد.');}
    closeNote();
  }
  noteWrap.addEventListener('click',function(e){
    if(e.target===noteWrap){closeNote();return;}
    var b=e.target.closest('button');if(!b) return;
    var a=b.getAttribute('data-act');
    if(a==='save')saveNote(noteT.value);else if(a==='cancel')closeNote();else if(a==='clear')saveNote('');
  });
  noteT.addEventListener('keydown',function(e){if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();saveNote(noteT.value);}});

  /* ---------- panel ---------- */
  var filt={f:'all',c:'',q:''};
  var CH=window.JOZVE_CH||{};
  function chInfo(id){var c=CH[id];return c?{n:c.n,t:c.t}:{n:'',t:id};}
  function chOrder(){var o={};Object.keys(CH).forEach(function(k){o[k]=CH[k].o;});return o;}
  function norm(s){return String(s||'').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/‌/g,' ').toLowerCase();}
  function sorted(items){var o=chOrder();return items.slice().sort(function(a,b){return ((o[a.ch]||0)-(o[b.ch]||0))||(a.s-b.s);});}
  function render(){
    var q=norm(filt.q),all=data.items,shown=sorted(all).filter(function(it){
      if(filt.f==='note'&&!it.n) return false;
      if(filt.c&&it.c!==filt.c) return false;
      if(q&&norm(it.q+' '+it.n+' '+it.h).indexOf(q)<0) return false;
      return true;});
    var nn=all.filter(function(x){return x.n;}).length;
    ntWrap.querySelector('.nt-sum').textContent=all.length?(fa(all.length)+' هایلایت، '+fa(nn)+' یادداشت'+(shown.length!==all.length?'؛ '+fa(shown.length)+' مورد با این فیلتر':'')):'';
    if(!all.length){
      list.innerHTML='<div class="nt-empty"><p>هنوز هایلایت یا یادداشتی ندارید.</p><p><b>هایلایت:</b> بخشی از متن یک فصل را انتخاب کنید؛ نواری با چهار رنگ ظاهر می‌شود. یکی از رنگ‌ها را بزنید.</p><p><b>یادداشت:</b> در همان نوار دکمه‌ی «یادداشت» را بزنید. برای ویرایش یا حذف، روی متن هایلایت‌شده کلیک کنید.</p><p>همه‌چیز در همین مرورگر ذخیره می‌شود. برای انتقال به دستگاه دیگر یا نگه‌داشتن نسخه‌ی پشتیبان، از «پشتیبان JSON» استفاده کنید.</p></div>';
      return;
    }
    if(!shown.length){list.innerHTML='<div class="nt-empty">موردی با این فیلتر پیدا نشد.</div>';return;}
    var html='',lastCh=null;
    shown.forEach(function(it){
      if(it.ch!==lastCh){
        if(lastCh!==null)html+='</ol></section>';
        var ci=chInfo(it.ch);
        html+='<section class="nt-g"><div class="nt-gh" role="heading" aria-level="3">'+(ci.n?'فصل '+esc(ci.n)+' · ':'')+esc(ci.t)+'</div><ol>';
        lastCh=it.ch;
      }
      var d='';try{d=new Date(it.t).toLocaleDateString('fa-IR');}catch(e){}
      html+='<li class="nt-i" data-id="'+esc(it.id)+'" style="--c:var(--sw-'+esc(it.c)+')">'+
        '<div class="nt-meta"><span>'+esc(it.h||'')+'</span><span>'+esc(d)+'</span></div>'+
        '<blockquote class="nt-qt" dir="rtl" data-a="go" title="رفتن به این بخش از متن">'+esc(it.q)+'</blockquote>'+
        (it.n?'<p class="nt-n" dir="rtl">'+esc(it.n)+'</p>':'')+
        (it.lost?'<p class="nt-lost">جای این متن در جزوه پیدا نشد (احتمالاً متن عوض شده است). یادداشت محفوظ است.</p>':'')+
        '<div class="nt-a"><button type="button" data-a="go"'+(it.lost?' disabled':'')+'>رفتن به متن</button>'+
        '<button type="button" data-a="note"'+(it.lost?' disabled':'')+'>'+(it.n?'ویرایش یادداشت':'افزودن یادداشت')+'</button>'+
        '<button type="button" data-a="del" class="hl-danger">حذف</button></div></li>';
    });
    html+='</ol></section>';
    list.innerHTML=html;
  }
  var panelFocus=null;
  function openPanel(){hideBar();panelFocus=document.activeElement;filt.q='';$('nt-q').value='';render();ntWrap.hidden=false;btn.setAttribute('aria-expanded','true');$('nt-close').focus();}
  function closePanel(){ntWrap.hidden=true;btn.setAttribute('aria-expanded','false');resetClear();if(panelFocus&&panelFocus.focus)panelFocus.focus({preventScroll:true});}
  btn.addEventListener('click',function(){if(ntWrap.hidden)openPanel();else closePanel();});
  $('nt-close').addEventListener('click',closePanel);
  ntWrap.addEventListener('click',function(e){if(e.target===ntWrap)closePanel();});
  $('nt-q').addEventListener('input',function(){filt.q=this.value;render();});
  $('nt-f').addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b) return;filt.f=b.getAttribute('data-f');
    [].forEach.call(this.querySelectorAll('button'),function(x){x.setAttribute('aria-pressed',String(x===b));});render();});
  [].forEach.call(ntWrap.querySelectorAll('[data-fc]'),function(b){b.addEventListener('click',function(){
    var c=b.getAttribute('data-fc');filt.c=filt.c===c?'':c;
    [].forEach.call(ntWrap.querySelectorAll('[data-fc]'),function(x){x.setAttribute('aria-pressed',String(x.getAttribute('data-fc')===filt.c));});render();});});
  list.addEventListener('click',function(e){
    var t=e.target.closest('[data-a]');if(!t||t.disabled) return;
    var li=t.closest('.nt-i'),id=li&&li.getAttribute('data-id'),it=byId(id),a=t.getAttribute('data-a');
    if(!it) return;
    if(a==='go'){if(it.lost)return;closePanel();if(document.getElementById(it.ch))jump(id);else if(CH[it.ch])window.jozveGo(CH[it.ch].h+'#hl='+encodeURIComponent(id));}
    else if(a==='note'){openNote(it);}
    else if(a==='del'){remove(id);}
  });

  function jump(id){
    var ms=marksOf(id);if(!ms.length) return;
    var el=ms[0],prev=null,stable=0,n=0,token={};jump.cur=token;
    (function step(){
      if(jump.cur!==token) return;
      var t=Math.round(el.getBoundingClientRect().top);
      if(prev!==null&&Math.abs(t-prev)<=1)stable++;else stable=0;
      el.scrollIntoView({block:'center',behavior:'instant'});
      prev=Math.round(el.getBoundingClientRect().top);
      if(stable<4&&n++<40)requestAnimationFrame(step);
      else ms.forEach(function(m){m.classList.remove('flash');void m.offsetWidth;m.classList.add('flash');});
    })();
    var stop=function(){jump.cur=null;window.removeEventListener('wheel',stop);window.removeEventListener('touchstart',stop);};
    window.addEventListener('wheel',stop,{passive:true});window.addEventListener('touchstart',stop,{passive:true});
  }

  /* ---------- export / import ---------- */
  function stamp(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function download(name,text,type){
    var blob=new Blob([text],{type:type}),a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1500);
  }
  function toMd(){
    var out=['# یادداشت‌ها و هایلایت‌های جزوه‌ی کوبرنتیز','',''+new Date().toLocaleDateString('fa-IR'),''],lastCh=null;
    sorted(data.items).forEach(function(it){
      if(it.ch!==lastCh){var ci=chInfo(it.ch);out.push('## '+(ci.n?'فصل '+ci.n+' — ':'')+ci.t,'');lastCh=it.ch;}
      if(it.h) out.push('**'+it.h+'** · '+CNAME[it.c]);
      it.q.split(/\n/).forEach(function(l){out.push('> '+l);});
      if(it.n){out.push('');it.n.split(/\n/).forEach(function(l){out.push(l);});}
      out.push('','---','');
    });
    return out.join('\n');
  }
  var clearArmed=false,clearT;
  function resetClear(){clearArmed=false;var b=ntWrap.querySelector('[data-x="clear"]');if(b)b.textContent='حذف همه';}
  ntWrap.querySelector('.nt-foot').addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b) return;var x=b.getAttribute('data-x');
    if(x==='md'){if(!data.items.length){toast('چیزی برای خروجی گرفتن نیست.');return;}download('jozve-notes-'+stamp()+'.md',toMd(),'text/markdown;charset=utf-8');}
    else if(x==='json'){if(!data.items.length){toast('چیزی برای پشتیبان‌گیری نیست.');return;}
      download('jozve-notes-'+stamp()+'.json',JSON.stringify({app:'k8s-jozve-notes',v:1,exported:new Date().toISOString(),items:data.items.map(function(it){var o={};for(var k in it)if(k!=='lost')o[k]=it[k];return o;})},null,1),'application/json');}
    else if(x==='imp'){$('nt-file').click();}
    else if(x==='clear'){
      if(!data.items.length) return;
      if(!clearArmed){clearArmed=true;b.textContent='برای حذف همه دوباره بزنید';clearTimeout(clearT);clearT=setTimeout(resetClear,4000);return;}
      resetClear();var old=data.items.slice();
      old.forEach(function(it){unwrap(it.id);});data.items=[];save();
      toast(fa(old.length)+' مورد حذف شد.',function(){data.items=old;apply(old);save();});
    }
  });
  $('nt-file').addEventListener('change',function(){
    var f=this.files&&this.files[0];this.value='';if(!f) return;
    var rd=new FileReader();
    rd.onload=function(){
      try{
        var d=JSON.parse(rd.result),arr=Array.isArray(d)?d:(d&&d.items);
        if(!Array.isArray(arr)) throw 0;
        var add=arr.filter(function(it){return it&&typeof it.id==='string'&&typeof it.q==='string'&&typeof it.ch==='string'&&typeof it.s==='number'&&typeof it.e==='number'&&!byId(it.id);})
          .map(function(it){return {id:it.id,ch:it.ch,s:it.s,e:it.e,q:it.q,pre:String(it.pre||''),suf:String(it.suf||''),h:String(it.h||''),c:CNAME[it.c]?it.c:'y',n:String(it.n||''),t:+it.t||Date.now()};});
        data.items=data.items.concat(add);apply(add);save();
        var lost=add.filter(function(x){return x.lost;}).length;
        toast(fa(add.length)+' مورد تازه اضافه شد'+(lost?'؛ جای '+fa(lost)+' مورد در متن پیدا نشد.':'.'));
      }catch(e){toast('این فایل پشتیبان معتبر یادداشت‌های جزوه نیست.');}
    };
    rd.readAsText(f);
  });

  /* ---------- toast ---------- */
  var toastT;
  function toast(msg,undo){
    var sp=toastEl.querySelector('span'),ub=toastEl.querySelector('button');
    sp.textContent=msg;ub.hidden=!undo;
    ub.onclick=undo?function(){toastEl.hidden=true;undo();}:null;
    toastEl.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){toastEl.hidden=true;},undo?6000:2600);
  }

  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape') return;
    if(!noteWrap.hidden){closeNote();return;}
    if(!ntWrap.hidden){closePanel();return;}
    if(cur){hideBar();}
  });
  // keep focus inside open dialogs
  document.addEventListener('focusin',function(e){
    var box=!noteWrap.hidden?$('hl-note'):(!ntWrap.hidden?$('nt-panel'):null);
    if(box&&!box.contains(e.target)){var f=box.querySelector('textarea,input,button');if(f)f.focus();}
  });

  badge();
  function refresh(){apply(data.items);badge();}
  started={refresh:refresh,jump:jump};
  return started;
}
