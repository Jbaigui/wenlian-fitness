import {
  EXERCISES, PLAN_VERSION, fromLocalDate, toLocalDate, plusDays, startOfWeek,
  getWeekNumber, recommendedDate, workoutForWeek, weekPhase, dateLabel,
  volumeExplanation, exerciseProgress, nextPendingExercise, resolveStartDate
} from './plan.js';
import {readAll, writeData, downloadFile} from './storage.js';
import {EXERCISE_GUIDES, GUIDE_REVIEWED} from './exercise-guides.js';
import {movementFor,isSided,SIDE_KEYS,freshRecord,syncSideGroup,upgradeDraftSides,hasRecordedWork,recordDescription} from './movement.js';

const APP_NAME = '稳练';
const ROOT = document.getElementById('app');
const NOW = new Date();
const DEFAULT_SETTINGS = {
  startDate: toLocalDate(startOfWeek(NOW)),
  restSeconds: 90,
  soundEnabled: false,
  trainingGoal: '改善体能与健康'
};
const state = {
  settings: {...DEFAULT_SETTINGS}, sessions: [], draft: null,
  view: 'home', selectedDate: recommendedDate(NOW),
  weekOffset: 0, modalExercise: null, historyId: null,
  feedback: '适中', toast: '', online: navigator.onLine,
  pendingFinish: false
};
let saveQueue = Promise.resolve();
let toastTimer = null;
let lastTimerExpired = null;

