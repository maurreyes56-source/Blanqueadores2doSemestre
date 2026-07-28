(() => {
  'use strict';

  const { records, goals } = window.APP_DATA;
  const $ = (id) => document.getElementById(id);
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const monthNames = {ene:'Enero',feb:'Febrero',mar:'Marzo',abr:'Abril',may:'Mayo',jun:'Junio',jul:'Julio',ago:'Agosto',sep:'Septiembre',oct:'Octubre',nov:'Noviembre',dic:'Diciembre'};
  const currentYear = Number(goals.cutoff.year);
  const priorYear = currentYear - 1;
  const currentMonth = String(goals.cutoff.month || '').toLowerCase();
  const currentMonthIndex = months.indexOf(currentMonth);
  const currentMonthName = monthNames[currentMonth] || currentMonth;
  const currentMonthLower = currentMonthName.toLowerCase();
  const currentPeriodKey = `${currentMonth}${String(currentYear).slice(-2)}`;
  const cutoffDateLabel = `${goals.cutoff.day} de ${currentMonthLower} de ${currentYear}`;
  const cutoffMonthLabel = `${currentMonthName} ${currentYear}`;
  const priorMonthLabel = `${currentMonthName} ${priorYear}`;
  const nextDay = Math.min(goals.cutoff.day + 1, goals.cutoff.daysInMonth);
  const ytdLabel = `YTD enero–${currentMonthLower} ${currentYear}`;
  if(currentMonthIndex<0) throw new Error(`Mes de corte inválido: ${goals.cutoff.month}`);
  const colors = { ALEN:'#64b4ff', CLARASOL:'#b9f45c', CLOROX:'#62d69a', VALENCIANA:'#ffc861' };
  const users = {
    clarisa: { password:'clarisa26', role:'alicia', name:'Clarisa', label:'Supervisión comercial' },
    ventas: { password:'ventas26', role:'direccion', name:'Dirección Ventas', label:'Dirección comercial' }
  };

  const state = {
    role: null,
    user: null,
    section: 'pressure',
    period: currentPeriodKey,
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

  function applyDynamicCopy(){
    document.title = `BG · Blanqueadores · Corte ${cutoffDateLabel}`;
    const set=(id,text)=>{ const el=$(id); if(el) el.textContent=text; };
    set('loginKicker',`DASHBOARD COMERCIAL · CORTE ${goals.cutoff.day} ${currentMonth.toUpperCase()} ${currentYear}`);
    set('sideCutoff',cutoffDateLabel);
    set('cutChip',`Corte ${goals.cutoff.day} ${currentMonth} · ${goals.cutoff.day}/${goals.cutoff.daysInMonth} días`);
    set('pressureEyebrow',`RESUMEN AL ${goals.cutoff.day} DE ${currentMonthName.toUpperCase()}`);
    set('kpiExpectedLabel',`Venta esperada al ${cutoffDateLabel}`);
    set('kpiDailyNote',`Promedio requerido del ${nextDay} al ${goals.cutoff.daysInMonth} de ${currentMonthLower}`);
    set('kpiProjectionLabel',`Proyección de cierre de ${currentMonthLower}`);
    set('technicalDetailLabel',`${priorYear}, ${ytdLabel} y ${currentMonthLower} al corte`);
    set('tablePriorYear',String(priorYear));
    set('tableYtd',ytdLabel);
    set('trendTitle',`${priorYear} vs ${currentYear} por mes`);
    set('tablePriorMonth',`${currentMonth.slice(0,3).replace(/^./,c=>c.toUpperCase())}-${String(priorYear).slice(-2)}`);
    set('tableCurrentMonth',`${currentMonth.slice(0,3).replace(/^./,c=>c.toUpperCase())}-${String(currentYear).slice(-2)}`);
    set('tableCurrentShare',`Participación ${currentMonth.slice(0,3).replace(/^./,c=>c.toUpperCase())}-${String(currentYear).slice(-2)}`);
    set('tableCurrentGoal',`Meta ${currentMonth.slice(0,3).replace(/^./,c=>c.toUpperCase())}`);
    set('dataFooter',`Fuente: Concurso_Clarasol.xlsx · Venta SubTotal · Bodega La Guadalupana · Corte al ${cutoffDateLabel}`);
    const periodFilter=$('periodFilter');
    if(periodFilter){
      periodFilter.innerHTML=`
        <option value="${currentPeriodKey}">${currentMonthName} ${currentYear} al día ${goals.cutoff.day}</option>
        <option value="ytd26">${ytdLabel}</option>
        <option value="year25">Año completo ${priorYear}</option>
        <option value="compare">Comparativo enero–${currentMonthLower}</option>`;
      periodFilter.value=currentPeriodKey;
    }
  }

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
      if(period === currentPeriodKey) return r.anio===currentYear && r.mes===currentMonth;
      if(period === 'ytd26' || period === 'compare') return r.anio===currentYear && months.indexOf(r.mes)<=currentMonthIndex;
      if(period === 'year25') return r.anio===priorYear;
      return false;
    });
  }

  function comparableRows(period=state.period, overrides={}){
    return records.filter(r => {
      if(!dimensionsMatch(r,overrides)) return false;
      if(period === currentPeriodKey) return r.anio===priorYear && r.mes===currentMonth;
      if(period === 'ytd26' || period === 'compare') return r.anio===priorYear && months.indexOf(r.mes)<=currentMonthIndex;
      return false;
    });
  }

  function currentMonthRows(year=currentYear, overrides={}){
    return records.filter(r => r.anio===year && r.mes===currentMonth && dimensionsMatch(r,overrides));
  }

  function semesterRows(year=currentYear, overrides={}){
    return records.filter(r => r.anio===year && months.indexOf(r.mes)>=6 && months.indexOf(r.mes)<=currentMonthIndex && dimensionsMatch(r,overrides));
  }

  function aggregate(rows,key,valueKey='venta'){
    const map = new Map();
    rows.forEach(r=>map.set(r[key],(map.get(r[key])||0)+(Number(r[valueKey])||0)));
    return [...map.entries()].map(([key,value])=>({key,value})).sort((a,b)=>b.value-a.value);
  }

  function periodLabel(period=state.period){
    if(period===currentPeriodKey) return `${currentMonthName} ${currentYear} al día ${goals.cutoff.day}`;
    if(period==='ytd26') return ytdLabel;
    if(period==='year25') return `Año completo ${priorYear}`;
    if(period==='compare') return `Comparativo enero–${currentMonthLower}`;
    return '';
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
    const rows = currentMonthRows(currentYear);
    const total = sum(rows);
    const contestSales = currentContestActual(rows);
    const target = targetContext();
    const currentDaily = contestSales / goals.cutoff.day;
    const projectedClose = currentDaily * goals.cutoff.daysInMonth;
    const requiredDaily = target.target===null ? 0 : Math.max(target.target-contestSales,0)/Math.max(daysRemaining,1);
    const expectedProgress = target.expected ? contestSales/target.expected : null;
    const projectedProgress = target.target ? projectedClose/target.target : null;
    const gapToDate = target.expected===null ? null : target.expected-contestSales;

    $('kpiEligible').textContent = fmt(contestSales);
    $('kpiEligibleNote').textContent = state.manufacturer==='VALENCIANA'
      ? 'Venta de Valenciana; se muestra fuera de la meta'
      : hasDimensionalFilter()
        ? 'Venta real de la selección dentro de Alen, Clarasol y Clorox'
        : 'Venta real de Alen + Clarasol + Clorox';
    $('kpiEligibleBar').style.width = `${Math.min((expectedProgress||0)*100,100)}%`;

    $('kpiExpected').textContent = target.expected===null ? 'Sin meta' : fmt(target.expected);
    $('kpiExpectedNote').textContent = target.expected===null
      ? 'Valenciana no tiene meta asignada'
      : hasDimensionalFilter()
        ? `Referencia de la meta global al día ${goals.cutoff.day}`
        : `Meta mensual proporcional a ${goals.cutoff.day} de ${goals.cutoff.daysInMonth} días`;
    $('kpiGapBadge').textContent = gapToDate===null
      ? 'Fuera de la meta'
      : gapToDate>0 ? `Faltan ${fmt(gapToDate)}` : `Supera por ${fmt(Math.abs(gapToDate))}`;
    $('kpiGapBadge').className = `delta-badge ${gapToDate!==null && gapToDate<=0?'positive':'negative'}`;

    $('kpiDaily').textContent = target.target===null ? '—' : fmt(requiredDaily);
    $('kpiDailyVs').textContent = target.target===null
      ? 'No aplica'
      : requiredDaily<=currentDaily
        ? 'El ritmo actual alcanza'
        : `Requiere ${pct(requiredDaily/Math.max(currentDaily,1)-1)} más por día`;
    $('kpiDailyVs').className = `delta-badge ${target.target!==null && requiredDaily<=currentDaily?'positive':'negative'}`;

    $('kpiProjection').textContent = fmt(projectedClose);
    $('kpiProjectionNote').textContent = `Estimación al ${goals.cutoff.daysInMonth} de ${currentMonthLower} con ${fmt(currentDaily)} diarios`;
    $('kpiProjectionBadge').textContent = target.target===null
      ? 'Fuera de la meta'
      : `Proyecta ${pct(projectedProgress)} de la meta mensual`;
    $('kpiProjectionBadge').className = `delta-badge ${target.target!==null && projectedClose>=target.target?'positive':'negative'}`;
    $('selectedContext').textContent = contextLabel();

    let stateClass='danger', stateText='Debajo de lo esperado';
    if(expectedProgress===null){ stateClass='warning'; stateText='Sin meta asignada'; }
    else if(expectedProgress>=.95){ stateClass='good'; stateText='En línea con el corte'; }
    else if(expectedProgress>=.75){ stateClass='warning'; stateText='Cerca del ritmo esperado'; }
    $('pressureState').className=`state-badge ${stateClass}`;
    $('pressureState').textContent=stateText;

    const clarasol = sum(rows.filter(r=>r.fabricante==='CLARASOL'));
    const contestAll = sum(rows.filter(r=>participants.has(r.fabricante)));
    const clarasolMix = contestAll ? clarasol/contestAll : 0;
    let headlineTitle, headlineText;
    if(target.target===null){
      headlineTitle = `Venta actual de Valenciana: ${fmt(contestSales)}.`;
      headlineText = 'Forma parte de la categoría, pero no se compara contra la meta del concurso.';
    } else if(expectedProgress>=1){
      headlineTitle = `La venta del concurso cumple el nivel esperado al día ${goals.cutoff.day}.`;
      headlineText = `Clarasol representa ${pct(clarasolMix)} de la venta del concurso frente al 30% objetivo.`;
    } else {
      headlineTitle = `Venta real ${fmt(contestSales)} frente a ${fmt(target.expected)} esperados al día ${goals.cutoff.day}.`;
      headlineText = `Faltan ${fmt(Math.max(target.expected-contestSales,0))} para estar al ritmo del corte. La proyección de ${currentMonthLower} es ${fmt(projectedClose)}.`;
    }
    $('actionHeadline').innerHTML=`<strong>${headlineTitle}</strong><span>${headlineText}${hasDimensionalFilter()?' La selección muestra su aporte; la meta continúa siendo global.':''}</span>`;

    renderManufacturerPressure();
    renderPriorityActions();
    renderPressureSellers();
  }

  function renderManufacturerPressure(){
    const rows = currentMonthRows(currentYear,{manufacturer:'TODOS'}).filter(r=>state.manufacturer==='TODOS' || r.fabricante===state.manufacturer);
    const total = sum(rows);
    const eligible = sum(rows.filter(r=>participants.has(r.fabricante)));
    const makers = state.manufacturer==='TODOS' ? ['ALEN','CLARASOL','CLOROX','VALENCIANA'] : [state.manufacturer];

    function executiveComment(m, mixShare, categoryShare, ratio){
      if(m==='VALENCIANA') return `Aporta ${pct(categoryShare)} de la categoría. Se vigila, pero no suma al concurso.`;
      const target=goals.shareObjetivo[m];
      const diff=mixShare-target;
      if(m==='CLARASOL'){
        if(diff>=0) return `Alcanza ${pct(mixShare)} de la venta del concurso y cumple el 30% objetivo. El reto es sostener volumen.`;
        return `Pesa ${pct(mixShare)} de la venta del concurso. Necesita ganar ${Math.abs(diff*100).toFixed(1)} pp para llegar al 30%.`;
      }
      if(m==='CLOROX'){
        if(diff>=0) return `Sostiene ${pct(mixShare)} de la venta del concurso, ${Math.abs(diff*100).toFixed(1)} pp sobre el 60%. Debe protegerse.`;
        return `Pesa ${pct(mixShare)} de la venta del concurso. Recuperar volumen sin frenar el crecimiento de Clarasol.`;
      }
      if(diff>=0 && ratio<.95) return `Aporta ${pct(mixShare)} de la venta del concurso, arriba del 10%; falta acelerar el volumen del mes.`;
      if(diff>=0) return `Cumple su peso objetivo con ${pct(mixShare)} de la venta del concurso. Mantener ejecución.`;
      return `Pesa ${pct(mixShare)} de la venta del concurso. Le faltan ${Math.abs(diff*100).toFixed(1)} pp para su objetivo.`;
    }

    $('manufacturerPressure').innerHTML = makers.map(m=>{
      const actual=sum(rows.filter(r=>r.fabricante===m));
      const outside=!participants.has(m);
      const expected=outside?null:goals.metaMensualFabricante[m]*dayRatio;
      const ratio=expected?actual/expected:0;
      const categoryShare=total?actual/total:0;
      const mixShare=participants.has(m)&&eligible?actual/eligible:0;
      let status, statusClass;
      if(outside){ status='Referencia'; statusClass='press'; }
      else if(ratio>=.95){ status='En ritmo'; statusClass='good'; }
      else if(m==='CLARASOL' && mixShare<goals.shareObjetivo[m]){ status='Ganar participación'; statusClass='urgent'; }
      else if(m==='CLOROX' && mixShare>=goals.shareObjetivo[m]){ status='Proteger'; statusClass='press'; }
      else { status='Acelerar'; statusClass=ratio>=.7?'press':'urgent'; }
      const comment=executiveComment(m,mixShare,categoryShare,ratio);
      return `<button type="button" class="pressure-row clickable" data-maker="${m}">
        <span class="maker-icon" style="background:${colors[m]}">${m.slice(0,2)}</span>
        <span class="pressure-copy"><strong>${m}</strong><small>${outside?`${pct(categoryShare)} de la categoría`:`${pct(mixShare)} de la venta del concurso · objetivo ${pct(goals.shareObjetivo[m])}`}</small><p>${comment}</p></span>
        <span class="pressure-meter-wrap"><small>${outside?'Peso en categoría':`Avance de venta al corte ${pct(ratio)}`}</small><span class="pressure-meter"><i style="width:${outside?Math.min(categoryShare*100,100):Math.min(ratio*100,100)}%;background:${colors[m]}"></i></span></span>
        <span class="pressure-amount"><strong>${fmt(actual)}</strong><small class="risk-pill ${statusClass}">${status}</small></span>
      </button>`;
    }).join('');
  }

  function sellerPressureStats(){
    const sellerNames = state.seller==='TODOS' ? unique('vendedor') : [state.seller];
    return sellerNames.map(seller=>{
      const cur = currentMonthRows(currentYear,{seller,manufacturer:state.manufacturer});
      const prev = currentMonthRows(priorYear,{seller,manufacturer:state.manufacturer});
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
      if(eligible===0){status='Atención';statusClass='urgent';action='Activar venta de fabricantes con meta.';}
      else if(score<.65){status='Atención';statusClass='urgent';action=clarasolShare<.15?`Desarrollar Clarasol: hoy representa ${pct(clarasolShare)} de su venta del concurso.`:`Recuperar ritmo: ${pct(1-pace)} debajo de ${currentMonthName.slice(0,3)}-${String(priorYear).slice(-2)} diario.`;}
      else if(score<1){status='Seguimiento';statusClass='press';action=clarasolShare<.30?`Llevar Clarasol hacia 30%; hoy representa ${pct(clarasolShare)}.`:cloroxPace<.9?'Proteger Clorox mientras crece Clarasol.':'Acelerar volumen elegible.';}
      return {seller,eligible,eligiblePrev,pace,clarasolShare,cloroxPace,score,status,statusClass,action,category:sum(cur)};
    }).sort((a,b)=>a.score-b.score || a.eligible-b.eligible);
  }

  function renderPriorityActions(){
    const stats=sellerPressureStats();
    const chosen=[];
    const add=(obj,type,title,text)=>{if(obj && !chosen.some(x=>x.seller===obj.seller)) chosen.push({...obj,type,title,text});};
    add(stats.filter(s=>s.eligible>0).sort((a,b)=>a.clarasolShare-b.clarasolShare)[0],'Participación', 'Desarrollar Clarasol', sText(stats.filter(s=>s.eligible>0).sort((a,b)=>a.clarasolShare-b.clarasolShare)[0],'clarasol'));
    add(stats.slice().sort((a,b)=>a.pace-b.pace)[0],'Ritmo','Recuperar ritmo',sText(stats.slice().sort((a,b)=>a.pace-b.pace)[0],'pace'));
    add(stats.filter(s=>s.eligible>0).sort((a,b)=>a.cloroxPace-b.cloroxPace)[0],'Protección','Sostener Clorox',sText(stats.filter(s=>s.eligible>0).sort((a,b)=>a.cloroxPace-b.cloroxPace)[0],'clorox'));
    for(const s of stats){ if(chosen.length>=3) break; add(s,'Seguimiento','Revisar cartera',s.action); }
    $('priorityActions').innerHTML=chosen.slice(0,3).map((x,i)=>`<button type="button" class="priority-card" data-seller="${encodeURIComponent(x.seller)}">
      <header><span class="priority-index">${i+1}</span><span>${x.type}</span></header>
      <strong>${esc(shortSeller(x.seller))}</strong><p>${esc(x.text)}</p>
    </button>`).join('') || '<p class="drawer-note">Sin vendedores para la selección.</p>';
  }

  function sText(s,type){
    if(!s) return 'Sin información suficiente para esta selección.';
    if(type==='clarasol') return s.clarasolShare>=.30 ? `Clarasol ya representa ${pct(s.clarasolShare)} de su venta del concurso. Sostener volumen.` : `Clarasol representa ${pct(s.clarasolShare)}. Enfocar clientes con potencial para acercarse al 30%.`;
    if(type==='pace') return s.eligiblePrev>0 ? `Su ritmo diario está ${pct(Math.abs(s.pace-1))} ${s.pace>=1?'arriba':'debajo'} de ${currentMonthLower} ${priorYear}. Revisar cartera prioritaria.` : 'Sin base comparable suficiente. Confirmar activación de cartera.';
    return s.cloroxPace<1 ? `Clorox está ${pct(1-s.cloroxPace)} debajo del ritmo de ${currentMonthLower} ${priorYear}. Recuperarlo sin sustituirlo por Clarasol.` : 'Clorox mantiene el ritmo. Crecer Clarasol de forma incremental.';
  }

  function renderPressureSellers(){
    const stats=sellerPressureStats();
    $('pressureSellerGrid').innerHTML=stats.slice(0,4).map(s=>`<button type="button" class="seller-pressure-card" data-seller="${encodeURIComponent(s.seller)}">
      <header><h4>${esc(shortSeller(s.seller))}</h4><span class="risk-pill ${s.statusClass}">${s.status}</span></header>
      <strong>${fmt(s.eligible)}</strong><p>${esc(s.action)}</p>
      <div class="mini-metrics"><span>Ritmo vs ${priorYear}<b>${pct(s.pace-1)}</b></span><span>Participación Clarasol<b>${pct(s.clarasolShare)}</b></span></div>
    </button>`).join('') || '<p class="drawer-note">Sin información para la selección.</p>';
  }

  function renderMix(){
    const period = state.role==='alicia' ? currentPeriodKey : state.period;
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
      const eligibleShare=eligible&&participants.has(m)?actual/eligible:0;
      let narrative;
      if(outside) narrative=`Representa ${pct(share)} de la categoría. Se conserva como referencia, sin acreditar meta.`;
      else if(m==='CLARASOL') narrative=eligibleShare>=.30?`Cumple la participación objetivo con ${pct(eligibleShare)}.`:`Está en ${pct(eligibleShare)} de la venta del concurso; faltan ${Math.abs((eligibleShare-.30)*100).toFixed(1)} pp para el 30%.`;
      else if(m==='CLOROX') narrative=`Sostiene ${pct(eligibleShare)} de la venta del concurso. Debe protegerse mientras crece Clarasol.`;
      else narrative=`Aporta ${pct(eligibleShare)} de la venta del concurso frente al 10% objetivo.`;
      return `<button type="button" class="manufacturer-card" data-maker="${m}">
        <header><span style="background:${colors[m]}">${m.slice(0,2)}</span><small>${outside?'REFERENCIA DE CATEGORÍA':'PARTICIPANTE'}</small></header>
        <strong>${fmt(actual)}</strong><p class="manufacturer-share">${pct(share)} de la categoría</p>
        <p class="manufacturer-narrative">${narrative}</p>
        <footer><span>${growth===null?'Sin comparable':`${pct(growth)} vs comparable`}</span><span>${outside?'No suma a meta':`Objetivo ${pct(goals.shareObjetivo[m])}`}</span></footer>
      </button>`;
    }).join('');

    $('shareComparison').innerHTML=makers.map(m=>{
      const c=total?currentMap[m]/total:0, p=priorTotal?priorMap[m]/priorTotal:0, change=c-p;
      const interpretation=Math.abs(change)<.005?'Participación estable':change>0?`Gana ${Math.abs(change*100).toFixed(1)} pp de peso`:`Cede ${Math.abs(change*100).toFixed(1)} pp de peso`;
      return `<div class="comparison-row"><header><strong>${m}</strong><span>${pp(change)}</span></header>
        <div class="dual-bar"><i style="width:${Math.min(p*100,100)}%;background:rgba(255,255,255,.24)"></i><i style="width:${Math.min(c*100,100)}%;background:${colors[m]}"></i></div>
        <div class="comparison-meta"><span>Antes ${pct(p)}</span><span>Ahora ${pct(c)}</span></div><p class="row-comment">${interpretation}</p></div>`;
    }).join('');

    $('contestMix').innerHTML=goals.participantes.map(m=>{
      const actual=currentMap[m], real=eligible?actual/eligible:0, target=goals.shareObjetivo[m], index=target?real/target:0, diff=real-target;
      const note=Math.abs(diff)<.01?'Mezcla alineada al objetivo':diff>0?`${Math.abs(diff*100).toFixed(1)} pp por arriba del objetivo`:`${Math.abs(diff*100).toFixed(1)} pp por debajo del objetivo`;
      return `<button type="button" class="objective-row" data-maker="${m}"><header><strong>${m}</strong><span>${pp(diff)}</span></header>
        <div class="objective-track"><i style="width:${Math.min(index*100,100)}%;background:${colors[m]}"></i></div>
        <div class="objective-meta"><span>Real ${pct(real)}</span><span>Objetivo ${pct(target)}</span></div><p class="row-comment">${note}</p></button>`;
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
    const period=state.role==='alicia'?currentPeriodKey:state.period;
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
    const period=state.role==='alicia'?currentPeriodKey:state.period;
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
    const h2Eligible=sum(semesterRows(currentYear).filter(r=>participants.has(r.fabricante)));
    $('directionPeriod').textContent=periodLabel();
    $('dirSales').textContent=fmt(sales);
    $('dirSalesNote').textContent=periodLabel();
    $('dirGrowth').textContent=growth===null?'—':pct(growth);
    $('dirGrowth').style.color=growth===null?'':growth>=0?'var(--green)':'var(--red)';
    $('dirGrowthNote').textContent=state.period==='year25'?'No existe 2024 en la base':`Contra periodo equivalente ${priorYear}`;
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
    const d25=monthly(priorYear), d26=monthly(currentYear), max=Math.max(...d25,...d26,1)*1.08;
    const x=i=>pad.l+i*((W-pad.l-pad.r)/11), y=v=>H-pad.b-(v/max)*(H-pad.t-pad.b);
    let html='';
    for(let i=0;i<5;i++){const val=max*i/4,yy=y(val);html+=`<line class="chart-grid" x1="${pad.l}" y1="${yy}" x2="${W-pad.r}" y2="${yy}"></line><text class="chart-label" x="${pad.l-9}" y="${yy+4}" text-anchor="end">${compact(val)}</text>`;}
    months.forEach((m,i)=>html+=`<text class="chart-label" x="${x(i)}" y="${H-15}" text-anchor="middle">${m.toUpperCase()}</text>`);
    [[d25,'#91aaa0',String(priorYear)],[d26,colors.CLARASOL,String(currentYear)]].forEach(([data,color,label])=>{
      const visible=data.map((v,i)=>({v,i})).filter(d=>d.v>0 || label===String(priorYear));
      html+=`<polyline class="chart-line" stroke="${color}" points="${visible.map(d=>`${x(d.i)},${y(d.v)}`).join(' ')}"></polyline>`;
      visible.forEach(d=>html+=`<circle class="chart-dot" cx="${x(d.i)}" cy="${y(d.v)}" r="5" fill="${color}"><title>${label} ${monthNames[months[d.i]]}: ${fmt(d.v)}</title></circle>`);
    });
    svg.innerHTML=html;
    $('chartLegend').innerHTML=`<span><i style="background:#91aaa0"></i>${priorYear}</span><span><i style="background:#b9f45c"></i>${currentYear}</span>`;
  }

  function renderDirectionInsights(){
    const jul26=currentMonthRows(currentYear), jul25=currentMonthRows(priorYear);
    const cat26=sum(jul26), cat25=sum(jul25), catProjection=cat26/goals.cutoff.day*goals.cutoff.daysInMonth;
    const eligible=sum(jul26.filter(r=>participants.has(r.fabricante))), eligibleProjection=eligible/goals.cutoff.day*goals.cutoff.daysInMonth;
    const clarasol=sum(jul26.filter(r=>r.fabricante==='CLARASOL')), clorox=sum(jul26.filter(r=>r.fabricante==='CLOROX')), valenciana=sum(jul26.filter(r=>r.fabricante==='VALENCIANA'));
    const eligMix=eligible?clarasol/eligible:0, total=cat26||1;
    const cards=[
      {cls:eligibleProjection>=goals.metaMensual?'good':'alert',title:'Proyección del concurso',text:`El ritmo actual proyecta ${fmt(eligibleProjection)} al cierre, ${eligibleProjection>=goals.metaMensual?'por arriba':'por debajo'} de la meta mensual de ${fmt(goals.metaMensual)}.`},
      {cls:eligMix>=.30?'good':'alert',title:'Clarasol aún no alcanza la participación objetivo',text:`Clarasol representa ${pct(eligMix)} de la venta del concurso; el objetivo es 30%. La brecha es ${pp(eligMix-.30)}.`},
      {cls:'good',title:'Clorox sostiene el volumen',text:`Clorox registra ${fmt(clorox)} y concentra ${pct(eligible?clorox/eligible:0)} de la mezcla del concurso. El crecimiento de Clarasol debe ser incremental, no sustitución de Clorox.`},
      {cls:'',title:'Valenciana sigue explicando categoría',text:`Valenciana aporta ${fmt(valenciana)}, equivalente a ${pct(valenciana/total)} de ${currentMonthLower}. Se mantiene visible, aunque no acredita la meta.`},
      {cls:catProjection>=cat25?'good':'alert',title:`Categoría vs ${currentMonthLower} ${priorYear}`,text:`La categoría proyecta ${fmt(catProjection)} frente a ${fmt(cat25)} de ${currentMonthLower} ${priorYear}: ${pct(cat25?catProjection/cat25-1:0)}.`}
    ];
    $('directionInsights').innerHTML=cards.map(c=>`<div class="insight-card ${c.cls}"><strong>${c.title}</strong><p>${c.text}</p></div>`).join('');
  }

  function renderManufacturerTable(){
    const makers=['ALEN','CLARASOL','CLOROX','VALENCIANA'];
    const jul26All=currentMonthRows(currentYear,{manufacturer:'TODOS'}), totalJul=sum(jul26All);
    $('manufacturerTableBody').innerHTML=makers.map(m=>{
      const full25=sum(records.filter(r=>r.anio===priorYear&&r.fabricante===m&&dimensionsMatch(r,{manufacturer:'TODOS'})));
      const ytd26=sum(records.filter(r=>r.anio===currentYear&&months.indexOf(r.mes)<=currentMonthIndex&&r.fabricante===m&&dimensionsMatch(r,{manufacturer:'TODOS'})));
      const j25=sum(currentMonthRows(priorYear,{manufacturer:'TODOS'}).filter(r=>r.fabricante===m));
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
    document.body.classList.add('drawer-open');
  }
  function closeDrawer(){
    $('detailDrawer').classList.remove('open');
    $('detailDrawer').setAttribute('aria-hidden','true');
    $('drawerBackdrop').classList.add('hidden');
    document.body.classList.remove('drawer-open');
  }

  function openMakerDetail(maker){
    const rows=currentMonthRows(currentYear,{manufacturer:maker});
    const prior=currentMonthRows(priorYear,{manufacturer:maker});
    const allRows=currentMonthRows(currentYear,{manufacturer:'TODOS'});
    const actual=sum(rows);
    const previous=sum(prior);
    const projected=actual/goals.cutoff.day*goals.cutoff.daysInMonth;
    const totalCategory=sum(allRows);
    const contestTotal=sum(allRows.filter(r=>participants.has(r.fabricante)));
    const target=participants.has(maker)?goals.metaMensualFabricante[maker]:null;
    const expected=target?target*dayRatio:null;
    const shareBase=participants.has(maker)?contestTotal:totalCategory;
    const share=shareBase?actual/shareBase:0;

    openDrawer(maker,`
      <div class="drawer-definition">${participants.has(maker)
        ? `Este detalle muestra la venta real del fabricante al ${cutoffDateLabel}, su meta y su proyección.`
        : 'Este detalle muestra la venta real de Valenciana dentro de la categoría. No tiene meta asignada.'}</div>
      <div class="drawer-hero">
        <span>Venta real al ${cutoffDateLabel}</span>
        <strong>${fmt(actual)}</strong>
        <small>${participants.has(maker)?`${pct(share)} de la venta del concurso`:`${pct(share)} de la categoría`}</small>
      </div>
      <div class="drawer-list">
        <div class="drawer-row"><span>Proyección al ${goals.cutoff.daysInMonth} de ${currentMonthLower}</span><strong>${fmt(projected)}</strong></div>
        <div class="drawer-row"><span>${priorMonthLabel}</span><strong>${fmt(previous)}</strong></div>
        <div class="drawer-row"><span>Variación proyectada vs ${priorMonthLabel}</span><strong>${previous?pct(projected/previous-1):'Sin base'}</strong></div>
        <div class="drawer-row"><span>Venta esperada al día ${goals.cutoff.day}</span><strong>${expected?fmt(expected):'No aplica'}</strong></div>
        <div class="drawer-row"><span>Cumplimiento al corte</span><strong>${expected?pct(actual/expected):'No aplica'}</strong></div>
      </div>
      <h3 class="drawer-section-title">Principales vendedores</h3>
      <div class="drawer-list">${breakdownRows(rows,'vendedor')}</div>
      <h3 class="drawer-section-title">Principales productos</h3>
      <div class="drawer-list">${breakdownRows(rows,'item')}</div>`);
  }

  function openSellerDetail(seller){
    const rows=currentMonthRows(currentYear,{seller});
    const prior=currentMonthRows(priorYear,{seller});
    const category=sum(rows);
    const contestRows=rows.filter(r=>participants.has(r.fabricante));
    const contestSales=sum(contestRows);
    const priorContest=sum(prior.filter(r=>participants.has(r.fabricante)));
    const clarasol=sum(rows.filter(r=>r.fabricante==='CLARASOL'));
    const dailyChange=priorContest
      ? (contestSales/goals.cutoff.day)/(priorContest/goals.cutoff.daysInMonth)-1
      : null;

    openDrawer(shortSeller(seller),`
      <div class="drawer-definition">La cifra principal es la venta real del vendedor en Alen, Clarasol y Clorox al ${cutoffDateLabel}.</div>
      <div class="drawer-hero">
        <span>Venta del concurso al ${cutoffDateLabel}</span>
        <strong>${fmt(contestSales)}</strong>
        <small>Alen + Clarasol + Clorox</small>
      </div>
      <div class="drawer-list">
        <div class="drawer-row"><span>Venta total de la categoría</span><strong>${fmt(category)}</strong></div>
        <div class="drawer-row"><span>Ritmo diario vs ${priorMonthLabel}</span><strong>${dailyChange===null?'Sin base':pct(dailyChange)}</strong></div>
        <div class="drawer-row"><span>Participación de Clarasol</span><strong>${pct(contestSales?clarasol/contestSales:0)} · objetivo 30%</strong></div>
      </div>
      <h3 class="drawer-section-title">Distribución real por fabricante</h3>
      <div class="drawer-list">${breakdownRows(rows,'fabricante')}</div>
      <h3 class="drawer-section-title">Productos principales</h3>
      <div class="drawer-list">${breakdownRows(rows,'item')}</div>
      <button type="button" class="drawer-action" id="filterDrawerSeller">Filtrar toda la app por este vendedor</button>`);
    setTimeout(()=>{const b=$('filterDrawerSeller');if(b)b.onclick=()=>{state.seller=seller;$('sellerFilter').value=seller;closeDrawer();renderAll();};},0);
  }

  function openProductDetail(item){
    const rows=currentMonthRows(currentYear,{product:item}), prior=currentMonthRows(priorYear,{product:item});
    const actual=sum(rows), previous=sum(prior), maker=rows[0]?.fabricante||prior[0]?.fabricante||'';
    openDrawer(shortProduct(item),`<div class="drawer-hero"><span>${maker} · venta ${currentMonthLower} al corte</span><strong>${fmt(actual)}</strong></div>
      <div class="drawer-list"><div class="drawer-row"><span>${priorMonthLabel}</span><strong>${fmt(previous)}</strong></div><div class="drawer-row"><span>Proyección de cierre</span><strong>${fmt(actual/goals.cutoff.day*goals.cutoff.daysInMonth)}</strong></div><div class="drawer-row"><span>Unidades</span><strong>${number(sum(rows,'cantidad'))}</strong></div></div>
      <p class="drawer-note">Vendedores que lo mueven</p><div class="drawer-list">${breakdownRows(rows,'vendedor')}</div>
      <button type="button" class="drawer-action" id="filterDrawerProduct">Filtrar toda la app por este producto</button>`);
    setTimeout(()=>{const b=$('filterDrawerProduct');if(b)b.onclick=()=>{state.product=item;$('productFilter').value=item;closeDrawer();renderAll();};},0);
  }

  function openGenericDetail(type){
    const rows=currentMonthRows(currentYear);
    const totalCategory=sum(rows);
    const contestRows=rows.filter(r=>participants.has(r.fabricante));
    const contestSales=sum(contestRows);
    const target=targetContext();
    const currentDaily=contestSales/goals.cutoff.day;
    const projectedClose=currentDaily*goals.cutoff.daysInMonth;
    const requiredDaily=target.target===null?0:Math.max(target.target-contestSales,0)/Math.max(daysRemaining,1);

    const actualByMaker = ['ALEN','CLARASOL','CLOROX','VALENCIANA'].map(m=>({
      maker:m,
      value:sum(rows.filter(r=>r.fabricante===m))
    }));

    const makerActualRows = (list, denominator) => list
      .filter(x=>x.value>0)
      .map(x=>`<div class="drawer-row"><span>${x.maker}</span><strong>${fmt(x.value)} · ${pct(denominator?x.value/denominator:0)}</strong></div>`)
      .join('');

    if(type==='category'){
      openDrawer('Venta total de la categoría',`
        <div class="drawer-definition">Es la venta real acumulada al ${cutoffDateLabel} e incluye Alen, Clarasol, Clorox y Valenciana.</div>
        <div class="drawer-hero"><span>Venta real al corte</span><strong>${fmt(totalCategory)}</strong><small>No es una proyección</small></div>
        <h3 class="drawer-section-title">Distribución real por fabricante</h3>
        <div class="drawer-list">${makerActualRows(actualByMaker,totalCategory)}</div>
        <h3 class="drawer-section-title">Principales vendedores</h3>
        <div class="drawer-list">${breakdownRows(rows,'vendedor')}</div>`);
      return;
    }

    if(type==='eligible'){
      const contestMakers=actualByMaker.filter(x=>participants.has(x.maker));
      openDrawer(`Venta del concurso al ${cutoffDateLabel}`,`
        <div class="drawer-definition">Es la venta real de Alen, Clarasol y Clorox. Valenciana aparece en la categoría, pero no suma a esta meta.</div>
        <div class="drawer-hero"><span>Venta real al corte</span><strong>${fmt(contestSales)}</strong><small>${pct(totalCategory?contestSales/totalCategory:0)} de la categoría</small></div>
        <h3 class="drawer-section-title">Distribución real de la venta del concurso</h3>
        <div class="drawer-list">${makerActualRows(contestMakers,contestSales)}</div>
        <h3 class="drawer-section-title">Principales vendedores</h3>
        <div class="drawer-list">${breakdownRows(contestRows,'vendedor')}</div>`);
      return;
    }

    if(type==='expected'){
      const expectedRows=goals.participantes.map(m=>{
        const expected=goals.metaMensualFabricante[m]*dayRatio;
        const actual=sum(rows.filter(r=>r.fabricante===m));
        return `<div class="drawer-comparison">
          <div><strong>${m}</strong><small>Esperado ${fmt(expected)}</small></div>
          <div><span>Real ${fmt(actual)}</span><b class="${actual>=expected?'ok':'bad'}">${pct(expected?actual/expected:0)}</b></div>
        </div>`;
      }).join('');
      openDrawer(`Venta esperada al ${cutoffDateLabel}`,`
        <div class="drawer-definition">Es la parte de la meta mensual que debería estar vendida después de ${goals.cutoff.day} de los ${goals.cutoff.daysInMonth} días de ${currentMonthLower}.</div>
        <div class="drawer-hero"><span>Meta proporcional al corte</span><strong>${target.expected===null?'No aplica':fmt(target.expected)}</strong><small>Venta real: ${fmt(contestSales)}</small></div>
        <h3 class="drawer-section-title">Esperado vs real por fabricante</h3>
        <div class="drawer-comparison-list">${expectedRows}</div>`);
      return;
    }

    if(type==='daily'){
      const dailyRows=goals.participantes.map(m=>{
        const actual=sum(rows.filter(r=>r.fabricante===m));
        const remaining=Math.max(goals.metaMensualFabricante[m]-actual,0);
        const perDay=remaining/Math.max(daysRemaining,1);
        return `<div class="drawer-row"><span>${m}</span><strong>${fmt(perDay)} diarios</strong></div>`;
      }).join('');
      openDrawer('Venta diaria necesaria',`
        <div class="drawer-definition">Es el promedio que debe venderse cada día del ${nextDay} al ${goals.cutoff.daysInMonth} de ${currentMonthLower} para completar la meta mensual.</div>
        <div class="drawer-hero"><span>Necesario por día</span><strong>${target.target===null?'No aplica':fmt(requiredDaily)}</strong><small>Quedan ${daysRemaining} días</small></div>
        <div class="drawer-list">
          <div class="drawer-row"><span>Ritmo diario actual</span><strong>${fmt(currentDaily)}</strong></div>
          <div class="drawer-row"><span>Venta pendiente del mes</span><strong>${target.target===null?'No aplica':fmt(Math.max(target.target-contestSales,0))}</strong></div>
        </div>
        <h3 class="drawer-section-title">Necesario por fabricante</h3>
        <div class="drawer-list">${dailyRows}</div>`);
      return;
    }

    if(type==='projection'){
      const projectionRows=goals.participantes.map(m=>{
        const actual=sum(rows.filter(r=>r.fabricante===m));
        const projection=actual/goals.cutoff.day*goals.cutoff.daysInMonth;
        return `<div class="drawer-row"><span>${m}</span><strong>${fmt(projection)}</strong></div>`;
      }).join('');
      openDrawer(`Proyección de cierre al ${goals.cutoff.daysInMonth} de ${currentMonthLower}`,`
        <div class="drawer-definition">Es una estimación, no la venta actual. Se calcula manteniendo el promedio diario observado al ${cutoffDateLabel}.</div>
        <div class="drawer-hero"><span>Cierre estimado</span><strong>${fmt(projectedClose)}</strong><small>Venta real al corte: ${fmt(contestSales)}</small></div>
        <div class="drawer-list">
          <div class="drawer-row"><span>Promedio diario actual</span><strong>${fmt(currentDaily)}</strong></div>
          <div class="drawer-row"><span>Meta mensual</span><strong>${target.target===null?'No aplica':fmt(target.target)}</strong></div>
          <div class="drawer-row"><span>Proyección vs meta</span><strong>${target.target===null?'No aplica':pct(projectedClose/target.target)}</strong></div>
        </div>
        <h3 class="drawer-section-title">Proyección por fabricante</h3>
        <div class="drawer-list">${projectionRows}</div>`);
      return;
    }

    if(type==='valenciana'){
      const val=sum(rows.filter(r=>r.fabricante==='VALENCIANA'));
      openDrawer('Participación de Valenciana',`
        <div class="drawer-definition">Valenciana se incluye para mostrar la categoría completa, pero no tiene meta dentro del concurso.</div>
        <div class="drawer-hero"><span>Peso dentro de la categoría</span><strong>${pct(totalCategory?val/totalCategory:0)}</strong><small>Venta real ${fmt(val)}</small></div>
        <h3 class="drawer-section-title">Principales vendedores</h3>
        <div class="drawer-list">${breakdownRows(rows.filter(r=>r.fabricante==='VALENCIANA'),'vendedor')}</div>`);
      return;
    }

    if(type==='mixgap'){
      const clarasol=sum(rows.filter(r=>r.fabricante==='CLARASOL'));
      const realShare=contestSales?clarasol/contestSales:0;
      openDrawer('Participación de Clarasol',`
        <div class="drawer-definition">La participación se calcula únicamente dentro de Alen, Clarasol y Clorox.</div>
        <div class="drawer-hero"><span>Participación actual</span><strong>${pct(realShare)}</strong><small>Objetivo 30%</small></div>
        <div class="drawer-list">
          <div class="drawer-row"><span>Diferencia contra objetivo</span><strong>${pp(realShare-.30)}</strong></div>
          <div class="drawer-row"><span>Venta Clarasol</span><strong>${fmt(clarasol)}</strong></div>
          <div class="drawer-row"><span>Venta total del concurso</span><strong>${fmt(contestSales)}</strong></div>
        </div>`);
      return;
    }

    if(type==='growth'){
      const cur=periodRows(state.period), prev=comparableRows(state.period), growth=sum(prev)?sum(cur)/sum(prev)-1:null;
      openDrawer(`Variación contra ${priorYear}`,`
        <div class="drawer-definition">Compara la venta del periodo seleccionado contra el mismo periodo de ${priorYear}.</div>
        <div class="drawer-hero"><span>${periodLabel()}</span><strong>${growth===null?'Sin base':pct(growth)}</strong></div>`);
      return;
    }

    if(type==='semester'){
      const semesterContestSales=sum(semesterRows(currentYear).filter(r=>participants.has(r.fabricante)));
      openDrawer('Avance de la meta julio–diciembre',`
        <div class="drawer-definition">La meta semestral es fija y el avance acumula la venta del concurso desde julio hasta ${currentMonthLower} al corte.</div>
        <div class="drawer-hero"><span>Avance actual</span><strong>${pct(semesterContestSales/goals.metaSemestre)}</strong><small>${fmt(semesterContestSales)} de ${fmt(goals.metaSemestre)}</small></div>`);
      return;
    }

    if(type==='units'){
      openDrawer('Unidades vendidas',`
        <div class="drawer-definition">Cantidad real vendida con los filtros seleccionados.</div>
        <div class="drawer-hero"><span>Unidades al corte</span><strong>${number(sum(rows,'cantidad'))}</strong><small>Venta ${fmt(totalCategory)}</small></div>`);
      return;
    }

    openGenericDetail('category');
  }

  function showSection(section){
    if(section==='direction' && state.role!=='direccion') section='pressure';
    state.section=section;
    document.querySelectorAll('.app-section').forEach(x=>x.classList.remove('active-section'));
    $(`${section}Section`)?.classList.add('active-section');
    document.querySelectorAll('[data-section]').forEach(x=>x.classList.toggle('active',x.dataset.section===section));
    const headers={
      pressure:['RESULTADOS AL CORTE',`Resumen comercial al ${cutoffDateLabel}`,'Venta real, venta esperada, proyección y seguimiento por fabricante.'],
      mix:['PARTICIPACIÓN POR FABRICANTE','Distribución de la venta','Venta y peso de cada fabricante dentro de la categoría.'],
      team:['RESULTADOS POR VENDEDOR','Venta y participación del equipo','Resultado al corte por vendedor y participación de Clarasol.'],
      products:['RESULTADOS POR PRODUCTO','Venta del portafolio',`Productos con mayor venta y variación contra ${priorMonthLabel}.`],
      direction:['ANÁLISIS GENERAL','Histórico, metas y tendencia',`Comparativos ${priorYear}–${currentYear} y detalle por fabricante.`]
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
    state.period=currentPeriodKey;showSection('pressure');renderAll();
  }

  function logout(){
    state.role=null;state.user=null;document.body.removeAttribute('data-role');$('appView').classList.add('hidden');$('loginView').classList.remove('hidden');$('passInput').value='';$('loginError').textContent='';
  }

  function resetFilters(){
    state.period=currentPeriodKey;state.manufacturer='TODOS';state.group='TODOS';state.seller='TODOS';state.product='TODOS';
    $('periodFilter').value=currentPeriodKey;$('manufacturerFilter').value='TODOS';$('groupFilter').value='TODOS';$('sellerFilter').value='TODOS';$('productFilter').value='TODOS';renderAll();
  }

  function downloadCSV(){
    const rows=periodRows(state.period);
    const headers=['Categoria','Fabricante','GrupoTienda','Producto','Grupo','Vendedor','Año','Mes','Venta SubTotal','Venta Cantidad'];
    const lines=[headers.join(',')].concat(rows.map(r=>[r.categoria,r.fabricante,r.grupoTienda,r.item,r.grupo,r.vendedor,r.anio,r.mes,r.venta,r.cantidad].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')));
    const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='vista_clarasol_'+state.period+'.csv';a.click();URL.revokeObjectURL(url);
  }

  applyDynamicCopy();
  initializeFilters();
  $('loginBtn').addEventListener('click',login);$('passInput').addEventListener('keydown',e=>{if(e.key==='Enter')login();});$('logoutBtn').addEventListener('click',logout);
  $('resetBtn').addEventListener('click',resetFilters);$('closeDrawer').addEventListener('click',closeDrawer);$('drawerBackdrop').addEventListener('click',closeDrawer);
  $('showAllSellers').addEventListener('click',()=>showSection('team'));$('downloadCsvBtn').addEventListener('click',downloadCSV);
  document.querySelectorAll('[data-section]').forEach(btn=>btn.addEventListener('click',()=>showSection(btn.dataset.section)));
  [['periodFilter','period'],['manufacturerFilter','manufacturer'],['groupFilter','group'],['sellerFilter','seller'],['productFilter','product']].forEach(([id,key])=>$(id).addEventListener('change',e=>{state[key]=e.target.value;renderAll();}));
  document.querySelectorAll('[data-detail]').forEach(el=>el.addEventListener('click',()=>openGenericDetail(el.dataset.detail)));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer();});
})();
