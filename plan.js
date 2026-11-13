// 训练计划 v1：零基础、健康与体能，每周一/三/五，同一套全身动作。
// 计划是可修改的静态定义；开始训练时复制一份快照到记录中。
export const PLAN_VERSION = '1.3';
export const ACE_LIBRARY = 'https://www.acefitness.org/resources/everyone/exercise-library/';

export const EXERCISES = {
  warmup: {
    id: 'warmup', name: '跑步机热身', short: '快走 · 激活身体', category: '热身', equipment: '跑步机',
    kind: 'time', min: 5, max: 8, unit: '分钟', rest: 0, symbol: 'W',
    points: ['从舒适速度开始，逐渐加快。', '走到身体微热、呼吸稍加快即可。', '不需要一开始就跑步。'],
    mistakes: ['起步速度太快，未热身就进入高强度。'], link: ACE_LIBRARY,
    linkName: 'ACE 动作与热身资料库'
  },
  squat: {
    id: 'squat', name: '哑铃杯式深蹲', short: '股四头肌 · 臀部', category: '下肢', equipment: '单只哑铃',
    kind: 'reps', min: 8, max: 10, unit: '次', rest: 90, symbol: 'S',
    points: ['两脚约肩宽，双手在胸前托住哑铃。', '屈膝屈髋下蹲到自己可以稳定控制的深度。', '脚掌稳稳踩地，站起时不要猛顶膝盖。'],
    mistakes: ['脚跟翘起、膝盖明显内扣。', '为了蹲得更低而弓腰或失去平衡。'],
    alternate: '完全零基础可先不持哑铃，练习坐凳起立。',
    link: 'https://www.acefitness.org/resources/everyone/exercise-library/362/goblet-squat/', linkName: 'ACE · Goblet Squat'
  },
  pulldown: {
    id: 'pulldown', name: '高位下拉', short: '背阔肌 · 上背部', category: '背部', equipment: '照片中的高位下拉机',
    kind: 'reps', min: 10, max: 12, unit: '次', rest: 90, symbol: 'P',
    points: ['调好座椅和大腿固定垫，先把身体坐稳。', '胸部自然挺起，将横杆拉向上胸部。', '慢慢伸直手臂还原，保持动作稳定。'],
    mistakes: ['大幅后仰，用身体甩动重量。', '把横杆拉到颈后。'],
    link: 'https://www.acefitness.org/resources/everyone/exercise-library/158/seated-lat-pulldown/', linkName: 'ACE · Seated Lat Pulldown'
  },
  chest: {
    id: 'chest', name: '哑铃平板卧推', short: '胸部 · 肱三头肌', category: '上肢推', equipment: '哑铃 + 稳固训练凳',
    kind: 'reps', min: 8, max: 12, unit: '次', rest: 90, symbol: 'C',
    points: ['平躺在稳定的平凳上，双脚踩稳地面。', '手腕保持中立，控制哑铃下降至舒适范围。', '呼气向上推起，不要弹震或猛放。'],
    mistakes: ['腰部刻意过度反弓、哑铃失控下落。'],
    alternate: '如果训练凳不稳，改为地板卧推；不要独自尝试无法控制的大重量。',
    link: 'https://www.acefitness.org/resources/everyone/exercise-library/19/chest-press/', linkName: 'ACE · Chest Press'
  },
  hinge: {
    id: 'hinge', name: '哑铃罗马尼亚硬拉', short: '臀部 · 大腿后侧', category: '下肢', equipment: '两只轻哑铃',
    kind: 'reps', min: 8, max: 10, unit: '次', rest: 90, symbol: 'H',
    points: ['双膝微屈，保持腰背自然稳定。', '主动让臀部向后移动，哑铃贴近双腿下降。', '下降到能保持背部稳定的位置，再推动髋部站直。'],
    mistakes: ['把动作做成弯腰摸地、背部明显弓起。', '用腰部猛地向上甩重量。'],
    alternate: '初练可不持哑铃，先学习髋关节折叠动作；最好请现场有经验者确认姿势。',
    link: 'https://www.nasm.org/resource-center/exercise-library/dumbbell-romanian-deadlift', linkName: 'NASM · Dumbbell Romanian Deadlift'
  },
  row: {
    id: 'row', name: '单臂哑铃划船', short: '背部 · 肱二头肌', category: '背部', equipment: '哑铃 + 稳固训练凳',
    kind: 'reps', min: 10, max: 10, unit: '次/侧', rest: 75, symbol: 'R',
    points: ['一只手扶在稳定的凳面上，身体前倾。', '另一手将哑铃向髋部方向拉，避免耸肩。', '左右两侧各完成目标次数，才算一组。'],
    mistakes: ['身体大幅扭转，靠惯性甩起哑铃。'],
    alternate: '如第一台组合机确实支持低位坐姿划船，可改为坐姿划船。',
    link: 'https://www.acefitness.org/resources/everyone/exercise-library/126/single-arm-row/', linkName: 'ACE · Single-arm Row'
  },
  shoulder: {
    id: 'shoulder', name: '坐姿哑铃推肩', short: '肩部 · 肱三头肌', category: '上肢推', equipment: '哑铃 + 靠背训练凳',
    kind: 'reps', min: 8, max: 12, unit: '次', rest: 90, symbol: 'O',
    points: ['背部得到支撑，哑铃在肩膀附近。', '呼气向上推举，在无不适的范围内活动。', '缓慢放回起点，避免身体明显后仰。'],
    mistakes: ['为了举起重量而过度挺腰。', '出现肩部锐痛还继续强推。'],
    alternate: '第3周起加入；图3机器尚未确认型号，暂不默认替代。',
    link: 'https://www.acefitness.org/resources/everyone/exercise-library/45/seated-overhead-press/', linkName: 'ACE · Seated Overhead Press'
  },
  core: {
    id: 'core', name: '死虫式', short: '核心稳定 · 躯干控制', category: '核心', equipment: '瑜伽垫 / 地面',
    kind: 'reps', min: 8, max: 8, unit: '次/侧', rest: 60, symbol: 'D',
    points: ['仰卧，抬起双臂和弯曲的双腿。', '缓慢伸展对侧的手和脚，控制腰背与躯干。', '左右交替，每侧8次。'],
    mistakes: ['动作过快，腰背失去控制。'],
    link: 'https://www.nasm.org/resource-center/exercise-library/dead-bug', linkName: 'NASM · Dead Bug'
  },
  cardio: {
    id: 'cardio', name: '跑步机结束快走', short: '中等强度 · 心肺耐力', category: '有氧', equipment: '跑步机',
    kind: 'time', min: 10, max: 15, unit: '分钟', rest: 0, symbol: 'F',
    points: ['力量训练结束后，以舒适速度快走10～15分钟。', '强度以能交谈、但呼吸略加快为宜。', '结束时放慢速度，稳定呼吸。'],
    mistakes: ['疲劳明显时仍刻意追求高速度。'], link: ACE_LIBRARY, linkName: 'ACE · 训练资料库'
  }
};

