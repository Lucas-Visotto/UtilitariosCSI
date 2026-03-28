/* ── CURVA DE CARGA EDITÁVEL ── */
var CURVA_BASE = [0.32, 0.25, 0.20, 0.18, 0.19, 0.22, 0.30, 0.42, 0.52, 0.55, 0.56, 0.54, 0.52, 0.50, 0.51, 0.53, 0.58, 0.65, 0.78, 1.00, 0.95, 0.82, 0.65, 0.48];
var CURVA = CURVA_BASE.slice();

/* Editor canvas state */
var CE = {
  canvas: null, ctx: null,
  W: 0, H: 0,
  dragging: -1,
  pad: { l: 8, r: 42, t: 26, b: 22 }
};

function ceInit() {
  var c = document.getElementById("curvaEditor");
  if (!c) return;
  CE.canvas = c;
  CE.ctx = c.getContext("2d");
  ceResize();
  ceRender();

  /* Mouse events */
  c.addEventListener("mousedown", function (e) {
    var pt = ceEvtPt(e);
    CE.dragging = ceHitTest(pt.x, pt.y);
    if (CE.dragging === -1) { CE.dragging = ceClosest(pt.x); }
    ceDrag(pt.x, pt.y);
  });
  window.addEventListener("mousemove", function (e) {
    if (CE.dragging < 0) return;
    var pt = ceEvtPt(e);
    ceDrag(pt.x, pt.y);
  });
  window.addEventListener("mouseup", function () {
    if (CE.dragging >= 0) { CE.dragging = -1; if (INTERLIG_VERIFICADO) calcular(); }
  });

  /* Touch events */
  c.addEventListener("touchstart", function (e) {
    e.preventDefault();
    var pt = ceEvtPt(e.touches[0]);
    CE.dragging = ceHitTest(pt.x, pt.y);
    if (CE.dragging === -1) { CE.dragging = ceClosest(pt.x); }
    ceDrag(pt.x, pt.y);
  }, { passive: false });
  window.addEventListener("touchmove", function (e) {
    if (CE.dragging < 0) return;
    e.preventDefault();
    var pt = ceEvtPt(e.touches[0]);
    ceDrag(pt.x, pt.y);
  }, { passive: false });
  window.addEventListener("touchend", function () {
    if (CE.dragging >= 0) { CE.dragging = -1; if (INTERLIG_VERIFICADO) calcular(); }
  });

  window.addEventListener("resize", function () { ceResize(); ceRender(); });
}

function ceResize() {
  var c = CE.canvas;
  var dpr = window.devicePixelRatio || 1;
  var cssW = c.offsetWidth || 800;
  var cssH = Math.max(185, Math.round(cssW * 0.30));
  c.width = cssW * dpr; c.height = cssH * dpr;
  c.style.height = cssH + "px";
  CE.W = cssW; CE.H = cssH;
  CE.ctx.scale(dpr, dpr);
}

function ceX(h) { return CE.pad.l + (h / 23) * (CE.W - CE.pad.l - CE.pad.r); }
function ceY(v) { return CE.pad.t + (1 - v) * (CE.H - CE.pad.t - CE.pad.b); }
function ceVfromY(y) { return Math.max(0.05, Math.min(1, 1 - (y - CE.pad.t) / (CE.H - CE.pad.t - CE.pad.b))); }
function ceHfromX(x) { return Math.round(Math.max(0, Math.min(23, (x - CE.pad.l) / (CE.W - CE.pad.l - CE.pad.r) * 23))); }

function ceEvtPt(e) {
  var r = CE.canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
function ceHitTest(x, y) {
  for (var h = 0; h < 24; h++) {
    var dx = x - ceX(h), dy = y - ceY(CURVA[h]);
    if (Math.sqrt(dx * dx + dy * dy) < 14) return h;
  }
  return -1;
}
function ceClosest(x) {
  return Math.round(Math.max(0, Math.min(23, (x - CE.pad.l) / (CE.W - CE.pad.l - CE.pad.r) * 23)));
}
function ceDrag(x, y) {
  if (CE.dragging < 0) return;
  CURVA[CE.dragging] = ceVfromY(y);
  ceRender();
  ceUpdateInfo();
  if (INTERLIG_VERIFICADO) calcular();
}

/* ceUpdateInfo — versão completa com faixa de pico */
function ceUpdateInfo() {
  var maxV = Math.max.apply(null, CURVA);
  /* Encontra intervalo de pico: horas com valor >= 90% do máximo */
  var LIMIAR = 0.90;
  var picoHoras = [];
  for (var h = 0; h < 24; h++) { if (CURVA[h] >= maxV * LIMIAR) picoHoras.push(h); }
  var picoStart = picoHoras[0], picoEnd = picoHoras[picoHoras.length - 1];
  var picoStr = picoStart === picoEnd ? picoStart + "h" : picoStart + "h–" + (picoEnd + 1) + "h";
  var el1 = document.getElementById("curva-pico-hora");
  var el2 = document.getElementById("curva-pico-pct");
  if (el1) el1.textContent = picoStr;
  if (el2) el2.textContent = Math.round(maxV * 100) + "%";
}

function ceRender() {
  var ctx = CE.ctx, W = CE.W, H = CE.H;
  var dark = DARK;

  /* ── Verde original da UI — melhor contraste no dark, consistente com a paleta ── */
  var acc = dark ? "#00e5b8" : "#007a60";
  var accRgb = dark ? "0,229,184" : "0,122,96";
  var accFill = dark ? "rgba(0,229,184,0.10)" : "rgba(0,122,96,0.08)";
  var barFill = dark ? "rgba(0,229,184,0.18)" : "rgba(0,122,96,0.15)";
  var barPico = dark ? "rgba(0,229,184,0.40)" : "rgba(0,122,96,0.32)";
  var gridC = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)";
  var gridStrong = dark ? "rgba(56,189,248,0.20)" : "rgba(2,132,199,0.18)";
  var labelHr = dark ? "rgba(200,220,240,1)" : "rgba(30,60,100,1)";    /* horários — bem visíveis */
  var labelPct = dark ? "rgba(160,190,215,1)" : "rgba(50,85,130,1)";   /* percentuais */
  var dotBg = dark ? "#131b27" : "#dde5f0";

  /* Pico range (>= 90% do max) */
  var maxV = Math.max.apply(null, CURVA);
  var LIMIAR = 0.90;

  ctx.clearRect(0, 0, W, H);

  /* ── Barras verticais por hora ── */
  var barW = Math.max(2, (ceX(1) - ceX(0)) * 0.55);
  for (var hb = 0; hb < 24; hb++) {
    var bx = ceX(hb);
    var byTop = ceY(CURVA[hb]);
    var byBot = ceY(0);
    var isPicoBar = CURVA[hb] >= maxV * LIMIAR;
    ctx.save();
    ctx.fillStyle = isPicoBar ? barPico : barFill;
    ctx.beginPath();
    ctx.roundRect(bx - barW / 2, byTop, barW, byBot - byTop, [3, 3, 0, 0]);
    ctx.fill();
    ctx.restore();
  }

  /* ── Grid horizontal 25/50/75/100% ── */
  [0.25, 0.5, 0.75, 1.0].forEach(function (v) {
    var y = ceY(v);
    var isTop = (v === 1.0);
    ctx.save();
    ctx.strokeStyle = isTop ? gridStrong : gridC;
    ctx.lineWidth = isTop ? 1 : 1;
    ctx.setLineDash(isTop ? [5, 4] : [3, 6]);
    ctx.beginPath(); ctx.moveTo(CE.pad.l, y); ctx.lineTo(W - CE.pad.r, y); ctx.stroke();
    ctx.setLineDash([]);
    /* Label % — à direita, bem legível */
    ctx.fillStyle = isTop ? acc : labelPct;
    ctx.font = (isTop ? "bold " : "") + "9px monospace";
    ctx.textAlign = "right";
    ctx.fillText(Math.round(v * 100) + "%", W - CE.pad.r + 1, y - 2);
    ctx.restore();
  });

  /* ── Grid vertical 6h/12h/18h ── */
  [6, 12, 18].forEach(function (hv) {
    ctx.save();
    ctx.strokeStyle = gridC; ctx.lineWidth = 1; ctx.setLineDash([2, 6]);
    ctx.beginPath(); ctx.moveTo(ceX(hv), CE.pad.t); ctx.lineTo(ceX(hv), H - CE.pad.b); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
  });

  /* ── Área preenchida (sobre as barras) ── */
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ceX(0), ceY(CURVA[0]));
  for (var ha = 1; ha < 24; ha++) {
    var xm = (ceX(ha - 1) + ceX(ha)) / 2;
    ctx.bezierCurveTo(xm, ceY(CURVA[ha - 1]), xm, ceY(CURVA[ha]), ceX(ha), ceY(CURVA[ha]));
  }
  ctx.lineTo(ceX(23), ceY(0));
  ctx.lineTo(ceX(0), ceY(0));
  ctx.closePath();
  ctx.fillStyle = accFill;
  ctx.fill();
  ctx.restore();

  /* ── Linha principal ── */
  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = acc;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "rgba(" + accRgb + ",0.35)";
  ctx.shadowBlur = 4;
  ctx.moveTo(ceX(0), ceY(CURVA[0]));
  for (var hl = 1; hl < 24; hl++) {
    var xm2 = (ceX(hl - 1) + ceX(hl)) / 2;
    ctx.bezierCurveTo(xm2, ceY(CURVA[hl - 1]), xm2, ceY(CURVA[hl]), ceX(hl), ceY(CURVA[hl]));
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();

  /* ── Labels de hora no eixo X — dentro do canvas, todos os 3h ── */
  var yLbl = H - CE.pad.b + 11;
  for (var lh = 0; lh < 24; lh++) {
    if (lh % 3 !== 0) continue;
    ctx.save();
    ctx.fillStyle = labelHr;
    ctx.font = "bold 9.5px monospace";
    ctx.textAlign = "center";
    ctx.fillText(lh + "h", ceX(lh), yLbl);
    ctx.restore();
  }

  /* ── Pontos (dots) ── */
  for (var hd = 0; hd < 24; hd++) {
    var px = ceX(hd), py = ceY(CURVA[hd]);
    var isActive = CE.dragging === hd;
    var isPico = CURVA[hd] >= maxV * LIMIAR;

    /* Halo externo */
    if (isActive || isPico) {
      ctx.save();
      ctx.beginPath(); ctx.arc(px, py, isActive ? 12 : 9, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? "rgba(" + accRgb + ",0.25)" : "rgba(" + accRgb + ",0.14)";
      ctx.fill(); ctx.restore();
    }
    /* Dot */
    ctx.save();
    ctx.beginPath(); ctx.arc(px, py, isActive ? 6 : isPico ? 5.5 : 4, 0, Math.PI * 2);
    ctx.fillStyle = dotBg;
    ctx.strokeStyle = isPico ? acc : (dark ? "rgba(" + accRgb + ",0.65)" : "rgba(" + accRgb + ",0.75)");
    ctx.lineWidth = isActive ? 2.5 : isPico ? 2.5 : 1.6;
    ctx.fill(); ctx.stroke();
    ctx.restore();

    /* Label flutuante ao arrastar */
    if (isActive) {
      var lbx = Math.max(28, Math.min(px, W - 30));
      ctx.save();
      ctx.fillStyle = "rgba(" + accRgb + ",0.92)";
      ctx.beginPath(); ctx.roundRect(lbx - 26, py - 30, 52, 18, 4); ctx.fill();
      ctx.fillStyle = dark ? "#0c1118" : "#ffffff";
      ctx.font = "bold 9.5px monospace"; ctx.textAlign = "center";
      ctx.fillText(hd + "h · " + Math.round(CURVA[hd] * 100) + "%", lbx, py - 17);
      ctx.restore();
    }
  }

  /* ── Label de pico fixo (faixa de horas de pico) ── */
  var picoHs = []; for (var ph = 0; ph < 24; ph++) { if (CURVA[ph] >= maxV * LIMIAR) picoHs.push(ph); }
  if (picoHs.length && CE.dragging < 0) {
    var pmid = picoHs[Math.floor(picoHs.length / 2)];
    var pStr = (picoHs[0] === picoHs[picoHs.length - 1]) ? picoHs[0] + "h" : picoHs[0] + "h–" + (picoHs[picoHs.length - 1] + 1) + "h";
    var ppx = ceX(pmid), ppy = ceY(maxV);
    var lbx2 = Math.max(32, Math.min(ppx, W - CE.pad.r - 32));
    ctx.save();
    ctx.fillStyle = acc;
    ctx.font = "bold 9.5px monospace"; ctx.textAlign = "center";
    ctx.fillText("⬆ pico " + pStr, lbx2, ppy - 14);
    ctx.restore();
  }
}

function resetCurva() {
  CURVA = CURVA_BASE.slice();
  ceRender();
  ceUpdateInfo();
  if (INTERLIG_VERIFICADO) calcular();
}

var CABOS = [
  { n: "Cabo de Alumínio CA 6AWG - 13,30mm", i: 81, ie: 110, t: 30.87, m: 17.82 },
  { n: "Cabo de Alumínio CA 4AWG - 21,15mm", i: 111, ie: 150, t: 42.30, m: 24.42 },
  { n: "Cabo de Alumínio CA 2AWG - 33,63mm", i: 149, ie: 201, t: 56.78, m: 32.78 },
  { n: "Cabo de Alumínio CA 1/0AWG - 53,43mm", i: 201, ie: 272, t: 45.00, m: 44.22 },
  { n: "Cabo de Alumínio CA 2/0AWG - 67,43mm", i: 230, ie: 313, t: 87.64, m: 50.60 },
  { n: "Cabo de Alumínio CA 3/0AWG - 85,03mm", i: 270, ie: 366, t: 102.88, m: 59.40 },
  { n: "Cabo de Alumínio CA 4/0AWG - 107,20mm", i: 314, ie: 425, t: 119.65, m: 69.08 },
  { n: "Cabo Multiplexado CA/CAL Isol XLPE 2x1x35mm+70mm - 0,6/1kV", i: 146, ie: 146, t: 55.63, m: 32.12 },
  { n: "Cabo Multiplexado CA/CAL Isol XLPE 2x1x70mm+70mm - 0,6/1kV", i: 227, ie: 227, t: 86.50, m: 49.94 },
  { n: "Cabo Multiplexado CA/CAL Isol XLPE 3x1x35mm+70mm - 0,6/1kV", i: 146, ie: 146, t: 55.63, m: 32.12 },
  { n: "Cabo Multiplexado CA/CAL Isol XLPE 3x1x70mm+70mm - 0,6/1kV", i: 227, ie: 227, t: 86.50, m: 49.94 },
  { n: "Cabo Multiplexado CA/CAL Isol XLPE 3x1x120mm+70mm - 0,6/1kV", i: 311, ie: 311, t: 118.51, m: 68.42 }
];

var S = { protD: "conv", protQ: "conv", faseD: "tri", faseQ: "tri", vaos: [], vid: 0 };
var VT = 220, VM = 127, CI = null, DARK = true;
var COORD_HIST = [];
var periodosHrs = [];

var PICONS = {
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  interlig: '<circle cx="6" cy="12" r="3"/><circle cx="18" cy="12" r="3"/><line x1="9" y1="12" x2="15" y2="12"/>',
  gdis: '<rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="9" x2="9" y2="19"/>',
  coord: '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/>',
  conv: '<path d="M13 2L3 14h7l-2 8 10-12h-7l2-8z" stroke-linejoin="round" stroke-linecap="round"/>',
  consult: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>',
  automacoes: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  renomeador: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
};
var PTITLES = {
  home: { t: "Início", s: "Ferramentas CSI · CEMIG Operação · OD/PI" },
  interlig: { t: "Verificação de Interligação", s: "Análise de capacidade do doador · Cabos · Janelas horárias" },
  gdis: { t: "Copiar G-Dis", s: "Extrai e organiza notas do texto copiado do G-Dis, filtrando CX e poste" },
  coord: { t: "Corrigir Coordenadas", s: "Converte e padroniza coordenadas geográficas" },
  conv: { t: "Conversor Elétrico", s: "kVA · kW · Amperes — trifásico e monofásico para qualquer tensão e FP" },
  consult: { t: "Consultas", s: "Referência de tipos de serviço por indicador operacional" },
  automacoes: { t: "Seletor de Intervalo", s: "Automação · Digiteam · Bookmarklet" },
  renomeador: { t: "Renomeador de Equipes", s: "Automação · Digiteam · CSV + Bookmarklet" },
};

function openSb() { document.getElementById("sb").classList.add("open"); document.getElementById("overlay").classList.add("on"); }
function closeSb() { document.getElementById("sb").classList.remove("open"); document.getElementById("overlay").classList.remove("on"); }

function navToSection(pageId, sectionId) {
  navTo(pageId);
  setTimeout(function () {
    var el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      /* flash highlight */
      el.style.transition = 'outline-color .3s';
      el.style.outline = '2px solid rgba(0,229,184,.35)';
      el.style.borderRadius = '12px';
      setTimeout(function () { el.style.outline = '2px solid transparent'; }, 1200);
    }
  }, 120);
}