const ICONS = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  play: '<path d="m8 5 11 7-11 7z"/>',
  history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  settings: '<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-3v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-2-2 .1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H5v-3h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-2 .1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V5h3v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 2 2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v3h-.2a1.7 1.7 0 0 0-1.6 1Z" transform="translate(-1 -1)"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  cloud: '<path d="M7 18H6a4 4 0 0 1-.8-7.9A6 6 0 0 1 17 9a4.5 4.5 0 1 1 .5 9H17"/><path d="m12 12 0 9m-3-3 3 3 3-3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  pause: '<path d="M9 4v16M15 4v16"/>',
  external: '<path d="M13 5h6v6m0-6-9 9"/><path d="M19 14v5H5V5h5"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5M5 19h14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  walk: '<circle cx="13" cy="4" r="2"/><path d="m7 20 3-5 2-3 2 2 3 5m-7-10 2 3-3 3m3-6 4 1"/>'
};
function icon(name, size=18) {
  return `<svg class="svg-icon" aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24">${ICONS[name] || ICONS.info}</svg>`;
}
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function prettyDate(iso) {
  const d=fromLocalDate(iso);
  return `${d.getMonth()+1}月${d.getDate()}日`;
}
function thisWeekMonday() { return startOfWeek(new Date()); }
function weekMondayOffset() { return plusDays(thisWeekMonday(),state.weekOffset*7); }
function setWeekForDate(date) {
  const t=startOfWeek(fromLocalDate(date));
  const a=Date.UTC(t.getFullYear(),t.getMonth(),t.getDate());
  const w=thisWeekMonday();
  const b=Date.UTC(w.getFullYear(),w.getMonth(),w.getDate());
  state.weekOffset = Math.round((a-b)/(7*86400000));
}
function getWeek(iso) { return getWeekNumber(iso,state.settings.startDate); }
function getSessionByDate(iso) { return state.sessions.find(x=>x.date===iso && x.status==='completed'); }
function getLatestSessions() { return [...state.sessions].filter(s=>s.status==='completed').sort((a,b)=>b.completedAt.localeCompare(a.completedAt)); }
function completedSets(session) {
  if (!session) return 0;
  return Object.values(session.records || {}).flat().filter(set=>set?.done).length;
}
function totalSets(session) { return session?.plan?.reduce((sum,ex)=>sum+ex.sets,0) || 0; }
function planSets(plan) { return plan.reduce((sum,ex)=>sum+ex.sets,0); }
function weekSessions(weekStart) {
  const start=toLocalDate(weekStart);
  const end=toLocalDate(plusDays(weekStart,7));
  return state.sessions.filter(s=>s.status==='completed' && s.date>=start && s.date<end);
}
function safeNumber(value,fallback=0) {
  const n=Number(value);
  return Number.isFinite(n)?n:fallback;
}
function sessionDateRange() {
  const months = state.sessions.map(s=>s.date).filter(Boolean).sort();
  return months.length ? [months[0], months[months.length-1]] : [];
}
function makeSession(date) {
  const week=getWeek(date);
  const plan=workoutForWeek(week);
  const records={};
  for (const ex of plan) {
    records[ex.id] = Array.from({length:ex.sets},()=>freshRecord(ex));
  }
  const id=(window.crypto?.randomUUID?.() || `s-${Date.now()}-${Math.round(Math.random()*1e8)}`);
  return {
    id,date,week,planVersion: PLAN_VERSION,createdAt:new Date().toISOString(),
    completedAt:null,status:'active',plan,records,skipped:[],activeIndex:0,
    restUntil:null,restTotal:0,notes:'',overallFeel:'适中'
  };
}
function save(...keys) {
  const copies = {};
  for (const key of keys) copies[key] = structuredClone(state[key]);
  saveQueue = saveQueue.then(async()=>{
    for (const key of keys) await writeData(key,copies[key]);
  }).catch(error=>{console.error(error); toast('保存失败，请先导出备份并检查存储空间');});
  return saveQueue;
}
function toast(text) {
  state.toast=text;
  renderToast();
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{state.toast='';renderToast();},3500);
}
function renderToast() {
  const existing=document.querySelector('.toast');
  if (existing) existing.remove();
  if (!state.toast) return;
  const div=document.createElement('div');
  div.className='toast';div.setAttribute('role','status');div.textContent=state.toast;
  document.body.append(div);
}
function navMarkup() {
  const items=[['home','今日'],['workout','跟练'],['history','记录'],['settings','我的']];
  return `<nav class="navbar" aria-label="主导航">${items.map(([key,name])=>
    `<button class="nav-item ${state.view===key || (key==='history'&&state.view==='detail')?'active':''}" data-action="nav" data-view="${key}" aria-label="${name}" ${state.view===key?'aria-current="page"':''}>${icon(key)}<span>${name}</span></button>`
  ).join('')}</nav>`;
}
function heading(sub) {
  const now = new Date();
  const today = toLocalDate(now);
  return `<header class="topbar"><div class="brand"><span class="brand-mini">稳</span>${APP_NAME} <small class="version-label">V1.2</small></div><div class="top-date">${sub || dateLabel(today)}</div></header>`;
}
function render() {
  let content='';
  if (state.view==='home') content=renderHome();
  if (state.view==='workout') content=renderWorkout();
  if (state.view==='history') content=renderHistory();
  if (state.view==='settings') content=renderSettings();
  if (state.view==='detail') content=renderDetail();
  ROOT.innerHTML=heading()+`<main>${content}</main>`+navMarkup()+renderModal();
  renderToast();
}
function renderHome() {
  const monday=weekMondayOffset();
  const scheduled=[0,2,4].map(d=>toLocalDate(plusDays(monday,d)));
  const chosen=state.selectedDate;
  const week=getWeek(chosen);
  const phase=weekPhase(Math.max(1,week));
  const workout=workoutForWeek(week);
  const doneToday=getSessionByDate(chosen);
  const existingDraft=state.draft;
  const inWeek=weekSessions(monday);
  const weekName = week<1?'计划开始前':`第 ${week} 周 · ${phase}`;
  const now=new Date();
  return `
    <section class="hero">
      <div class="eyebrow">YOUR EVERYDAY STRENGTH</div>
      <h1>稳稳练习，<br>让身体更有力量。</h1>
      <p class="hero-sub">每周三次全身训练。不追求一次练狠，追求每一周都在进步。</p>
      <div class="hero-tags"><span>零基础友好</span><span>全身力量</span><span>健康体能</span></div>
    </section>
    ${existingDraft && existingDraft.status==='active'?`<div class="tip">${icon('info')} <div>有一场 <b>${esc(dateLabel(existingDraft.date))}</b> 的训练尚未结束。<button class="text-link" data-action="resume">点此恢复</button></div></div>`:''}
    <section class="week-nav">
      <button class="icon-button" data-action="prev-week" aria-label="上一周">${icon('left')}</button>
      <div class="week-caption">${weekName}<small>${prettyDate(scheduled[0])} — ${prettyDate(scheduled[2])} · 已完成 ${inWeek.length}/3 次</small></div>
      <button class="icon-button" data-action="next-week" aria-label="下一周">${icon('right')}</button>
    </section>
    <section class="days" aria-label="本周训练日">
      ${scheduled.map((date,i)=>{
        const selected=date===chosen;
        const completed=!!getSessionByDate(date);
        const weekday=['周一','周三','周五'][i];
        const dt=fromLocalDate(date);
        return `<button class="day ${selected?'selected':''} ${completed?'done':''}" data-action="pick-day" data-date="${date}" aria-pressed="${selected}">
          <span class="day-name">${weekday}</span><span class="day-date">${dt.getDate()}</span>
          <span class="day-status">${completed?'✓ 已完成':selected?'当前选中':'全身训练'}</span>
        </button>`;
      }).join('')}
    </section>
    <div class="section-heading"><h2>${prettyDate(chosen)}的计划</h2><small>${week<=1?'动作学习优先':phase}</small></div>
    <section class="panel">
      <div class="summary-top">
        <div><h3>全身基础力量</h3><p>${dateLabel(chosen)} · 包含热身及快走</p></div>
        <span class="badge">计划 ${planSets(workout)} 组</span>
      </div>
      <div class="stats">
        <div class="stat"><b>${workout.length}</b><small>训练环节</small></div>
        <div class="stat"><b>${workout.filter(ex=>ex.kind==='reps').length}</b><small>力量动作</small></div>
        <div class="stat"><b>${state.settings.restSeconds}s</b><small>默认休息</small></div>
      </div>
      <button class="primary" data-action="start" ${doneToday?'disabled':''}>
        ${icon(doneToday?'check':existingDraft?'play':'arrow')} ${doneToday?'本日训练已完成':existingDraft?'继续当前训练':'开始这次训练'}
      </button>
      ${doneToday?`<button class="tertiary" style="width:100%;margin-top:7px" data-action="view-session" data-id="${esc(doneToday.id)}">查看本次记录</button>`:''}
    </section>
    <div class="callout green-callout">${volumeExplanation(week)}</div>
    <div class="section-heading"><h2>动作顺序</h2><small>点击查看站内详细教学</small></div>
    <p class="small-note">先连续做完一组的次数，再记录、休息；完成全部组数后换动作。</p>
    <section class="panel exercise-preview">
      ${workout.map(ex=>`<button class="preview-row" style="width:100%;text-align:left;background:none" data-action="show-exercise" data-id="${ex.id}">
        <div class="exercise-emblem">${ex.symbol}</div><div class="preview-content"><b>${ex.name}</b><small>${ex.short}</small><span class="movement-tag">${esc(movementFor(ex).label)}</span><span class="preview-number">${ex.kind==='time'?`${ex.sets} 次（持续 ${ex.min===ex.max?ex.min:ex.min+'～'+ex.max} 分钟）`:`${ex.sets} 组（每组${ex.unit==='次/侧'?'两侧各':' '} ${ex.min===ex.max?ex.min:ex.min+'～'+ex.max} 次）`}</span></div>
      </button>`).join('')}
    </section>
    <div class="tip">${icon('shield')}<div>如果当天感觉疲劳，可降低重量或减少组数。出现关节锐痛、胸痛、明显头晕应停止训练。</div></div>
    ${week>8?'<div class="callout">已超过最初8周的训练期：目前沿用第8周的动作结构。建议导出记录进行下一阶段复盘。</div>':''}
    <p class="footer-note">${state.online?'目前在线':'当前离线'} · 训练记录仅保存于本机，尚未接入云同步</p>
  `;
}
function renderWorkout() {
  const draft=state.draft;
  if (!draft) return `<div class="empty"><span class="big">▤</span><b>目前没有正在进行的训练</b><p>在「今日」选择训练日，再开始跟练。</p><button class="primary" data-action="nav" data-view="home">返回今日计划</button></div>`;
  const idx=Math.max(0,Math.min(draft.plan.length-1,draft.activeIndex));
  const ex=draft.plan[idx];
  const sets=draft.records[ex.id] || [];
  const done=completedSets(draft), total=totalSets(draft);
  const progress=Math.round((done/Math.max(1,total))*100);
  const last=idx===draft.plan.length-1;
  const allDone=draft.plan.every(item=> (draft.records[item.id] || []).every(s=>s.done) || draft.skipped.includes(item.id));
  const current=exerciseProgress(draft,ex.id);
  const nextIdx=nextPendingExercise(draft);
  const nextEx=nextIdx>=0?draft.plan[nextIdx]:null;
  const guide=EXERCISE_GUIDES[ex.id];
  return `
    <section class="training-hero">
      <div class="eyebrow">TRAINING IN PROGRESS</div>
      <h2>${dateLabel(draft.date)}</h2>
      <small>第 ${Math.max(1,draft.week)} 周 · 全身基础力量 · 共 ${draft.plan.length} 个环节</small>
      <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
      <div class="progress-label"><span>已完成 ${done}/${total} 组</span><span>${progress}%</span></div>
    </section>
    <div class="workout-toolbar">
      <span class="tiny">环节 ${idx+1} / ${draft.plan.length}</span>
      <div class="stepper">
        <button data-action="previous-exercise" ${idx===0?'disabled':''}>${icon('left')} 上一个</button>
        <button data-action="next-exercise" ${last?'disabled':''}>下一个 ${icon('right')}</button>
      </div>
    </div>
    <section class="panel">
      <div class="exercise-large"><span class="exercise-emblem">${ex.symbol}</span><div><h2>${ex.name}</h2><p>${ex.short} · ${ex.equipment}</p></div></div>
      <div class="movement-instruction"><strong>${esc(movementFor(ex).label)}</strong><p>${esc(movementFor(ex).cue)}</p></div>
      <div class="exercise-progress ${current.complete?'is-complete':''}" role="status" aria-live="polite">
        <div class="exercise-progress-top"><strong>${current.complete?'本动作已完成':`准备第 ${current.next+1} / ${current.total} 组`}</strong><span>已完成 ${current.done} / ${current.total} 组</span></div>
        <div class="set-markers" aria-label="本动作各组进度">${sets.map((r,i)=>`<span class="set-marker ${r.done?'done':i===current.next?'current':''}">${r.done?'✓':i+1} 第 ${i+1} 组${r.done?'已完成':i===current.next?'待完成':''}</span>`).join('')}</div>
        <p>${ex.kind==='time'?'计时环节：按实际分钟数记录。':ex.unit==='次/侧'?`左右各 ${ex.min===ex.max?ex.min:ex.min+'–'+ex.max} 次才算一组。`:'一次完整动作算一次，达到目标次数后再记录一组。'}</p>
      </div>
      <div class="info-stripe">${icon('info')}<div>目标：${ex.sets} 组，每组 ${ex.min===ex.max?ex.min:`${ex.min}–${ex.max}`}${ex.unit}。${ex.kind==='reps'?'做完应保留约2次余力。':'以身体感受合适为准。'}</div></div>
      <p class="volume-note">${volumeExplanation(draft.week)}</p>
      <div class="quick-cue">${icon('book')}<span>${esc(guide?.cue || ex.points[0])}</span></div>
      <button class="secondary" style="width:100%;margin-top:12px" data-action="show-exercise" data-id="${ex.id}">${icon('book')} 查看完整动作教学（无需跳转）</button>
      ${renderRest(draft)}
      ${current.complete?`<div class="exercise-done"><strong>✓ ${esc(ex.name)}：${current.total} / ${current.total} 组全部完成</strong><p>${nextEx?`接下来：${esc(nextEx.name)}，共 ${nextEx.sets} 组。休息好后再继续。`:'本次训练已无待完成动作，可以保存训练。'}</p>${nextEx?`<button class="primary" data-action="continue-exercise">进入下一动作：${esc(nextEx.name)} ${icon('right')}</button>`:''}</div>`:''}
      <div class="set-heading"><h3>本动作训练记录</h3><small>${current.complete?'全部记录已保存':`还剩 ${current.total-current.done} 组`}</small></div>
      ${sets.map((record,i)=>renderSet(ex,record,i)).join('')}
      <div class="small-note">${ex.kind==='reps'?'重量指当次使用的哑铃/器械标称重量；若两只哑铃，请记录单只重量。': '计时类动作记录实际分钟数。'} 标记「完成」才会计入统计。</div>
      <label class="caption" for="overall-feel">本次训练整体感受</label>
      <div class="field"><select id="overall-feel" data-field="overallFeel">${['轻松','适中','吃力'].map(v=>`<option value="${v}" ${draft.overallFeel===v?'selected':''}>${v}</option>`).join('')}</select></div>
      <label class="caption" for="work-note">训练备注（可选）</label>
      <textarea class="note-box" id="work-note" data-field="note" placeholder="例如：肩膀有点紧、今天状态很好……">${esc(draft.notes)}</textarea>
      <div class="wide-actions">
        <button class="secondary" data-action="skip-exercise">跳过此动作</button>
        <button class="secondary" data-action="show-exercise" data-id="${ex.id}">动作说明 ${icon('right')}</button>
      </div>
      ${allDone?`<button class="primary soft" data-action="finish" style="margin-top:12px">${icon('check')} 全部完成，保存训练</button>`:''}
      <button class="tertiary" style="width:100%;margin-top:8px" data-action="finish-early">提前结束并保存已做的组数</button>
    </section>
    <p class="footer-note">数据会自动保存在这台设备；离开网页后计时按实际时间恢复，但锁屏响铃不保证。</p>
  `;
}
function renderSet(ex,record,i) {
  if(isSided(ex) && record.sides) return renderSideSet(ex,record,i);
  const isTime=ex.kind==='time';
  const next=state.draft.records[ex.id].findIndex(s=>!s.done);
  return `<div class="set-card ${record.done?'completed':''} ${i===next?'is-next':''}">
    <div class="set-card-top"><div class="set-badge">${record.done?icon('check'):icon('play')} 第 ${i+1} / ${ex.sets} 组</div><span class="set-state">${record.done?'✓ 已记录':i===next?'当前待完成':'尚未完成'}</span></div>
    ${isSided(ex)?'<p class="small-note">旧版合并记录：未分别记录两侧。原组数与成绩保留。</p>':''}
    <div class="set-fields">
      ${isTime?`<div class="field"><label for="m-${ex.id}-${i}">实际时长（分钟）</label><input id="m-${ex.id}-${i}" type="number" min="0" max="180" step="1" inputmode="numeric" data-field="actual" data-ex="${ex.id}" data-set="${i}" value="${esc(record.actual)}" ${record.done?'disabled':''}></div>
      <div class="field"><label>目标时长</label><input value="${ex.min}–${ex.max} 分钟" disabled></div>`:
      `<div class="field"><label for="w-${ex.id}-${i}">重量（kg，空白表示未记录）</label><input id="w-${ex.id}-${i}" type="number" min="0" max="500" step="0.5" inputmode="decimal" placeholder="可留空" data-field="weightKg" data-ex="${ex.id}" data-set="${i}" value="${esc(record.weightKg)}" ${record.done?'disabled':''}></div>
       <div class="field"><label for="r-${ex.id}-${i}">实际次数（${ex.unit}）</label><input id="r-${ex.id}-${i}" type="number" min="0" max="300" step="1" inputmode="numeric" data-field="actual" data-ex="${ex.id}" data-set="${i}" value="${esc(record.actual)}" ${record.done?'disabled':''}></div>`}
    </div>
    ${!isTime && !record.done?`<div class="field" style="margin-top:9px"><label for="d-${ex.id}-${i}">这一组的体感</label>
      <select id="d-${ex.id}-${i}" data-field="difficulty" data-ex="${ex.id}" data-set="${i}">${['轻松','适中','吃力'].map(v=>`<option value="${v}" ${record.difficulty===v?'selected':''}>${v}</option>`).join('')}</select></div>`:''}
    <div class="set-footer"><button class="secondary" style="background:${record.done?'#e4eee0':'#e5efdf'}" data-action="${record.done?'undo-set':'complete-set'}" data-ex="${ex.id}" data-set="${i}" ${!record.done && i!==next?'disabled':''}>${record.done?'撤销本组完成':`完成第 ${i+1} / ${ex.sets} 组并记录`} ${icon(record.done?'left':'check')}</button></div>
  </div>`;
}
function renderSideSet(ex,record,i) {
  const next=state.draft.records[ex.id].findIndex(r=>!r.done);
  const locked=i!==next && !record.done;
  const movement=movementFor(ex);
  const count=SIDE_KEYS.filter(side=>record.sides[side].done).length;
  return `<div class="set-card ${record.done?'completed':''} ${i===next?'is-next':''}">
    <div class="set-card-top"><div class="set-badge">第 ${i+1} / ${ex.sets} 组</div><span class="set-state">${record.done?'✓ 整组完成':`两侧已完成 ${count} / 2`}</span></div>
    <p class="side-count-note">${ex.id==='core'?`交替做两种配对，每种各 ${ex.min} 次，共 ${ex.min*2} 次伸展；分别记录后才完成这一组。`:`左手 ${ex.min} 次＋右手 ${ex.min} 次，共同算 1 组；只做一侧不计整组完成。`}</p>
    <div class="side-records">${SIDE_KEYS.map(side=>{
      const r=record.sides[side], name=movement.sides[side], prefix=`side-${ex.id}-${i}-${side}`;
      const disabled=r.done || locked;
      return `<section class="side-card ${r.done?'completed':''}" aria-label="第 ${i+1} 组 ${name}">
        <div class="side-card-heading"><strong>${name}</strong><span>${r.done?'✓ 已完成':'待完成'}</span></div>
        <div class="set-fields ${ex.id==='core'?'single-field':''}">
          ${ex.id!=='core'?`<div class="field"><label for="${prefix}-weight">${name}重量（kg）</label><input id="${prefix}-weight" aria-label="第${i+1}组${name}重量（kg）" type="number" min="0" max="500" step="0.5" inputmode="decimal" placeholder="可留空" data-field="weightKg" data-ex="${ex.id}" data-set="${i}" data-side="${side}" value="${esc(r.weightKg)}" ${disabled?'disabled':''}></div>`:''}
          <div class="field"><label for="${prefix}-actual">${name}实际次数</label><input id="${prefix}-actual" aria-label="第${i+1}组${name}实际次数" type="number" min="1" max="300" step="1" inputmode="numeric" data-field="actual" data-ex="${ex.id}" data-set="${i}" data-side="${side}" value="${esc(r.actual)}" ${disabled?'disabled':''}></div>
        </div>
        <div class="field side-feel"><label for="${prefix}-feel">${name}体感</label><select id="${prefix}-feel" aria-label="第${i+1}组${name}体感" data-field="difficulty" data-ex="${ex.id}" data-set="${i}" data-side="${side}" ${disabled?'disabled':''}>${['轻松','适中','吃力'].map(v=>`<option value="${v}" ${r.difficulty===v?'selected':''}>${v}</option>`).join('')}</select></div>
        <button class="secondary side-complete" data-action="${r.done?'undo-side':'complete-side'}" data-ex="${ex.id}" data-set="${i}" data-side="${side}" ${locked?'disabled':''}>${r.done?`撤销${name}完成（第${i+1}组）`:`记录${name}完成（第${i+1}组）`}</button>
      </section>`;
    }).join('')}</div>
    <p class="side-group-status" role="status">${record.done?'两侧均已记录，本组已计入完成组数。':count===1?'还有一侧未完成，本组尚未计入完成组数。':'请分别记录两侧；两侧全部完成才算一组。'}</p>
  </div>`;
}
function renderRest(draft) {
  if (!draft.restUntil) return '';
  const remaining=Math.max(0,Math.ceil((draft.restUntil-Date.now())/1000));
  const expired=remaining===0;
  const ex=draft.plan[draft.activeIndex];
  const current=exerciseProgress(draft,ex.id);
  const nextIdx=nextPendingExercise(draft);
  const afterRest=current.complete?(nextIdx>=0?`下一动作：${draft.plan[nextIdx].name}（${draft.plan[nextIdx].sets} 组）`:'本次训练可以保存了'):`接下来：${ex.name}，第 ${current.next+1} / ${current.total} 组`;
  return `<aside class="rest-card" id="rest-panel" aria-live="polite">
    <div class="rest-top"><strong>${expired?'休息已结束':'组间休息'}</strong><small>${expired?'准备好后再继续':'放松呼吸'}</small></div>
    <p class="rest-next">${esc(afterRest)}</p>
    ${expired?`<div class="rest-finish">时间到了，继续训练</div>`:
    `<div class="timer-display" id="rest-clock">${formatSeconds(remaining)}</div>`}
    <div class="rest-actions">
      ${expired?`<button data-action="stop-rest">关闭提醒</button>`:`<button data-action="extend-rest">+30 秒</button><button data-action="stop-rest">跳过休息</button>`}
    </div>
  </aside>`;
}
function renderHistory() {
  const sessions=getLatestSessions();
  const weekStats=[];
  const base=startOfWeek(new Date());
  for(let i=7;i>=0;i--){
    const monday=plusDays(base,-i*7);
    weekStats.push({name:`${8-i}`,n:weekSessions(monday).length});
  }
  const totalSessions=sessions.length;
  const totalCompletedSets=sessions.reduce((n,s)=>n+completedSets(s),0);
  return `
    <div class="section-heading" style="margin-top:8px"><h2 style="font-size:25px">训练记录</h2><small>只有本机数据</small></div>
    <section class="panel">
      <div class="summary-top"><div><h3>坚持的每一次，都有记录</h3><p>最近8周 · 每周目标3次</p></div><span class="badge dark">训练统计</span></div>
      <div class="stats"><div class="stat"><b>${totalSessions}</b><small>完成训练</small></div><div class="stat"><b>${totalCompletedSets}</b><small>有效训练组</small></div><div class="stat"><b>${weekStats.at(-1).n}/3</b><small>本周完成</small></div></div>
      <div class="chart-box">${weekStats.map(w=>`<div class="chart-col"><div class="chart-bar" style="height:${Math.max(3,Math.min(3,w.n)*28)}px" title="${w.n}次"></div><small>${w.name}</small></div>`).join('')}</div>
      <p class="small-note" style="text-align:center">横轴是最近8个自然周（由左到右）；每根柱子代表完成次数。</p>
    </section>
    <div class="section-heading"><h2>历史训练</h2><small>${totalSessions} 条记录</small></div>
    ${sessions.length?sessions.map(s=>`<button class="hist-card" style="width:100%;text-align:left" data-action="view-session" data-id="${esc(s.id)}">
      <span class="hist-icon">${icon('check')}</span><span style="flex:1"><h3>${esc(dateLabel(s.date))} · 全身基础力量</h3><small>第 ${s.week} 周 · ${completedSets(s)} 组完成 · ${s.overallFeel || '适中'}</small></span>${icon('right')}
    </button>`).join(''):`<div class="panel empty"><span class="big">◌</span>第一条训练记录会出现在这里。<br>从一场完整的训练开始。</div>`}
    <div class="section-heading"><h2>备份与复盘</h2><small>建议每周导出一次</small></div>
    <section class="panel">
      <div class="summary-top"><div><h3>把训练带给 ChatGPT 分析</h3><p>导出 Markdown 报告，上传到聊天中，让我给出下周的训练调整建议。</p></div></div>
      <div class="data-actions"><button class="secondary" data-action="export-report">${icon('download')} AI 复盘报告</button><button class="secondary" data-action="export-csv">${icon('download')} CSV 明细</button></div>
      <div class="tip">${icon('shield')}<div>包含你的私人训练表现。请只在你信任的位置保存或分享；网页不会自行上传记录。</div></div>
    </section>
  `;
}
function renderDetail() {
  const session=state.sessions.find(x=>x.id===state.historyId);
  if(!session){state.view='history';return renderHistory();}
  const setsDone=completedSets(session);
  return `<div style="margin-top:8px"><button class="tertiary" data-action="nav" data-view="history">${icon('left')} 返回记录</button></div>
    <div class="section-heading" style="margin-top:13px"><h2>${dateLabel(session.date)}</h2><span class="badge">已完成</span></div>
    <section class="panel">
      <div class="summary-top"><div><h3>全身基础力量</h3><p>第 ${session.week} 周 · ${esc(session.completedAt?.slice(0,10) || '')}</p></div></div>
      <div class="stats"><div class="stat"><b>${setsDone}</b><small>完成组数</small></div><div class="stat"><b>${totalSets(session)}</b><small>计划组数</small></div><div class="stat"><b>${esc(session.overallFeel || '适中')}</b><small>整体感受</small></div></div>
      ${session.plan.map(ex=>{
        const records=session.records[ex.id] || [];
        return `<div class="session-row"><span class="row-check">${icon('check')}</span><div class="row-main"><b>${ex.name}</b>
          <small>${esc(movementFor(ex).label)}</small><small>${records.map((set,i)=>hasRecordedWork(set)?`第${i+1}组 ${esc(recordDescription(ex,set))}`:null).filter(Boolean).join('；') || '未完成'}</small></div></div>`;
      }).join('')}
      ${session.notes?`<div class="tip">备注：${esc(session.notes)}</div>`:''}
    </section><div style="text-align:right;margin-top:11px"><button class="ghost-danger" data-action="delete-session">删除这条记录</button></div>
    <div class="callout green-callout">对比连续几次训练的实际次数、重量和身体感受，比单纯追求更重的重量更重要。</div>`;
}
function renderSettings() {
  const s=state.settings;
  return `<div class="section-heading" style="margin-top:8px"><h2 style="font-size:25px">我的设置</h2><small>仅当前设备</small></div>
    <section class="panel">
      <div class="summary-top"><div><h3>八周训练计划</h3><p>每周一、三、五 · 健康与体能 · 零基础</p></div><span class="badge">V1.2</span></div>
      <div class="select-line"><div><label for="start-date">第1周的起始日期</label><span>自动按该日期所在的周一计算</span></div><input id="start-date" type="date" data-setting="startDate" value="${esc(s.startDate)}"></div>
      <div class="select-line"><div><label for="rest-sec">默认组间休息</label><span>可在训练中临时延长30秒</span></div>
        <select id="rest-sec" data-setting="restSeconds">${[60,75,90,120,150].map(n=>`<option value="${n}" ${s.restSeconds===n?'selected':''}>${n} 秒</option>`).join('')}</select></div>
      <div class="select-line"><div><label for="sound-enabled">前台提示音</label><span>只在网页保持活动时可能响铃</span></div>
        <select id="sound-enabled" data-setting="soundEnabled"><option value="false" ${!s.soundEnabled?'selected':''}>关闭</option><option value="true" ${s.soundEnabled?'selected':''}>开启</option></select></div>
      <div class="tip">${icon('info')}<div>网页在 iPhone 锁屏后可能被系统挂起。计时恢复依靠真实结束时间，不能保证锁屏时发声或振动。</div></div>
    </section>
    <div class="section-heading"><h2>数据管理</h2><small>本地保存，不经过服务器</small></div>
    <section class="panel">
      <div class="summary-top"><div><h3>备份、恢复和迁移</h3><p>JSON 备份包含训练计划设置、历史记录，以及当前未完成训练。</p></div></div>
      <div class="data-actions"><button class="secondary" data-action="export-json">${icon('download')} 导出完整备份</button><button class="secondary" data-action="import-json">${icon('cloud')} 导入备份</button></div>
      <input type="file" id="import-file" accept=".json,application/json" style="display:none" aria-label="选择训练记录备份">
      <div class="callout">卸载主屏幕应用、清除 Safari 网站数据、更换手机都有可能导致本地记录丢失。请定期导出 JSON 备份。</div>
    </section>
    <div class="section-heading"><h2>安装到 iPhone</h2></div>
    <section class="panel">
      <div class="summary-top"><div><h3>像原生 App 一样打开</h3><p>部署到 HTTPS 站点后，可通过 Safari 的分享菜单添加到主屏幕。</p></div></div>
      <div class="session-row"><span class="row-check">1</span><div class="row-main"><b>用 Safari 打开正式 HTTPS 网站</b></div></div>
      <div class="session-row"><span class="row-check">2</span><div class="row-main"><b>点「分享」 →「添加到主屏幕」</b></div></div>
      <div class="session-row"><span class="row-check">3</span><div class="row-main"><b>打开「作为网页 App 打开」并添加</b></div></div>
      <p class="small-note">首次联网打开并完成缓存后，可在断网环境下查看训练计划与本地记录。ACE 外部教学链接需要网络。</p>
    </section>
    <div class="section-heading"><h2>连接状态</h2></div>
    <section class="panel">
      <div class="session-row"><span class="row-check">${icon('check')}</span><div class="row-main"><b>本机离线存储</b><small>IndexedDB（无法使用时回退到本地存储）</small></div></div>
      <div class="session-row"><span class="row-check">—</span><div class="row-main"><b>云端同步：尚未启用</b><small>后续版本才接入 Supabase 登录与同步</small></div></div>
      <div class="session-row"><span class="row-check">—</span><div class="row-main"><b>Apple Watch / Apple 健康：尚未启用</b><small>需要后续原生桥接；当前可独立使用手表体能训练</small></div></div>
    </section>
    <p class="footer-note">稳练 · 开源单机版 V1.2 · 健身指导不替代专业医疗意见</p>`;
}
function renderModal() {
  const ex=state.modalExercise?EXERCISES[state.modalExercise]:null;
  if(!ex) return '';
  const guide=EXERCISE_GUIDES[ex.id];
  const planned=state.draft?.plan.find(item=>item.id===ex.id) || workoutForWeek(getWeek(state.selectedDate)).find(item=>item.id===ex.id);
  const list=(title,items,ordered=false)=>`<h3>${title}</h3><${ordered?'ol':'ul'}>${items.map(item=>`<li>${esc(item)}</li>`).join('')}</${ordered?'ol':'ul'}>`;
  return `<div class="modal-backdrop" data-action="close-modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div class="modal-handle"></div><button class="modal-close" data-action="close-modal" aria-label="关闭动作说明">${icon('close')}</button>
    <span class="badge dark">${ex.category} · ${ex.equipment}</span><h2 id="modal-title" style="margin-top:13px">${ex.name}</h2>
    <p>${ex.short}</p>
    <div class="movement-instruction"><strong>${esc(movementFor(ex).label)}</strong><p>${esc(movementFor(ex).cue)}</p></div>
    <div class="guide-summary"><strong>${esc(guide.cue)}</strong><p>${planned?`本次目标 ${planned.sets} 组 · 每组 ${ex.min===ex.max?ex.min:ex.min+'–'+ex.max}${ex.unit}`:'该动作从第 3 周加入计划'}</p><p>${esc(guide.count)}</p></div>
    <p class="small-note">完整中文教学已内置，可离线阅读；不用离开跟练页。</p>
    ${list('1 · 开始前怎么摆好',guide.prepare)}
    ${list('2 · 一次完整动作怎么做',guide.steps,true)}
    <h3>3 · 呼吸与节奏</h3><p>${esc(guide.breathing)}</p>
    ${list('4 · 做对时检查什么',guide.check)}
    ${list('5 · 常见错误',guide.mistakes)}
    <h3>6 · 太难时怎么调整</h3><p>${esc(guide.easier)}</p>
    <div class="callout"><b>注意事项：</b>${esc(guide.stop)}</div>
    <details class="guide-sources"><summary>查看已绑定的专业来源</summary><p>依据官方资料整理的中文要点，并结合本应用的入门计划作调整。不是原文转载；组次以应用内计划为准。核对日期：${GUIDE_REVIEWED}。</p>
    ${guide.sources.map(item=>`<div class="guide-source"><a class="source" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${icon('external')} ${esc(item.title)}</a><p>${esc(item.note)}</p></div>`).join('')}</details>
    <button class="primary" data-action="close-modal">返回训练 ${icon('check')}</button>
  </div></div>`;
}
function formatSeconds(value) {
  const sec=Math.max(0,Math.ceil(value));
  return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
}

