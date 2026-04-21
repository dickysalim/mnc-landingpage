/* ---------- 0. SCROLL RESTORATION ---------- */
if('scrollRestoration' in history){history.scrollRestoration='manual';}
window.scrollTo(0,0);

(function(){'use strict';

/* ---------- 1. inboundId_generator ---------- */
var inboundId=(function(){
  var chars='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',result='';
  for(var i=0;i<7;i++)result+=chars.charAt(Math.floor(Math.random()*chars.length));
  return result;
})();
window.inboundId=inboundId;



/* ---------- 2b. PHASE 2 REVEAL (200px before trigger enters viewport) ---------- */
(function(){
  var phase2=document.getElementById('phase2-content');
  var trigger=document.getElementById('phase1-end-trigger');
  if(!phase2||!trigger)return;
  var obs=new IntersectionObserver(function(entries,o){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        phase2.style.display='block';
        o.disconnect();
        if(window._fetchDist)window._fetchDist();
        if(window._refreshTrackers)window._refreshTrackers();
      }
    });
  },{rootMargin:'200px'});
  obs.observe(trigger);
})();

/* ---------- 3. section_tracker ---------- */
(function(){
  var LINE=0.27,trackers=[],ticking=false,baselineSet=false;
  /* sections that need a different trigger line (fraction of vh) */
  var LINE_OVERRIDES={'viewOffer':0.75};

  function buildTrackers(){
    var nodes=document.querySelectorAll('.section-tracker');
    for(var i=0;i<nodes.length;i++){
      var name=nodes[i].getAttribute('data-section-name')||('section_'+(i+1));
      /* skip elements inside display:none containers (e.g. Phase 2 not yet revealed) */
      if(!nodes[i].offsetParent)continue;
      /* skip if already registered */
      var exists=false;
      for(var j=0;j<trackers.length;j++){if(trackers[j].name===name){exists=true;break;}}
      if(!exists)trackers.push({el:nodes[i],name:name,triggered:false,prevTop:Infinity});
    }
    /* recalculate order by DOM position */
    trackers.sort(function(a,b){
      var ar=a.el.getBoundingClientRect().top+window.scrollY;
      var br=b.el.getBoundingClientRect().top+window.scrollY;
      return ar-br;
    });
    for(var i=0;i<trackers.length;i++){trackers[i].order=i+1;}
  }

  function setBaseline(){
    for(var i=0;i<trackers.length;i++){
      trackers[i].prevTop=trackers[i].el.getBoundingClientRect().top;
    }
    baselineSet=true;
  }

  function check(){
    ticking=false;
    var vh=window.innerHeight||document.documentElement.clientHeight;
    for(var i=0;i<trackers.length;i++){
      var t=trackers[i];if(t.triggered||!t.el)continue;
      var lineY=vh*(LINE_OVERRIDES[t.name]!==undefined?LINE_OVERRIDES[t.name]:LINE);
      var top=t.el.getBoundingClientRect().top;
      if(top<=lineY&&t.prevTop>lineY){t.triggered=true;window.dataLayer.push({event:'trackSection',section_name:t.name,section_order:t.order});}
      t.prevTop=top;
    }
  }

  function req(){if(ticking)return;ticking=true;requestAnimationFrame(check);}

  function activate(){
    buildTrackers();
    setBaseline();
    /* fire sections already inside the trigger zone on load (e.g. hookIntro) */
    var vh=window.innerHeight||document.documentElement.clientHeight;
    for(var i=0;i<trackers.length;i++){
      var t=trackers[i];if(t.triggered)continue;
      var lineY=vh*(LINE_OVERRIDES[t.name]!==undefined?LINE_OVERRIDES[t.name]:LINE);
      if(t.prevTop<=lineY){t.triggered=true;window.dataLayer.push({event:'trackSection',section_name:t.name,section_order:t.order});}
    }
    window.addEventListener('scroll',req,{passive:true});
    window.addEventListener('resize',req);
  }

  ['scroll','touchstart','click'].forEach(function(e){window.addEventListener(e,activate,{once:true,passive:true});});

  /* called by Phase 2 reveal to register newly visible trackers */
  window._refreshTrackers=function(){
    buildTrackers();
    /* fire any Phase 2 sections already in view */
    var vh=window.innerHeight||document.documentElement.clientHeight;
    for(var i=0;i<trackers.length;i++){
      var t=trackers[i];if(t.triggered)continue;
      var lineY=vh*(LINE_OVERRIDES[t.name]!==undefined?LINE_OVERRIDES[t.name]:LINE);
      var top=t.el.getBoundingClientRect().top;
      t.prevTop=top;
      if(top<=lineY){t.triggered=true;window.dataLayer.push({event:'trackSection',section_name:t.name,section_order:t.order});}
    }
  };
})();