function navTo(id) {
  document.querySelectorAll(".ni").forEach(function (e) { e.classList.remove("active"); });
  document.querySelectorAll(".pg").forEach(function (e) { e.classList.remove("active"); });
  document.getElementById("nav-" + id).classList.add("active");
  var pg = document.getElementById("page-" + id);
  pg.classList.add("active");
  // Restart entry animation
  pg.querySelectorAll(".card,.kpi-strip").forEach(function (el) {
    el.style.animation = "none";
    el.offsetHeight;
    el.style.animation = "";
  });
  // Update topbar icon with crossfade
  var titleBlock = document.querySelector(".topbar-title-block");
  if (titleBlock) { titleBlock.style.opacity = "0"; titleBlock.style.transform = "translateY(4px)"; }
  var iconEl = document.getElementById("topbar-page-svg");
  if (iconEl && PICONS[id]) {
    iconEl.innerHTML = PICONS[id];
    var wrap = document.getElementById("topbar-page-icon");
    if (wrap) {
      wrap.setAttribute("data-page", id);
      wrap.style.transform = "scale(.85)";
      setTimeout(function () { wrap.style.transform = ""; }, 150);
    }
  }
  document.getElementById("ttitle").textContent = PTITLES[id].t;
  document.getElementById("tsub").textContent = PTITLES[id].s;
  setTimeout(function () {
    if (titleBlock) { titleBlock.style.opacity = ""; titleBlock.style.transform = ""; }
    /* Re-render curve editor when navigating to interlig (canvas may have been hidden) */
    if (id === "interlig" && CE.canvas) { ceResize(); ceRender(); }
  }, 60);
  closeSb();
}

function toggleTheme() {
  DARK = !DARK;
  document.body.classList.toggle("light", !DARK);
  document.getElementById("themeLbl").textContent = DARK ? "Claro" : "Escuro";
  var ic = document.getElementById("themeIcon");
  ic.innerHTML = DARK ? "<path d=\"M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z\"/>" : "<circle cx=\"12\" cy=\"12\" r=\"5\"/><line x1=\"12\" y1=\"1\" x2=\"12\" y2=\"3\"/><line x1=\"12\" y1=\"21\" x2=\"12\" y2=\"23\"/><line x1=\"4.22\" y1=\"4.22\" x2=\"5.64\" y2=\"5.64\"/><line x1=\"18.36\" y1=\"18.36\" x2=\"19.78\" y2=\"19.78\"/><line x1=\"1\" y1=\"12\" x2=\"3\" y2=\"12\"/><line x1=\"21\" y1=\"12\" x2=\"23\" y2=\"12\"/>";
  if (CI) { calcular(); }
  if (CE.canvas) { ceRender(); }
}

var TTM;
function toast(msg) {
  var el = document.getElementById("toast");
  el.classList.remove("show");
  while (el.childNodes.length > 1) { el.removeChild(el.lastChild); }
  el.appendChild(document.createTextNode(msg));
  clearTimeout(TTM);
  requestAnimationFrame(function () {
    el.classList.add("show");
    TTM = setTimeout(function () { el.classList.remove("show"); }, 1800);
  });
}

/* INTERLIGAÇÃO — verificação explícita */
var INTERLIG_VERIFICADO = false;

