import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as plan from '../plan.js';
import * as guides from '../exercise-guides.js';
import * as movement from '../movement.js';

// 执行真实应用函数；用最小 DOM/存储替身验证状态迁移，不冒充浏览器或离线测试。
function app(saved={}) {
  const root={innerHTML:''}, writes=[];
  const context=vm.createContext({
    ...plan,...guides,...movement,structuredClone,console,
    document:{getElementById:()=>root,querySelector:()=>null,addEventListener(){},body:{append(){}},createElement:()=>({setAttribute(){}})},
    navigator:{onLine:true},window:{addEventListener(){},scrollTo(){},confirm:()=>true},
    setInterval(){},setTimeout(){},clearTimeout(){},
    readAll:async()=>structuredClone(saved),writeData:async(key,value)=>writes.push([key,structuredClone(value)]),downloadFile(){}
  });
  let source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  source=source.slice(source.indexOf('const APP_NAME')).replace(/initialize\(\);\s*$/,'');
  // toast 的 DOM 动画不属于本测试；保留传入文本以检查用户提示。
  source+='\nrenderToast=()=>{}; globalThis.api={state,initialize,makeSession,completeSet,completeSide,undoSide,undoSet,updateSetField,dispatchAction,renderWorkout,renderModal,makeReport,makeCsv,normalizeSession,completedSets,flush:()=>saveQueue};';
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

function rowSession(api) {
  api.state.settings.startDate='2026-11-09';
  api.state.draft=api.makeSession('2026-11-16');
  api.state.draft.activeIndex=api.state.draft.plan.findIndex(ex=>ex.id==='row');
  api.state.view='workout';
  return api.state.draft;
}
test('one side is not a completed set; reload, second side and undo preserve independent data',async()=>{
  const first=app();const s=rowSession(first.api);
  first.api.updateSetField({dataset:{ex:'row',set:'0',side:'left',field:'weightKg'},value:'4'});
  first.api.completeSide('row',0,'left');
  assert.equal(s.records.row[0].done,false);
  assert.equal(first.api.completedSets(s),0);
  assert.equal(s.restUntil,null);
  assert.match(first.api.renderWorkout(),/还有一侧未完成/);
  await first.api.flush();
  const restored=app({settings:{startDate:'2026-11-09'},sessions:[],draft:s});
  await restored.api.initialize();
  const group=restored.api.state.draft.records.row[0];
  assert.equal(group.sides.left.done,true);
  assert.equal(group.sides.left.weightKg,4);
  assert.equal(group.sides.right.done,false);
  restored.api.updateSetField({dataset:{ex:'row',set:'0',side:'right',field:'actual'},value:'8'});
  restored.api.updateSetField({dataset:{ex:'row',set:'0',side:'right',field:'weightKg'},value:'5'});
  restored.api.completeSide('row',0,'right');
  assert.equal(group.done,true);
  assert.equal(restored.api.completedSets(restored.api.state.draft),1);
  assert.equal(group.sides.left.actual,10);
  assert.equal(group.sides.right.actual,8);
  assert.equal(group.sides.right.weightKg,5);
  assert.ok(restored.api.state.draft.restUntil>Date.now());
  restored.api.undoSide('row',0,'right');
  assert.equal(group.done,false);
  assert.equal(group.sides.left.done,true);
  assert.equal(group.sides.right.done,false);
  assert.equal(restored.api.completedSets(restored.api.state.draft),0);
});
test('legacy completed groups remain merged; only pending groups gain separate sides',async()=>{
  const first=app();const draft=rowSession(first.api);
  delete draft.records.row[0].sides;
  delete draft.records.row[1].sides;
  draft.records.row[0].done=true;
  const {api}=app({draft,sessions:[]});await api.initialize();
  assert.equal(api.state.draft.records.row[0].done,true);
  assert.equal(api.state.draft.records.row[0].sides,undefined);
  assert.equal(api.state.draft.records.row[1].sides.left.done,false);
  assert.equal(api.state.draft.records.row[1].sides.right.done,false);
  assert.match(api.renderWorkout(),/旧版合并记录/);
  api.undoSet('row',0);
  assert.equal(api.state.draft.records.row[0].sides.left.done,false);
  assert.equal(api.state.draft.records.row[0].sides.right.done,false);
});
test('exports and import retain unequal sides and partial-set evidence',()=>{
  const {api}=app();const session=rowSession(api);
  session.records.row[0].sides.left.actual=9;
  api.completeSide('row',0,'left');
  session.status='completed';session.completedAt='2026-11-16T10:00:00Z';api.state.sessions=[session];
  const csv=api.makeCsv(),report=api.makeReport();
  assert.match(csv,/左手/);assert.doesNotMatch(csv,/"右手"/);
  assert.match(csv,/"否"/);
  assert.match(report,/左手：9 次/);assert.match(report,/右手：未完成/);
  const restored=api.normalizeSession(JSON.parse(JSON.stringify(session)));
  assert.equal(restored.records.row[0].sides.left.actual,9);
  assert.equal(restored.records.row[0].sides.left.done,true);
  assert.equal(restored.records.row[0].done,false);
  const inconsistent=JSON.parse(JSON.stringify(session));inconsistent.records.row[0].done=true;
  assert.equal(api.normalizeSession(inconsistent).records.row[0].done,false);
});
test('dead bug alternates opposite limbs and bilateral movements count once',()=>{
  const {api}=app();rowSession(api);
  const s=api.state.draft;
  s.activeIndex=s.plan.findIndex(ex=>ex.id==='core');
  assert.match(api.renderWorkout(),/右手＋左腿/);
  assert.match(api.renderWorkout(),/左手＋右腿/);
  assert.match(api.renderWorkout(),/共 16 次伸展/);
  api.completeSide('core',0,'left');assert.equal(s.records.core[0].done,false);
  api.completeSide('core',0,'right');assert.equal(s.records.core[0].done,true);
  assert.equal(api.completedSets(s),1);
  assert.equal(s.records.chest[0].sides,undefined);
  api.completeSet('chest',0);assert.equal(api.completedSets(s),2);
});