/* ---------- 4. ccom_mdcs_button_handler ---------- */
[{sel:'.whatsapp-button',phone:'6281584021443',pre:'CC-',ch:'CCOM'},
 {sel:'.whatsapp-button-mdc',phone:'6282195277642',pre:'DC-',ch:'MDCS'}
].forEach(function(cfg){
  document.querySelectorAll(cfg.sel).forEach(function(btn){
    btn.addEventListener('click',function(e){
      e.preventDefault();
      var msg=(btn.getAttribute('data-message')||'')+'\n\nKode Unik Pelanggan ['+cfg.pre+inboundId+']. Jangan Hapus Kode Unik Anda.';
      window.dataLayer.push({event:'leadEvent',inbound_id:cfg.pre+inboundId,sales_channel:cfg.ch,offer_type:btn.getAttribute('data-offer')||''});
      window.open('https://wa.me/'+cfg.phone+'?text='+encodeURIComponent(msg),'_blank');
    });
  });
});

/* ---------- 5. HEADER SIDEBAR ---------- */
(function(){
  var sidebar=document.getElementById('sidebar'),overlay=document.getElementById('sidebar-overlay');
  var open=document.getElementById('hamburger-btn'),close=document.getElementById('sidebar-close');
  var isOpen=false;
  function openMenu(){isOpen=true;sidebar.classList.add('open');sidebar.setAttribute('aria-hidden','false');overlay.classList.add('visible');setTimeout(function(){overlay.classList.add('opaque');},10);}
  function closeMenu(){isOpen=false;sidebar.classList.remove('open');sidebar.setAttribute('aria-hidden','true');overlay.classList.remove('opaque');setTimeout(function(){overlay.classList.remove('visible');},300);}
  open.addEventListener('click',function(e){e.stopPropagation();openMenu();});
  close.addEventListener('click',closeMenu);
  overlay.addEventListener('click',closeMenu);
  window.addEventListener('scroll',function(){if(isOpen)closeMenu();},{passive:true});
})();

/* ---------- 6. YOUTUBE FACADES ---------- */
/* Main video — uses dedicated IDs on the padding-bottom wrapper */
(function(){
  var container=document.getElementById('yt-main-container');
  if(!container)return;
  function playMain(){
    var vid=container.dataset.vid;
    var iframe=document.createElement('iframe');
    iframe.src='https://www.youtube-nocookie.com/embed/'+vid+'?autoplay=1&rel=0';
    iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen=true;
    iframe.style.cssText='position:absolute;inset:0;width:100%;height:100%;border:none;';
    container.innerHTML='';container.appendChild(iframe);container.style.cursor='default';
    container.removeEventListener('click',playMain);container.removeEventListener('keydown',onKey);
  }
  function onKey(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();playMain();}}
  container.addEventListener('click',playMain);container.addEventListener('keydown',onKey);
})();
/* Inline video-list facades (testimonials) */
document.querySelectorAll('.yt-facade').forEach(function(facade){
  function play(){
    var vid=facade.dataset.vid;
    var iframe=document.createElement('iframe');
    iframe.src='https://www.youtube-nocookie.com/embed/'+vid+'?autoplay=1&rel=0';
    iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen=true;
    /* If inside a video carousel, stop auto-advance */
    var carousel=facade.closest('.carousel--video');
    if(carousel&&typeof carousel._stopAutoplay==='function')carousel._stopAutoplay();
    facade.innerHTML='';facade.appendChild(iframe);facade.style.cursor='default';
    facade.removeEventListener('click',play);facade.removeEventListener('keydown',onKey);
  }
  function onKey(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();play();}}
  facade.addEventListener('click',play);facade.addEventListener('keydown',onKey);
});