function verificarInterligacao() {
  INTERLIG_VERIFICADO = true;
  calcular();
  /* Reveal chart card and resultado */
  var cc = document.getElementById("card-curvas");
  if (cc) { cc.style.display = ""; }
  /* Scroll to result */
  setTimeout(function () {
    var r = document.getElementById("resultado-final");
    if (r) { r.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
  }, 120);
}

function updateInterligSteps() {
  var potD = parseFloat(document.getElementById("pot-doador").value) || 0;
  var cD = parseFloat(document.getElementById("carga-doador").value) || 0;
  var potQ = parseFloat(document.getElementById("pot-queimado").value) || 0;
  var cQ = parseFloat(document.getElementById("carga-queimado").value) || 0;
  var hasVaos = S.vaos.length > 0;
  var s1 = potD > 0 && cD >= 0;
  var s2 = potQ > 0 && cQ >= 0;
  var s3 = hasVaos;
  ["istep-1", "istep-2", "istep-3", "istep-4"].forEach(function (id, i) {
    var el = document.getElementById(id);
    if (!el) return;
    var ok = [s1, s2, s3, INTERLIG_VERIFICADO][i];
    el.classList.toggle("done", !!ok);
  });
}

/* INTERLIGAÇÃO */
function setP(t, v) {
  S[t === "doador" ? "protD" : "protQ"] = v;
  ["conv", "prot"].forEach(function (x) { document.getElementById("tp-" + t + "-" + x).classList.toggle("on", x === v); });
  calcular();
}
function setF(t, v) {
  S[t === "doador" ? "faseD" : "faseQ"] = v;
  ["tri", "mono"].forEach(function (x) { document.getElementById("fase-" + t + "-" + x).classList.toggle("on", x === v); });
  calcular();
}
function addVao() { S.vid++; S.vaos.push({ id: S.vid, cabo: 0 }); renderVaos(); calcular(); }
function removeVao(id) { S.vaos = S.vaos.filter(function (v) { return v.id !== id; }); renderVaos(); calcular(); }

function renderVaos() {
  var cont = document.getElementById("vaos"); cont.innerHTML = "";
  S.vaos.forEach(function (vao, idx) {
    var row = document.createElement("div"); row.className = "vr2";
    var opts = CABOS.map(function (cab, i) { return "<option value=\"" + i + "\"" + (i === vao.cabo ? " selected" : "") + ">" + cab.n + "</option>"; }).join("");
    var cab = CABOS[vao.cabo];
    var info = "<div class=\"vinfo\"><div class=\"vinfo-row\"><span class=\"vi-lbl\">Nominal 30\xb0C:</span><span class=\"vi-val vi-30\">" + cab.i + " A</span></div><div class=\"vinfo-row\"><span class=\"vi-lbl\">Emergencial 60\xb0C:</span><span class=\"vi-val vi-60\">" + cab.ie + " A</span></div></div>";
    row.innerHTML = "<div class=\"vn\">" + (idx + 1) + "</div><select onchange=\"updVao(" + vao.id + ",this.value)\">" + opts + "</select>" + info + "<div class=\"vres\" id=\"vr-" + vao.id + "\">—</div><button class=\"vdel\" onclick=\"removeVao(" + vao.id + ")\">×</button>";
    cont.appendChild(row);
  });
}

function updVao(id, val) {
  var v = S.vaos.filter(function (x) { return x.id === id; })[0];
  if (v) { v.cabo = parseInt(val); renderVaos(); calcular(); }
}

function iDem(kva, fase) { return fase === "tri" ? (kva * 1000) / (Math.sqrt(3) * VT) : (kva * 1000) / VM; }

function mkMetric(val, unit, label, color) {
  var col = color ? " style=\"color:" + color + "\"" : "";
  return "<div class=\"res-metric\"><div class=\"res-metric-v\"" + col + ">" + val + "<span class=\"res-metric-u\">" + unit + "</span></div><div class=\"res-metric-l\">" + label + "</div></div>";
}

function calcular() {
  updateInterligSteps();
  var potD = parseFloat(document.getElementById("pot-doador").value) || 0;
  var cD = parseFloat(document.getElementById("carga-doador").value) || 0;
  var cQ = parseFloat(document.getElementById("carga-queimado").value) || 0;

  /* Alerta de fase — sempre visível pois orienta o preenchimento */
  var aEl = document.getElementById("alert-fase");
  var inv = S.faseD === "mono" && S.faseQ === "tri";
  var avi = S.faseD === "tri" && S.faseQ === "mono";
  if (inv) { aEl.className = "ail danger"; aEl.textContent = "\u2717 Trafo monofásico não pode alimentar rede trifásica. Interligação inviável."; }
  else if (avi) { aEl.className = "ail warn"; aEl.textContent = "\u26a0 Doador trifásico alimentando rede monofásica — somente uma fase será usada."; }
  else { aEl.className = "ail"; }

  /* Tudo abaixo só renderiza após o usuário clicar em Verificar */
  if (!INTERLIG_VERIFICADO) {
    var _rt0 = document.getElementById("resultado-trafo"); if (_rt0) _rt0.innerHTML = "";
    if (document.getElementById("jsum")) document.getElementById("jsum").innerHTML = "";
    if (CI) { CI.destroy(); CI = null; }
    /* Manter KPI strip com traços */
    ["kpi-potD", "kpi-limite", "kpi-uso", "kpi-margem"].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.textContent = "—";
    });
    /* Mostrar hero, limpar resultado */
    var heroEl = document.getElementById("interlig-hero");
    if (heroEl) heroEl.style.display = "";
    document.getElementById("resultado-final").innerHTML = "";
    return;
  }

  var fator = S.protD === "prot" ? 1.00 : 1.20;
  var maxD = potD * fator, tot = cD + cQ, sobra = maxD - tot, pct = maxD > 0 ? (tot / maxD * 100) : 0;
  var cls, tit, msg;
  if (inv) {
    cls = "danger"; tit = "\u2717 Interligação inviável"; msg = "Trafo monofásico não pode suprir rede trifásica.";
  } else if (tot <= maxD * 0.85) {
    cls = "ok"; tit = "\u2713 Capacidade suficiente no pico";
    msg = "Carga total de <span class=\"n\">" + tot.toFixed(1) + " kVA</span> dentro do limite de <span class=\"n\">" + maxD.toFixed(0) + " kVA</span>. Margem: <span class=\"n\">" + sobra.toFixed(1) + " kVA</span>.";
  } else if (tot <= maxD) {
    cls = "warn"; tit = "\u26a0 Viável no pico com atenção";
    msg = "Carga total de <span class=\"n\">" + tot.toFixed(1) + " kVA</span> próxima ao limite de <span class=\"n\">" + maxD.toFixed(0) + " kVA</span> (" + pct.toFixed(0) + "%). Margem: <span class=\"n\">" + sobra.toFixed(1) + " kVA</span>.";
  } else {
    cls = "danger"; tit = "\u2717 Inviável no pico — verifique janelas horárias";
    msg = "Carga total de <span class=\"n\">" + tot.toFixed(1) + " kVA</span> excede o limite de <span class=\"n\">" + maxD.toFixed(0) + " kVA</span>. Excesso: <span class=\"n\">" + Math.abs(sobra).toFixed(1) + " kVA</span>.";
  }

  var fLbl = { "tri-tri": "Trifásico → Trifásico", "tri-mono": "Trifásico → Monofásico", "mono-mono": "Monofásico → Monofásico", "mono-tri": "Monofásico → Trifásico \u2717" }[S.faseD + "-" + S.faseQ];
  var pctColor = pct > 100 ? "var(--danger)" : pct > 85 ? "var(--warn)" : "var(--ok)";
  var margemColor = sobra < 0 ? "var(--danger)" : sobra < maxD * 0.15 ? "var(--warn)" : "var(--ok)";

  var metricsHtml = "";
  if (!inv) {
    metricsHtml = "<div class=\"res-metrics\">" +
      mkMetric(pct.toFixed(1), "%", "Uso no pico", pctColor) +
      mkMetric(tot.toFixed(1), "kVA", "Carga total", "") +
      mkMetric(sobra.toFixed(1), "kVA", "Margem", margemColor) +
      mkMetric(maxD.toFixed(0), "kVA", "Limite", "") +
      "</div>" +
      "<div class=\"gr\" style=\"margin-top:14px;\"><span class=\"gl\">Carregamento</span><div class=\"gb\"><div class=\"gf\" id=\"gauge-fill\" data-pct=\"" + Math.min(pct, 100).toFixed(1) + "\" style=\"width:0%;background:" + pctColor + "\"></div></div><span class=\"gv\" style=\"color:" + pctColor + "\">" + pct.toFixed(1) + "%</span></div>";
  }

  var detFasesHtml = "<div class=\"res-detail-grid\">" +
    "<div class=\"res-detail-item\"><span class=\"res-detail-lbl\">Fases</span><span class=\"res-detail-val\">" + fLbl + "</span></div>" +
    "<div class=\"res-detail-item\"><span class=\"res-detail-lbl\">Limite doador</span><span class=\"res-detail-val\">" + maxD.toFixed(1) + " kVA <span style=\"color:var(--muted);font-weight:400;font-size:11px;\">(" + (fator === 1 ? "100" : "120") + "%)</span></span></div>" +
    "<div class=\"res-detail-item\"><span class=\"res-detail-lbl\">Carga doador</span><span class=\"res-detail-val\">" + cD.toFixed(1) + " kVA</span></div>" +
    "<div class=\"res-detail-item\"><span class=\"res-detail-lbl\">Carga queimado</span><span class=\"res-detail-val\">" + cQ.toFixed(1) + " kVA</span></div>" +
    "</div>";

  /* ── KPI STRIP UPDATE ── */
  if (!inv && document.getElementById("kpi-potD")) {
    var potDEl = document.getElementById("kpi-potD");
    if (potDEl) potDEl.textContent = potD.toFixed(0) + " kVA";
    var limEl = document.getElementById("kpi-limite");
    if (limEl) limEl.textContent = maxD.toFixed(0) + " kVA";
    var limTip = document.getElementById("kpi-limitetip");
    if (limTip) limTip.textContent = S.protD === "prot" ? "Auto-protegido (100%)" : "Convencional (120%)";
    var usoEl = document.getElementById("kpi-uso");
    if (usoEl) usoEl.textContent = pct.toFixed(1) + "%";
    var usoTip = document.getElementById("kpi-usotip");
    if (usoTip) usoTip.textContent = (cD + cQ).toFixed(1) + " kVA combinado";
    var kpiUso = document.getElementById("kpi-card-uso");
    if (kpiUso) { kpiUso.className = "kpi-card " + (pct > 100 ? "kpi-danger" : pct > 85 ? "kpi-warn" : "kpi-ok"); }
    var margEl = document.getElementById("kpi-margem");
    if (margEl) margEl.textContent = sobra.toFixed(1) + " kVA";
    var margTip = document.getElementById("kpi-margemtip");
    if (margTip) margTip.textContent = pct.toFixed(0) + "% utilizado no pico";
    var kpiMarg = document.getElementById("kpi-card-margem");
    if (kpiMarg) { kpiMarg.className = "kpi-card " + (sobra < 0 ? "kpi-danger" : sobra < maxD * 0.15 ? "kpi-warn" : "kpi-ok"); }
  }

  /* ── CARD DE RESULTADO UNIFICADO ── escrito em resultado-final no final da função ── */
  var _rt1 = document.getElementById("resultado-trafo"); if (_rt1) _rt1.innerHTML = ""; /* limpo — não usado mais */

  /* GRÁFICO */
  var hrs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
  var dD = hrs.map(function (h) { return cD * CURVA[h]; });
  var dQ = hrs.map(function (h) { return cQ * CURVA[h]; });
  var dT = hrs.map(function (h) { return (cD + cQ) * CURVA[h]; });
  var gc = DARK ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
  var tc = DARK ? "#8ba3be" : "#526480";
  var lc = DARK ? "#e2eaf4" : "#1a2030";

  /* Cor das barras por status da hora */
  var barColD = dT.map(function (t) {
    var p = maxD > 0 ? (t / maxD * 100) : 0;
    if (p > 100) return DARK ? "rgba(255,80,100,0.55)" : "rgba(220,40,60,0.45)";
    if (p > 85) return DARK ? "rgba(255,184,48,0.55)" : "rgba(200,130,0,0.45)";
    return DARK ? "rgba(0,184,255,0.50)" : "rgba(0,130,200,0.40)";
  });
  var barColQ = dT.map(function (t) {
    var p = maxD > 0 ? (t / maxD * 100) : 0;
    if (p > 100) return DARK ? "rgba(255,80,100,0.35)" : "rgba(220,40,60,0.28)";
    if (p > 85) return DARK ? "rgba(255,184,48,0.35)" : "rgba(200,130,0,0.28)";
    return DARK ? "rgba(0,229,184,0.35)" : "rgba(0,122,96,0.28)";
  });

  if (CI) { CI.destroy(); CI = null; }
  var canvas = document.getElementById("chartCurvas");
  if (canvas && typeof Chart !== "undefined") {
    CI = new Chart(canvas, {
      type: "bar",
      data: {
        labels: hrs.map(function (h) { return h + "h"; }),
        datasets: [
          {
            type: "line", label: "Carga Total", data: dT,
            borderColor: lc, borderWidth: 2.5,
            pointRadius: 3, pointBackgroundColor: lc,
            pointBorderColor: lc,
            tension: 0.35, fill: false, order: 1, yAxisID: "y"
          },
          {
            type: "bar", label: "Doador", data: dD,
            backgroundColor: barColD,
            borderRadius: 3, order: 2, yAxisID: "y", stack: "s"
          },
          {
            type: "bar", label: "Queimado", data: dQ,
            backgroundColor: barColQ,
            borderRadius: 0, order: 2, yAxisID: "y", stack: "s"
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: {
              color: tc,
              font: { size: 11 },
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 10,
              generateLabels: function (chart) {
                /* Legenda customizada com indicadores de status */
                var base = [
                  { text: "Carga Total (kVA)", fillStyle: lc, strokeStyle: lc, lineWidth: 2, pointStyle: "line" },
                  { text: "Doador", fillStyle: DARK ? "rgba(0,184,255,0.55)" : "rgba(0,130,200,0.45)", strokeStyle: "transparent", lineWidth: 0, pointStyle: "rect" },
                  { text: "Queimado", fillStyle: DARK ? "rgba(0,229,184,0.40)" : "rgba(0,122,96,0.30)", strokeStyle: "transparent", lineWidth: 0, pointStyle: "rect" },
                  { text: "Viável (≤85%)", fillStyle: DARK ? "rgba(0,184,255,0.5)" : "rgba(0,130,200,0.4)", strokeStyle: "transparent", lineWidth: 0, pointStyle: "rectRounded" },
                  { text: "Atenção (85–100%)", fillStyle: DARK ? "rgba(255,184,48,0.55)" : "rgba(200,130,0,0.45)", strokeStyle: "transparent", lineWidth: 0, pointStyle: "rectRounded" },
                  { text: "Inviável (>100%)", fillStyle: DARK ? "rgba(255,80,100,0.55)" : "rgba(220,40,60,0.45)", strokeStyle: "transparent", lineWidth: 0, pointStyle: "rectRounded" }
                ];
                return base.map(function (b, i) { return Object.assign({ index: i, hidden: false, datasetIndex: i < 3 ? i : 0 }, b); });
              }
            }
          },
          tooltip: {
            callbacks: {
              title: function (ctx) { return ctx[0].label; },
              afterBody: function (items) {
                var h = items[0].dataIndex, t = dT[h], p = maxD > 0 ? (t / maxD * 100) : 0;
                return [
                  "Total: " + t.toFixed(1) + " kVA (" + p.toFixed(0) + "%)",
                  "Doador: " + dD[h].toFixed(1) + " kVA | Queimado: " + dQ[h].toFixed(1) + " kVA",
                  p > 100 ? "\u2717 Inviável — excede o limite" : p > 85 ? "\u26a0 Atenção — próximo ao limite" : "\u2713 Viável"
                ];
              }
            }
          }
        },
        scales: {
          x: { stacked: true, ticks: { color: tc, font: { size: 10 }, autoSkip: false, maxRotation: 0 }, grid: { color: gc } },
          y: {
            stacked: false, beginAtZero: true,
            max: Math.ceil(Math.max(maxD, Math.max.apply(null, dT.concat([0]))) * 1.18) || 10,
            ticks: { color: tc, font: { size: 10 }, callback: function (v) { return v + " kVA"; } },
            grid: { color: gc }
          }
        }
      },
      plugins: [{
        id: "refs", afterDraw: function (chart) {
          var ctx2 = chart.ctx, y = chart.scales.y, x = chart.scales.x;
          if (!maxD) return;
          function dl(val, col, dash, lbl, lblRight) {
            var yp = y.getPixelForValue(val);
            if (yp < chart.chartArea.top || yp > chart.chartArea.bottom) return;
            ctx2.save();
            ctx2.setLineDash(dash);
            ctx2.strokeStyle = col;
            ctx2.lineWidth = 1.5;
            ctx2.beginPath(); ctx2.moveTo(x.left, yp); ctx2.lineTo(x.right, yp); ctx2.stroke();
            if (lbl) {
              ctx2.setLineDash([]);
              ctx2.fillStyle = col;
              ctx2.font = "bold 10px Consolas,monospace";
              ctx2.textAlign = "right";
              ctx2.fillText(lbl, x.right - 4, yp - 4);
            }
            ctx2.restore();
          }
          dl(maxD, "rgba(255,77,77,0.9)", [6, 4], "Limite " + maxD.toFixed(0) + " kVA");
          dl(maxD * 0.85, "rgba(245,166,35,0.6)", [3, 5], "Atenção 85%");
        }
      }]
    });
  }

  /* JANELAS HORÁRIAS — só para o jsum do card-curvas */
  periodosHrs = [];
  if (!inv && maxD > 0) {
    var statusHrs = hrs.map(function (h) { var p = (dT[h] / maxD) * 100; return p > 100 ? "inv" : p > 85 ? "warn" : "ok"; });
    var pi = 0;
    while (pi < 24) {
      var ps = statusHrs[pi], pj = pi;
      while (pj < 24 && statusHrs[pj] === ps) { pj++; }
      var maxPct = 0;
      for (var ph = pi; ph < pj; ph++) { var pp = (dT[ph] / maxD) * 100; if (pp > maxPct) { maxPct = pp; } }
      periodosHrs.push({ de: pi, ate: pj - 1, s: ps, maxPct: maxPct });
      pi = pj;
    }
    var f2 = function (h) { return h + "h"; };
    var barSegs = "";
    periodosHrs.forEach(function (p) {
      var w = ((p.ate - p.de + 1) / 24 * 100).toFixed(2);
      var lbl = p.de === p.ate ? f2(p.de) : f2(p.de) + "\u2013" + f2(p.ate + 1);
      barSegs += "<div class=\"jwin-seg s-" + p.s + "\" style=\"width:" + w + "%\" title=\"" + lbl + ": " + (p.s === "ok" ? "Viável" : p.s === "warn" ? "Atenção" : "Inviável") + "\">" + ((p.ate - p.de + 1) >= 2 ? lbl : "") + "</div>";
    });
    var lblsHtml = "";
    [0, 6, 12, 18, 23].forEach(function (h) {
      lblsHtml += "<span class=\"jwin-lbl\" style=\"left:" + (h / 24 * 100).toFixed(1) + "%\">" + h + "h</span>";
    });
    var rowsHtml = "";
    periodosHrs.forEach(function (p) {
      var lbl = p.de === p.ate ? f2(p.de) : f2(p.de) + "\u2013" + f2(p.ate + 1);
      var ic = p.s === "ok" ? "\u2713" : p.s === "warn" ? "\u26a0" : "\u2717";
      var desc = p.s === "ok" ? "Interligação viável" : p.s === "warn" ? "Viável com atenção — próximo ao limite" : "Inviável — carga excede o limite";
      var pctColor = p.s === "ok" ? "var(--ok)" : p.s === "warn" ? "var(--warn)" : "var(--danger)";
      rowsHtml += "<div class=\"jwin-row s-" + p.s + "\"><span class=\"jwin-row-ic\">" + ic + "</span>" +
        "<span class=\"jwin-row-hrs s-" + p.s + "\">" + lbl + "</span>" +
        "<span class=\"jwin-row-desc\">" + desc + "</span>" +
        "<span class=\"jwin-row-pct\" style=\"color:" + pctColor + "\">" + p.maxPct.toFixed(0) + "%</span></div>";
    });
    document.getElementById("jsum").innerHTML =
      "<div class=\"jwin-block\">" +
      "<div class=\"jwin-title\">Distribuição horária — 0h às 23h</div>" +
      "<div class=\"jwin-bar\">" + barSegs + "</div>" +
      "<div class=\"jwin-labels\">" + lblsHtml + "</div>" +
      "<div class=\"jwin-janelas\">" + rowsHtml + "</div>" +
      "<div class=\"jwin-legend\">" +
      "<div class=\"jwin-leg-item\"><div class=\"jwin-leg-dot\" style=\"background:rgba(0,229,184,.6)\"></div>Viável (&le;85%)</div>" +
      "<div class=\"jwin-leg-item\"><div class=\"jwin-leg-dot\" style=\"background:rgba(255,184,48,.65)\"></div>Atenção (85\u2013100%)</div>" +
      "<div class=\"jwin-leg-item\"><div class=\"jwin-leg-dot\" style=\"background:rgba(255,77,106,.6)\"></div>Inviável (&gt;100%)</div>" +
      "</div>" +
      "</div>";
  } else {
    document.getElementById("jsum").innerHTML = inv ? "<div class=\"jwin-row s-inv\" style=\"margin-top:8px;\"><span>\u2717</span><span style=\"color:var(--danger);font-weight:700;\">Interligação inviável — incompatibilidade de fase.</span></div>" : "";
  }

  // ═══════════════════════════════════════════
  // CARD DE RESULTADO UNIFICADO
  // ═══════════════════════════════════════════

  /* Se não há vãos, ainda mostra resultado da capacidade */
  if (!S.vaos.length) {
    document.getElementById("resultado-final").innerHTML =
      "<div class=\"rb2 " + cls + "\">" +
      "<div class=\"rb2-header\"><h3>" + tit + "</h3><p>" + msg + "</p></div>" +
      metricsHtml +
      "<div class=\"rb2-sep\"></div>" +
      detFasesHtml +
      "<div class=\"info\" style=\"margin-top:12px;\">Adicione os vãos de cabo acima para completar a verificação de capacidade dos condutores.</div>" +
      "</div>";
    animateGauge();
    return;
  }

  var iVao = iDem(cQ, S.faseD), todosOk = true;
  S.vaos.forEach(function (vao) {
    var cab = CABOS[vao.cabo], ok = iVao <= cab.i;
    if (!ok) { todosOk = false; }
    var p = (iVao / cab.i * 100), el = document.getElementById("vr-" + vao.id);
    if (el) {
      el.className = "vres " + (ok ? "ok" : "danger");
      el.textContent = (ok ? "\u2713 " : "\u2717 ") + p.toFixed(0) + "%";
      el.title = "Demanda: " + iVao.toFixed(1) + " A | Limite: " + cab.i + " A";
    }
  });

  var cg = (inv || cls === "danger" || !todosOk) ? "danger" : cls === "warn" ? "warn" : "ok";
  var rep = S.vaos.filter(function (v) { return iVao > CABOS[v.cabo].i; });

  /* Título final único — abrange tudo */
  var titFinal, clsFinal;
  if (inv || rep.length) {
    clsFinal = "danger";
    titFinal = rep.length
      ? "\u2717 Interligação reprovada — cabos insuficientes"
      : "\u2717 Interligação inviável — incompatibilidade de fases";
  } else if (!inv && maxD > 0) {
    var oksH2 = periodosHrs.filter(function (p) { return p.s === "ok"; });
    var invsH2 = periodosHrs.filter(function (p) { return p.s === "inv"; });
    var warnsOnly = periodosHrs.every(function (p) { return p.s !== "inv"; }) && periodosHrs.some(function (p) { return p.s === "warn"; });
    if (invsH2.length && oksH2.length) {
      clsFinal = "warn"; titFinal = "\u26a0 Interligação parcialmente viável — restrita a janelas horárias";
    } else if (invsH2.length && !oksH2.length) {
      clsFinal = "danger"; titFinal = "\u2717 Inviável — carga excede o limite em todos os horários";
    } else if (warnsOnly) {
      clsFinal = "warn"; titFinal = "\u26a0 Viável com atenção — carregamento próximo ao limite no pico";
    } else {
      clsFinal = "ok"; titFinal = "\u2713 Interligação aprovada";
    }
  } else {
    clsFinal = cg; titFinal = cg === "ok" ? "\u2713 Interligação aprovada" : cg === "warn" ? "\u26a0 Aprovada com atenção" : "\u2717 Interligação reprovada";
  }

  /* Cabos reprovados */
  var detHtml = "";
  if (rep.length) {
    var repRows = rep.map(function (v) {
      var cab = CABOS[v.cabo];
      return "<div style=\"font-family:var(--mono);color:var(--text2);font-size:12px;padding:3px 0;\">" +
        "Vão " + (S.vaos.indexOf(v) + 1) + " — " + cab.n +
        ": limite <strong style=\"color:var(--danger)\">" + cab.i + " A</strong>" +
        ", demanda <strong>" + iVao.toFixed(1) + " A</strong>" +
        "</div>";
    }).join("");
    detHtml = "<div style=\"margin-top:10px;padding:10px 12px;background:var(--danger-dim);border:1px solid rgba(255,77,77,.25);border-radius:8px;\">" +
      "<strong style=\"color:var(--danger);font-size:12px;\">\u2717 Vãos com capacidade insuficiente:</strong>" +
      "<div style=\"margin-top:6px;\">" + repRows + "</div>" +
      "</div>";
  }

  /* Janelas horárias */
  var conclHtml = "";
  if (!inv && maxD > 0) {
    var oksH = periodosHrs.filter(function (p) { return p.s === "ok"; });
    var warnsH = periodosHrs.filter(function (p) { return p.s === "warn"; });
    var invsH = periodosHrs.filter(function (p) { return p.s === "inv"; });
    var hasInv = invsH.length > 0;
    var hasOk = oksH.length > 0 || warnsH.length > 0;
    var mergeRanges = function (periodos) {
      var horas = [];
      periodos.forEach(function (p) { for (var h = p.de; h <= p.ate; h++) { horas.push(h); } });
      horas.sort(function (a, b) { return a - b; });
      if (!horas.length) { return ""; }
      var faixas = [], ini = horas[0], fim = horas[0];
      for (var i = 1; i < horas.length; i++) {
        if (horas[i] === fim + 1) { fim = horas[i]; }
        else { faixas.push({ de: ini, ate: fim }); ini = horas[i]; fim = horas[i]; }
      }
      faixas.push({ de: ini, ate: fim });
      return faixas.map(function (f) { return f.de === f.ate ? f.de + "h" : f.de + "h\u2013" + (f.ate + 1) + "h"; }).join(", ");
    };
    if (clsFinal === "ok") {
      conclHtml = "<div class=\"concl-block s-ok\"><div class=\"concl-title s-ok\">\u2713 Viável em todos os horários</div>" +
        "<div class=\"concl-text\">A carga combinada permanece dentro do limite ao longo de todo o dia.</div></div>";
    } else if (clsFinal === "warn" && !hasInv) {
      conclHtml = "<div class=\"concl-block s-warn\"><div class=\"concl-title s-warn\">\u26a0 Próxima ao limite no pico</div>" +
        "<div class=\"concl-text\">Interligação viável. Monitore o carregamento — margem pequena no pico.</div></div>";
    } else if (hasInv && hasOk) {
      var okList = mergeRanges(oksH.concat(warnsH));
      var invList = mergeRanges(invsH);
      conclHtml = "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;\">" +
        "<div style=\"padding:10px 12px;background:rgba(0,212,170,.07);border:1px solid rgba(0,212,170,.25);border-radius:8px;\">" +
        "<div style=\"font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ok);margin-bottom:6px;\">\u2713 Pode interligar</div>" +
        "<div style=\"font-family:var(--mono);font-weight:700;color:var(--ok);font-size:14px;\">" + okList + "</div>" +
        "</div>" +
        "<div style=\"padding:10px 12px;background:rgba(255,77,77,.07);border:1px solid rgba(255,77,77,.25);border-radius:8px;\">" +
        "<div style=\"font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--danger);margin-bottom:6px;\">\u2717 Não interligar</div>" +
        "<div style=\"font-family:var(--mono);font-weight:700;color:var(--danger);font-size:14px;\">" + invList + "</div>" +
        "</div>" +
        "</div>";
    } else if (hasInv && !hasOk) {
      conclHtml = "<div class=\"concl-block s-inv\"><div class=\"concl-title s-inv\">\u2717 Inviável em todos os horários</div>" +
        "<div class=\"concl-text\">A carga total excede a capacidade do doador mesmo nos horários de menor demanda.</div></div>";
    }
  }

  /* Linha de cabos resumida */
  var cabosResumoHtml =
    "<div class=\"rb2-sep\"></div>" +
    "<div class=\"res-detail-grid\" style=\"margin-bottom:8px;\">" +
    "<div class=\"res-detail-item\"><span class=\"res-detail-lbl\">Cabos verificados</span>" +
    "<span class=\"res-detail-val\">" + S.vaos.length + " vão" + (S.vaos.length !== 1 ? "s" : "") + "</span></div>" +
    "<div class=\"res-detail-item\"><span class=\"res-detail-lbl\">Corrente no pico</span>" +
    "<span class=\"res-detail-val\">" + iVao.toFixed(1) + " A</span></div>" +
    "<div class=\"res-detail-item\"><span class=\"res-detail-lbl\">Reprovados</span>" +
    "<span class=\"res-detail-val\" style=\"color:" + (rep.length ? "var(--danger)" : "var(--ok)") + "\">" +
    (rep.length ? rep.length + " vão" + (rep.length !== 1 ? "s" : "") : "Todos aprovados") + "</span></div>" +
    "</div>";

  document.getElementById("resultado-final").innerHTML =
    "<div class=\"rb2 " + clsFinal + "\">" +
    "<div class=\"rb2-header\"><h3>" + titFinal + "</h3><p>" + msg + "</p></div>" +
    metricsHtml +
    "<div class=\"rb2-sep\"></div>" +
    detFasesHtml +
    cabosResumoHtml +
    conclHtml +
    detHtml +
    "</div>";

  animateGauge();
}

