// 动作执行方式与分侧记录。旧版合并记录保留原样，不推测左右侧成绩。
export const MOVEMENTS = {
  warmup:{mode:'continuous',label:'连续步行',cue:'左右脚自然交替走路，按总分钟数记录。'},
  squat:{mode:'bilateral',label:'双腿同时 · 双手共持一只哑铃',cue:'双脚同时完成一次下蹲和站起算 1 次，不需要左右各做一遍。'},
  pulldown:{mode:'bilateral',label:'双手同时拉',cue:'两手一起拉下、一起还原算 1 次，不分左右轮流拉。'},
  chest:{mode:'bilateral',label:'双手同时 · 每手一只哑铃',cue:'两只哑铃同时下放、同时推起算 1 次；重量记单只。'},
  hinge:{mode:'bilateral',label:'双腿同时 · 每手一只哑铃',cue:'双脚站稳，两只哑铃随身体一起下降和站起算 1 次；重量记单只。'},
  row:{mode:'unilateral',label:'单侧分别做 · 左手与右手',cue:'左手做完目标次数，换右手完成；左右都完成才记 1 组。',sides:{left:'左手',right:'右手'}},
  shoulder:{mode:'bilateral',label:'双手同时 · 每手一只哑铃',cue:'两手一起推起、一起下放算 1 次，不是轮流推举；重量记单只。'},
  core:{mode:'alternating',label:'对侧手脚交替',cue:'右手＋左腿做 1 次，再换左手＋右腿做 1 次；两种配对各完成目标次数才记 1 组。',sides:{left:'右手＋左腿',right:'左手＋右腿'}},
  cardio:{mode:'continuous',label:'连续步行',cue:'左右脚自然交替，按整个环节的实际分钟数记录。'}
};
export const SIDE_KEYS = ['left','right'];
export function movementFor(ex) {return MOVEMENTS[typeof ex==='string'?ex:ex.id];}
export function isSided(ex) {return Boolean(movementFor(ex)?.sides);}
export function freshRecord(ex,seed={}) {
  const record={weightKg:'',actual:ex.min,difficulty:'适中',done:false,doneAt:null,...seed};
  if(isSided(ex)) record.sides=Object.fromEntries(SIDE_KEYS.map(side=>[side,{
    weightKg:ex.id==='core'?'':record.weightKg,actual:record.actual,difficulty:record.difficulty,done:false,doneAt:null
  }]));
  return record;
}
export function syncSideGroup(record) {
  record.done=SIDE_KEYS.every(side=>record.sides[side].done);
  record.doneAt=record.done?SIDE_KEYS.map(side=>record.sides[side].doneAt).filter(Boolean).sort().at(-1) || null:null;
  // 兼容已有的通用字段；分侧展示和导出始终使用 sides，不丢失两侧差异。
  record.actual=Math.min(...SIDE_KEYS.map(side=>Number(record.sides[side].actual)||0));
  record.weightKg=record.sides.left.weightKg===record.sides.right.weightKg?record.sides.left.weightKg:'';
  const levels=['轻松','适中','吃力'];
  record.difficulty=levels[Math.max(...SIDE_KEYS.map(side=>Math.max(0,levels.indexOf(record.sides[side].difficulty))))];
}
export function upgradeDraftSides(draft) {
  if(!draft) return false;
  let changed=false;
  for(const ex of draft.plan) {
    if(!isSided(ex)) continue;
    for(const record of draft.records[ex.id] || []) {
      if(record.sides) {
        const before=record.done;syncSideGroup(record);if(before!==record.done)changed=true;
      } else if(!record.done) {
        record.sides=freshRecord(ex,record).sides;changed=true;
      }
    }
  }
  return changed;
}
export function hasRecordedWork(record) {return record.done || SIDE_KEYS.some(side=>record.sides?.[side]?.done);}
export function recordDescription(ex,record) {
  if(record.sides && isSided(ex)) return SIDE_KEYS.map(side=>{
    const r=record.sides[side];
    return `${movementFor(ex).sides[side]}：${r.done?`${r.actual} 次${r.weightKg!==''?' · '+r.weightKg+' kg':''}（${r.difficulty}）`:'未完成'}`;
  }).join('；')+(record.done?'（整组完成）':'（整组未完成）');
  if(!record.done) return '未完成';
  if(ex.kind==='time') return `${record.actual} 分钟`;
  return `${record.weightKg!==''?record.weightKg+' kg · ':''}${record.actual}${ex.unit}${isSided(ex)?'（旧版合并记录，未分别记录两侧）':'（双侧同时）'}`;
}