/* ---------- 7. CAROUSELS (CSS scroll-snap + dots) ---------- */
document.querySelectorAll('.carousel').forEach(function(wrapper){
  var track=wrapper.querySelector('.carousel-track');
  var slides=wrapper.querySelectorAll('.carousel-slide');
  var dotsEl=wrapper.querySelector('.carousel-dots');
  var n=slides.length;if(!track||!n||!dotsEl)return;
  var dots=[],cur=0;
  for(var i=0;i<n;i++){
    var d=document.createElement('button');
    d.className='dot'+(i===0?' active':'');d.setAttribute('aria-label','Slide '+(i+1));d.setAttribute('role','tab');
    dotsEl.appendChild(d);dots.push(d);
  }
  function setActive(idx){cur=idx;dots.forEach(function(d,i){d.classList.toggle('active',i===idx);});}
  function goTo(idx){setActive(idx);track.scrollTo({left:idx*track.offsetWidth,behavior:'smooth'});}
  dots.forEach(function(d,i){d.addEventListener('click',function(){goTo(i);stop();});});
  /* IntersectionObserver to sync dots on swipe */
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting&&e.intersectionRatio>=0.5){var idx=Array.from(slides).indexOf(e.target);if(idx!==-1)setActive(idx);}
    });
  },{root:track,threshold:0.5});
  slides.forEach(function(s){io.observe(s);});
  /* Auto-advance — only when carousel is visible in viewport */
  var timer=null;
  function start(){if(timer)return;timer=setInterval(function(){goTo((cur+1)%n);},3500);}
  function stop(){clearInterval(timer);timer=null;}
  var visObs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){if(e.isIntersecting)start();else stop();});
  },{threshold:0.3});
  visObs.observe(wrapper);
  wrapper.addEventListener('touchstart',stop,{passive:true});
  wrapper.addEventListener('touchend',function(){setTimeout(start,3000);},{passive:true});
  /* Expose stop for video carousels — facade handler calls this when playback starts */
  wrapper._stopAutoplay=stop;
});

/* ---------- 8. AOS POLYFILL ---------- */
(function(){
  var els=document.querySelectorAll('[data-aos]');if(!els.length)return;
  var obs=new IntersectionObserver(function(entries,o){
    entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('aos-animate');o.unobserve(e.target);}});
  },{threshold:0.1});
  els.forEach(function(el){obs.observe(el);});
})();

/* ---------- 9. mpsh_button_handler ---------- */
[{id:'MPSH-Tokopedia',type:'tokopedia',label:'Tokopedia'},
 {id:'MPSH-Shopee',type:'shopee',label:'Shopee'},
 {id:'MPSH-Tiktok',type:'tiktok',label:'Tiktok Shop'}
].forEach(function(b){
  var el=document.getElementById(b.id);if(!el)return;
  el.addEventListener('click',function(e){
    e.preventDefault();
    var id='MP-'+inboundId;
    window.dataLayer.push({event:'leadEvent',sales_channel:'MPSH',offer_type:b.type,inbound_id:id});
    window.open('https://wa.me/6285882893126?text='+encodeURIComponent('Kirimkan kode ini ['+id+'] untuk mendapatkan alamat '+b.label+' mGanik Pusat'),'_blank');
  });
});

