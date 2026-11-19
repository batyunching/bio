/* 總入口共用：Firebase 初始化、帳號格式、小工具 */
var PORTAL_CFG = {
  DOMAIN: '@student.bio',
  CONFIG: {
    apiKey: "AIzaSyDJqzPBj9Byeda1GOj79sHWXZiDpqQnygs",
    authDomain: "bio-ch2-bingo.firebaseapp.com",
    databaseURL: "https://bio-ch2-bingo-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "bio-ch2-bingo",
    storageBucket: "bio-ch2-bingo.firebasestorage.app",
    messagingSenderId: "180821849719",
    appId: "1:180821849719:web:3d4cbd0e5aea36aa617872"
  },
  /* 章節清單：以後新增章節，在這裡加一筆就好 */
  CHAPTERS: [
    { id:'ch2', no:'第 2 章', title:'生物體的營養', units:'2-2 酵素・2-3 植物如何製造養分・2-4 人體如何獲得養分', url:'https://batyunching.github.io/bio-ch2/#/', color:'#43A047', icon:'🍃' },
    { id:'ch3', no:'第 3 章', title:'生物體內的運輸', units:'3-1 植物的運輸構造・3-2 人體的循環・3-3 人體的防禦', url:'https://batyunching.github.io/bio-ch3/', color:'#E53935', icon:'🩸' }
  ]
};
if(!firebase.apps.length) firebase.initializeApp(PORTAL_CFG.CONFIG);
var auth = firebase.auth(), db = firebase.database();
try{ auth.languageCode = 'zh-TW'; }catch(e){} // 設定密碼信與設定密碼頁面改用繁體中文

function normClass(s){ return String(s || '').trim().toLowerCase().replace(/\s+/g, ''); }
function pad2(n){ n = String(parseInt(n, 10)); return n.length < 2 ? '0' + n : n; }
function sidOf(cls, seat){ return normClass(cls) + '-' + pad2(seat); }
function emailOf(sid){ return sid + PORTAL_CFG.DOMAIN; }
function sidFromEmail(email){ email = (email || '').toLowerCase(); return email.slice(-PORTAL_CFG.DOMAIN.length) === PORTAL_CFG.DOMAIN ? email.slice(0, -PORTAL_CFG.DOMAIN.length) : null; }
function validClass(c){ return /^[a-z0-9]{1,12}$/.test(normClass(c)); }
function authMsg(e){
  var c = (e && e.code) || '';
  if(/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)) return '班級、座號或密碼不對，請再確認一次。';
  if(/too-many-requests/.test(c)) return '嘗試太多次了，請等幾分鐘再試。';
  if(/network/.test(c)) return '網路連線有問題，請確認平板有連上網路。';
  if(/email-already-in-use/.test(c)) return '這個帳號已經存在。';
  if(/weak-password/.test(c)) return '密碼至少要 6 個字元。';
  if(/operation-not-allowed/.test(c)) return 'Firebase 還沒開啟「電子郵件/密碼」登入（請看設定說明第 1 步）。';
  if(/requires-recent-login/.test(c)) return '請先登出再重新登入，然後再修改密碼。';
  if(/PERMISSION_DENIED|permission/i.test(c + (e && e.message))) return '資料庫規則不允許這個動作（請確認已貼上新的規則）。';
  return (e && e.message) || '發生錯誤';
}
function readFlag(path){ return db.ref(path).get().then(function(s){ return s.val() === true; }, function(){ return false; }); }
/* 角色：teacher＝生物老師（只看自己的班）；admin＝管理人（看全部、可指派班級） */
function getRoles(uid){ return Promise.all([readFlag('teachers/' + uid), readFlag('admins/' + uid)]).then(function(r){ return { teacher:r[0] || r[1], admin:r[1] }; }); }
function isTeacher(uid){ return getRoles(uid).then(function(r){ return r.teacher; }); }
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
