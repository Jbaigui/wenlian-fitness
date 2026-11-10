import test from 'node:test';
import assert from 'node:assert/strict';
import {getWeekNumber, workoutForWeek, recommendedDate, toLocalDate, startOfWeek} from '../plan.js';

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