function animateGauge() {
  var gf = document.getElementById("gauge-fill");
  if (!gf) return;
  var target = parseFloat(gf.getAttribute("data-pct") || "0");
  var cls2 = target > 100 ? "gf-danger" : target > 85 ? "gf-warn" : "animate";
  gf.className = "gf " + cls2;
  void gf.offsetWidth; /* força reflow para reiniciar a animação CSS */
  setTimeout(function () { gf.style.width = Math.min(target, 100).toFixed(1) + "%"; }, 20);
}

/* G-DIS */
var RNOTA = /(?:^|[^\d])(\d{9})(?!\d)/g, GTMR;
var GNOTAS = [];
var G_MAPA = {};
var POSTE_KEYS = ["PST", "POSTE", "MULTI", "CARRO", "POST"];
var CAIXA_KEYS = ["CX", "CAIXA", "MOTO"];

function gAtualizar() {
  var inp = document.getElementById("gin").value.trim();
  /* Auto-extract whenever there's content, otherwise reset */
  if (inp) { gExtrair(); }
  else {
    GNOTAS = []; G_MAPA = {};
    var emptyEl = document.getElementById("gdis-empty-state");
    if (emptyEl) { emptyEl.style.display = "flex"; }
    document.getElementById("gout").value = "";
    document.getElementById("gstat-total").textContent = "—";
    document.getElementById("gstat-dup").textContent = "—";
    gUpdateButtons();
  }
}
function gExtrair() {
  var txt = document.getElementById("gin").value.trim();
  /* Toggle empty state */
  var emptyEl = document.getElementById("gdis-empty-state");
  if (emptyEl) { emptyEl.style.display = txt ? "none" : "flex"; }
  if (!txt) {
    GNOTAS = []; G_MAPA = {};
    document.getElementById("gout").value = "";
    document.getElementById("gstat-total").textContent = "—";
    document.getElementById("gstat-dup").textContent = "—";
    gUpdateButtons(); return;
  }
  requestAnimationFrame(function () {
    var m = [...txt.matchAll(RNOTA)].map(function (x) { return x[1]; });
    var total = m.length;
    var u = [...new Set(m)];
    GNOTAS = u; G_MAPA = {};
    var dup = total - u.length;
    // Classifica cada OS pela linha de origem
    txt.split("\n").forEach(function (linha) {
      var osLinha = [...linha.matchAll(RNOTA)].map(function (x) { return x[1]; });
      if (!osLinha.length) { return; }
      var lu = linha.toUpperCase().trim();
      var ePoste = POSTE_KEYS.some(function (k) { return lu.indexOf(k) >= 0; });
      var eCaixa = CAIXA_KEYS.some(function (k) { return lu.indexOf(k) >= 0; }) || /--/.test(linha);
      osLinha.forEach(function (os) {
        if (!G_MAPA[os]) { G_MAPA[os] = ePoste ? "poste" : eCaixa ? "caixa" : "outro"; }
      });
    });
    document.getElementById("gstat-total").textContent = u.length || "0";
    document.getElementById("gstat-dup").textContent = dup > 0 ? dup : "0";
    if (u.length) {
      document.getElementById("gout").value = u.join(",");
    }
    else {
      document.getElementById("gout").value = "";
    }
    gUpdateButtons();
  });
}