function moveToNextExercise() {
  if (!state.draft) return;
  const d=state.draft;
  const firstRemaining=d.plan.findIndex((ex,i)=> i>d.activeIndex && !d.skipped.includes(ex.id) && (d.records[ex.id]||[]).some(s=>!s.done));
  if(firstRemaining!==-1) d.activeIndex=firstRemaining;
  else if (d.activeIndex<d.plan.length-1) d.activeIndex++;
}
function makeBeep() {
  if(!state.settings.soundEnabled || document.visibilityState!=='visible') return;
  try {
    const AC=window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    const ctx=new AC();
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.connect(gain);gain.connect(ctx.destination);
    osc.type='sine';osc.frequency.value=740;
    gain.gain.setValueAtTime(.0001,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.13,ctx.currentTime+.02);
    gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.25);
    osc.start();osc.stop(ctx.currentTime+.27);
    osc.onended=()=>ctx.close().catch(()=>{});
  } catch { /* iOS may prevent audio in background: timer is still correct. */ }
}
function startRest(sec) {
  if (!state.draft || sec<=0) return;
  const ms=sec*1000;
  state.draft.restUntil=Date.now()+ms;
  state.draft.restTotal=sec;
  lastTimerExpired=null;
}
function completeSet(exId,index) {
  const d=state.draft;
  if(!d) return;
  const ex=d.plan.find(p=>p.id===exId), record=d.records?.[exId]?.[index];
  if(!ex || !record || record.done) return;
  if(isSided(ex) && record.sides){toast('请分别记录两侧，两侧都完成才算一组');return;}
  const actual=safeNumber(record.actual,NaN);
  if(!Number.isFinite(actual) || actual<=0 || actual>300){toast('请先输入有效的实际次数或时长');return;}
  if (record.weightKg!=='' && (!Number.isFinite(Number(record.weightKg)) || Number(record.weightKg)<0 || Number(record.weightKg)>500)) {
    toast('重量应在 0–500 kg 范围内'); return;
  }
  record.actual=actual;
  finishSet(ex,record,index);
}
function finishSet(ex,record,index) {
  const d=state.draft;
  record.done=true;
  record.doneAt=new Date().toISOString();
  // 最后一组完成后保留当前动作的完成提示，由用户明确进入下一动作。
  if(ex.kind==='reps') {
    const stillRemaining=d.plan.some(e=> (d.records[e.id]||[]).some(s=>!s.done) && !d.skipped.includes(e.id));
    if(stillRemaining) startRest(state.settings.restSeconds);
    else {d.restUntil=null;d.restTotal=0;}
  } else {d.restUntil=null;d.restTotal=0;}
  save('draft');render();
  const progress=exerciseProgress(d,ex.id);
  toast(progress.complete?`${ex.name}：${progress.total} 组全部完成`:`${ex.name}：已完成 ${progress.done}/${progress.total} 组，休息后做第 ${progress.next+1} 组`);
  document.querySelector('.exercise-progress')?.scrollIntoView({block:'center',behavior:'smooth'});
}
function completeSide(exId,index,side) {
  const d=state.draft,ex=d?.plan.find(item=>item.id===exId),group=d?.records?.[exId]?.[index];
  if(!ex || !group?.sides || !SIDE_KEYS.includes(side) || group.sides[side].done) return;
  if(index!==d.records[exId].findIndex(r=>!r.done)){toast('请先完成前面一组的两侧');return;}
  const record=group.sides[side],actual=Number(record.actual);
  if(!Number.isInteger(actual) || actual<1 || actual>300){toast('请填写 1–300 的整数次数');return;}
  if(record.weightKg!=='' && (!Number.isFinite(Number(record.weightKg)) || Number(record.weightKg)<0 || Number(record.weightKg)>500)){toast('重量应在 0–500 kg 范围内');return;}
  record.actual=actual;record.done=true;record.doneAt=new Date().toISOString();
  syncSideGroup(group);
  if(group.done) {finishSet(ex,group,index);return;}
  save('draft');render();
  const pending=SIDE_KEYS.find(s=>!group.sides[s].done);
  toast(`${movementFor(ex).sides[side]}已记录；${movementFor(ex).sides[pending]}还未完成，本组尚未完成`);
}
function undoSide(exId,index,side) {
  const d=state.draft,record=d?.records?.[exId]?.[index];
  if(!record?.sides?.[side]?.done) return;
  record.sides[side].done=false;record.sides[side].doneAt=null;syncSideGroup(record);
  d.activeIndex=d.plan.findIndex(ex=>ex.id===exId);d.restUntil=null;d.restTotal=0;
  save('draft');render();toast('已撤销这一侧；另一侧记录保留，本组改为未完成');
}
function undoSet(exId,index) {
  const record=state.draft?.records?.[exId]?.[index];
  if(!record || !record.done) return;
  record.done=false;record.doneAt=null;
  const ex=state.draft.plan.find(e=>e.id===exId);
  if(isSided(ex)) record.sides=freshRecord(ex,record).sides;
  const exIdx=state.draft.plan.findIndex(e=>e.id===exId);
  if(exIdx>=0) state.draft.activeIndex=exIdx;
  state.draft.restUntil=null;
  save('draft');render();
  toast('本组已改回待完成');
}
async function finishWorkout(early=false) {
  const draft=state.draft;
  if(!draft) return;
  const done=completedSets(draft);
  const partial=Object.values(draft.records).flat().filter(r=>r.sides && !r.done && hasRecordedWork(r)).length;
  if(early && !window.confirm(`本次已记录 ${done}/${totalSets(draft)} 个完整组${partial?`，另有 ${partial} 组仅完成一侧（也会保留）`:''}。确定提前结束并保存吗？`)) return;
  if(!early && done===0) {toast('至少先完成一组训练再保存');return;}
  draft.status='completed';
  draft.completedAt=new Date().toISOString();
  draft.restUntil=null;
  draft.restTotal=0;
  state.sessions=[...state.sessions.filter(s=>s.id!==draft.id),draft];
  state.historyId=draft.id;
  state.draft=null;
  state.view='detail';
  await save('sessions','draft');
  render();window.scrollTo({top:0,behavior:'instant'});
  toast('本次训练已保存');
}
function createTraining() {
  const current=state.draft;
  if(current){
    state.view='workout';render();window.scrollTo({top:0,behavior:'instant'});
    return;
  }
  if(getSessionByDate(state.selectedDate)){toast('这个训练日已经有已完成记录');return;}
  state.draft=makeSession(state.selectedDate);
  state.view='workout';
  save('draft');render();window.scrollTo({top:0,behavior:'instant'});
}
function updateSetField(target) {
  const exId=target.dataset.ex;
  const idx=Number(target.dataset.set);
  const field=target.dataset.field;
  const group=state.draft?.records?.[exId]?.[idx];
  const side=target.dataset.side;
  const record=side && SIDE_KEYS.includes(side)?group?.sides?.[side]:group;
  if(!record || record.done || (group?.sides && !side)) return;
  if(field==='difficulty') record.difficulty=target.value;
  else if(field==='weightKg') {
    const raw=target.value.trim();
    if(raw==='') record.weightKg='';
    else {
      const n=Number(raw);
      if(!Number.isFinite(n)||n<0||n>500){toast('重量范围应为 0–500 kg');target.value=String(record.weightKg);return;}
      record.weightKg=n;
    }
  } else if(field==='actual') {
    const n=Number(target.value);
    if(!Number.isFinite(n)||n<0||n>300){toast('请输入有效的次数或分钟数');return;}
    record.actual=n;
  }
  save('draft');
}
async function updateSetting(target) {
  const setting=target.dataset.setting;
  if(setting==='startDate') {
    const iso=target.value;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
    state.settings.startDate=toLocalDate(startOfWeek(fromLocalDate(iso)));
    setWeekForDate(state.selectedDate);
  } else if(setting==='restSeconds') {
    const number=Number(target.value);
    if(![60,75,90,120,150].includes(number)) return;
    state.settings.restSeconds=number;
  } else if(setting==='soundEnabled') {
    state.settings.soundEnabled=target.value==='true';
  }
  await save('settings');render();toast('设置已保存');
}
function makeReport() {
  const list=getLatestSessions();
  const lines=[
    '# 稳练 · 训练复盘报告',
    '',`导出时间：${new Date().toLocaleString('zh-CN')}`,
    `训练目标：${state.settings.trainingGoal}`,
    `计划起始：${state.settings.startDate}（周一）`,
    `已完成训练：${list.length} 次`,
    `已完成有效组数：${list.reduce((n,s)=>n+completedSets(s),0)} 组`,
    '', '## 每次训练详细记录'
  ];
  if(!list.length) lines.push('尚无已完成训练。');
  for(const s of list){
    lines.push('',`### ${s.date} · 第 ${s.week} 周（${s.planVersion || PLAN_VERSION}）`,
      `整体感受：${s.overallFeel || '未填写'}；完成 ${completedSets(s)}/${totalSets(s)} 组`);
    for(const ex of s.plan){
      const items=(s.records?.[ex.id]||[]).map((r,i)=>hasRecordedWork(r)?`第${i+1}组 ${recordDescription(ex,r)}`:null).filter(Boolean);
      lines.push(`- ${ex.name}（${movementFor(ex).label}）：${items.join('；') || '未完成'}${s.skipped?.includes(ex.id)?'（跳过）':''}`);
    }
    if(s.notes) lines.push(`- 备注：${String(s.notes).replace(/\r?\n/g,' ')}`);
  }
  lines.push('','## 请 ChatGPT 分析','请根据以上记录，结合「零基础、改善体能与健康、每周一三五训练」目标，评估训练依从性、动作进步与负重变化；优先提供循序渐进的下周安排，避免过早大幅增量。','',
    '> 隐私：报告由设备本地生成，只有主动上传后其他人或服务才可能读取。');
  return lines.join('\n');
}
function csvCell(s) {return `"${String(s??'').replace(/"/g,'""')}"`;}
function makeCsv() {
  const header=['日期','状态','计划周','动作','组数序号','目标下限','目标上限','实际次数或分钟','单位','单只哑铃或器械重量kg','组体感','整体体感','备注','侧别或配对','整组完成'];
  const rows=[header];
  for(const s of getLatestSessions()){
    for(const ex of s.plan){
      const sets=s.records[ex.id]||[];
      for(let i=0;i<sets.length;i++){
        const r=sets[i];
        if(!hasRecordedWork(r)) continue;
        if(r.sides && isSided(ex)) {
          for(const side of SIDE_KEYS){
            const item=r.sides[side];if(!item.done)continue;
            rows.push([s.date,s.status,s.week,ex.name,i+1,ex.min,ex.max,item.actual,'次',item.weightKg,item.difficulty||'',s.overallFeel||'',s.notes||'',movementFor(ex).sides[side],r.done?'是':'否']);
          }
        } else rows.push([s.date,s.status,s.week,ex.name,i+1,ex.min,ex.max,r.actual,ex.unit,r.weightKg,r.difficulty||'',s.overallFeel||'',s.notes||'',isSided(ex)?'旧版合并，未分别记录两侧':movementFor(ex).label,'是']);
      }
    }
  }
  return '\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}
function exportBackup() {
  const dump={app:'wenlian',schemaVersion:2,appVersion:'1.2',exportedAt:new Date().toISOString(),settings:state.settings,sessions:state.sessions,draft:state.draft};
  downloadFile(`稳练-完整备份-${toLocalDate(new Date())}.json`,JSON.stringify(dump,null,2));
  toast('已创建完整 JSON 备份');
}
function normalizeSession(raw) {
  if(!raw || typeof raw!=='object' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date||'')) return null;
  if(!['active','completed'].includes(raw.status)) return null;
  const plan=(Array.isArray(raw.plan)?raw.plan:[]).slice(0,16).filter(ex=>EXERCISES[ex?.id]).map(ex=>({
    ...EXERCISES[ex.id],sets:Math.min(6,Math.max(1,Math.round(Number(ex.sets)||1))),
    minReps: EXERCISES[ex.id].min,maxReps: EXERCISES[ex.id].max
  }));
  if(!plan.length) return null;
  const records={};
  for(const ex of plan) {
    const source=Array.isArray(raw.records?.[ex.id])?raw.records[ex.id]:[];
    records[ex.id]=Array.from({length:ex.sets},(_,i)=>{
      const item=source[i]||{};
      const weight=safeNumber(item.weightKg,0);
      const record={
        weightKg: item.weightKg==='' || item.weightKg===undefined?'':Math.max(0,Math.min(500,weight)),
        actual: Math.min(300,Math.max(0,safeNumber(item.actual,ex.min))),
        difficulty: ['轻松','适中','吃力'].includes(item.difficulty)?item.difficulty:'适中',
        done: Boolean(item.done),doneAt:typeof item.doneAt==='string'?item.doneAt:null
      };
      if(isSided(ex) && item.sides && typeof item.sides==='object') {
        record.sides=Object.fromEntries(SIDE_KEYS.map(side=>{
          const r=item.sides[side]||{},actual=Math.min(300,Math.max(0,Math.round(safeNumber(r.actual,ex.min))));
          return [side,{
            weightKg:ex.id==='core' || r.weightKg==='' || r.weightKg===undefined?'':Math.max(0,Math.min(500,safeNumber(r.weightKg,0))),
            actual,difficulty:['轻松','适中','吃力'].includes(r.difficulty)?r.difficulty:'适中',
            done:Boolean(r.done) && actual>0,doneAt:typeof r.doneAt==='string'?r.doneAt:null
          }];
        }));
        syncSideGroup(record);
      }
      return record;
    });
  }
  return {
    id:String(raw.id||`imported-${Date.now()}`).slice(0,90),date:raw.date,
    week:Math.min(200,Math.max(1,Math.round(safeNumber(raw.week,1)))),
    planVersion:String(raw.planVersion||PLAN_VERSION).slice(0,20),
    createdAt: typeof raw.createdAt==='string'?raw.createdAt:new Date().toISOString(),
    completedAt:typeof raw.completedAt==='string'?raw.completedAt:null,
    status:raw.status,plan,records,
    skipped:Array.isArray(raw.skipped)?raw.skipped.filter(id=>EXERCISES[id]).slice(0,16):[],
    activeIndex:Math.min(plan.length-1,Math.max(0,Math.round(safeNumber(raw.activeIndex,0)))),
    restUntil:null,restTotal:0,
    notes:String(raw.notes||'').slice(0,2000),
    overallFeel:['轻松','适中','吃力'].includes(raw.overallFeel)?raw.overallFeel:'适中'
  };
}
async function importBackup(file) {
  if(!file) return;
  if(file.size>8*1024*1024){toast('备份文件过大（最大 8MB）');return;}
  try {
    const data=JSON.parse(await file.text());
    if(data.app!=='wenlian' || ![1,2].includes(data.schemaVersion) || !Array.isArray(data.sessions)) throw Error('不是有效的稳练备份格式');
    if(data.sessions.length>1500) throw Error('超过导入记录数量限制');
    if(!window.confirm('导入会替换当前设备上的设置、历史和未完成训练。请先导出本机 JSON 备份。确定继续吗？')) return;
    const sessions=data.sessions.map(normalizeSession).filter(Boolean).filter(x=>x.status==='completed');
    const oldSettings=data.settings||{};
    state.settings={...DEFAULT_SETTINGS,
      startDate: /^\d{4}-\d{2}-\d{2}$/.test(oldSettings.startDate||'')?toLocalDate(startOfWeek(fromLocalDate(oldSettings.startDate))):DEFAULT_SETTINGS.startDate,
      restSeconds: [60,75,90,120,150].includes(Number(oldSettings.restSeconds))?Number(oldSettings.restSeconds):90,
      soundEnabled:Boolean(oldSettings.soundEnabled),trainingGoal:'改善体能与健康'
    };
    state.sessions=sessions;
    state.draft=data.draft?normalizeSession(data.draft):null;
    if(state.draft && state.draft.status!=='active') state.draft=null;
    upgradeDraftSides(state.draft);
    state.view='home';setWeekForDate(state.selectedDate);
    await save('settings','sessions','draft');render();toast(`成功导入 ${sessions.length} 条训练记录`);
  } catch(error){toast(`导入失败：${error.message||'文件格式错误'}`);}
}
function newView(view) {
  state.view=view;state.modalExercise=null;
  render();window.scrollTo({top:0,behavior:'instant'});
}
async function dispatchAction(button) {
  const action=button.dataset.action;
  const id=button.dataset.id;
  switch(action) {
    case 'nav': newView(button.dataset.view);break;
    case 'pick-day': state.selectedDate=button.dataset.date;render();break;
    case 'prev-week': {
      state.weekOffset--;const monday=weekMondayOffset();state.selectedDate=toLocalDate(plusDays(monday,0));render();break;
    }
    case 'next-week': {
      state.weekOffset++;const monday=weekMondayOffset();state.selectedDate=toLocalDate(plusDays(monday,0));render();break;
    }
    case 'start':createTraining();break;
    case 'resume':newView('workout');break;
    case 'continue-exercise':
      if(state.draft){
        const next=nextPendingExercise(state.draft);
        if(next>=0){state.draft.activeIndex=next;save('draft');render();window.scrollTo({top:0,behavior:'instant'});}
      }break;
    case 'show-exercise':state.modalExercise=id;render();break;
    case 'close-modal':state.modalExercise=null;render();break;
    case 'previous-exercise':
      if(state.draft){state.draft.activeIndex=Math.max(0,state.draft.activeIndex-1);save('draft');render();window.scrollTo({top:0,behavior:'instant'});}break;
    case 'next-exercise':
      if(state.draft){state.draft.activeIndex=Math.min(state.draft.plan.length-1,state.draft.activeIndex+1);save('draft');render();window.scrollTo({top:0,behavior:'instant'});}break;
    case 'complete-set':completeSet(button.dataset.ex,Number(button.dataset.set));break;
    case 'complete-side':completeSide(button.dataset.ex,Number(button.dataset.set),button.dataset.side);break;
    case 'undo-side':undoSide(button.dataset.ex,Number(button.dataset.set),button.dataset.side);break;
    case 'undo-set':undoSet(button.dataset.ex,Number(button.dataset.set));break;
    case 'extend-rest':
      if(state.draft?.restUntil){state.draft.restUntil=Math.max(Date.now(),state.draft.restUntil)+30000;state.draft.restTotal+=30;save('draft');render();}break;
    case 'stop-rest':
      if(state.draft){state.draft.restUntil=null;state.draft.restTotal=0;save('draft');render();}break;
    case 'skip-exercise':
      if(state.draft){
        const ex=state.draft.plan[state.draft.activeIndex];
        if(!window.confirm(`确定跳过「${ex.name}」？已做完的组仍会保留。`))break;
        if(!state.draft.skipped.includes(ex.id)) state.draft.skipped.push(ex.id);
        state.draft.restUntil=null;moveToNextExercise();save('draft');render();
      }break;
    case 'finish':await finishWorkout(false);break;
    case 'finish-early':await finishWorkout(true);break;
    case 'view-session':state.historyId=id;newView('detail');break;
    case 'export-json':exportBackup();break;
    case 'export-csv':downloadFile(`稳练-组次明细-${toLocalDate(new Date())}.csv`,makeCsv(),'text/csv;charset=utf-8');toast('CSV 组次明细已导出');break;
    case 'export-report':downloadFile(`稳练-AI复盘报告-${toLocalDate(new Date())}.md`,makeReport(),'text/markdown;charset=utf-8');toast('AI 复盘报告已导出');break;
    case 'import-json':document.getElementById('import-file')?.click();break;
    case 'delete-session':{
      const session=state.sessions.find(s=>s.id===state.historyId);
      if(session && window.confirm('永久删除这条训练记录？删除后只能通过此前导出的备份恢复。')){
        state.sessions=state.sessions.filter(s=>s.id!==session.id);await save('sessions');newView('history');toast('记录已删除');
      }break;
    }
    default: break;
  }
}
document.addEventListener('click',event=>{
  const button=event.target.closest('button[data-action]');
  if(button){event.preventDefault();dispatchAction(button).catch(err=>{console.error(err);toast('操作失败，请刷新后重试');});return;}
  if(event.target.matches('.modal-backdrop')) {state.modalExercise=null;render();}
});
document.addEventListener('change',event=>{
  const target=event.target;
  if(target.id==='import-file'){importBackup(target.files?.[0]);return;}
  if(target.dataset.setting){updateSetting(target);return;}
  if(target.dataset.field==='note' && state.draft){state.draft.notes=target.value.slice(0,2000);save('draft');return;}
  if(target.dataset.field==='overallFeel' && state.draft){state.draft.overallFeel=target.value;save('draft');return;}
  if(target.dataset.field && target.dataset.ex){updateSetField(target);}
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape' && state.modalExercise){state.modalExercise=null;render();}
});
window.addEventListener('online',()=>{state.online=true;if(state.view==='home')render();});
window.addEventListener('offline',()=>{state.online=false;if(state.view==='home')render();});

