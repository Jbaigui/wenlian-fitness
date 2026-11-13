import test from 'node:test';
import assert from 'node:assert/strict';
import {getWeekNumber, workoutForWeek, recommendedDate, toLocalDate, startOfWeek, resolveStartDate, exerciseProgress, nextPendingExercise, EXERCISES} from '../plan.js';
import {EXERCISE_GUIDES} from '../exercise-guides.js';

test('week numbers stay correct across daylight saving time',()=>{
  assert.equal(getWeekNumber('2026-11-09','2026-11-09'),1);
  assert.equal(getWeekNumber('2026-11-16','2026-11-09'),2);
  assert.equal(getWeekNumber('2026-11-23','2026-11-09'),3);
  assert.equal(getWeekNumber('2027-01-04','2026-11-09'),9);
});
test('workout progression is beginner-friendly',()=>{
  const week1=workoutForWeek(1);
  const week2=workoutForWeek(2);
  const week3=workoutForWeek(3);
  const week5=workoutForWeek(5);
  assert.equal(week1.find(x=>x.id==='squat').sets,1);
  assert.equal(week2.find(x=>x.id==='squat').sets,2);
  assert.ok(!week1.some(x=>x.id==='shoulder'));
  assert.equal(week3.find(x=>x.id==='shoulder').sets,1);
  assert.equal(week5.find(x=>x.id==='shoulder').sets,2);
  assert.equal(week1.find(x=>x.id==='row').unit,'次/侧');
});
test('recommended day is Mon/Wed/Fri in local date',()=>{
  assert.equal(recommendedDate(new Date(2026,10,10)), '2026-11-11');
  assert.equal(toLocalDate(startOfWeek(new Date(2026,10,15))), '2026-11-09');
});
test('start week survives a new calendar week and missing legacy settings',()=>{
  assert.equal(resolveStartDate(null,[],null,new Date(2026,10,13)),'2026-11-09');
  assert.equal(resolveStartDate({startDate:'2026-11-09'},[],null,new Date(2026,10,16)),'2026-11-09');
  assert.equal(resolveStartDate(null,[{date:'2026-11-11',week:1}],null,new Date(2026,10,16)),'2026-11-09');
  assert.equal(resolveStartDate(null,[],{date:'2026-11-18',week:2},new Date(2026,10,23)),'2026-11-09');
  assert.equal(getWeekNumber('2026-11-16',resolveStartDate(null,[{date:'2026-11-11',week:1}])) ,2);
});
test('multi-set completion, refresh snapshots, undo and pending earlier actions',()=>{
  const s={plan:workoutForWeek(2),records:{},activeIndex:1,skipped:['warmup']};
  for(const ex of s.plan)s.records[ex.id]=Array.from({length:ex.sets},()=>({done:false}));
  s.records.squat[0].done=true;
  assert.deepEqual(exerciseProgress(s,'squat'),{done:1,total:2,next:1,complete:false});
  s.records.squat[1].done=true;
  const restored=JSON.parse(JSON.stringify(s));
  assert.deepEqual(exerciseProgress(restored,'squat'),{done:2,total:2,next:-1,complete:true});
  assert.equal(restored.plan[nextPendingExercise(restored)].id,'pulldown');
  restored.records.squat[0].done=false;
  assert.equal(exerciseProgress(restored,'squat').next,0);
  for(const ex of restored.plan)restored.records[ex.id].forEach(r=>r.done=true);
  assert.equal(nextPendingExercise(restored),-1);
  restored.activeIndex=restored.plan.length-1;
  restored.records.squat[0].done=false;
  assert.equal(restored.plan[nextPendingExercise(restored)].id,'squat');
});
test('every exercise has a complete offline guide and a specific official source',()=>{
  assert.deepEqual(Object.keys(EXERCISE_GUIDES).sort(),Object.keys(EXERCISES).sort());
  for(const g of Object.values(EXERCISE_GUIDES)){
    for(const key of ['prepare','steps','check','mistakes','sources']) assert.ok(g[key].length>0,key);
    for(const key of ['cue','breathing','easier','stop','count']) assert.ok(g[key].length>0,key);
    for(const s of g.sources){assert.ok(/^https:\/\/(www\.)?(acefitness\.org|nasm\.org|heart\.org|cdc\.gov)\//.test(s.url));assert.ok(s.title && s.note);}
  }
  assert.ok(EXERCISE_GUIDES.shoulder.sources[0].url.endsWith('/45/seated-overhead-press/'));
  assert.ok(EXERCISE_GUIDES.hinge.sources[0].url.endsWith('dumbbell-romanian-deadlift'));
});