export function startOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}
export function toLocalDate(date) {
  const y = date.getFullYear();
  return `${y}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function fromLocalDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return new Date();
  const [y,m,d] = iso.split('-').map(Number);
  return new Date(y,m-1,d);
}
export function plusDays(date, days) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}
export function getWeekNumber(dateString, startDateString) {
  // 先将当地日历日期映射为 UTC 日历天，避免夏令时造成周数偏差。
  const startD = fromLocalDate(startDateString);
  const dayD = fromLocalDate(dateString);
  const utcStart = Date.UTC(startD.getFullYear(),startD.getMonth(),startD.getDate());
  const utcDay = Date.UTC(dayD.getFullYear(),dayD.getMonth(),dayD.getDate());
  const weekdays = (startD.getDay()+6)%7;
  const weekdaysDay = (dayD.getDay()+6)%7;
  return Math.floor(((utcDay - weekdaysDay * 86400000) - (utcStart - weekdays * 86400000)) / (7*86400000)) + 1;
}
export function recommendedDate(now = new Date()) {
  const today = new Date(now.getFullYear(),now.getMonth(),now.getDate());
  for (let i=0; i<7; i++) {
    const d = plusDays(today,i);
    if ([1,3,5].includes(d.getDay())) return toLocalDate(d);
  }
  return toLocalDate(today);
}
export function resolveStartDate(settings,sessions=[],draft=null,today=new Date()) {
  if(/^\d{4}-\d{2}-\d{2}$/.test(settings?.startDate || '')) return settings.startDate;
  // V1 未写入设置的设备，优先恢复训练快照所指向的第 1 周。
  const inferred=[...sessions,draft].filter(item=>item && /^\d{4}-\d{2}-\d{2}$/.test(item.date || '')).map(item=>{
    const week=Number.isInteger(item.week) && item.week>0?item.week:1;
    return toLocalDate(plusDays(startOfWeek(fromLocalDate(item.date)),-7*(week-1)));
  }).sort();
  return inferred[0] || toLocalDate(startOfWeek(today));
}
export function workoutForWeek(weekNumber, trainingLevel='intro') {
  const w = Math.max(1,Math.min(8,weekNumber));
  const progressive=trainingLevel==='progressive';
  const basicSets = progressive?2:w === 1 ? 1 : 2;
  const items = [
    ['warmup',1], ['squat',progressive?3:basicSets], ['pulldown',progressive?3:basicSets],
    ['chest',progressive?3:basicSets], ['hinge',basicSets], ['row',basicSets],
    ...(w>=3 ? [['shoulder',progressive?2:w<5?1:2]] : []),
    ['core',basicSets], ['cardio',1]
  ];
  return items.map(([id,sets])=>({
    ...EXERCISES[id], sets, minReps: EXERCISES[id].min, maxReps: EXERCISES[id].max
  }));
}
export function trainingLevelName(level) {return level==='progressive'?'基础进阶版':'动作熟悉版';}
export function weekPhase(weekNumber, trainingLevel='intro') {
  if(trainingLevel==='progressive') return '基础进阶 · 稳定加量';
  if (weekNumber<=2) return '动作适应期';
  if (weekNumber<=4) return '规律建立期';
  if (weekNumber<=6) return '渐进训练期';
  return '巩固提升期';
}
export function volumeExplanation(weekNumber, trainingLevel='intro') {
  if(trainingLevel==='progressive') return `基础进阶版：深蹲、下拉、卧推各 3 组；硬拉、划船、死虫式各 2 组${weekNumber>=3?'，推肩 2 组':''}。这轮先用原重量适应新增组数；热身和快走各 1 个计时环节。`;
  if (weekNumber<=1) return '第 1 周学习动作：主要力量动作各 1 组。第 2 周起各 2 组；热身和快走始终是 1 个计时环节。';
  if (weekNumber===2) return '第 2 周：主要力量动作各 2 组。每组都要单独完成并记录；热身和快走各 1 个计时环节。';
  return `第 ${weekNumber} 周：主要力量动作各 2 组，推肩 ${weekNumber<5?1:2} 组；热身和快走各 1 个计时环节。`;
}
// 由实际记录推导进度，刷新、撤销或恢复旧版草稿时不依赖临时界面状态。
export function exerciseProgress(session, id) {
  const ex=session.plan.find(item=>item.id===id);
  const records=session.records?.[id] || [];
  const total=ex?.sets || 0;
  const done=records.slice(0,total).filter(item=>item?.done).length;
  const next=Array.from({length:total},(_,i)=>i).find(i=>!records[i]?.done) ?? -1;
  return {total,done,next,complete:total>0 && done===total};
}
export function nextPendingExercise(session) {
  for(let step=1;step<=session.plan.length;step++) {
    const index=(session.activeIndex+step)%session.plan.length;
    const ex=session.plan[index];
    if(!session.skipped.includes(ex.id) && !exerciseProgress(session,ex.id).complete) return index;
  }
  return -1;
}
export function dateLabel(iso) {
  const d = fromLocalDate(iso);
  return `${d.getMonth()+1}月${d.getDate()}日 · ${['周日','周一','周二','周三','周四','周五','周六'][d.getDay()]}`;
}
