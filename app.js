(() => {
  'use strict';

  const { records, goals } = window.APP_DATA;
  const $ = (id) => document.getElementById(id);
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const monthNames = {ene:'Enero',feb:'Febrero',mar:'Marzo',abr:'Abril',may:'Mayo',jun:'Junio',jul:'Julio',ago:'Agosto',sep:'Septiembre',oct:'Octubre',nov:'Noviembre',dic:'Diciembre'};
  const colors = { ALEN:'#64b4ff', CLARASOL:'#b9f45c', CLOROX:'#62d69a', VALENCIANA:'#ffc861' };
  const users = {
    clarisa: { password:'clarisa26', role:'alicia', name:'Clarisa', label:'Supervisora comercial' },
    ventas: { password:'ventas26', role:'direccion', name:'Dirección Ventas', label:'Vista directiva' }
  };

  const state = {
    role: null,
    user: null,
    section: 'pressure',
    period: 'jul26',
    manufacturer: 'TODOS',
    group: 'TODOS',
    seller: 'TODOS',
    product: 'TODOS'
  };

  const fmt = (n) => new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(Number(n)||0);
  const compact = (n) => new Intl.NumberFormat('es-MX',{notation:'compact',maximumFractionDigits:1}).format(Number(n)||0);
  const number = (n) => new Intl.NumberFormat('es-MX',{maximumFractionDigits:0}).format(Number(n)||0);
  const pct = (n) => Number.isFinite(n) ? new Intl.NumberFormat('es-MX',{style:'percent',maximumFractionDigits:1}).format(n) : '—';
  const pp = (n) => Number.isFinite(n) ? `${n >= 0 ? '+' : ''}${(n*100).toFixed(1)} pp` : '—';
  const sum = (rows,key='venta') => rows.reduce((a,r)=>a+(Number(r[key])||0),0);
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const shortSeller = (name) => String(name||'').replace(/^VF\d+\s*-\s*/,'').replace(/\s+/g,' ').trim();
  const shortProduct = (name) => String(name||'').replace(/^[A-Z0-9]+\s*-\s*/,'').trim();
  const participants = new Set(goals.participantes);
  const dayRatio = goals.cutoff.day / goals.cutoff.daysInMonth;
  const daysRemaining = goals.cutoff.daysInMonth - goals.cutoff.day;

  function unique(key){ return [...new Set(records.map(r=>r[key]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'es')); }
  function options(values,label,formatter=(v)=>v){ return `<option value="TODOS">${label}</option>` + values.map(v=>`<option value="${esc(v)}">${esc(formatter(v))}</option>`).join(''); }

  function initializeFilters(){
    $('manufacturerFilter').innerHTML = options(unique('fabricante'),'Todos los fabricantes');
    $('groupFilter').innerHTML = options(unique('grupo'),'Todos los grupos');
    $('sellerFilter').innerHTML = options(unique('vendedor'),'Todos los vendedores',shortSeller);
    $('productFilter').innerHTML = options(unique('item'),'Todos los productos',shortProduct);
  }

  function dimensionsMatch(r, overrides={}){
    const s = {...state,...overrides};
    return (s.manufacturer === 'TODOS' || r.fabricante === s.manufacturer)
      && (s.group === 'TODOS' || r.grupo === s.group)
      && (s.seller === 'TODOS' || r.vendedor === s.seller)
      && (s.product === 'TODOS' || r.item === s.product);
  }

  function periodRows(period=state.period, overrides={}){
    return records.filter(r => {
      if(!dimensionsMatch(r,overrides)) return false;
      if(period === 'jul26') return r.anio===2026 && r.mes==='jul';
      if(period === 'ytd26' || period === 'compare') return r.anio===2026 && months.indexOf(r.mes)<=6;
      if(period === 'year25') return r.anio===2025;
      return false;
    });
  }

  function comparableRows(period=state.period, overrides={}){
    return records.filter(r => {
      if(!dimensionsMatch(r,overrides)) return false;
      if(period === 'jul26') return r.anio===2025 && r.mes==='jul';
      if(period === 'ytd26' || period === 'compare') return r.anio===2025 && months.indexOf(r.mes)<=6;
      return false;
    });
  }

  function julyRows(year=2026, overrides={}){
    return records.filter(r => r.anio===year && r.mes==='jul' && dimensionsMatch(r,overrides));
  }

  function aggregate(rows,key,valueKey='venta'){
    const map = new Map();
    rows.forEach(r=>map.set(r[key],(map.get(r[key])||0)+(Number(r[valueKey])||0)));
    return [...map.entries()].map(([key,value])=>({key,value})).sort((a,b)=>b.value-a.value);
  }

  function periodLabel(period=state.period){
    return ({jul26:'Julio 2026 al día 23',ytd26:'YTD enero–julio 2026',year25:'Año completo 2025',compare:'Comparativo enero–julio'})[period] || '';
  }

  function hasDimensionalFilter(){ return state.group!=='TODOS' || state.seller!=='TODOS' || state.product!=='TODOS'; }
  function contextLabel(){
    const parts=[];
    if(state.manufacturer!=='TODOS') parts.push(state.manufacturer);
    if(state.group!=='TODOS') parts.push(state.group);
    if(state.seller!=='TODOS') parts.push(shortSeller(state.seller));
    if(state.product!=='TODOS') parts.push(shortProduct(state.product));
    return parts.length ? parts.join(' · ') : 'Categoría completa';
  }

  function targetContext(){
    if(state.manufacturer==='VALENCIANA') return {target:null, expected:null, label:'Valenciana no participa en la meta'};
    const target = state.manufacturer!=='TODOS' && participants.has(state.manufacturer)
      ? goals.metaMensualFabricante[state.manufacturer]
      : goals.metaMensual;
    return {
      target,
      expected: target * dayRatio,
      label: state.manufacturer==='TODOS' ? 'Meta mensual conjunta' : `Meta mensual ${state.manufacturer}`
    };
  }

  function currentContestActual(rows){
    if(state.manufacturer==='VALENCIANA') return sum(rows);
    return sum(rows.filter(r=>participants.has(r.fabricante)));
  }

  function renderAll(){
    renderPressure();
    renderMix();
    renderTeam();
    renderProducts();
    if(state.role==='direccion') renderDirection();
    bindDynamicActions();
  }

  function renderPressure(){
    const rows = julyRows(2026);
    const total = sum(rows);
    const eligible = currentContestActual(rows);
    const target = targetContext();
    const actualDaily = eligible / goals.cutoff.day;
    const projection = actualDaily * goals.cutoff.daysInMonth;
    const requiredDaily = target.target===null ? 0 : Math.max(target.target-eligible,0)/Math.max(daysRemaining,1);
    const expectedProgress = target.expected ? eligible/target.expected : null;
    const fullProgress = target.target ? eligible/target.target : null;
    const gap = target.expected===null ? null : target.expected-eligible;

    $('kpiEligible').textContent = fmt(eligible);
    $('kpiEligibleNote').textContent = state.manufacturer==='VALENCIANA' ? 'Venta de categoría · fuera del concurso' : hasDimensionalFilter() ? 'Contribución filtrada a la meta global' : 'Alen + Clarasol + Clorox';
    $('kpiEligibleBar').style.width = `${Math.min((expectedProgress||0)*100,100)}%`;
    $('kpiExpected').textContent = target.expected===null ? 'Sin meta' : fmt(target.expected);
    $('kpiExpectedNote').textContent = target.expected===null ? 'Se muestra como referencia de categoría' : `${pct(dayRatio)} del mes transcurrido · ${target.label}`;
    $('kpiGapBadge').textContent = gap===null ? 'Fuera del concurso' : gap>0 ? `Brecha ${fmt(gap)}` : `Arriba ${fmt(Math.abs(gap))}`;
    $('kpiGapBadge').className = `delta-badge ${gap!==null && gap<=0?'positive':'negative'}`;
    $('kpiDaily').textContent = target.target===null ? '—' : fmt(requiredDaily);
    $('kpiDailyVs').textContent = target.target===null ? 'Sin objetivo asignado' : `${requiredDaily > actualDaily ? '+' : ''}${pct(actualDaily ? requiredDaily/actualDaily-1 : 1)} vs ritmo actual`;
    $('kpiDailyVs').className = `delta-badge ${target.target!==null && requiredDaily<=actualDaily?'positive':'negative'}`;
    $('kpiProjection').textContent = fmt(projection);
    $('kpiProjectionNote').textContent = `Ritmo actual ${fmt(actualDaily)} por día`;
    $('kpiProjectionBadge').textContent = target.target===null ? 'Referencia de categoría' : `${pct(fullProgress)} de meta mensual`;
    $('kpiProjectionBadge').className = `delta-badge ${target.target!==null && projection>=target.target?'positive':'negative'}`;
    $('selectedContext').textContent = contextLabel();

    let stateClass='danger', stateText='Acción urgente';
    if(expectedProgress===null){ stateClass='warning'; stateText='Fuera del concurso'; }
    else if(expectedProgress>=.95){ stateClass='good'; stateText='En ritmo'; }
    else if(expectedProgress>=.75){ stateClass='warning'; stateText='Presionar hoy'; }
    $('pressureState').className=`state-badge ${stateClass}`;
    $('pressureState').textContent=stateText;

    const clarasol = sum(rows.filter(r=>r.fabricante==='CLARASOL'));
    const eligibleAll = sum(rows.filter(r=>participants.has(r.fabricante)));
    const clarasolMix = eligibleAll ? clarasol/eligibleAll : 0;
    let headlineTitle, headlineText;
    if(target.target===null){
      headlineTitle = `Valenciana pesa ${pct(total ? eligible/total : 0)} en la selección.`;
      headlineText = 'Debe permanecer visible para entender la categoría, pero su venta no acredita cumplimiento del concurso.';
    } else if(expectedProgress>=1){
      headlineTitle = `La selección está ${fmt(eligible-target.expected)} arriba del ritmo esperado.`;
      headlineText = `No aflojar: Clarasol representa ${pct(clarasolMix)} de la mezcla elegible frente al 30% objetivo.`;
    } else {
      headlineTitle = `Faltan ${fmt(Math.max(target.expected-eligible,0))} para estar al ritmo del día 23.`;
      headlineText = `El cierre proyectado es ${fmt(projection)}. Para alcanzar la meta se requieren ${fmt(requiredDaily)} diarios en los 8 días restantes.`;
    }
    $('actionHeadline').innerHTML=`<strong>${headlineTitle}</strong><span>${headlineText}${hasDimensionalFilter()?' La meta oficial no se redistribuye por vendedor, grupo o producto; la vista representa su contribución.':''}</span>`;

    renderManufacturerPressure();
    renderPriorityActions();
    renderPressureSellers();
  }

  function renderManufacturerPressure(){
    const rows = julyRows(2026,{manufacturer:'TODOS'}).filter(r=>state.manufacturer==='TODOS' || r.fabricante===state.manufacturer);
    const total = sum(rows);
    const eligible = sum(rows.filter(r=>participants.has(r.fabricante)));
    const makers = state.manufacturer==='TODOS' ? ['ALEN','CLARASOL','CLOROX','VALENCIANA'] : [state.manufacturer];
    $('manufacturerPressure').innerHTML = makers.map(m=>{
      const actual=sum(rows.filter(r=>r.fabricante===m));
      const outside=!participants.has(m);
      const expected=outside?null:goals.metaMensualFabricante[m]*dayRatio;
      const ratio=expected?actual/expected:0;
      const categoryShare=total?actual/total:0;
      const mixShare=participants.has(m)&&eligible?actual/eligible:0;
      const status=outside?'Fuera concurso':ratio>=.95?'En ritmo':ratio>=.70?'Presionar':'Urgente';
      const statusClass=outside?'press':ratio>=.95?'good':ratio>=.70?'press':'urgent';
      return `<button type="button" class="pressure-row clickable" data-maker="${m}">
        <span class="maker-icon" style="background:${colors[m]}">${m.slice(0,2)}</span>
        <span class="pressure-name"><strong>${m}</strong><small>${outside?`${pct(categoryShare)} de la categoría`:`${pct(mixShare)} de mezcla · objetivo ${pct(goals.shareObjetivo[m])}`}</small></span>
        <span class="pressure-meter"><i style="width:${outside?Math.min(categoryShare*100,100):Math.min(ratio*100,100)}%;background:${colors[m]}"></i></span>
        <span class="pressure-amount"><strong>${fmt(actual)}</strong><small class="risk-pill ${statusClass}">${status}</small></span>
      </button>`;
    }).join('');
  }

  function sellerPressureStats(){
    const sellerNames = state.seller==='TODOS' ? unique('vendedor') : [state.seller];
    return sellerNames.map(seller=>{
      const cur = julyRows(2026,{seller,manufacturer:state.manufacturer});
      const prev = julyRows(2025,{seller,manufacturer:state.manufacturer});
      const eligible = sum(cur.filter(r=>participants.has(r.fabricante)));
      const eligiblePrev = sum(prev.filter(r=>participants.has(r.fabricante)));
      const clarasol = sum(cur.filter(r=>r.fabricante==='CLARASOL'));
      const clorox = sum(cur.filter(r=>r.fabricante==='CLOROX'));
      const cloroxPrev = sum(prev.filter(r=>r.fabricante==='CLOROX'));
      const currentDaily=eligible/goals.cutoff.day;
      const priorDaily=eligiblePrev/goals.cutoff.daysInMonth;
      const pace=priorDaily>0?currentDaily/priorDaily:(eligible>0?1.05:0);
      const clarasolShare=eligible?clarasol/eligible:0;
      const cloroxPace=(cloroxPrev>0)?(clorox/goals.cutoff.day)/(cloroxPrev/goals.cutoff.daysInMonth):(clorox>0?1.05:0);
      const mixIndex=clarasolShare/.30;
      const score=.55*Math.min(pace,1.4)+.45*Math.min(mixIndex,1.4);
      let status='Bien',statusClass='good',action='Sostener el ritmo y mejorar mezcla.';
      if(eligible===0){status='Urgente';statusClass='urgent';action='Activar venta de fabricantes participantes hoy.';}
      else if(score<.65){status='Urgente';statusClass='urgent';action=clarasolShare<.15?`Abrir Clarasol: solo ${pct(clarasolShare)} de su mezcla.`:`Recuperar ritmo: ${pct(1-pace)} debajo de Jul-25 diario.`;}
      else if(score<1){status='Presionar';statusClass='press';action=clarasolShare<.30?`Subir Clarasol hacia 30%; hoy está en ${pct(clarasolShare)}.`:cloroxPace<.9?'Proteger Clorox mientras crece Clarasol.':'Acelerar volumen elegible.';}
      return {seller,eligible,eligiblePrev,pace,clarasolShare,cloroxPace,score,status,statusClass,action,category:sum(cur)};
    }).sort((a,b)=>a.score-b.score || a.eligible-b.eligible);
  }

  function renderPriorityActions(){
    const stats=sellerPressureStats();
    const chosen=[];
    const add=(obj,type,title,text)=>{if(obj && !chosen.some(x=>x.seller===obj.seller)) chosen.push({...obj,type,title,text});};
    add(stats.filter(s=>s.eligible>0).sort((a,b)=>a.clarasolShare-b.clarasolShare)[0],'Mezcla', 'Subir Clarasol', sText(stats.filter(s=>s.eligible>0).sort((a,b)=>a.clarasolShare-b.clarasolShare)[0],'clarasol'));
    add(stats.slice().sort((a,b)=>a.pace-b.pace)[0],'Ritmo','Recuperar venta',sText(stats.slice().sort((a,b)=>a.pace-b.pace)[0],'pace'));
    add(stats.filter(s=>s.eligible>0).sort((a,b)=>a.cloroxPace-b.cloroxPace)[0],'Protección','Cuidar Clorox',sText(stats.filter(s=>s.eligible>0).sort((a,b)=>a.cloroxPace-b.cloroxPace)[0],'clorox'));
    for(const s of stats){ if(chosen.length>=3) break; add(s,'Acción','Presionar cartera',s.action); }
    $('priorityActions').innerHTML=chosen.slice(0,3).map((x,i)=>`<button type="button" class="priority-card" data-seller="${encodeURIComponent(x.seller)}">
      <header><span class="priority-index">${i+1}</span><span>${x.type}</span></header>
      <strong>${esc(shortSeller(x.seller))}</strong><p>${esc(x.text)}</p>
    </button>`).join('') || '<p class="drawer-note">Sin vendedores para la selección.</p>';
  }

  function sText(s,type){
    if(!s) return 'Sin información suficiente para esta selección.';
    if(type==='clarasol') return `Clarasol pesa ${pct(s.clarasolShare)} de su venta elegible. La referencia del concurso es 30%.`;
    if(type==='pace') return s.eligiblePrev>0 ? `Su ritmo diario está ${pct(Math.abs(s.pace-1))} ${s.pace>=1?'arriba':'debajo'} de julio 2025.` : 'No tiene base comparable suficiente; revisar activación de cartera.';
    return s.cloroxPace<1 ? `El ritmo diario de Clorox está ${pct(1-s.cloroxPace)} debajo de julio 2025.` : 'Mantener Clorox mientras se abre espacio incremental para Clarasol.';
  }

  function renderPressureSellers(){
    const stats=sellerPressureStats();
    $('pressureSellerGrid').innerHTML=stats.slice(0,4).map(s=>`<button type="button" class="seller-pressure-card" data-seller="${encodeURIComponent(s.seller)}">
      <header><h4>${esc(shortSeller(s.seller))}</h4><span class="risk-pill ${s.statusClass}">${s.status}</span></header>
      <strong>${fmt(s.eligible)}</strong><p>${esc(s.action)}</p>
      <div class="mini-metrics"><span>Ritmo vs 2025<b>${pct(s.pace-1)}</b></span><span>Mix Clarasol<b>${pct(s.clarasolShare)}</b></span></div>
    </button>`).join('') || '<p class="drawer-note">Sin información para la selección.</p>';
  }

  function renderMix(){
    const period = state.role==='alicia' ? 'jul26' : state.period;
    const rows=periodRows(period);
    const prior=comparableRows(period);
    const total=sum(rows), eligible=sum(rows.filter(r=>participants.has(r.fabricante))), valenciana=sum(rows.filter(r=>r.fabricante==='VALENCIANA'));
    const clarasol=sum(rows.filter(r=>r.fabricante==='CLARASOL'));
    const clarasolMix=eligible?clarasol/eligible:0;
    $('mixTotal').textContent=fmt(total);
    $('mixEligible').textContent=fmt(eligible);
    $('mixEligibleShare').textContent=`${pct(total?eligible/total:0)} de la categoría`;
    $('mixValenciana').textContent=pct(total?valenciana/total:0);
    $('mixGap').textContent=pp(clarasolMix-.30);
    $('sharePeriod').textContent=periodLabel(period);

    const makers=['ALEN','CLARASOL','CLOROX','VALENCIANA'];
    const currentMap=Object.fromEntries(makers.map(m=>[m,sum(rows.filter(r=>r.fabricante===m))]));
    const priorTotal=sum(prior);
    const priorMap=Object.fromEntries(makers.map(m=>[m,sum(prior.filter(r=>r.fabricante===m))]));
    $('shareStack').innerHTML=makers.map(m=>{
      const share=total?currentMap[m]/total:0;
      return `<button type="button" class="share-segment" data-maker="${m}" style="flex-basis:${share*100}%;background:${colors[m]}" title="${m}: ${pct(share)}"><span>${share>=.08?`${m} ${pct(share)}`:''}</span></button>`;
    }).join('');

    $('manufacturerGrid').innerHTML=makers.map(m=>{
      const actual=currentMap[m], share=total?actual/total:0, prev=priorMap[m], growth=prev?actual/prev-1:null;
      const outside=!participants.has(m);
      return `<button type="button" class="manufacturer-card" data-maker="${m}">
        <header><span style="background:${colors[m]}">${m.slice(0,2)}</span><small>${outside?'FUERA DEL CONCURSO':'PARTICIPANTE'}</small></header>
        <strong>${fmt(actual)}</strong><p>${pct(share)} de la categoría</p>
        <footer><span>${growth===null?'Sin comparable':`${pct(growth)} vs comparable`}</span><span>${outside?'Referencia':`Obj. mix ${pct(goals.shareObjetivo[m])}`}</span></footer>
      </button>`;
    }).join('');

    $('shareComparison').innerHTML=makers.map(m=>{
      const c=total?currentMap[m]/total:0, p=priorTotal?priorMap[m]/priorTotal:0;
      return `<div class="comparison-row"><header><strong>${m}</strong><span>${pp(c-p)}</span></header>
        <div class="dual-bar"><i style="width:${Math.min(p*100,100)}%;background:rgba(255,255,255,.24)"></i><i style="width:${Math.min(c*100,100)}%;background:${colors[m]}"></i></div>
        <div class="comparison-meta"><span>Anterior ${pct(p)}</span><span>Actual ${pct(c)}</span></div></div>`;
    }).join('');

    $('contestMix').innerHTML=goals.participantes.map(m=>{
      const actual=currentMap[m], real=eligible?actual/eligible:0, target=goals.shareObjetivo[m], index=target?real/target:0;
      return `<button type="button" class="objective-row" data-maker="${m}"><header><strong>${m}</strong><span>${pp(real-target)}</span></header>
        <div class="objective-track"><i style="width:${Math.min(index*100,100)}%;background:${colors[m]}"></i></div>
        <div class="objective-meta"><span>Real ${pct(real)}</span><span>Objetivo ${pct(target)}</span></div></button>`;
    }).join('');
  }

  function sellerPeriodStats(period){
    const rows=periodRows(period), prior=comparableRows(period);
    const names=state.seller==='TODOS' ? unique('vendedor') : [state.seller];
    return names.map(seller=>{
      const cur=rows.filter(r=>r.vendedor===seller), prv=prior.filter(r=>r.vendedor===seller);
      const eligible=sum(cur.filter(r=>participants.has(r.fabricante)));
      const category=sum(cur), prevEligible=sum(prv.filter(r=>participants.has(r.fabricante)));
      const clarasol=sum(cur.filter(r=>r.fabricante==='CLARASOL'));
      return {seller,eligible,category,prevEligible,growth:prevEligible?eligible/prevEligible-1:null,clarasolShare:eligible?clarasol/eligible:0};
    }).filter(s=>s.category>0||s.prevEligible>0).sort((a,b)=>b.eligible-a.eligible);
  }

  function renderTeam(){
    const period=state.role==='alicia'?'jul26':state.period;
    const stats=sellerPeriodStats(period);
    $('sellerCount').textContent=`${stats.length} vendedores`;
    const top=stats.slice(0,3);
    $('sellerPodium').innerHTML=top.map((s,i)=>`<button type="button" class="podium-card rank-${i+1}" data-seller="${encodeURIComponent(s.seller)}"><span class="podium-num">${i+1}</span><strong>${esc(shortSeller(s.seller))}</strong><b>${fmt(s.eligible)}</b><small>Clarasol ${pct(s.clarasolShare)}</small></button>`).join('');
    const max=stats[0]?.eligible||1;
    $('sellerTable').innerHTML=stats.map((s,i)=>`<div class="data-row" data-seller="${encodeURIComponent(s.seller)}">
      <span class="data-rank">${String(i+1).padStart(2,'0')}</span>
      <span class="data-name"><strong>${esc(shortSeller(s.seller))}</strong><small>${fmt(s.category)} categoría</small></span>
      <span class="inline-bar"><i style="width:${s.eligible/max*100}%"></i></span>
      <span class="risk-pill ${s.clarasolShare>=.30?'good':s.clarasolShare>=.15?'press':'urgent'}">Clarasol ${pct(s.clarasolShare)}</span>
      <span class="data-value"><strong>${fmt(s.eligible)}</strong><small>${s.growth===null?'Sin base':pct(s.growth)}</small></span>
    </div>`).join('') || '<p class="drawer-note">Sin vendedores para la selección.</p>';
  }

  function renderProducts(){
    const period=state.role==='alicia'?'jul26':state.period;
    const rows=periodRows(period), prior=comparableRows(period);
    const current=aggregate(rows,'item'), priorMap=new Map(aggregate(prior,'item').map(x=>[x.key,x.value]));
    const total=sum(rows), max=current[0]?.value||1;
    $('productCount').textContent=`${current.length} productos`;
    $('productTable').innerHTML=current.slice(0,15).map((x,i)=>{
      const productRows=rows.filter(r=>r.item===x.key), maker=productRows[0]?.fabricante||'', prev=priorMap.get(x.key)||0, growth=prev?x.value/prev-1:null;
      return `<div class="data-row" data-item="${encodeURIComponent(x.key)}"><span class="data-rank">${String(i+1).padStart(2,'0')}</span>
        <span class="data-name"><strong>${esc(shortProduct(x.key))}</strong><small>${maker} · ${pct(total?x.value/total:0)} share</small></span>
        <span class="inline-bar"><i style="width:${x.value/max*100}%;background:${colors[maker]||'#62d69a'}"></i></span>
        <span class="risk-pill ${growth===null?'press':growth>=0?'good':'urgent'}">${growth===null?'Nuevo':pct(growth)}</span>
        <span class="data-value"><strong>${fmt(x.value)}</strong><small>${number(sum(productRows,'cantidad'))} uds.</small></span></div>`;
    }).join('') || '<p class="drawer-note">Sin productos para la selección.</p>';

    const opportunities=current.map(x=>{
      const prev=priorMap.get(x.key)||0, growth=prev?x.value/prev-1:null;
      return {...x,prev,growth};
    }).filter(x=>x.prev>0 && x.growth<0).sort((a,b)=>(a.value-a.prev)-(b.value-b.prev)).slice(0,8);
    $('productOpportunity').innerHTML=opportunities.map(x=>`<button type="button" class="opportunity-row" data-item="${encodeURIComponent(x.key)}"><header><strong>${esc(shortProduct(x.key))}</strong><span>${pct(x.growth)}</span></header><p>Venta actual ${fmt(x.value)} vs ${fmt(x.prev)} del periodo comparable.</p></button>`).join('') || '<div class="insight-card good"><strong>Sin caídas relevantes</strong><p>No hay productos comparables con contracción en la selección actual.</p></div>';
  }

  function renderDirection(){
    const rows=periodRows(state.period), prior=comparableRows(state.period);
    const sales=sum(rows), priorSales=sum(prior), units=sum(rows,'cantidad');
    const growth=priorSales?sales/priorSales-1:null;
    const h2Eligible=sum(julyRows(2026).filter(r=>participants.has(r.fabricante)));
    $('directionPeriod').textContent=periodLabel();
    $('dirSales').textContent=fmt(sales);
    $('dirSalesNote').textContent=periodLabel();
    $('dirGrowth').textContent=growth===null?'—':pct(growth);
    $('dirGrowth').style.color=growth===null?'':growth>=0?'var(--green)':'var(--red)';
    $('dirGrowthNote').textContent=state.period==='year25'?'No existe 2024 en la base':'Contra periodo equivalente 2025';
    $('dirUnits').textContent=number(units);
    $('dirUnitValue').textContent=`Valor promedio ${fmt(units?sales/units:0)}`;
    $('dirSemester').textContent=pct(h2Eligible/goals.metaSemestre);
    $('dirSemesterNote').textContent=`${fmt(h2Eligible)} de ${fmt(goals.metaSemestre)}`;
    renderTrend();
    renderDirectionInsights();
    renderManufacturerTable();
  }

  function renderTrend(){
    const svg=$('trendChart'), W=820,H=330,pad={l:58,r:20,t:22,b:42};
    const monthly=(year)=>months.map(m=>sum(records.filter(r=>r.anio===year&&r.mes===m&&dimensionsMatch(r))));
    const d25=monthly(2025), d26=monthly(2026), max=Math.max(...d25,...d26,1)*1.08;
    const x=i=>pad.l+i*((W-pad.l-pad.r)/11), y=v=>H-pad.b-(v/max)*(H-pad.t-pad.b);
    let html='';
    for(let i=0;i<5;i++){const val=max*i/4,yy=y(val);html+=`<line class="chart-grid" x1="${pad.l}" y1="${yy}" x2="${W-pad.r}" y2="${yy}"></line><text class="chart-label" x="${pad.l-9}" y="${yy+4}" text-anchor="end">${compact(val)}</text>`;}
    months.forEach((m,i)=>html+=`<text class="chart-label" x="${x(i)}" y="${H-15}" text-anchor="middle">${m.toUpperCase()}</text>`);
    [[d25,'#91aaa0','2025'],[d26,colors.CLARASOL,'2026']].forEach(([data,color,label])=>{
      const visible=data.map((v,i)=>({v,i})).filter(d=>d.v>0 || label==='2025');
      html+=`<polyline class="chart-line" stroke="${color}" points="${visible.map(d=>`${x(d.i)},${y(d.v)}`).join(' ')}"></polyline>`;
      visible.forEach(d=>html+=`<circle class="chart-dot" cx="${x(d.i)}" cy="${y(d.v)}" r="5" fill="${color}"><title>${label} ${monthNames[months[d.i]]}: ${fmt(d.v)}</title></circle>`);
    });
    svg.innerHTML=html;
    $('chartLegend').innerHTML='<span><i style="background:#91aaa0"></i>2025</span><span><i style="background:#b9f45c"></i>2026</span>';
  }

  function renderDirectionInsights(){
    const jul26=julyRows(2026), jul25=julyRows(2025);
    const cat26=sum(jul26), cat25=sum(jul25), catProjection=cat26/goals.cutoff.day*goals.cutoff.daysInMonth;
    const eligible=sum(jul26.filter(r=>participants.has(r.fabricante))), eligibleProjection=eligible/goals.cutoff.day*goals.cutoff.daysInMonth;
    const clarasol=sum(jul26.filter(r=>r.fabricante==='CLARASOL')), clorox=sum(jul26.filter(r=>r.fabricante==='CLOROX')), valenciana=sum(jul26.filter(r=>r.fabricante==='VALENCIANA'));
    const eligMix=eligible?clarasol/eligible:0, total=cat26||1;
    const cards=[
      {cls:eligibleProjection>=goals.metaMensual?'good':'alert',title:'Proyección del concurso',text:`El ritmo actual proyecta ${fmt(eligibleProjection)} al cierre, ${eligibleProjection>=goals.metaMensual?'por arriba':'por debajo'} de la meta mensual de ${fmt(goals.metaMensual)}.`},
      {cls:eligMix>=.30?'good':'alert',title:'Clarasol aún no alcanza la mezcla',text:`Clarasol representa ${pct(eligMix)} de la venta elegible; el objetivo es 30%. La brecha es ${pp(eligMix-.30)}.`},
      {cls:'good',title:'Clorox sostiene el volumen',text:`Clorox registra ${fmt(clorox)} y concentra ${pct(eligible?clorox/eligible:0)} de la mezcla elegible. El crecimiento de Clarasol debe ser incremental, no sustitución de Clorox.`},
      {cls:'',title:'Valenciana sigue explicando categoría',text:`Valenciana aporta ${fmt(valenciana)}, equivalente a ${pct(valenciana/total)} de julio. Se mantiene visible, aunque no acredita la meta.`},
      {cls:catProjection>=cat25?'good':'alert',title:'Categoría vs julio 2025',text:`La categoría proyecta ${fmt(catProjection)} frente a ${fmt(cat25)} de julio 2025: ${pct(cat25?catProjection/cat25-1:0)}.`}
    ];
    $('directionInsights').innerHTML=cards.map(c=>`<div class="insight-card ${c.cls}"><strong>${c.title}</strong><p>${c.text}</p></div>`).join('');
  }

  function renderManufacturerTable(){
    const makers=['ALEN','CLARASOL','CLOROX','VALENCIANA'];
    const jul26All=julyRows(2026,{manufacturer:'TODOS'}), totalJul=sum(jul26All);
    $('manufacturerTableBody').innerHTML=makers.map(m=>{
      const full25=sum(records.filter(r=>r.anio===2025&&r.fabricante===m&&dimensionsMatch(r,{manufacturer:'TODOS'})));
      const ytd26=sum(records.filter(r=>r.anio===2026&&months.indexOf(r.mes)<=6&&r.fabricante===m&&dimensionsMatch(r,{manufacturer:'TODOS'})));
      const j25=sum(julyRows(2025,{manufacturer:'TODOS'}).filter(r=>r.fabricante===m));
      const j26=sum(jul26All.filter(r=>r.fabricante===m));
      const target=participants.has(m)?goals.metaMensualFabricante[m]:null;
      const expected=target?target*dayRatio:null;
      const compliance=expected?j26/expected:null;
      return `<tr data-maker="${m}"><td><strong>${m}</strong>${participants.has(m)?'':' · Fuera concurso'}</td><td>${fmt(full25)}</td><td>${fmt(ytd26)}</td><td>${fmt(j25)}</td><td>${fmt(j26)}</td><td>${pct(totalJul?j26/totalJul:0)}</td><td>${target?fmt(target):'—'}</td><td>${compliance===null?'—':pct(compliance)}</td></tr>`;
    }).join('');
  }

  function bindDynamicActions(){
    document.querySelectorAll('[data-maker]').forEach(el=>el.onclick=()=>openMakerDetail(el.dataset.maker));
    document.querySelectorAll('[data-seller]').forEach(el=>el.onclick=()=>openSellerDetail(decodeURIComponent(el.dataset.seller)));
    document.querySelectorAll('[data-item]').forEach(el=>el.onclick=()=>openProductDetail(decodeURIComponent(el.dataset.item)));
  }

  function breakdownRows(rows,key,limit=8){
    const data=aggregate(rows,key).slice(0,limit), total=sum(rows);
    return data.map(x=>`<div class="drawer-row"><span>${esc(key==='vendedor'?shortSeller(x.key):key==='item'?shortProduct(x.key):x.key)}</span><strong>${fmt(x.value)} · ${pct(total?x.value/total:0)}</strong></div>`).join('');
  }

  function openDrawer(title,content){
    $('drawerTitle').textContent=title;
    $('drawerContent').innerHTML=content;
    $('drawerBackdrop').classList.remove('hidden');
    $('detailDrawer').classList.add('open');
    $('detailDrawer').setAttribute('aria-hidden','false');
  }
  function closeDrawer(){
    $('detailDrawer').classList.remove('open');
    $('detailDrawer').setAttribute('aria-hidden','true');
    $('drawerBackdrop').classList.add('hidden');
  }

  function openMakerDetail(maker){
    const rows=julyRows(2026,{manufacturer:maker}), prior=julyRows(2025,{manufacturer:maker});
    const actual=sum(rows), previous=sum(prior), projected=actual/goals.cutoff.day*goals.cutoff.daysInMonth;
    const target=participants.has(maker)?goals.metaMensualFabricante[maker]:null;
    const expected=target?target*dayRatio:null;
    openDrawer(maker,`<div class="drawer-hero"><span>Venta julio al día 23</span><strong>${fmt(actual)}</strong></div>
      <div class="drawer-list">
        <div class="drawer-row"><span>Proyección de cierre</span><strong>${fmt(projected)}</strong></div>
        <div class="drawer-row"><span>Julio 2025</span><strong>${fmt(previous)}</strong></div>
        <div class="drawer-row"><span>Variación de ritmo proyectada</span><strong>${previous?pct(projected/previous-1):'—'}</strong></div>
        <div class="drawer-row"><span>Meta esperada al corte</span><strong>${expected?fmt(expected):'Fuera del concurso'}</strong></div>
        <div class="drawer-row"><span>Cumplimiento al tiempo</span><strong>${expected?pct(actual/expected):'—'}</strong></div>
      </div><p class="drawer-note">Principales vendedores</p><div class="drawer-list">${breakdownRows(rows,'vendedor')}</div>
      <p class="drawer-note">Principales productos</p><div class="drawer-list">${breakdownRows(rows,'item')}</div>`);
  }

  function openSellerDetail(seller){
    const rows=julyRows(2026,{seller}), prior=julyRows(2025,{seller});
    const category=sum(rows), eligible=sum(rows.filter(r=>participants.has(r.fabricante))), prev=sum(prior.filter(r=>participants.has(r.fabricante)));
    const clarasol=sum(rows.filter(r=>r.fabricante==='CLARASOL'));
    openDrawer(shortSeller(seller),`<div class="drawer-hero"><span>Venta elegible julio</span><strong>${fmt(eligible)}</strong></div>
      <div class="drawer-list"><div class="drawer-row"><span>Venta total categoría</span><strong>${fmt(category)}</strong></div>
      <div class="drawer-row"><span>Ritmo diario vs Jul-25</span><strong>${prev?pct((eligible/goals.cutoff.day)/(prev/goals.cutoff.daysInMonth)-1):'Sin base'}</strong></div>
      <div class="drawer-row"><span>Mix Clarasol</span><strong>${pct(eligible?clarasol/eligible:0)} · objetivo 30%</strong></div></div>
      <p class="drawer-note">Mezcla por fabricante</p><div class="drawer-list">${breakdownRows(rows,'fabricante')}</div>
      <p class="drawer-note">Productos principales</p><div class="drawer-list">${breakdownRows(rows,'item')}</div>
      <button type="button" class="drawer-action" id="filterDrawerSeller">Filtrar toda la app por este vendedor</button>`);
    setTimeout(()=>{const b=$('filterDrawerSeller');if(b)b.onclick=()=>{state.seller=seller;$('sellerFilter').value=seller;closeDrawer();renderAll();};},0);
  }

  function openProductDetail(item){
    const rows=julyRows(2026,{product:item}), prior=julyRows(2025,{product:item});
    const actual=sum(rows), previous=sum(prior), maker=rows[0]?.fabricante||prior[0]?.fabricante||'';
    openDrawer(shortProduct(item),`<div class="drawer-hero"><span>${maker} · venta julio al corte</span><strong>${fmt(actual)}</strong></div>
      <div class="drawer-list"><div class="drawer-row"><span>Julio 2025</span><strong>${fmt(previous)}</strong></div><div class="drawer-row"><span>Proyección de cierre</span><strong>${fmt(actual/goals.cutoff.day*goals.cutoff.daysInMonth)}</strong></div><div class="drawer-row"><span>Unidades</span><strong>${number(sum(rows,'cantidad'))}</strong></div></div>
      <p class="drawer-note">Vendedores que lo mueven</p><div class="drawer-list">${breakdownRows(rows,'vendedor')}</div>
      <button type="button" class="drawer-action" id="filterDrawerProduct">Filtrar toda la app por este producto</button>`);
    setTimeout(()=>{const b=$('filterDrawerProduct');if(b)b.onclick=()=>{state.product=item;$('productFilter').value=item;closeDrawer();renderAll();};},0);
  }

  function openGenericDetail(type){
    const rows=julyRows(2026), total=sum(rows), eligible=currentContestActual(rows), target=targetContext();
    const makerBreakdown=breakdownRows(rows,'fabricante');
    const sellerBreakdown=breakdownRows(rows,'vendedor');
    const definitions={
      category:['Venta total de categoría',total,'Incluye todos los fabricantes vendidos, incluida Valenciana.'],
      eligible:['Venta elegible del concurso',eligible,'Incluye Alen, Clarasol y Clorox. Valenciana permanece visible, pero no acredita cumplimiento.'],
      expected:['Meta esperada al corte',target.expected,'La meta mensual se prorratea a 23 de 31 días. No se redistribuye por vendedor, grupo o producto.'],
      daily:['Venta diaria necesaria',target.target===null?0:Math.max(target.target-eligible,0)/daysRemaining,'Ritmo requerido en los ocho días restantes para alcanzar la meta mensual oficial.'],
      projection:['Proyección de cierre',eligible/goals.cutoff.day*goals.cutoff.daysInMonth,'Proyección lineal con el ritmo promedio observado del 1 al 23 de julio.'],
      valenciana:['Peso de Valenciana',sum(rows.filter(r=>r.fabricante==='VALENCIANA')),'Se muestra para comprender la categoría, aunque está fuera del concurso.'],
      mixgap:['Brecha de mezcla Clarasol',(sum(rows.filter(r=>r.fabricante==='CLARASOL'))/(sum(rows.filter(r=>participants.has(r.fabricante)))||1))-.30,'Diferencia entre la participación de Clarasol dentro de los participantes y el objetivo de 30%.'],
      semester:['Avance Jul–Dic',eligible/goals.metaSemestre,'El segundo semestre apenas contiene julio al corte; la meta oficial permanece fija.'],
      units:['Unidades vendidas',sum(rows,'cantidad'),'Cantidad vendida bajo los filtros seleccionados.']
    };
    if(type==='growth'){
      const cur=periodRows(state.period), prev=comparableRows(state.period), growth=sum(prev)?sum(cur)/sum(prev)-1:null;
      openDrawer('Variación comparable',`<div class="drawer-hero"><span>${periodLabel()}</span><strong>${growth===null?'—':pct(growth)}</strong></div><p class="drawer-note">Compara el mismo periodo disponible de 2026 contra 2025. Julio 2026 se proyecta por separado cuando se analiza ritmo.</p>`);return;
    }
    const [title,value,note]=definitions[type]||definitions.category;
    const display=(type==='mixgap'||type==='semester')?pct(value):type==='units'?number(value):fmt(value);
    openDrawer(title,`<div class="drawer-hero"><span>${contextLabel()}</span><strong>${display}</strong></div><p class="drawer-note">${note}</p><p class="drawer-note">Por fabricante</p><div class="drawer-list">${makerBreakdown}</div><p class="drawer-note">Principales vendedores</p><div class="drawer-list">${sellerBreakdown}</div>`);
  }

  function showSection(section){
    if(section==='direction' && state.role!=='direccion') section='pressure';
    state.section=section;
    document.querySelectorAll('.app-section').forEach(x=>x.classList.remove('active-section'));
    $(`${section}Section`)?.classList.add('active-section');
    document.querySelectorAll('[data-section]').forEach(x=>x.classList.toggle('active',x.dataset.section===section));
    const headers={
      pressure:['TABLERO DE SUPERVISIÓN','Presión comercial inmediata','Qué falta, quién debe reaccionar y dónde está la oportunidad.'],
      mix:['MEZCLA DE CATEGORÍA','Peso de fabricantes','Venta, share, migración y cumplimiento de la mezcla objetivo.'],
      team:['EJECUCIÓN COMERCIAL','Fuerza de ventas','Quién mueve el negocio y quién necesita intervención.'],
      products:['PORTAFOLIO','Productos que explican la venta','El detalle suficiente para convertir lectura en acción.'],
      direction:['DIRECCIÓN COMERCIAL','Control analítico completo','Histórico 2025, YTD 2026, metas, tendencias y detalle.']
    }[section];
    $('headerEyebrow').textContent=headers[0];$('headerTitle').textContent=headers[1];$('headerSubtitle').textContent=headers[2];
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function login(){
    const user=$('userInput').value.trim().toLowerCase(), pass=$('passInput').value;
    const account=users[user];
    if(!account || account.password!==pass){$('loginError').textContent='Usuario o contraseña incorrectos.';return;}
    state.role=account.role;state.user=account;
    document.body.dataset.role=account.role;
    $('loginView').classList.add('hidden');$('appView').classList.remove('hidden');
    $('roleLabel').textContent=account.label;$('profileName').textContent=account.name;$('profileInitial').textContent=account.name.charAt(0);
    document.querySelectorAll('.director-only').forEach(el=>el.classList.toggle('hidden',account.role!=='direccion'));
    state.period='jul26';showSection(account.role==='alicia'?'pressure':'direction');renderAll();
  }

  function logout(){
    state.role=null;state.user=null;document.body.removeAttribute('data-role');$('appView').classList.add('hidden');$('loginView').classList.remove('hidden');$('passInput').value='';$('loginError').textContent='';
  }

  function resetFilters(){
    state.period='jul26';state.manufacturer='TODOS';state.group='TODOS';state.seller='TODOS';state.product='TODOS';
    $('periodFilter').value='jul26';$('manufacturerFilter').value='TODOS';$('groupFilter').value='TODOS';$('sellerFilter').value='TODOS';$('productFilter').value='TODOS';renderAll();
  }

  function downloadCSV(){
    const rows=periodRows(state.period);
    const headers=['Categoria','Fabricante','GrupoTienda','Producto','Grupo','Vendedor','Año','Mes','Venta SubTotal','Venta Cantidad'];
    const lines=[headers.join(',')].concat(rows.map(r=>[r.categoria,r.fabricante,r.grupoTienda,r.item,r.grupo,r.vendedor,r.anio,r.mes,r.venta,r.cantidad].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')));
    const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='vista_clarasol_'+state.period+'.csv';a.click();URL.revokeObjectURL(url);
  }

  initializeFilters();
  $('loginBtn').addEventListener('click',login);$('passInput').addEventListener('keydown',e=>{if(e.key==='Enter')login();});$('logoutBtn').addEventListener('click',logout);
  $('resetBtn').addEventListener('click',resetFilters);$('closeDrawer').addEventListener('click',closeDrawer);$('drawerBackdrop').addEventListener('click',closeDrawer);
  $('showAllSellers').addEventListener('click',()=>showSection('team'));$('downloadCsvBtn').addEventListener('click',downloadCSV);
  document.querySelectorAll('[data-section]').forEach(btn=>btn.addEventListener('click',()=>showSection(btn.dataset.section)));
  [['periodFilter','period'],['manufacturerFilter','manufacturer'],['groupFilter','group'],['sellerFilter','seller'],['productFilter','product']].forEach(([id,key])=>$(id).addEventListener('change',e=>{state[key]=e.target.value;renderAll();}));
  document.querySelectorAll('[data-detail]').forEach(el=>el.addEventListener('click',()=>openGenericDetail(el.dataset.detail)));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer();});
})();
