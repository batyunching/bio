/* =========================================================
   生物學習網站｜共用帳號程式（所有章節共用）
   放在總入口：https://batyunching.github.io/bio/js/account.js

   各章網站在 <head> 加入：
   <script src="https://batyunching.github.io/bio/js/account.js"
           data-chapter="ch3" data-prefix="ch3."></script>
     data-chapter：章節代號（ch2、ch3…），雲端資料存在 students/{班級-座號}/data/{章節}
     data-prefix ：這一章存在瀏覽器（localStorage）的資料名稱開頭，例如第2章 bio2_、第3章 ch3.

   功能
   1. 沒登入 → 自動帶到總入口登入，登入後回到原本的頁面
   2. 學習進度（概念卡、錯題本、徽章…）同步到雲端，換平板也看得到
   3. 同一台平板換人登入時，先清掉上一位同學的進度，不會混在一起
   4. 右下角顯示「👤 班級座號｜🏠 總目錄｜登出」
   只在 batyunching.github.io 上啟用；在自己電腦直接開檔案時不會要求登入。
   ========================================================= */
(function(){
  'use strict';
  var PORTAL = 'https://batyunching.github.io/bio/';
  var DOMAIN = '@student.bio';
  var V = '10.12.2', BASE = 'https://www.gstatic.com/firebasejs/' + V + '/';
  var CONFIG = {
    apiKey: "AIzaSyDJqzPBj9Byeda1GOj79sHWXZiDpqQnygs",
    authDomain: "bio-ch2-bingo.firebaseapp.com",
    databaseURL: "https://bio-ch2-bingo-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "bio-ch2-bingo",
    storageBucket: "bio-ch2-bingo.firebasestorage.app",
    messagingSenderId: "180821849719",
    appId: "1:180821849719:web:3d4cbd0e5aea36aa617872"
  };
  var me = document.currentScript;
  var chapter = (me && me.getAttribute('data-chapter')) || '';
  var prefix = (me && me.getAttribute('data-prefix')) || '';
  var ONLINE = location.hostname === 'batyunching.github.io';
  var resolveReady, rejectReady;
  var api = window.BIO_ACCOUNT = {
    PORTAL:PORTAL, DOMAIN:DOMAIN, CONFIG:CONFIG, chapter:chapter, online:ONLINE,
    user:null, sid:null, isTeacher:false, label:'',
    ready: new Promise(function(res, rej){ resolveReady = res; rejectReady = rej; }),
    signOut: signOut, flush: function(){ return flush(); }
  };
  if(!ONLINE){ resolveReady(null); return; }

  /* 先把畫面藏起來，確認登入後再顯示（最多等 8 秒） */
  var css = document.createElement('style');
  css.textContent = 'html.bio-wait body{visibility:hidden}' +
    '.bio-badge{position:fixed;left:12px;bottom:12px;z-index:9000;display:flex;align-items:center;gap:6px;background:#263238;color:#fff;border-radius:999px;padding:6px 8px 6px 14px;font:700 14px/1.2 "Noto Sans TC","Microsoft JhengHei",sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.25)}' +
    '.bio-badge a,.bio-badge button{color:#fff;background:rgba(255,255,255,.14);border:none;border-radius:999px;padding:7px 12px;font:inherit;cursor:pointer;text-decoration:none;min-height:36px;display:inline-flex;align-items:center}' +
    '.bio-badge a:hover,.bio-badge button:hover{background:rgba(255,255,255,.28)}' +
    '.bio-badge .who{white-space:nowrap}' +
    '.bio-badge.min .opt{display:none}' +
    '@media print{.bio-badge{display:none}}';
  document.head.appendChild(css);
  document.documentElement.classList.add('bio-wait');
  var failSafe = setTimeout(function(){ document.documentElement.classList.remove('bio-wait'); }, 8000);

  function load(src){
    return new Promise(function(res, rej){
      var old = document.querySelector('script[src="' + src + '"]');
      if(old){ if(old.dataset.loaded){ res(); } else { old.addEventListener('load', res); old.addEventListener('error', rej); } return; }
      var s = document.createElement('script'); s.src = src;
      s.onload = function(){ s.dataset.loaded = '1'; res(); }; s.onerror = function(){ rej(new Error('無法載入 ' + src)); };
      document.head.appendChild(s);
    });
  }
  function goLogin(){
    location.replace(PORTAL + '?next=' + encodeURIComponent(location.href));
  }

  /* ---------- 雲端同步 ---------- */
  var db, ref, dirty = {}, timer = null, origSet, origRemove;
  function enc(k){ return encodeURIComponent(k).replace(/\./g, '%2E'); }
  function dec(k){ try{ return decodeURIComponent(k); }catch(e){ return k; } }
  function localKeys(){
    var out = [];
    try{ for(var i=0;i<localStorage.length;i++){ var k = localStorage.key(i); if(k && prefix && k.indexOf(prefix) === 0) out.push(k); } }catch(e){}
    return out;
  }
  function snapshotLocal(){ var o = {}; localKeys().forEach(function(k){ o[k] = localStorage.getItem(k); }); return o; }
  function flush(){
    if(!ref){ return Promise.resolve(); }
    clearTimeout(timer); timer = null;
    var keys = Object.keys(dirty); if(!keys.length) return Promise.resolve();
    var up = {};
    keys.forEach(function(k){ var v = null; try{ v = localStorage.getItem(k); }catch(e){} up[enc(k)] = (v != null && v.length < 200000) ? v : null; });
    dirty = {};
    return ref.update(up).catch(function(e){ console.warn('進度同步失敗', e); keys.forEach(function(k){ dirty[k] = 1; }); });
  }
  function mark(k){ if(prefix && k && String(k).indexOf(prefix) === 0){ dirty[k] = 1; clearTimeout(timer); timer = setTimeout(flush, 1500); } }
  function hookStorage(){
    var P = Storage.prototype; origSet = P.setItem; origRemove = P.removeItem;
    P.setItem = function(k, v){ origSet.call(this, k, v); if(this === window.localStorage) mark(k); };
    P.removeItem = function(k){ origRemove.call(this, k); if(this === window.localStorage) mark(k); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', function(){ if(document.visibilityState === 'hidden') flush(); });
  }
  function startSync(sid){
    if(!prefix || !chapter) return Promise.resolve(false);
    ref = db.ref('students/' + sid + '/data/' + chapter);
    var ownerKey = 'bio_owner_' + chapter;
    var owner = null; try{ owner = localStorage.getItem(ownerKey); }catch(e){}
    var before = JSON.stringify(snapshotLocal());
    return ref.get().then(function(snap){
      var cloud = snap.val();
      if(cloud){
        // 雲端有資料：以雲端為準
        localKeys().forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} });
        Object.keys(cloud).forEach(function(k){ try{ localStorage.setItem(dec(k), cloud[k]); }catch(e){} });
      } else {
        // 雲端還沒有資料：如果這台平板上的資料是別人的，先清掉；否則把這台的進度上傳
        if(owner && owner !== sid) localKeys().forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} });
        localKeys().forEach(function(k){ dirty[k] = 1; });
      }
      try{ localStorage.setItem(ownerKey, sid); }catch(e){}
      hookStorage(); flush();
      db.ref('students/' + sid + '/lastSeen/' + chapter).set(firebase.database.ServerValue.TIMESTAMP).catch(function(){});
      return JSON.stringify(snapshotLocal()) !== before;   // 進度有變 → 重新整理一次，讓頁面顯示雲端進度
    });
  }

  /* ---------- 介面 ---------- */
  function badge(){
    var b = document.createElement('div'); b.className = 'bio-badge'; b.setAttribute('role', 'navigation'); b.setAttribute('aria-label', '帳號');
    b.innerHTML = '<span class="who">' + api.label + '</span>' +
      '<a class="opt" href="' + PORTAL + '">🏠 總目錄</a><button class="opt" type="button" data-out>登出</button>' +
      '<button type="button" data-min title="收合" aria-label="收合">⇤</button>';
    document.body.appendChild(b);
    b.querySelector('[data-out]').addEventListener('click', function(){ if(confirm('確定要登出嗎？')) signOut(); });
    var mn = b.querySelector('[data-min]');
    mn.addEventListener('click', function(){ var m = b.classList.toggle('min'); mn.textContent = m ? '⇥' : '⇤'; });
  }
  function signOut(){
    return flush().then(function(){
      localKeys().forEach(function(k){ try{ (origRemove || Storage.prototype.removeItem).call(localStorage, k); }catch(e){} });
      try{ localStorage.removeItem('bio_owner_' + chapter); }catch(e){}
      return window.firebase ? firebase.auth().signOut() : null;
    }).then(function(){ location.href = PORTAL; });
  }
  function show(){ clearTimeout(failSafe); document.documentElement.classList.remove('bio-wait'); }

  /* ---------- 啟動 ---------- */
  load(BASE + 'firebase-app-compat.js')
    .then(function(){ return load(BASE + 'firebase-auth-compat.js'); })
    .then(function(){ return load(BASE + 'firebase-database-compat.js'); })
    .then(function(){
      if(!firebase.apps.length) firebase.initializeApp(CONFIG);
      db = firebase.database();
      return new Promise(function(res){ var off = firebase.auth().onAuthStateChanged(function(u){ off(); res(u); }); });
    })
    .then(function(u){
      if(!u || u.isAnonymous){ goLogin(); return new Promise(function(){}); }
      api.user = u;
      var email = (u.email || '').toLowerCase();
      if(email.slice(-DOMAIN.length) === DOMAIN){
        api.sid = email.slice(0, -DOMAIN.length);
        var p = api.sid.split('-'); api.label = '👤 ' + p[0] + ' 班 ' + (parseInt(p[1], 10) || '') + ' 號';
        return startSync(api.sid).then(function(changed){
          var flag = 'bio_reloaded_' + chapter + '_' + api.sid;
          if(changed && !sessionStorage.getItem(flag)){ sessionStorage.setItem(flag, '1'); location.reload(); return new Promise(function(){}); }
          return u;
        });
      }
      return db.ref('teachers/' + u.uid).get().then(function(s){ api.isTeacher = s.val() === true; api.label = api.isTeacher ? '👩‍🏫 老師' : '👤 ' + (u.email || '使用者'); return u; }, function(){ api.label = '👤 ' + (u.email || '使用者'); return u; });
    })
    .then(function(u){
      if(document.body) badge(); else document.addEventListener('DOMContentLoaded', badge);
      show(); resolveReady(u);
    })
    .catch(function(e){
      console.warn('帳號系統無法啟動：', e);
      show(); resolveReady(null);
    });
})();
