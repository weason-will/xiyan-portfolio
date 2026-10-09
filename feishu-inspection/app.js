const STORAGE_KEY = "xunlan-demo-v1";
const stores = ["上海静安店","上海徐汇店","杭州西湖店","杭州滨江店","苏州中心店","南京新街口店"];
const assignees = ["张店长","陈店长","周店长","王主管","赵主管"];
const hoursFromNow = h => new Date(Date.now() + h * 3600000).toISOString();
const hoursAgo = h => new Date(Date.now() - h * 3600000).toISOString();
const initialTasks = () => [
  {id:"XJ-24018",store:"上海静安店",item:"食品安全 · 冷藏温度",desc:"冷藏柜实测 12℃，部分乳制品表面有水珠。",risk:"高",assignee:"张店长",due:hoursFromNow(8),status:"待整改",created:hoursAgo(5),evidence:"",timeline:[{at:hoursAgo(5),text:"巡检发现问题并由人工确认高风险"}]},
  {id:"XJ-24017",store:"杭州西湖店",item:"门店环境 · 清洁卫生",desc:"后场地面油污，清洁记录缺失。",risk:"中",assignee:"陈店长",due:hoursFromNow(30),status:"待整改",created:hoursAgo(12),evidence:"",timeline:[{at:hoursAgo(12),text:"任务已派发"}]},
  {id:"XJ-24016",store:"苏州中心店",item:"消防安全 · 通道畅通",desc:"消防通道堆放物料，现场已清理并提交说明。",risk:"高",assignee:"周店长",due:hoursAgo(2),status:"待复核",created:hoursAgo(26),evidence:"已清除全部物料，重新划定禁放区域并完成员工提醒。",timeline:[{at:hoursAgo(26),text:"任务创建"},{at:hoursAgo(3),text:"门店提交整改证据，等待复核"}]},
  {id:"XJ-24015",store:"南京新街口店",item:"设备设施 · 运行状态",desc:"制冰机异响，未按期限完成检修。",risk:"中",assignee:"王主管",due:hoursAgo(9),status:"待整改",created:hoursAgo(55),evidence:"",timeline:[{at:hoursAgo(55),text:"任务创建"},{at:hoursAgo(9),text:"系统标记超时并触发提醒"}]},
  {id:"XJ-24014",store:"上海徐汇店",item:"服务规范 · 员工着装",desc:"两名员工未佩戴工牌。",risk:"低",assignee:"赵主管",due:hoursAgo(20),status:"已关闭",created:hoursAgo(80),evidence:"已补发工牌并在班前会重申规范。",timeline:[{at:hoursAgo(80),text:"任务创建"},{at:hoursAgo(60),text:"提交整改"},{at:hoursAgo(58),text:"区域经理复核通过"}]}
];
let state = loadState();
let pendingInspection = null;
let selectedRisk = "中";
let currentTaskId = null;
let taskFilter = "all";

