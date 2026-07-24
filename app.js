
(() => {
  const {records, goals} = window.APP_DATA;
  const $ = id => document.getElementById(id);
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  const monthNames = {ene:"Enero",feb:"Febrero",mar:"Marzo",abr:"Abril",may:"Mayo",jun:"Junio",jul:"Julio",ago:"Agosto",sep:"Septiembre",oct:"Octubre",nov:"Noviembre",dic:"Diciembre"};
  const colors = {ALEN:"#63b3ff",CLARASOL:"#b9f45c",CLOROX:"#62d69a",VALENCIANA:"#ffc861"};
  const fmt = n => new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(n || 0);
  const compact = n => new Intl.NumberFormat("es-MX",{notation:"compact",maximumFractionDigits:1}).format(n || 0);
  const pct = n => new Intl.NumberFormat("es-MX",{style:"percent",maximumFractionDigits:1}).format(n || 0);
  const sum = (arr,key) => arr.reduce((a,r)=>a+(+r[key]||0),0);
  const shortSeller = s => (s || "").replace(/^VF\d+\s*-\s*/,"").replace(/\s+/g," ").trim();

  const state = {month:"jul", manufacturer:"TODOS", group:"TODOS", seller:"TODOS"};

  function unique(key){ return [...new Set(records.map(r=>r[key]).filter(Boolean))].sort(); }
  function optionList(values, allLabel){ return `<option value="TODOS">${allLabel}</option>` + values.map(v=>`<option value="${v}">${v}</option>`).join(""); }

  $("monthFilter").innerHTML = months.filter(m=>records.some(r=>r.mes===m)).map(m=>`<option value="${m}" ${m==="jul"?"selected":""}>${monthNames[m]}</option>`).join("");
  $("manufacturerFilter").innerHTML = optionList(unique("fabricante"),"Todos");
  $("groupFilter").innerHTML = optionList(unique("grupo"),"Todos");
  $("sellerFilter").innerHTML = optionList(unique("vendedor").map(v=>v),"Todos");

  function filterRows(extra={}){
    const s={...state,...extra};
    return records.filter(r =>
      (!s.month || r.mes===s.month) &&
      (s.manufacturer==="TODOS" || r.fabricante===s.manufacturer) &&
      (s.group==="TODOS" || r.grupo===s.group) &&
      (s.seller==="TODOS" || r.vendedor===s.seller)
    );
  }

  function allSelectedMonths(){
    const idx=months.indexOf(state.month);
    return records.filter(r=>months.indexOf(r.mes)<=idx &&
      (state.manufacturer==="TODOS" || r.fabricante===state.manufacturer) &&
      (state.group==="TODOS" || r.grupo===state.group) &&
      (state.seller==="TODOS" || r.vendedor===state.seller));
  }

  function render(){
    const selected=filterRows();
    const total=sum(selected,"venta");
    const units=sum(selected,"cantidad");
    const participants=selected.filter(r=>goals.participantes.includes(r.fabricante));
    const eligible=sum(participants,"venta");
    const ratio=total/goals.metaMensual;
    const eligibleRatio=total ? eligible/total : 0;
    const ytdRows=allSelectedMonths().filter(r=>goals.participantes.includes(r.fabricante));
    const ytdEligible=sum(ytdRows,"venta");
    const semProgress=ytdEligible/goals.metaSemestre;
    const gap=Math.max(goals.metaSemestre-ytdEligible,0);

    $("cutLabel").textContent=`Corte ${monthNames[state.month]} 2026`;
    $("totalSales").textContent=fmt(total);
    $("eligibleSales").textContent=fmt(eligible);
    $("eligibleShare").textContent=`${pct(eligibleRatio)} de la categoría`;
    $("unitsSold").textContent=new Intl.NumberFormat("es-MX").format(units);
    $("ticketAverage").textContent=`Precio medio ${fmt(units ? total/units : 0)}`;
    $("goalDelta").textContent=pct(ratio-1);
    $("goalMessage").textContent=`Meta mensual ${fmt(goals.metaMensual)}`;
    $("goalProgress").style.width=`${Math.min(ratio*100,100)}%`;
    $("eligibleProgress").style.width=`${Math.min(eligibleRatio*100,100)}%`;
    $("heroSales").textContent=fmt(total);
    $("objectiveTag").textContent=`Meta ${fmt(goals.metaMensual)}`;
    $("gaugeValue").textContent=pct(ratio);
    $("goalGauge").style.setProperty("--p",`${Math.min(ratio,1)*180}deg`);
    $("semesterGoal").textContent=fmt(goals.metaSemestre);
    $("semesterProgress").textContent=pct(semProgress);
    $("semesterGap").textContent=fmt(gap);

    const status=$("goalStatus");
    status.className="status-pill " + (ratio>=1?"good":ratio>=.75?"warn":"bad");
    status.textContent=ratio>=1?"Meta mensual superada":ratio>=.75?"Meta en recuperación":"Brecha relevante";

    const topFab=aggregate(selected,"fabricante")[0];
    const outside=sum(selected.filter(r=>goals.fueraConcurso.includes(r.fabricante)),"venta");
    let insight;
    if(!total) insight="No hay venta con la combinación seleccionada. Conviene revisar el filtro antes de declarar una tragedia comercial.";
    else if(ratio>=1) insight=`La categoría supera el objetivo mensual por ${fmt(total-goals.metaMensual)}. ${topFab ? topFab.key+" lidera con "+pct(topFab.value/total)+" de participación." : ""}`;
    else insight=`La categoría presenta una brecha de ${fmt(goals.metaMensual-total)} contra la meta mensual. ${topFab ? topFab.key+" concentra "+pct(topFab.value/total)+" de la venta." : ""}`;
    if(outside>0) insight += ` Valenciana aporta ${fmt(outside)} como venta de categoría, aunque permanece fuera del concurso.`;
    $("executiveInsight").textContent=insight;
    $("salesContext").textContent=state.manufacturer==="TODOS" ? "Venta SubTotal de todos los fabricantes" : `Venta SubTotal de ${state.manufacturer}`;

    renderSpark();
    renderManufacturers(selected,total);
    renderObjectives();
    renderTrend();
    renderSellers(selected);
  }

  function aggregate(rows,key){
    const m=new Map();
    rows.forEach(r=>m.set(r[key],(m.get(r[key])||0)+r.venta));
    return [...m.entries()].map(([key,value])=>({key,value})).sort((a,b)=>b.value-a.value);
  }

  function renderSpark(){
    const values=months.map(m=>sum(records.filter(r=>r.mes===m),"cantidad"));
    const max=Math.max(...values,1);
    $("unitsSpark").innerHTML=values.map(v=>`<i style="height:${Math.max(3,v/max*26)}px"></i>`).join("");
  }

  function renderManufacturers(rows,total){
    const ag=aggregate(rows,"fabricante");
    $("manufacturerCards").innerHTML=ag.map(x=>{
      const outside=goals.fueraConcurso.includes(x.key);
      return `<div class="manufacturer-item">
        <div class="manu-icon" style="background:${colors[x.key]||"#fff"}">${x.key.slice(0,2)}</div>
        <div><strong>${x.key}</strong><small>${outside?"Fuera del concurso":"Fabricante participante"}</small></div>
        <div class="manu-value"><strong>${fmt(x.value)}</strong><small>${pct(total?x.value/total:0)} share</small></div>
      </div>`;
    }).join("") || `<p class="footnote">Sin datos para los filtros seleccionados.</p>`;
  }

  function renderObjectives(){
    const cumulative=allSelectedMonths();
    $("objectiveList").innerHTML=goals.participantes.map(f=>{
      const actual=sum(cumulative.filter(r=>r.fabricante===f),"venta");
      const target=goals.metaFabricante[f];
      const p=target?actual/target:0;
      return `<div class="objective-row">
        <header><strong>${f}</strong><span>${pct(p)}</span></header>
        <div class="objective-track"><i style="width:${Math.min(p*100,100)}%;background:${colors[f]}"></i></div>
        <div class="objective-meta"><span>${fmt(actual)} vendido</span><span>Meta ${fmt(target)}</span></div>
      </div>`;
    }).join("");
  }

  function renderTrend(){
    const svg=$("trendChart");
    const W=820,H=330,pad={l:55,r:20,t:20,b:42};
    const series=["ALEN","CLARASOL","CLOROX","VALENCIANA"];
    const data=series.map(f=>({f,values:months.slice(0,7).map(m=>sum(records.filter(r=>r.fabricante===f&&r.mes===m),"venta"))}));
    const max=Math.max(...data.flatMap(s=>s.values),1)*1.08;
    const x=i=>pad.l+i*((W-pad.l-pad.r)/6);
    const y=v=>H-pad.b-(v/max)*(H-pad.t-pad.b);
    let html="";
    for(let i=0;i<5;i++){
      const val=max*(i/4), yy=y(val);
      html+=`<line class="chart-grid" x1="${pad.l}" y1="${yy}" x2="${W-pad.r}" y2="${yy}"></line>`;
      html+=`<text class="chart-label" x="${pad.l-10}" y="${yy+4}" text-anchor="end">${compact(val)}</text>`;
    }
    months.slice(0,7).forEach((m,i)=>html+=`<text class="chart-label" x="${x(i)}" y="${H-15}" text-anchor="middle">${m.toUpperCase()}</text>`);
    data.forEach(s=>{
      const pts=s.values.map((v,i)=>`${x(i)},${y(v)}`).join(" ");
      html+=`<polyline class="chart-line" stroke="${colors[s.f]}" points="${pts}"></polyline>`;
      s.values.forEach((v,i)=>html+=`<circle class="chart-dot" cx="${x(i)}" cy="${y(v)}" r="5" fill="${colors[s.f]}"><title>${s.f} ${monthNames[months[i]]}: ${fmt(v)}</title></circle>`);
    });
    svg.innerHTML=html;
    $("chartLegend").innerHTML=series.map(f=>`<span class="legend-item"><i style="background:${colors[f]}"></i>${f}</span>`).join("");
  }

  function renderSellers(rows){
    const ag=aggregate(rows,"vendedor");
    $("sellerCount").textContent=`${ag.length} vendedores`;
    const top=ag.slice(0,3);
    const podiumOrder=[top[1],top[0],top[2]].filter(Boolean);
    $("sellerPodium").innerHTML=podiumOrder.map((x,i)=>{
      const rank=i===1?1:i===0?2:3;
      return `<div class="podium-card"><span class="podium-rank">${rank}</span><strong>${shortSeller(x.key)}</strong><small>${fmt(x.value)}</small></div>`;
    }).join("");
    const max=ag[0]?.value||1;
    $("sellerRanking").innerHTML=ag.slice(0,10).map((x,i)=>`<div class="seller-row">
      <span class="seller-rank">${String(i+1).padStart(2,"0")}</span>
      <strong class="seller-name" title="${x.key}">${shortSeller(x.key)}</strong>
      <div class="seller-bar"><i style="width:${x.value/max*100}%"></i></div>
      <span class="seller-value">${fmt(x.value)}</span>
    </div>`).join("") || `<p class="footnote">Sin vendedores para los filtros seleccionados.</p>`;
  }

  function login(){
    const ok=$("userInput").value.trim().toLowerCase()==="ventas" && $("passInput").value==="ventas26";
    if(!ok){$("loginError").textContent="Usuario o contraseña incorrectos.";return;}
    $("loginView").classList.add("is-hidden");
    $("appView").classList.remove("is-hidden");
    render();
  }

  $("loginBtn").addEventListener("click",login);
  $("passInput").addEventListener("keydown",e=>{if(e.key==="Enter")login();});
  $("logoutBtn").addEventListener("click",()=>{ $("appView").classList.add("is-hidden"); $("loginView").classList.remove("is-hidden"); $("passInput").value=""; });
  [["monthFilter","month"],["manufacturerFilter","manufacturer"],["groupFilter","group"],["sellerFilter","seller"]].forEach(([id,key])=>{
    $(id).addEventListener("change",e=>{state[key]=e.target.value;render();});
  });
  $("resetBtn").addEventListener("click",()=>{
    state.month="jul";state.manufacturer="TODOS";state.group="TODOS";state.seller="TODOS";
    $("monthFilter").value="jul";$("manufacturerFilter").value="TODOS";$("groupFilter").value="TODOS";$("sellerFilter").value="TODOS";render();
  });
  document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>{
    document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.scroll)?.scrollIntoView({behavior:"smooth",block:"start"});
  }));
})();