function gUpdateButtons() {
  var inp = document.getElementById("gin").value.trim();
  var hasOut = GNOTAS.length > 0;
  var nCx = GNOTAS.filter(function (os) { return G_MAPA[os] === "caixa"; }).length;
  var nPst = GNOTAS.filter(function (os) { return G_MAPA[os] === "poste"; }).length;
  document.getElementById("gBtnLp").disabled = !inp && !hasOut;
  document.getElementById("gBtnCp").disabled = !hasOut;
  document.getElementById("gBtnCx").disabled = !nCx;
  document.getElementById("gBtnPst").disabled = !nPst;
  // badges
  var bT = document.getElementById("gBadgeTotal");
  var bC = document.getElementById("gBadgeCx");
  var bP = document.getElementById("gBadgePst");
  if (bT) bT.textContent = hasOut ? GNOTAS.length : "—";
  if (bC) bC.textContent = nCx || "—";
  if (bP) bP.textContent = nPst || "—";
  /* Update KPI strip */
  var kg1 = document.getElementById("kpi-gd-total");
  var kg2 = document.getElementById("kpi-gd-cx");
  var kg3 = document.getElementById("kpi-gd-pst");
  if (kg1) kg1.textContent = hasOut ? GNOTAS.length : "—";
  if (kg2) kg2.textContent = nCx || "—";
  if (kg3) kg3.textContent = nPst || "—";
}

