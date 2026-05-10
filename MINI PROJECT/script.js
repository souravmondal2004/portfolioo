const randColor = (() => {
 const palette = [
 '#a7f3d0','#93c5fd','#fbcfe8','#fde68a','#c7d2fe','#fca5a5','#fdba74','#99f6e4',
 '#ddd6fe','#fecdd3','#bbf7d0','#bfdbfe','#fef3c7','#fecaca'
 ];
 let i = 0; return () => palette[i++ % palette.length];
 })();
 const el = (id) => document.getElementById(id);
 // ---------- State ----------
 let processes = []; // original processes (for results & legend): {pid, arrival,
// burst, color}
 let originalBursts = {}; // pid -> original burst
 let schedule = []; // list of events {pid, start, end}
 let snapshots = []; // step-by-step states
 let stepIndex = 0; // current revealed event count
 let playing = null; // interval id
 // ---------- DOM Builders (kept same as yours) ----------
 function addRow(pid = '', arrival = '', burst = '', color = randColor()){
 const tbody = el('procTable').querySelector('tbody');
 const tr = document.createElement('tr');
 tr.innerHTML = `
 <td><input class="form-control form-control-sm pid" value="${pid}"
placeholder="P1"/></td>
 <td style="max-width:140px"><input type="number" min="0" class="form-control formcontrol-sm arrival" value="${arrival}"/></td>
 <td style="max-width:140px"><input type="number" min="1" class="form-control formcontrol-sm burst" value="${burst}"/></td>
 <td style="max-width:160px"><input type="color" class="form-control form-controlcolor color" value="${color}" title="Choose color"/></td>
 <td class="text-end"><button class="btn btn-sm btn-outline-danger">✖</button></td>
 `;
 tr.querySelector('button').onclick = () => tr.remove();
 tbody.appendChild(tr);
 }
 function readTable(){
 const rows = el('procTable').querySelectorAll('tbody tr');
 const arr = [];
 rows.forEach(r => {
 const pid = r.querySelector('.pid').value.trim();
 const arrival = Number(r.querySelector('.arrival').value);
 const burst = Number(r.querySelector('.burst').value);
 const color = r.querySelector('.color').value || randColor();
 if(!pid || isNaN(arrival) || isNaN(burst) || burst <= 0) return;
 arr.push({pid, arrival, burst, color});
 });
 // sort by arrival then pid to ensure deterministic FCFS order
 return arr.sort((a,b) => a.arrival - b.arrival || a.pid.localeCompare(b.pid));
 }
 function clearViz(){
 el('ganttTrack').innerHTML = '';
 el('timeAxis').innerHTML = '';
 el('legend').innerHTML = '';
 el('rq').innerHTML = '';
 el('running').textContent = '—';
 el('nextEvt').textContent = '—';
 el('clock').textContent = '0';
 el('resTable').querySelector('tbody').innerHTML = '';
 el('avgW').textContent = '—';
 el('avgT').textContent = '—';
 }
 function renderLegend(list){
 const wrap = el('legend');
 wrap.innerHTML = '';
 list.forEach(p => {
 const span = document.createElement('span');
 span.className = 'pill bg-light';
 span.innerHTML = `<span class="legend-box"
style="background:${p.color}"></span>${p.pid}`;
 wrap.appendChild(span);
 });
 }
 function buildAxis(total){
 const axis = el('timeAxis');
 axis.innerHTML = '';
 for(let t = 0; t <= total; t++){
 const div = document.createElement('div');
 div.className = 'tick';
 div.textContent = t;
 axis.appendChild(div);
 }
 }
 function renderBars(upto){
 const track = el('ganttTrack');
 track.innerHTML = '';
 const sliceWidth = 24; // px per time unit (matches .tick min-width)
 for(let i=0;i<upto;i++){
 const ev = schedule[i];
 const w = Math.max(24, (ev.end - ev.start) * sliceWidth);
 const bar = document.createElement('div');
 bar.className = 'gantt-bar' + (i === upto-1 ? ' current' : '');
 bar.style.width = w + 'px';
 if(ev.pid === 'IDLE'){
 bar.classList.add('idle');
 bar.textContent = 'IDLE';
 } else {
 const color = processes.find(p => p.pid === ev.pid)?.color || '#e5e7eb';
 bar.style.background = color;
 bar.textContent = ev.pid;
 }
 bar.title = (ev.pid === 'IDLE') ? `Idle ${ev.start} → ${ev.end}` : `${ev.pid}
${ev.start} → ${ev.end}`;
 track.appendChild(bar);
 }
 }
 function renderRQ(chips){
 const rq = el('rq');
 rq.innerHTML = '';
 chips.forEach(({pid,color})=>{
 const c = document.createElement('span');
 c.className = 'rq-chip bg-light';
 c.style.background = color;
 c.textContent = pid;
 rq.appendChild(c);
 });
 }
 function renderResults(){
 const tbody = el('resTable').querySelector('tbody');
 tbody.innerHTML = '';
 // compute last completion time per pid
 const lastEndByPid = {};
 for(let i=0;i<schedule.length;i++){
 const ev = schedule[i];
 if(ev.pid !== 'IDLE') lastEndByPid[ev.pid] = ev.end;
 }
 let sumW=0, sumT=0, n=processes.length;
 processes.forEach(p => {
 const completion = lastEndByPid[p.pid] ?? 0;
 const turnaround = completion - p.arrival;
 const waiting = turnaround - (originalBursts[p.pid] ?? p.burst);
 sumW += waiting; sumT += turnaround;
 const tr = document.createElement('tr');
 tr.innerHTML = `
 <td><span class="pill bg-light" style="background:${p.color}">${p.pid}</span></td>
 <td>${p.arrival}</td>
 <td>${originalBursts[p.pid]}</td>
 <td>${completion}</td>
 <td>${turnaround}</td>
 <td>${waiting}</td>
 `;
 tbody.appendChild(tr);
 });
 el('avgW').textContent = (sumW/n).toFixed(2);
 el('avgT').textContent = (sumT/n).toFixed(2);
 }
 // ---------- Scheduler (FCFS Non-preemptive) ----------
 function buildFCFS(){
 const procs = readTable();
 if(procs.length === 0) return;
 // Keep a copy of original data for legend/results
 processes = JSON.parse(JSON.stringify(procs));
 originalBursts = Object.fromEntries(processes.map(p=>[p.pid, p.burst]));
 schedule = [];
 snapshots = [];
 stepIndex = 0;
 clearViz();
 renderLegend(processes);
 const arr = [...procs].sort((a,b) => a.arrival - b.arrival ||
a.pid.localeCompare(b.pid));
 // start at earliest arrival
 let time = arr.length ? Math.min(...arr.map(p=>p.arrival)) : 0;
 for(let i=0;i<arr.length;i++){
 const p = arr[i];
 // If CPU idle until this process arrives
 if(p.arrival > time){
 schedule.push({pid:'IDLE', start: time, end: p.arrival});
 // snapshot for idle (running none)
 snapshots.push({ time, runningPid: 'IDLE', rq: arr.slice(i).filter(q=>q.arrival <=
p.arrival).map(q=>({pid:q.pid,color:q.color})) });
 time = p.arrival;
 }
 // ready queue at this moment (excluding current process)
 const rq = arr.slice(i+1).filter(q => q.arrival <=
time).map(q=>({pid:q.pid,color:q.color}));
 // snapshot BEFORE running this process
 snapshots.push({ time, runningPid: p.pid, rq });
 // run till completion (non-preemptive)
 schedule.push({ pid: p.pid, start: time, end: time + p.burst });
 time += p.burst;
 }
 const totalTime = schedule.length ? schedule[schedule.length - 1].end : 0;
 buildAxis(totalTime);
 // Reset visual to 0 steps
 clearInterval(playing);
 playing = null;
 stepIndex = 0;
 el('clock').textContent = '0';
 el('running').textContent = '—';
 el('rq').innerHTML = '';
 el('nextEvt').textContent = schedule.length ? (schedule[0].pid === 'IDLE' ? `Idle
${schedule[0].start}→${schedule[0].end}` : `${schedule[0].pid}
${schedule[0].start}→${schedule[0].end}`) : '—';
 renderBars(0);
 renderResults();
 }
 // ---------- Step/Back/Play Controls ----------
 function doStep(){
 if(stepIndex >= schedule.length) return;
 stepIndex++;
 renderBars(stepIndex);
 const snap = snapshots[Math.min(stepIndex-1, snapshots.length-1)];
 if(snap){
 el('clock').textContent = schedule[stepIndex-1].end;
 el('running').textContent = snap.runningPid;
 renderRQ(snap.rq);
 el('nextEvt').textContent = schedule[stepIndex] ? (schedule[stepIndex].pid === 'IDLE'
? `Idle ${schedule[stepIndex].start}→${schedule[stepIndex].end}` :
`${schedule[stepIndex].pid} ${schedule[stepIndex].start}→${schedule[stepIndex].end}`) : '—';
 }
 }
 function doBack(){
 if(stepIndex <= 0) return;
 stepIndex--;
 renderBars(stepIndex);
 const snap = snapshots[Math.max(0, stepIndex-1)];
 if(snap){
 el('clock').textContent = stepIndex>0 ? schedule[stepIndex-1].end : 0;
 el('running').textContent = stepIndex>0 ? snap.runningPid : '—';
 renderRQ(stepIndex>0 ? snap.rq : []);
 el('nextEvt').textContent = schedule[stepIndex] ? (schedule[stepIndex].pid === 'IDLE'
? `Idle ${schedule[stepIndex].start}→${schedule[stepIndex].end}` :
`${schedule[stepIndex].pid} ${schedule[stepIndex].start}→${schedule[stepIndex].end}`) : '—';
 } else {
 el('clock').textContent = '0';
 el('running').textContent = '—';
 renderRQ([]);
 el('nextEvt').textContent = schedule[0] ? (schedule[0].pid === 'IDLE' ? `Idle
${schedule[0].start}→${schedule[0].end}` : `${schedule[0].pid}
${schedule[0].start}→${schedule[0].end}`) : '—';
 }
 }
 function play(){
 if(playing) return;
 playing = setInterval(()=>{ if(stepIndex >= schedule.length){ pause(); return; }
doStep(); }, 800);
 }
 function pause(){
 clearInterval(playing);
 playing = null;
 }
 function reset(){
 pause();
 stepIndex = 0;
 renderBars(0);
 el('clock').textContent = '0';
 el('running').textContent = '—';
 renderRQ([]);
 el('nextEvt').textContent = schedule[0] ? (schedule[0].pid === 'IDLE' ? `Idle
${schedule[0].start}→${schedule[0].end}` : `${schedule[0].pid}
${schedule[0].start}→${schedule[0].end}`) : '—';
 }
 // ---------- Demo Data ----------
 function loadDemoAllAt0(){
 el('procTable').querySelector('tbody').innerHTML = '';
 addRow('P1', 0, 5, '#a7f3d0');
 addRow('P2', 0, 7, '#93c5fd');
 addRow('P3', 0, 3, '#fbcfe8');
 addRow('P4', 0, 9, '#fde68a');
 addRow('P5', 0, 4, '#c7d2fe');
 addRow('P6', 0, 6, '#fca5a5');
 clearViz();
 }
 function loadDemoStaggered(){
 el('procTable').querySelector('tbody').innerHTML = '';
 addRow('P1', 0, 5, '#a7f3d0');
 addRow('P2', 1, 6, '#93c5fd');
 addRow('P3', 2, 4, '#fbcfe8');
 addRow('P4', 3, 5, '#fde68a');
 addRow('P5', 4, 3, '#c7d2fe');
 addRow('P6', 6, 7, '#fca5a5');
 clearViz();
 }
 // ---------- Wire Up ----------
 document.addEventListener('DOMContentLoaded', () => {
 // Seed with a couple rows
 addRow('P1', 0, 5);
 addRow('P2', 1, 7);
 addRow('P3', 2, 4);
 // Buttons
 el('btnAdd').onclick = () => addRow();
 el('btnClear').onclick = () => { el('procTable').querySelector('tbody').innerHTML='';
clearViz(); };
 el('btnBuild').onclick = buildFCFS;
 el('btnStep').onclick = doStep;
 el('btnBack').onclick = doBack;
 el('btnPlay').onclick = play;
 el('btnPause').onclick = pause;
 el('btnReset').onclick = reset;
 el('btnDemo1').onclick = loadDemoAllAt0;
 el('btnDemo2').onclick = loadDemoStaggered;
 });
 
