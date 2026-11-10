// 仅本设备 IndexedDB 存储；没有任何服务器请求或账户同步。
const DB_NAME = 'solo-fitness-v1';
const STORE = 'data';
let connection;
function openDb() {
  if (connection) return connection;
  connection = new Promise((resolve,reject)=>{
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'));
    const request = indexedDB.open(DB_NAME,1);
    request.onupgradeneeded = ()=>{
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = ()=>resolve(request.result);
    request.onerror = ()=>reject(request.error);
  });
  return connection;
}
function fallbackGet(key) {
  try { const v = localStorage.getItem(`solo-fitness:${key}`); return v ? JSON.parse(v) : null; }
  catch { return null; }
}
function fallbackSet(key,value) {
  try { localStorage.setItem(`solo-fitness:${key}`,JSON.stringify(value)); }
  catch { throw new Error('无法保存训练数据：请确认浏览器未禁用本地存储。'); }
}
export async function readData(key) {
  try {
    const db = await openDb();
    return await new Promise((resolve,reject)=>{
      const req = db.transaction(STORE,'readonly').objectStore(STORE).get(key);
      req.onsuccess = ()=>resolve(req.result ?? null);
      req.onerror = ()=>reject(req.error);
    });
  } catch { return fallbackGet(key); }
}
export async function writeData(key,value) {
  try {
    const db = await openDb();
    await new Promise((resolve,reject)=>{
      const tx = db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put(value,key);
      tx.oncomplete = ()=>resolve();
      tx.onerror = ()=>reject(tx.error);
      tx.onabort = ()=>reject(tx.error);
    });
  } catch { fallbackSet(key,value); }
}
export async function readAll() {
  const [settings,sessions,draft] = await Promise.all([
    readData('settings'),readData('sessions'),readData('draft')
  ]);
  return {settings,sessions:sessions || [],draft};
}
export function downloadFile(filename, content, mime='application/json;charset=utf-8') {
  const blob = new Blob([content],{type:mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=filename; a.style.display='none';
  document.body.append(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}
