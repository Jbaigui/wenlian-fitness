import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as plan from '../plan.js';
import * as guides from '../exercise-guides.js';

// 执行真实应用函数；用最小 DOM/存储替身验证状态迁移，不冒充浏览器或离线测试。
function app(saved={}) {
  const root={innerHTML:''}, writes=[];
  const context=vm.createContext({
    ...plan,...guides,structuredClone,console,
    document:{getElementById:()=>root,querySelector:()=>null,addEventListener(){},body:{append(){}},createElement:()=>({setAttribute(){}})},
    navigator:{onLine:true},window:{addEventListener(){},scrollTo(){},confirm:()=>true},
    setInterval(){},setTimeout(){},clearTimeout(){},
    readAll:async()=>structuredClone(saved),writeData:async(key,value)=>writes.push([key,structuredClone(value)]),downloadFile(){}
  });
  let source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  source=source.slice(source.indexOf('const APP_NAME')).replace(/initialize\(\);\s*$/,'');
  // toast 的 DOM 动画不属于本测试；保留传入文本以检查用户提示。
  source+='\nrenderToast=()=>{}; globalThis.api={state,initialize,makeSession,completeSet,undoSet,dispatchAction,renderWorkout,renderModal,flush:()=>saveQueue};';
  new vm.Script(source).runInContext(context);
  return {api:context.api,root,writes};
}
test('first startup persists settings even without user editing settings',async()=>{
  const {api,writes}=app();
  await api.initialize();
  assert.ok(writes.some(([key,value])=>key==='settings' && value.startDate));
});
test('first and final sets remain on the same action until explicit continue',async()=>{
  const {api}=app();
  api.state.settings.startDate='2026-11-09';
  api.state.draft=api.makeSession('2026-11-16');
  api.state.draft.activeIndex=1;
  api.state.view='workout';
  api.completeSet('squat',0);
  assert.equal(api.state.draft.activeIndex,1);
  assert.match(api.renderWorkout(),/准备第 2 \/ 2 组/);
  assert.match(api.state.toast,/已完成 1\/2 组/);
  assert.ok(api.state.draft.restUntil>Date.now());
  api.completeSet('squat',1);
  assert.equal(api.state.draft.activeIndex,1);
  assert.match(api.renderWorkout(),/2 \/ 2 组全部完成/);
  assert.match(api.state.toast,/2 组全部完成/);
  await api.dispatchAction({dataset:{action:'continue-exercise'}});
  assert.equal(api.state.draft.plan[api.state.draft.activeIndex].id,'pulldown');
  api.undoSet('squat',0);
  assert.equal(api.state.draft.activeIndex,1);
  assert.equal(api.state.draft.records.squat[0].done,false);
  assert.match(api.renderWorkout(),/准备第 1 \/ 2 组/);
  await api.flush();
});
test('legacy single-set draft restores start date and retains its original volume',async()=>{
  const first=app();
  first.api.state.settings.startDate='2026-11-09';
  const draft=first.api.makeSession('2026-11-11');
  draft.records.squat[0].done=true;
  const {api}=app({draft,sessions:[]});
  await api.initialize();
  assert.equal(api.state.settings.startDate,'2026-11-09');
  assert.equal(api.state.draft.plan.find(ex=>ex.id==='squat').sets,1);
  assert.equal(api.state.draft.records.squat[0].done,true);
  api.state.modalExercise='hinge';
  assert.match(api.renderModal(),/一次完整动作怎么做/);
  assert.match(api.renderModal(),/dumbbell-romanian-deadlift/);
  assert.doesNotMatch(api.renderModal(),/317\/romanian-deadlift/);
});