function loadState(){
  try { const v = JSON.parse(localStorage.getItem(STORAGE_KEY)); if(v && Array.isArray(v.tasks)) return v; } catch(e){}
  return {tasks: initialTasks()};
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function effectiveStatus(t){ return t.status === "待整改" && new Date(t.due) < new Date() ? "已超时" : t.status; }
function fmt(v){ return new Intl.DateTimeFormat("zh-CN",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(v)); }
function riskClass(r){ return "risk-" + r; }
function toast(msg){ const el=document.getElementById("toast"); el.textContent=msg; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2200); }
function uid(){ return "XJ-" + String(Date.now()).slice(-5); }
function esc(v){ return String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function goto(view){
  document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));
  const el=document.getElementById("view-"+view); if(el) el.classList.add("active");
  document.querySelectorAll("#nav button").forEach(x=>x.classList.toggle("active",x.dataset.view===view));
  const titles={dashboard:["管理看板","从发现问题到闭环复盘，每一步都有据可查"],inspect:["发起巡检","记录问题，人工确认 AI / 规则建议"],confirm:["确认风险判断","人工确认后才会生成整改任务"],tasks:["整改任务","统一跟踪责任、时限和证据"],review:["经理复核","高风险动作始终保留人工判断"],handoff:["客户接管","交付可配置、可审计、可迁移的流程资产"],"task-detail":["任务详情","查看整改证据和完整操作记录"]};
  const t=titles[view]||titles.dashboard; document.getElementById("pageTitle").textContent=t[0]; document.getElementById("pageSubtitle").textContent=t[1];
  document.getElementById("sidebar").classList.remove("open");
  if(view==="dashboard") renderDashboard(); if(view==="tasks") renderTasks(); if(view==="review") renderReview();
  window.scrollTo({top:0,behavior:"smooth"});
}
function renderDashboard(){
  const open=state.tasks.filter(t=>effectiveStatus(t)!=="已关闭");
  const overdue=state.tasks.filter(t=>effectiveStatus(t)==="已超时");
  const closed=state.tasks.filter(t=>t.status==="已关闭");
  const rate=Math.round(closed.length/state.tasks.length*100)||0;
  document.getElementById("heroOpen").textContent=open.length;
  document.getElementById("metrics").innerHTML=[
    ["待处理任务",open.length,"比昨日减少 2 项","◎"],["已超时",overdue.length,"需要立即关注","!"],["本周闭环率",rate+"%","较上周提升 8%","↗"],["平均整改时长","18.6h","目标低于 24h","◷"]
  ].map((m,i)=>`<article class="panel metric"><div class="metric-top"><span>${m[0]}</span><i class="metric-icon">${m[3]}</i></div><strong>${m[1]}</strong><small class="${i===1?"warn":i===2?"up":""}">${m[2]}</small></article>`).join("");
  const found=[5,7,4,8,6,5,9],done=[3,5,4,6,5,5,7];
  document.getElementById("trendChart").innerHTML=found.map((v,i)=>`<div class="bar-day"><i style="height:${v*9}%"></i><i class="done" style="height:${done[i]*9}%"></i><small>${["一","二","三","四","五","六","日"][i]}</small></div>`).join("")+`<div class="chart-legend"><span><i style="background:#b7c6d5"></i>发现</span><span><i style="background:#1ca790"></i>完成</span></div>`;
  const counts={高:0,中:0,低:0}; open.forEach(t=>counts[t.risk]++); const total=open.length||1; const high=Math.round(counts.高/total*100),mid=Math.round(counts.中/total*100);
  document.getElementById("riskChart").innerHTML=`<div class="donut" style="--high:${high};--mid:${mid}"><div class="donut-center"><b>${open.length}</b><small>未关闭</small></div></div><div class="risk-legend">${["高","中","低"].map((r,i)=>`<div><i style="background:${["#d75a55","#e8a342","#2ba98e"][i]}"></i><span>${r}风险</span><b>${counts[r]}</b></div>`).join("")}</div>`;
  const order={高:0,中:1,低:2};
  const sorted=[...open].sort((a,b)=>(order[a.risk]-order[b.risk])||(new Date(a.due)-new Date(b.due))).slice(0,4);
  document.getElementById("priorityTasks").innerHTML=sorted.map(t=>`<div class="priority-row"><span class="risk-tag ${riskClass(t.risk)}">${t.risk}风险</span><button data-task="${t.id}"><b>${esc(t.store)} · ${esc(t.item.split(" · ").pop())}</b><p>${esc(t.desc)}</p></button><span class="status-tag status-${effectiveStatus(t)}">${effectiveStatus(t)}</span></div>`).join("")||'<div class="empty">暂无重点任务</div>';
  document.getElementById("observability").innerHTML=[["事件留痕","全部任务变更可追溯",state.tasks.reduce((n,t)=>n+t.timeline.length,0)+" 条"],["人工确认","高风险判断和关闭均需确认","100%"],["流程健康","当前模拟运行状态","正常"],["客户接管","规则、数据和文档均可移交","可导出"]].map(x=>`<div class="obs-item"><span class="obs-icon">✓</span><p><b>${x[0]}</b><small>${x[1]}</small></p><b>${x[2]}</b></div>`).join("");
  bindTaskLinks(); updateCounts();
}
function renderTasks(){
  const store=document.getElementById("storeFilter").value||"all";
  const list=state.tasks.filter(t=>(taskFilter==="all"||effectiveStatus(t)===taskFilter)&&(store==="all"||t.store===store));
  document.getElementById("taskList").innerHTML=`<div class="task-table-head"><span>门店</span><span>问题</span><span>风险</span><span>责任人</span><span>期限</span><span>状态</span></div>`+list.map(t=>`<div class="task-row"><span><b>${esc(t.store)}</b><small>${esc(t.id)}</small></span><button data-task="${t.id}">${esc(t.item)}<small>${esc(t.desc)}</small></button><span class="risk-tag ${riskClass(t.risk)}">${t.risk}</span><span>${esc(t.assignee)}</span><span>${fmt(t.due)}</span><span class="status-tag status-${effectiveStatus(t)}">${effectiveStatus(t)}</span></div>`).join("");
  if(!list.length) document.getElementById("taskList").innerHTML='<div class="empty">该筛选条件下暂无任务</div>'; bindTaskLinks(); updateCounts();
}
function bindTaskLinks(){ document.querySelectorAll("[data-task]").forEach(b=>b.onclick=()=>openTask(b.dataset.task)); }
function openTask(id){ currentTaskId=id; const t=state.tasks.find(x=>x.id===id); if(!t)return; document.getElementById("taskDetail").innerHTML=`<div class="detail-grid"><article class="panel"><div class="detail-head"><div><span class="risk-tag ${riskClass(t.risk)}">${t.risk}风险</span><h2>${esc(t.store)} · ${esc(t.item)}</h2><p>${esc(t.desc)}</p></div><span class="status-tag status-${effectiveStatus(t)}">${effectiveStatus(t)}</span></div><div class="detail-meta"><div><small>责任人</small><b>${esc(t.assignee)}</b></div><div><small>整改期限</small><b>${fmt(t.due)}</b></div><div><small>任务编号</small><b>${t.id}</b></div></div>${t.status==="待整改"?`<div class="evidence-form"><h3>提交整改证据</h3><textarea id="evidenceText" rows="4" placeholder="说明采取了什么措施、现场现状和防止复发的方法"></textarea><div class="fake-upload">＋ 模拟添加现场照片</div><button class="primary" id="submitEvidence">提交并进入经理复核</button></div>`:`<div class="evidence"><b>整改说明</b><small>${esc(t.evidence||"尚未提交")}</small></div>`}</article><aside class="panel"><h3>操作时间线</h3><div class="timeline">${t.timeline.slice().reverse().map(x=>`<div class="timeline-item"><i></i><p>${esc(x.text)}<small>${fmt(x.at)}</small></p></div>`).join("")}</div></aside></div>`;
  goto("task-detail"); const btn=document.getElementById("submitEvidence"); if(btn)btn.onclick=()=>{const v=document.getElementById("evidenceText").value.trim(); if(v.length<8)return toast("请填写至少 8 个字的整改说明"); t.evidence=v;t.status="待复核";t.timeline.push({at:new Date().toISOString(),text:"门店提交整改证据，等待区域经理复核"});save();toast("整改证据已提交");openTask(t.id);};
}
function renderReview(){
  const list=state.tasks.filter(t=>t.status==="待复核"); document.getElementById("reviewCountChip").textContent=list.length+" 项待复核";
  document.getElementById("reviewList").innerHTML=list.map(t=>`<article class="panel review-card"><span class="risk-tag ${riskClass(t.risk)}">${t.risk}风险</span><h3>${esc(t.store)} · ${esc(t.item)}</h3><p>${esc(t.desc)}</p><div class="evidence"><b>整改说明</b><small>${esc(t.evidence)}</small></div><div class="review-actions"><textarea id="comment-${t.id}" placeholder="复核意见（驳回时必填）"></textarea><button class="reject" data-reject="${t.id}">驳回</button><button class="approve" data-approve="${t.id}">通过</button></div></article>`).join("")||'<div class="panel empty">暂无待复核任务</div>';
  document.querySelectorAll("[data-approve]").forEach(b=>b.onclick=()=>reviewTask(b.dataset.approve,true)); document.querySelectorAll("[data-reject]").forEach(b=>b.onclick=()=>reviewTask(b.dataset.reject,false)); updateCounts();
}
function reviewTask(id,ok){ const t=state.tasks.find(x=>x.id===id); const c=document.getElementById("comment-"+id).value.trim(); if(!ok&&!c)return toast("驳回时请填写原因"); t.status=ok?"已关闭":"待整改"; t.timeline.push({at:new Date().toISOString(),text:ok?"区域经理复核通过，任务关闭":"区域经理驳回整改："+c}); if(!ok)t.due=hoursFromNow(24); save();toast(ok?"复核通过，任务已关闭":"已驳回并重新进入整改");renderReview(); }
function updateCounts(){ const open=state.tasks.filter(t=>effectiveStatus(t)!=="已关闭").length, rev=state.tasks.filter(t=>t.status==="待复核").length; document.getElementById("navTaskCount").textContent=open||"";document.getElementById("navReviewCount").textContent=rev||""; }
function analyze(desc,item){ const s=(desc+" "+item).toLowerCase(); if(/消防|过期|异物|疏散|冒烟/.test(s))return {risk:"高",reason:"命中高风险安全规则",tip:"建议 24 小时内整改，并由区域经理复核。"}; if(/温度|故障|油污|冷藏|设备|泄漏/.test(s))return {risk:"中",reason:"命中设备或食品安全异常规则",tip:"建议 3 天内整改，必要时暂停相关设备。"}; return {risk:"低",reason:"未命中高/中风险规则",tip:"建议 7 天内整改，并纳入门店例行复盘。"}; }
function prepareConfirm(){ const a=analyze(pendingInspection.desc,pendingInspection.item); selectedRisk=a.risk; document.getElementById("analysisSummary").innerHTML=`<b>${esc(pendingInspection.store)}</b> ${esc(pendingInspection.item)}<br>${esc(pendingInspection.desc)}`;document.getElementById("analysisReason").textContent=a.reason;document.getElementById("suggestedRisk").className="risk-tag "+riskClass(a.risk);document.getElementById("suggestedRisk").textContent=a.risk+"风险";document.getElementById("analysisTip").textContent=a.tip;document.querySelectorAll("[data-risk]").forEach(x=>x.classList.toggle("selected",x.dataset.risk===selectedRisk)); document.getElementById("assigneeSelect").value=assignees[0]; setDue(selectedRisk);document.getElementById("humanConfirmed").checked=false;goto("confirm"); }
function setDue(r){ const h={低:168,中:72,高:24}[r]; const d=new Date(Date.now()+h*3600000); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); document.getElementById("dueDate").value=d.toISOString().slice(0,16); }
function init(){
  document.getElementById("storeSelect").innerHTML='<option value="">请选择门店</option>'+stores.map(x=>`<option>${x}</option>`).join("");
  document.getElementById("assigneeSelect").innerHTML=assignees.map(x=>`<option>${x}</option>`).join("");
  document.getElementById("storeFilter").innerHTML='<option value="all">全部门店</option>'+stores.map(x=>`<option>${x}</option>`).join("");
  document.querySelectorAll("[data-view],[data-go]").forEach(b=>b.onclick=()=>goto(b.dataset.view||b.dataset.go));
  document.getElementById("menuBtn").onclick=()=>document.getElementById("sidebar").classList.toggle("open");
  document.querySelectorAll("[data-example]").forEach(b=>b.onclick=()=>document.getElementById("description").value=b.dataset.example);
  document.getElementById("clearForm").onclick=()=>document.getElementById("inspectionForm").reset();
  document.getElementById("inspectionForm").onsubmit=e=>{e.preventDefault();pendingInspection={store:document.getElementById("storeSelect").value,item:document.getElementById("itemSelect").value,desc:document.getElementById("description").value.trim(),note:document.getElementById("note").value.trim()};prepareConfirm();};
  document.querySelectorAll("[data-risk]").forEach(b=>b.onclick=()=>{selectedRisk=b.dataset.risk;document.querySelectorAll("[data-risk]").forEach(x=>x.classList.toggle("selected",x===b));setDue(selectedRisk);});
  document.getElementById("createTaskBtn").onclick=()=>{if(!pendingInspection)return goto("inspect"); if(!document.getElementById("humanConfirmed").checked)return toast("请先完成人工确认"); const t={id:uid(),...pendingInspection,risk:selectedRisk,assignee:document.getElementById("assigneeSelect").value,due:new Date(document.getElementById("dueDate").value).toISOString(),status:"待整改",created:new Date().toISOString(),evidence:"",timeline:[{at:new Date().toISOString(),text:"人工确认风险并创建整改任务"}]};state.tasks.unshift(t);save();pendingInspection=null;toast("整改任务已生成并记录操作日志");openTask(t.id);};
  document.getElementById("taskTabs").onclick=e=>{if(!e.target.dataset.filter)return;taskFilter=e.target.dataset.filter;document.querySelectorAll("#taskTabs button").forEach(x=>x.classList.toggle("active",x===e.target));renderTasks();};
  document.getElementById("storeFilter").onchange=renderTasks;
  document.getElementById("resetBtn").onclick=()=>document.getElementById("resetModal").classList.add("open");document.getElementById("cancelReset").onclick=()=>document.getElementById("resetModal").classList.remove("open");document.getElementById("confirmReset").onclick=()=>{localStorage.removeItem(STORAGE_KEY);state={tasks:initialTasks()};document.getElementById("resetModal").classList.remove("open");toast("演示数据已重置");goto("dashboard");};
  renderDashboard();renderTasks();renderReview();
}
document.addEventListener("DOMContentLoaded",init);