function copyText(txt) {
  if (navigator.clipboard) { navigator.clipboard.writeText(txt).catch(function () { fbCopy(txt); }); }
  else { fbCopy(txt); }
}
function fbCopy(txt) {
  var ta = document.createElement("textarea");
  ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
}
function gCopiar() {
  if (!GNOTAS.length) { return; }
  copyText(GNOTAS.join(",")); toast(GNOTAS.length + " notas copiadas");
}
function gCopiarFiltro(tipo) {
  var lista = GNOTAS.filter(function (os) { return G_MAPA[os] === tipo; });
  if (!lista.length) { toast("Nenhuma nota identificada como " + (tipo === "caixa" ? "CX" : "Poste")); return; }
  copyText(lista.join(","));
  toast(lista.length + " nota(s) " + (tipo === "caixa" ? "CX" : "Poste") + " copiadas");
}
function gLimpar() {
  GNOTAS = []; G_MAPA = {};
  document.getElementById("gin").value = "";
  document.getElementById("gout").value = "";
  document.getElementById("gstat-total").textContent = "—";
  document.getElementById("gstat-dup").textContent = "—";
  /* Show empty state */
  var emptyEl = document.getElementById("gdis-empty-state");
  if (emptyEl) { emptyEl.style.display = "flex"; }
  gAtualizar(); toast("Campos limpos");
}

/* COORDENADAS */
var CFMT = "ponto", CLAT = null, CLON = null;
function cFmt(v) {
  CFMT = v;
  ["ponto", "virgula"].forEach(function (x) { document.getElementById("fmt-" + x).classList.toggle("on", x === v); });
  cConverter();
}
function cConverter() {
  var val = document.getElementById("cinput").value.trim();
  var latEl = document.getElementById("clat");
  var lonEl = document.getElementById("clon");
  var hint = document.getElementById("coord-hint");
  if (!val) {
    CLAT = null; CLON = null;
    latEl.textContent = "—"; lonEl.textContent = "—";
    latEl.className = "coord-box-val"; lonEl.className = "coord-box-val";
    hint.textContent = "Aguardando entrada…"; return;
  }
  var nums = val.match(/-?\d+(?:[.,]\d+)?/g);
  if (!nums || nums.length < 2) {
    latEl.textContent = "Inválido"; lonEl.textContent = "Inválido";
    latEl.className = "coord-box-val"; lonEl.className = "coord-box-val";
    hint.textContent = "Formato não reconhecido"; return;
  }
  var lat = parseFloat(nums[0].replace(",", "."));
  var lon = parseFloat(nums[1].replace(",", "."));
  if (isNaN(lat) || isNaN(lon)) {
    latEl.textContent = "Inválido"; lonEl.textContent = "Inválido";
    hint.textContent = "Valores inválidos"; return;
  }
  CLAT = lat; CLON = lon;
  var f = function (v) { return CFMT === "virgula" ? v.toString().replace(".", ",") : v.toString(); };
  latEl.textContent = f(CLAT); lonEl.textContent = f(CLON);
  latEl.className = "coord-box-val filled"; lonEl.className = "coord-box-val filled";
  hint.textContent = "Clique nos campos para copiar individualmente";
  cAddHist(f(CLAT), f(CLON), val);
}
function cCopiar(campo) {
  var v = campo === "lat" ? CLAT : CLON;
  if (v === null) { return; }
  var f = function (v) { return CFMT === "virgula" ? v.toString().replace(".", ",") : v.toString(); };
  copyText(f(v)); toast((campo === "lat" ? "Latitude" : "Longitude") + " copiada");
}
function cCopiarTudo() {
  if (CLAT === null) { return; }
  var f = function (v) { return CFMT === "virgula" ? v.toString().replace(".", ",") : v.toString(); };
  copyText(f(CLAT) + " " + f(CLON)); toast("Lat + Lon copiados");
}
function cLimpar() {
  document.getElementById("cinput").value = "";
  CLAT = null; CLON = null;
  document.getElementById("clat").textContent = "—";
  document.getElementById("clon").textContent = "—";
  document.getElementById("clat").className = "coord-box-val";
  document.getElementById("clon").className = "coord-box-val";
  document.getElementById("coord-hint").textContent = "Aguardando entrada…";
}
function cAddHist(lat, lon, orig) {
  var already = COORD_HIST.some(function (h) { return h.lat === lat && h.lon === lon; });
  if (already) { return; }
  COORD_HIST.unshift({ lat: lat, lon: lon, orig: orig });
  if (COORD_HIST.length > 8) { COORD_HIST.pop(); }
  var el = document.getElementById("coord-hist");
  el.innerHTML = "";
  COORD_HIST.forEach(function (h, idx) {
    var row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:12px;gap:10px;";
    if (idx === COORD_HIST.length - 1) { row.style.borderBottom = "none"; }
    var origSpan = document.createElement("span");
    origSpan.style.cssText = "color:var(--muted);font-size:11px;font-family:var(--mono);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
    origSpan.textContent = h.orig;
    var valSpan = document.createElement("span");
    valSpan.style.cssText = "font-family:var(--mono);font-weight:700;color:var(--accent);white-space:nowrap;";
    valSpan.textContent = h.lat + "  " + h.lon;
    var btn = document.createElement("button");
    btn.style.cssText = "background:transparent;border:1px solid var(--border2);border-radius:5px;color:var(--muted);cursor:pointer;font-size:11px;padding:3px 8px;font-family:var(--sans);transition:all .15s;flex-shrink:0;";
    btn.textContent = "Copiar";
    var hLat = h.lat, hLon = h.lon;
    btn.onclick = function () { copyText(hLat + " " + hLon); toast("Copiado"); };
    btn.onmouseover = function () { this.style.borderColor = "var(--accent)"; this.style.color = "var(--accent)"; };
    btn.onmouseout = function () { this.style.borderColor = "var(--border2)"; this.style.color = "var(--muted)"; };
    row.appendChild(origSpan); row.appendChild(valSpan); row.appendChild(btn);
    el.appendChild(row);
  });
}

/* ── CONSULTAS ── */
var INDICADORES = [
  {
    id: "emerg-mt",
    label: "EMERG.MT",
    color: "#f52323",
    bg: "rgba(245, 35, 35, 0.10)",
    border: "rgba(245, 35, 35, 0.28)",
    desc: "Emergência Média Tensão",
    servicos: ["RC01", "RC08", "RC09", "RC11"]
  },
  {
    id: "emerg-bt",
    label: "EMERG.BT",
    color: "#f5a623",
    bg: "rgba(245,166,35,.10)",
    border: "rgba(245,166,35,.28)",
    desc: "Emergência Baixa Tensão",
    servicos: ["RC03", "RC04", "RC05", "RC06", "RC07",
      "RC14", "RC15", "RC16", "RC17", "RC18", "RC19",
      "RC21", "RC30", "RC32", "RC40", "RC41", "RC43", "RC45",
      "RC48", "RC90"]
  },
  {
    id: "pmal",
    label: "PMAL",
    color: "#00d4aa",
    bg: "rgba(0,212,170,.12)",
    border: "rgba(0,212,170,.3)",
    desc: "Manutenção de Ativos de Linha",
    servicos: ["AP01", "AP14", "AP79", "OSA1", "OSAC", "OSAQ", "OSCM", "OSIN", "OSIR",
      "OSLI", "OSLN", "OSLQ", "OSM1", "OSML", "OSMR", "OSRO", "OSSC",
      "OSSM", "OSVQ", "RC79", "RC81", "RC82", "APAA", "APMG", "GD81", "OSA2",
      "OSAA", "OSLA", "OSRL"]
  },
  {
    id: "pmar",
    label: "PMAR",
    color: "#a78bfa",
    bg: "rgba(167,139,250,.10)",
    border: "rgba(167,139,250,.28)",
    desc: "Manutenção de Ativos de Rede",
    servicos: ["ORNI", "ORSD", "ORSG", "ORTA", "ORTC"]
  },
  {
    id: "pmag",
    label: "PMAG",
    color: "#38bdf8",
    bg: "rgba(56,189,248,.10)",
    border: "rgba(56,189,248,.28)",
    desc: "Manutenção de Ativos de Geração",
    servicos: ["AP06", "AP24", "AP34", "AP40", "AP41", "AP43", "AP44",
      "LMT1", "NLMP", "NSCI", "NSME", "NSRC",
      "OS14", "OSDC", "OSIM", "OSRP", "OSRR",
      "OSTA", "OSTD", "OSTL", "OSTM", "OSTN", "OSTR", "OSTT",
      "RC02", "RC20", "RC42", "RC43", "RC45", "RC46", "RC48", "RC54", "RC95",
      "RCLD", "RCOP", "RCRN"]
  }
];