// 恢复到前台时使用绝对时间判断休息是否结束；不依赖 setInterval 的调用次数。
function tickRestClock() {
  const d=state.draft;
  if(!d?.restUntil || state.view!=='workout') return;
  const remaining=Math.max(0,Math.ceil((d.restUntil-Date.now())/1000));
  const clock=document.getElementById('rest-clock');
  if(clock) clock.textContent=formatSeconds(remaining);
  if(remaining===0 && lastTimerExpired!==d.restUntil){
    lastTimerExpired=d.restUntil;
    makeBeep();
    if(navigator.vibrate) navigator.vibrate([90,65,90]);
    render();
  }
}
setInterval(tickRestClock,1000);
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible') tickRestClock();
});

async function initialize() {
  try {
    const saved=await readAll();
    state.settings={...DEFAULT_SETTINGS,...(saved.settings||{})};
    state.sessions=Array.isArray(saved.sessions)?saved.sessions:[];
    state.draft=saved.draft?.status==='active'?saved.draft:null;
    const draftUpgraded=upgradeDraftSides(state.draft);
    state.settings.startDate=resolveStartDate(saved.settings,state.sessions,state.draft,NOW);
    // 首次打开也保存起始周，避免没有手动改设置时每到周一又回到第 1 周。
    await save('settings',...(draftUpgraded?['draft']:[]));
    if(state.draft?.restUntil && Date.now()>=state.draft.restUntil) lastTimerExpired=state.draft.restUntil;
    setWeekForDate(state.selectedDate);
    render();
    if('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost' || location.hostname==='127.0.0.1')){
      const hadController=Boolean(navigator.serviceWorker.controller);
      navigator.serviceWorker.addEventListener('controllerchange',()=>{
        if(!hadController || document.querySelector('.update-banner')) return;
        const banner=document.createElement('aside');
        banner.className='update-banner';banner.setAttribute('role','status');
        banner.innerHTML='新版本已准备好。训练进度会保留。<button type="button">保存进度并更新</button>';
        banner.querySelector('button').addEventListener('click',async()=>{
          // 先让正在编辑的输入框触发 change，再等所有本地写入结束。
          document.activeElement?.blur();
          await saveQueue;
          window.location.reload();
        });
        document.body.append(banner);
      });
      navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(reg=>reg.update()).catch(err=>console.warn('Service worker could not install',err));
    }
  } catch(error) {
    console.error(error);
    ROOT.innerHTML=`<div class="startup"><div class="brand-mark">稳</div><h2>应用启动遇到问题</h2><p>请刷新或检查浏览器是否允许本地数据存储。</p></div>`;
  }
}
initialize();