/* ---------- 10. DISTRIBUTOR WIDGET ---------- */
(function(){
  var cityDataMap={},availableKota=[],provinceToCitiesMap={},availableProvinces=[],rawDistributorData=[];
  var cityToProvinceMap={},agentDLVRegistry={};
  var searchInput=document.getElementById('citySearch');
  var suggestionBox=document.getElementById('suggestionBox');
  var notFoundMessage=document.getElementById('notFoundMessage');
  var searchResultsContainer=document.getElementById('searchResultsContainer');
  var accordionContainer=document.getElementById('accordionContainer');
  var ROUTING_PHONE='6285882893126';

  /* If distributor widget elements don't exist on this page, bail out gracefully */
  if(!searchInput||!suggestionBox||!notFoundMessage||!searchResultsContainer||!accordionContainer)return;

  function debounce(fn,w){var t;return function(){var a=arguments,ctx=this;clearTimeout(t);t=setTimeout(function(){fn.apply(ctx,a);},w||300);};}

  window.loadDistributors=function(payload){
    if(!payload||payload.status!=='Success'||!payload.data||!payload.data.distributors)return;
    rawDistributorData=payload.data.distributors;
    rawDistributorData.forEach(function(prov){
      if(prov.name){availableProvinces.push(prov.name);provinceToCitiesMap[prov.name]=[];}
      if(prov.cities&&Array.isArray(prov.cities)){prov.cities.forEach(function(city){
        if(city.name&&city.distributorBrands&&city.distributorBrands.length>0){
          cityDataMap[city.name]=city.distributorBrands;availableKota.push(city.name);
          if(prov.name){provinceToCitiesMap[prov.name].push(city.name);cityToProvinceMap[city.name]=prov.name;}
        }
      });}
    });
    availableKota=[...new Set(availableKota)].filter(Boolean);
    availableProvinces=[...new Set(availableProvinces)].filter(Boolean);
    buildAccordion();searchInput.disabled=false;
  };

  function fetchDist(){
    if(document.getElementById('mganik-distributor-script'))return;
    var s=document.createElement('script');s.id='mganik-distributor-script';
    s.src='https://mganik-cache.pages.dev/prod/mganik-distributors-v1.js';
    document.head.appendChild(s);
  }
  /* Expose for Phase 2 reveal handler; also fallback timeout */
  window._fetchDist=fetchDist;
  setTimeout(fetchDist,5000);

  searchInput.addEventListener('input',function(){window.dataLayer.push({event:'searchDp'});},{once:true});
  searchInput.addEventListener('input',debounce(function(){
    var q=searchInput.value.toLowerCase().trim();
    suggestionBox.innerHTML='';suggestionBox.style.display='none';notFoundMessage.style.display='none';
    searchResultsContainer.innerHTML='';searchResultsContainer.style.display='none';accordionContainer.style.display='block';
    if(!q.length)return;
    var show=[];
    availableProvinces.filter(function(p){return p.toLowerCase().includes(q);}).forEach(function(p){show=show.concat(provinceToCitiesMap[p]);});
    show=show.concat(availableKota.filter(function(k){return k.toLowerCase().includes(q);}));
    show=[...new Set(show)];
    if(show.length){
      show.forEach(function(kota){var li=document.createElement('li');li.textContent=kota;li.addEventListener('click',function(){searchInput.value=kota;suggestionBox.style.display='none';accordionContainer.style.display='none';searchResultsContainer.style.display='flex';renderAgentCards(kota,cityDataMap[kota]);});suggestionBox.appendChild(li);});
      suggestionBox.style.display='block';
    }else{notFoundMessage.style.display='block';}
  }));
  document.addEventListener('click',function(e){if(!searchInput.contains(e.target)&&!suggestionBox.contains(e.target))suggestionBox.style.display='none';});

  function buildAccordion(){
    var html='';
    rawDistributorData.slice().sort(function(a,b){return a.name.localeCompare(b.name);}).forEach(function(prov){
      var cities=prov.cities.filter(function(c){return c.distributorBrands&&c.distributorBrands.length>0;});
      if(!cities.length)return;
      html+='<div class="acc-prov-item"><div class="acc-prov-header">'+prov.name+'</div><div class="acc-prov-body"><div class="acc-prov-body-inner"><div style="padding:10px">';
      cities.slice().sort(function(a,b){return a.name.localeCompare(b.name);}).forEach(function(city){
        html+='<div class="acc-city-item"><div class="acc-city-header" data-city="'+city.name+'" data-prov="'+prov.name+'">'+city.name+'</div><div class="acc-city-body"><div class="acc-city-body-inner"><div class="acc-city-content" data-loaded="false"></div></div></div></div>';
      });
      html+='</div></div></div></div>';
    });
    accordionContainer.innerHTML=html;
    var provHeaders=document.querySelectorAll('#mganik-distributor-wrapper .acc-prov-header');
    provHeaders.forEach(function(h){h.addEventListener('click',function(){var wasOpen=this.classList.contains('active');provHeaders.forEach(function(x){x.classList.remove('active');x.nextElementSibling.classList.remove('open');});if(!wasOpen){this.classList.add('active');this.nextElementSibling.classList.add('open');}});});
    var cityHeaders=document.querySelectorAll('#mganik-distributor-wrapper .acc-city-header');
    cityHeaders.forEach(function(h){h.addEventListener('click',function(){
      var city=this.getAttribute('data-city'),prov=this.getAttribute('data-prov');
      var body=this.nextElementSibling,content=body.querySelector('.acc-city-content');
      if(content.getAttribute('data-loaded')==='false'){
        var agents=(cityDataMap[city]||[]).slice().sort(function(a,b){return(a.order||99)-(b.order||99);});
        var cid=city.replace(/[^a-zA-Z0-9]/g,'');
        var ahtml='';agents.forEach(function(agent,i){ahtml+=genCardHTML(agent,i,'ACC-'+cid,city,prov);});
        content.innerHTML=ahtml;content.setAttribute('data-loaded','true');attachListeners(content);
      }
      var wasOpen=this.classList.contains('active');
      cityHeaders.forEach(function(x){x.classList.remove('active');x.nextElementSibling.classList.remove('open');});
      if(!wasOpen){this.classList.add('active');body.classList.add('open');}
    });});
  }

  function getShippingTags(a){
    var t='';
    if(a.distributor&&Array.isArray(a.distributor.shippings))a.distributor.shippings.forEach(function(s){
      var n=s.name.toLowerCase();
      if(n.includes('jne'))t+='<div class="tag"><img src="https://e7.pngegg.com/pngimages/168/7/png-clipart-jne-logistic-semarang-jalur-nugraha-ekakurir-logistics-logo-delivery-business-blue-text.png" alt="JNE"></div>';
      else if(n.includes('j&t')||n.includes('jnt'))t+='<div class="tag"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/J%26T_Express_logo.svg/1280px-J%26T_Express_logo.svg.png" alt="J&T"></div>';
      else if(n.includes('sicepat'))t+='<div class="tag"><img src="https://fe-cft.cdn.sicepat.express/virgo/b5f1aac8f625ebd475f85c70181a1139.png" alt="SiCepat"></div>';
      else if(n.includes('kurir lainnya'))t+='<div class="tag" style="gap:4px;font-size:9px;font-weight:700"><img src="https://mganik-assets.pages.dev/assets/pengiriman.svg" alt="Kurir Lainnya"> Kurir Lainnya</div>';
    });
    if(a.distributor&&a.distributor.isCOD)t+='<div class="tag" style="gap:4px;font-size:9px;font-weight:700"><img src="https://mganik-assets.pages.dev/assets/cod.svg" alt="Bisa COD"> Bisa COD</div>';
    return t;
  }
  function getMarketIcons(a,uid){
    var m='';
    if(a.tokopedia)m+='<a id="D2OR-Tokopedia-'+uid+'" class="icon-market d2or-trackable" data-type="tokopedia" data-prefix="FM" data-dlv-id="'+uid+'"><img src="https://mganik-assets.pages.dev/assets/tokopedia.png" alt="Tokopedia"></a>';
    if(a.shopee)m+='<a id="D2OR-Shopee-'+uid+'" class="icon-market d2or-trackable" data-type="shopee" data-prefix="FM" data-dlv-id="'+uid+'"><img src="https://mganik-assets.pages.dev/assets/shopee.png" alt="Shopee"></a>';
    if(a.lazada)m+='<a id="D2OR-Lazada-'+uid+'" class="icon-market d2or-trackable" data-type="lazada" data-prefix="FM" data-dlv-id="'+uid+'"><img src="https://mganik-assets.pages.dev/assets/lazada.png" alt="Lazada"></a>';
    if(a.tiktok)m+='<a id="D2OR-Tiktok-'+uid+'" class="icon-market d2or-trackable" data-type="tiktok" data-prefix="FM" data-dlv-id="'+uid+'"><img src="https://mganik-assets.pages.dev/assets/tiktok.png" alt="TikTok Shop"></a>';
    return m;
  }
  function genCardHTML(agent,index,prefix,city,province){
    var uid=prefix+'-'+index;
    var loc=(agent.lat&&agent.lng)?agent.lat+','+agent.lng:(agent.googleMapsUrl||'N/A');
    agentDLVRegistry[uid]={kode_agen:agent.newAgentCode||agent.oldAgentCode||'N/A',nama_agen:agent.name||'N/A',kota_agen:city||'N/A',provinsi_agen:province||'N/A',agen_phone:(agent.distributor&&agent.distributor.phone1)||'N/A',location_links:loc,raw_marketplaces:{tokopedia:agent.tokopedia||'',shopee:agent.shopee||'',lazada:agent.lazada||'',tiktok:agent.tiktok||'',bukalapak:agent.bukalapak||''}};
    var ship=getShippingTags(agent),mkt=getMarketIcons(agent,uid);
    var shipHtml=ship?'<div class="section-label">Melayani pengiriman:</div><div class="shipping-tags">'+ship+'</div>':'';
    var mktHtml=mkt?'<div class="marketplace-title">Tersedia di marketplace online:</div><div class="marketplace-icons-inline">'+mkt+'</div><p class="disclaimer">*Dapatkan marketplace Mitra via WhatsApp</p>':'';
    var star=agent.isStarSeller?'<div class="star-badge">★ Star Seller</div>':'';
    return '<div class="mobile-wrapper"><div class="store-card"><div class="card-header"><img class="avatar" src="https://mganik-assets.pages.dev/assets/placeholder_foto.png" alt="Profile"><div class="title-col"><div class="store-name">'+(agent.name||'Agen mGanik')+'</div>'+star+'</div></div><div class="card-address"><img src="https://mganik-assets.pages.dev/assets/pinlocation_googlemaps.svg" style="width:16px;height:16px;margin-top:2px"><div class="address-col"><p class="address-text">'+(agent.address||'Alamat tersedia via WhatsApp')+'</p><a id="D2OR-Maps-'+uid+'" class="maps-link d2or-trackable" data-type="location" data-prefix="FL" data-dlv-id="'+uid+'">Dapatkan link maps dari Mitra</a></div></div><div class="mganik-separator-line"></div>'+shipHtml+'<div class="btn-container"><a id="D2OR-MainOffer-'+uid+'" class="btn-wa d2or-trackable" data-type="whatsapp" data-prefix="FW" data-dlv-id="'+uid+'"><img src="https://mganik-assets.pages.dev/assets/whatsapp.png" width="20"> Hubungi via WhatsApp</a></div>'+mktHtml+'</div></div>';
  }
  function renderAgentCards(city,agents){
    var sorted=agents.slice().sort(function(a,b){return(a.order||99)-(b.order||99);});
    var html='<div class="result-header">Menampilkan '+sorted.length+' agen di <strong>'+city+'</strong></div>';
    var prov=cityToProvinceMap[city]||'N/A';
    sorted.forEach(function(a,i){html+=genCardHTML(a,i,'SRCH',city,prov);});
    searchResultsContainer.innerHTML=html;searchResultsContainer.style.display='flex';
    attachListeners(searchResultsContainer);
  }
  function attachListeners(container){
    function fmtOffer(t){return t==='tiktok'?'Tiktok Shop':t.charAt(0).toUpperCase()+t.slice(1);}
    function getMsgTpl(pre,sid,type,d){
      if(pre==='FL')return'Kirimkan kode ini ['+sid+'] untuk mendapat link Google Maps milik Mitra mGanik '+d.nama_agen;
      if(pre==='FM')return'Kirimkan kode ini ['+sid+'] untuk mendapat link '+fmtOffer(type)+' milik Mitra mGanik '+d.nama_agen;
      return'Kirimkan kode ini ['+sid+'] agar Anda segera terhubung dengan Whatsapp Mitra mGanik '+d.nama_agen;
    }
    container.querySelectorAll('.d2or-trackable').forEach(function(el){
      var neo=el.cloneNode(true);if(el.parentNode)el.parentNode.replaceChild(neo,el);
      neo.addEventListener('click',function(e){
        e.preventDefault();
        var offerType=this.getAttribute('data-type'),pre=this.getAttribute('data-prefix'),dlvId=this.getAttribute('data-dlv-id');
        var d=agentDLVRegistry[dlvId]||{},sid=pre+'-'+inboundId;
        var msg=getMsgTpl(pre,sid,offerType,d);
        var mktStr='N/A';
        if(d.raw_marketplaces){
          if(['tokopedia','shopee','lazada','tiktok','bukalapak'].includes(offerType)){if(d.raw_marketplaces[offerType])mktStr=d.raw_marketplaces[offerType];}
          else{var al=Object.values(d.raw_marketplaces).filter(Boolean);if(al.length)mktStr=al.join(' | ');}
        }
        window.dataLayer.push({event:'leadEvent',inbound_id:sid,offer_type:offerType,sales_channel:'D2OR',agen_data:{kode_agen:d.kode_agen||'N/A',nama_agen:d.nama_agen||'N/A',kota_agen:d.kota_agen||'N/A',provinsi_agen:d.provinsi_agen||'N/A',agen_phone:d.agen_phone||'N/A',location_links:d.location_links||'N/A',marketplace_links:mktStr},'gtm.elementId':this.id||''});
        window.open('https://wa.me/'+ROUTING_PHONE+'?text='+encodeURIComponent(msg),'_blank');
      });
    });
  }
})();

})();