// Mapa reverso: código → indicador
var CONSULT_MAP = {};
INDICADORES.forEach(function (ind) {
  ind.servicos.forEach(function (s) { CONSULT_MAP[s] = ind; });
});


var DESC_NOTAS = {
  "RC01": "ABALROAMENTO DE POSTE",
  "RC03": "RISCO DE CHOQUE ELETRICO",
  "RC04": "CURTO NA TUBULACAO",
  "RC05": "FAISCAMENTO",
  "RC06": "FALTA DE ENERGIA NO TRAFO",
  "RC07": "FALTA ENERGIA NO CONSUMIDOR",
  "RC08": "FALTA ENERGIA NA REDE",
  "RC09": "FIO PARTIDO",
  "RC11": "FALTA DE ENERGIA EM RELIGADOR/SEC TRIFASICO",
  "RC14": "OBJETOS ESTRANHOS NA REDE",
  "RC15": "POSTE EM MAU ESTADO",
  "RC16": "RAMAL PARTIDO",
  "RC17": "TENSAO ELEVADA",
  "RC18": "TENSAO BAIXA",
  "RC19": "TENSAO OSCILANTE",
  "RC21": "TRANSFORMADOR EM CHAMAS/CRUZETA QUEBRADA",
  "RC30": "FALTA DE ENERGIA NO TRAFO",
  "RC32": "TROCA DISJUNTOR C/FALTA ENERGIA",
  "RC40": "VERIFICACAO DE TRANSFORMADOR",
  "RC41": "FALTA ENERGIA - SEM PONTO DE INSTALACAO",
  "RC43": "VERIFICACAO DE RD/EQUIPAMENTO FURTADO OU",
  "RC45": "VAZAMENTO-CONTAMINACAO OLEO ISOLANTE",
  "RC48": "MEIO AMBIENTE OUTRAS RECLAMACAO",
  "RC79": "VISTORIA EM QUADRO DE MEDICAO COLETIVO",
  "RC81": "INSTALAR RAMAL",
  "RC82": "CONECTAR RAMAL NA REDE",
  "RC90": "VARIACAO TENSAO PERMANENTE",

  "RC02": "SOLICITACAO DE PODA DE ARVORE",
  "RC20": "TROCA DISJUNTOR S/ FALTA ENERGIA",
  "RC42": "FALTA ENERGIA NO CONSUMIDOR FOTOVOLTAICO",
  "RC46": "RUIDO PROVOCADO EQUIPAMENTO NA REDE",
  "RC54": "VERIFICACAO DE MEDIDOR - ORDEM JUDICIAL",
  "RC95": "VERIFICACAO DE MEDIDOR DO FATURAMENTO",
  "RCLD": "VISITA TECNICA LIG. E OUTROS COMERCIAIS",
  "RCOP": "VISITA TECNICA - OPERACAO",
  "RCRN": "VISITA TECNICA - INSPECAO UC",

  "AP01": "NOVA LIGACAO - MT",
  "AP06": "TROCAR MEDICAO - MT",
  "AP14": "ALTERAR DEMANDA - MT",
  "AP24": "AFERICAO DE MEDIDOR - MT",
  "AP34": "VISITA TECNICA SEM COBRANCA",
  "AP40": "VISTORIA P/ MIGRACAO CLIENTE LIVRE",
  "AP41": "2A VISTORIA P/ MIGRACAO CLIENTE LIVRE",
  "AP43": "MIGRACAO DE CLIENTE PARA MERCADO LIVRE",
  "AP44": "VISITA TECNICA COM COBRANCA",
  "AP79": "RESTABELECIMENTO MT NOVO CLIENTE",
  "APAA": "ALT CARG ACESSANTE MICRO/MINI GERACAO MT",
  "APMG": "LIG.NOVA P/ACESSANTES MICRO/MINI GERACAO",

  "GD81": "INSTALAR RAMAL GD",

  "ORNI": "CONTING. RELIGAR NORMAL TELEMEDICAO",
  "ORSD": "RELIGAR NORMAL",
  "ORSG": "RELIGACAO NO POSTE/REDE",
  "ORTA": "CONTING. RELIGACAO TACITA TELEMEDICAO",
  "ORTC": "RELIGACAO TACITA",

  "LMT1": "LEITURA - MT",
  "NLMP": "MANUTENCAO EM CAIXA COM MEDICAO NO POSTE",

  "NSCI": "NSSM CIRCUITO",
  "NSME": "NSSM MEDICAO",
  "NSRC": "NSSM REDE",

  "OS14": "ALT CARG RETORN MICROMINI GER P/CONV BT",
  "OSAA": "ALT CARG ACESSANTE MICRO/MINI GERACAO BT",
  "OSA1": "ALTERACAO DE CARGA EM INSTALACAO CORTADA",
  "OSA2": "ALT CARG ACESS/MICRO/MINI GER IN CORTADA",
  "OSAC": "ALTERACAO DE CARGA",
  "OSAQ": "ALTERAR CARGA DE UC EM QM VISTORIADO",
  "OSCM": "CONTING RESTABELECIMENTO TELEMEDICAO",
  "OSDC": "DESLIGAR CONSUMIDOR",
  "OSIM": "INSTALAR MEDIDOR",
  "OSIN": "INSPECAO",
  "OSIR": "RESTABELECER COM INSTALACAO RAMAL",
  "OSLA": "LIG. NOVA P/ACESSANTE MICRO/MINI GERACAO",
  "OSLI": "LIGAR NOVO CONSUMIDOR - MEDICAO INDIRETA",
  "OSLN": "LIGAR NOVO CONSUMIDOR",
  "OSLQ": "LIGACAO NOVA DE UC EM QM VISTORIADO",
  "OSM1": "MANUTENCAO",
  "OSML": "PMAL BT",
  "OSMR": "MANUTENCAO RAMAL",
  "OSRO": "RESTABELECER COM MUDANÇA DE LOCAL",
  "OSRR": "RETIRAR RAMAL",
  "OSSC": "SUBSTITUICAO",
  "OSSM": "SUBSTITUICAO MEDIDOR",
  "OSTA": "SERVICO TRANSFORMADOR",
  "OSTD": "TROCA DISJ.",
  "OSTL": "TROCA LAMP.",
  "OSTM": "TROCA MEDIDOR",
  "OSTN": "TROCA NEUTRO",
  "OSTR": "TROCA RAMAL",
  "OSTT": "TROCA TRAFO",
  "OSVQ": "VISTORIA DE QM PARA ADEQUACAO DA LIGACAO",

  "OSRL": "RESTABELECER NA CAIXA",

  "RC36": "REGULARIZAR APOS CC SEM COB TAXA",
  "RC23": "REGULARIZAR APOS CC COM COB TAXA",
  "RC68": "LIGAR PROVISORIA SEM MEDICAO",
  "RC69": "LIGAR PROVISORIA COM MEDICAO",
  "RC70": "DESLIGAR PROVISORIA COM MEDICAO",
  "RC72": "DESLIGAR PROVISORIA SEM MEDICAO",
  "RC94": "DESLIGAR NO POSTE - ARTIGO 355",
  "RC53": "RELIGACAO POR ORDEM JUDICIAL",
  "RC85": "VERIFICAR CARGA IRRIGANTE NOTURNO",
  "RC86": "ABRIR E SELAR BORNE/CAIXA DE MEDICAO",

  "RC68": "LIGAR PROVISORIA SEM MEDICAO",
  "RC69": "LIGAR PROVISORIA COM MEDICAO",
  "RC70": "DESLIGAR PROVISORIA COM MEDICAO",
  "OSCI": "OS DE CORTE PARA CONSERTO ISENTO DE TAXA",
  "OSDC": "DESLIGAR CONSUMIDOR",
  "OSRP": "REPROGRAMAR MEDIDOR ELETRONICO"
};

function showChipDesc(code, desc, ev) {
  var tt = document.getElementById("chip-tooltip");
  tt.textContent = code + " — " + desc;
  tt.style.display = "block";
  tt.style.left = (ev.pageX + 12) + "px";
  tt.style.top = (ev.pageY + 12) + "px";
}

function hideChipDesc() {
  var tt = document.getElementById("chip-tooltip");
  tt.style.display = "none";
}

function consultRender() {
  var grid = document.getElementById("consult-grid");
  grid.innerHTML = INDICADORES.map(function (ind) {
    var chips = ind.servicos.map(function (s) {
      var desc = DESC_NOTAS[s] || s;
      return "<span class=\"consult-chip\" style=\"color:" + ind.color + ";background:" + ind.bg + ";border-color:" + ind.border + "\" onmouseover=\"showChipDesc('" + s + "','" + desc + "',event)\" onmouseout=\"hideChipDesc()\">" + s + "</span>";
    }).join("");
    return "<div class=\"consult-card c-" + ind.id + "\">" +
      "<div class=\"consult-header\">" +
      "<div class=\"consult-header-ic\" style=\"background:" + ind.bg + ";border:1.5px solid " + ind.border + ";color:" + ind.color + "\">" + ind.label.charAt(0) + "</div>" +
      "<div class=\"consult-header-title\" style=\"color:" + ind.color + "\">" + ind.label + "</div>" +
      "<span class=\"consult-header-count\" style=\"color:" + ind.color + ";background:" + ind.bg + ";border-color:" + ind.border + "\">" + ind.servicos.length + "</span>" +
      "</div>" +
      "<div class=\"consult-chips\">" + chips + "</div>" +
      "</div>";
  }).join("");
}

function consultLimpar() {
  document.getElementById("consult-search").value = "";
  consultSearch();
}

function consultSearch() {
  var q = document.getElementById("consult-search").value.trim().toUpperCase();
  var resEl = document.getElementById("consult-search-result");
  var gridEl = document.getElementById("consult-grid");

  if (!q) {
    resEl.style.display = "none";
    gridEl.style.display = "grid";
    return;
  }

  gridEl.style.display = "none";
  resEl.style.display = "block";

  // Busca parcial
  var hits = Object.keys(CONSULT_MAP).filter(function (k) {
    return k.indexOf(q) >= 0;
  });

  if (!hits.length) {
    resEl.innerHTML =
      '<div class="card"><div class="consult-none">Nenhum tipo de serviço encontrado para "' +
      q +
      '".</div></div>';
    return;
  }

  var rows = hits
    .map(function (code) {
      var ind = CONSULT_MAP[code];
      var desc = DESC_NOTAS[code] || "Descrição não cadastrada";

      return (
        '<div class="consult-search-hit">' +
        '<span class="consult-search-code">' +
        code +
        "</span>" +
        '<span class="consult-search-badge" style="color:' +
        ind.color +
        ";background:" +
        ind.bg +
        ";border:1px solid " +
        ind.border +
        '">' +
        ind.label +
        "</span>" +
        '<span style="font-size:12px;color:var(--muted);font-family:var(--mono);margin-left:auto;text-align:right;">' +
        desc +
        "</span>" +
        "</div>"
      );
    })
    .join("");

  resEl.innerHTML =
    '<div style="margin-bottom:8px;font-size:11px;color:var(--muted);">' +
    hits.length +
    ' resultado(s) para "' +
    q +
    '"</div>' +
    rows;
}


var CV = { tensao: 220, fase: "tri", fp: 0.85, unidade: "kva", customV: false };
var CV_REFS = [5, 10, 15, 25, 30, 37.5, 45, 50, 75, 100, 112.5, 150, 200, 250, 300];

function cvLimpar() {
  document.getElementById("cv-valor").value = "";
  document.getElementById("cv-results").innerHTML = "<div class=\"cv-empty\">Insira um valor para converter.</div>";
  cvRenderTable();
}
function cvRenderVoltageButtons() {
  var bar = document.getElementById("cv-vbar");
  if (CV.fase === "tri") {
    bar.innerHTML =
      "<div class=\"rb" + (CV.tensao === 220 && !CV.customV ? " on" : "") + "\" id=\"cvt-220\" onclick=\"cvSetV(220)\">220 V</div>" +
      "<div class=\"rb" + (CV.tensao === 127 && !CV.customV ? " on" : "") + "\" id=\"cvt-127\" onclick=\"cvSetV(127)\">127 V</div>" +
      "<div class=\"rb" + (CV.tensao === 380 && !CV.customV ? " on" : "") + "\" id=\"cvt-380\" onclick=\"cvSetV(380)\">380 V</div>" +
      "<div class=\"rb" + (CV.customV ? " on" : "") + "\" id=\"cvt-custom\" onclick=\"cvSetV('custom')\">Outro</div>";
  } else {
    // Monofásico CEMIG: 110V (MT rural) ou 240V (padrão BT)
    bar.innerHTML =
      "<div class=\"rb" + (CV.tensao === 240 && !CV.customV ? " on" : "") + "\" id=\"cvt-240\" onclick=\"cvSetV(240)\">240 V</div>" +
      "<div class=\"rb" + (CV.tensao === 110 && !CV.customV ? " on" : "") + "\" id=\"cvt-110\" onclick=\"cvSetV(110)\">110 V</div>" +
      "<div class=\"rb" + (CV.customV ? " on" : "") + "\" id=\"cvt-custom\" onclick=\"cvSetV('custom')\">Outro</div>";
  }
}

function cvSetV(v) {
  var inp = document.getElementById("cv-tensao");
  if (v === "custom") {
    CV.customV = true;
    inp.style.display = "block";
    CV.tensao = parseFloat(inp.value) || CV.tensao;
  } else {
    CV.customV = false;
    CV.tensao = v;
    inp.style.display = "none";
  }
  cvRenderVoltageButtons();
  cvCalc();
}
function cvSetF(f) {
  CV.fase = f;
  // Ajusta tensão padrão ao mudar fase
  if (f === "mono" && (CV.tensao === 127 || CV.tensao === 220 || CV.tensao === 380)) { CV.tensao = 240; CV.customV = false; }
  if (f === "tri" && (CV.tensao === 110 || CV.tensao === 240)) { CV.tensao = 220; CV.customV = false; }
  document.getElementById("cv-tensao").style.display = "none";
  ["tri", "mono"].forEach(function (x) { document.getElementById("cvf-" + x).classList.toggle("on", x === f); });
  cvRenderVoltageButtons();
  cvCalc();
}
function cvSetFP(fp) {
  CV.fp = fp;
  ["085", "090", "092", "1"].forEach(function (x) {
    var val = x === "085" ? 0.85 : x === "090" ? 0.90 : x === "092" ? 0.92 : 1.0;
    document.getElementById("cvfp-" + x).classList.toggle("on", val === fp);
  });
  cvCalc();
}
function cvSetU(u) {
  CV.unidade = u;
  ["kva", "kw", "a"].forEach(function (x) { document.getElementById("cvu-" + x).classList.toggle("on", x === u); });
  cvCalc();
}

function cvToKVA(val, u) {
  if (u === "kva") { return val; }
  if (u === "kw") { return val / CV.fp; }
  // A → kVA
  if (CV.fase === "tri") { return (val * Math.sqrt(3) * CV.tensao) / 1000; }
  return (val * CV.tensao) / 1000;
}
function cvFromKVA(kva) {
  var kw = kva * CV.fp;
  var a = CV.fase === "tri" ? (kva * 1000) / (Math.sqrt(3) * CV.tensao) : (kva * 1000) / CV.tensao;
  return { kva: kva, kw: kw, a: a };
}
function cvFmt(v, dec) { return v.toFixed(dec === undefined ? 2 : dec).replace(".", ","); }

function cvCalc() {
  var raw = parseFloat(document.getElementById("cv-valor").value);
  var el = document.getElementById("cv-results");
  if (!raw || isNaN(raw)) { el.innerHTML = "<div class=\"cv-empty\">Insira um valor para converter.</div>"; cvRenderTable(); return; }
  var kva = cvToKVA(raw, CV.unidade);
  var r = cvFromKVA(kva);
  var items = [
    { lbl: "Potência Aparente", val: cvFmt(r.kva) + " kVA", hl: CV.unidade === "kva" },
    { lbl: "Potência Ativa", val: cvFmt(r.kw) + " kW", hl: CV.unidade === "kw" },
    { lbl: "Corrente", val: cvFmt(r.a, 1) + " A", hl: CV.unidade === "a" },
    { lbl: "Fator de Potência", val: CV.fp.toFixed(2).replace(".", ","), hl: false },
    { lbl: "Tensão / Fases", val: CV.tensao + " V — " + (CV.fase === "tri" ? "Trifásico" : "Monofásico"), hl: false }
  ];
  el.innerHTML = items.map(function (it) {
    return "<div class=\"cv-result-item" + (it.hl ? " highlight" : "") + "\">" +
      "<span class=\"cv-result-lbl\">" + it.lbl + "</span>" +
      "<span class=\"cv-result-val\">" + it.val + "</span>" +
      "</div>";
  }).join("");
  /* Update KPI strip */
  var kpiKva = document.getElementById("kpi-cv-kva");
  var kpiKw = document.getElementById("kpi-cv-kw");
  var kpiA = document.getElementById("kpi-cv-a");
  var kpiAt = document.getElementById("kpi-cv-atip");
  if (kpiKva && raw && !isNaN(raw)) {
    var kva2 = cvToKVA(raw, CV.unidade); var r2 = cvFromKVA(kva2);
    if (kpiKva) kpiKva.textContent = cvFmt(r2.kva) + " kVA";
    if (kpiKw) kpiKw.textContent = cvFmt(r2.kw) + " kW";
    if (kpiA) kpiA.textContent = cvFmt(r2.a, 1) + " A";
    if (kpiAt) kpiAt.textContent = CV.tensao + "V — " + (CV.fase === "tri" ? "Trifásico" : "Monofásico");
  } else {
    ["kpi-cv-kva", "kpi-cv-kw", "kpi-cv-a"].forEach(function (id) { var e = document.getElementById(id); if (e) e.textContent = "—"; });
  }
  cvRenderTable();
}

function cvRenderTable() {
  var lbl = (CV.fase === "tri" ? "Trifásico" : "Monofásico") + " " + CV.tensao + " V, FP " + CV.fp.toFixed(2).replace(".", ",");
  document.getElementById("cv-ref-label").textContent = lbl;
  var rows = CV_REFS.map(function (kva) {
    var r = cvFromKVA(kva);
    return "<div class=\"cv-table-row\" onclick=\"document.getElementById('cv-valor').value='" + kva + "';cvSetU('kva');cvCalc();\">" +
      "<div class=\"cv-table-cell\">" + kva + " kVA</div>" +
      "<div class=\"cv-table-cell\">" + cvFmt(r.kva) + " kVA</div>" +
      "<div class=\"cv-table-cell\">" + cvFmt(r.kw) + " kW</div>" +
      "<div class=\"cv-table-cell\">" + cvFmt(r.a, 1) + " A</div>" +
      "</div>";
  }).join("");
  document.getElementById("cv-table").innerHTML =
    "<div class=\"cv-table-row header\">" +
    "<div class=\"cv-table-cell\">Potência</div>" +
    "<div class=\"cv-table-cell\">kVA</div>" +
    "<div class=\"cv-table-cell\">kW</div>" +
    "<div class=\"cv-table-cell\">Corrente (A)</div>" +
    "</div>" + rows;
}

/* INIT */
gAtualizar(); cvRenderVoltageButtons(); cvRenderTable(); consultRender();
/* Interligação: inicia sem vãos e sem resultado */
renderVaos();
/* Editor de curva */
requestAnimationFrame(function () { ceInit(); ceUpdateInfo(); });

/* Registra listener de paste para extração automática G-Dis */
(function () {
  var ginEl = document.getElementById('gin');
  if (ginEl && !ginEl._pasteRegistered) {
    ginEl.addEventListener('paste', gOnPaste);
    ginEl._pasteRegistered = true;
  }
})();