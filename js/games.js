/* =========================================================
   Juegos, progreso y simulacro (TP 4, 5 y 6)
   ========================================================= */
(function () {
  "use strict";

  const STORE_KEY = "tp456-progress-v1";
  const SIM_KEY = "tp456-sim-v1";
  const GAME_IDS = ["estado", "regimen", "vueltas", "formas", "gobiernos", "vf", "fichas"];

  /* ---------- utilidades ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canAnimate = () => Element.prototype.animate && !reduced;

  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; }
  }
  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* modo privado */ }
  }

  /* ---------- progreso ---------- */
  let progress = readJSON(STORE_KEY);
  const doneBadge = (id) => (progress[id] ? ' · <span class="done-badge">✓ hecho</span>' : "");

  function renderProgress(bump) {
    const done = GAME_IDS.filter((id) => progress[id]).length;
    $("#gamesDone").textContent = done;
    $("#gamesTotal").textContent = GAME_IDS.length;
    if (bump) {
      const chip = $(".score-chip");
      chip.classList.remove("bump");
      void chip.offsetWidth;
      chip.classList.add("bump");
    }
    document.querySelectorAll("#arenaTabs .tab").forEach((tab) => {
      let tick = tab.querySelector(".tick");
      if (progress[tab.dataset.tab] && !tick) {
        tick = document.createElement("span");
        tick.className = "tick";
        tick.textContent = "✓";
        tab.appendChild(tick);
      } else if (!progress[tab.dataset.tab] && tick) {
        tick.remove();
      }
    });
    return done;
  }

  function markDone(id) {
    if (progress[id]) return;
    progress[id] = true;
    writeJSON(STORE_KEY, progress);
    const done = renderProgress(true);
    if (done === GAME_IDS.length) {
      toast("¡Completaste los 7 juegos! Soberanía total sobre la materia.");
      confetti(120);
    } else {
      toast(`Juego completado · ${done}/${GAME_IDS.length}`);
      confetti(50);
    }
  }

  function resetProgress() {
    progress = {};
    writeJSON(STORE_KEY, progress);
    renderProgress(true);
    toast("Progreso reiniciado");
  }

  /* ---------- toast y confetti ---------- */
  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-on"), 2800);
  }

  function confetti(n) {
    if (!canAnimate()) return;
    const colors = ["#e8b64c", "#f6d68a", "#74b4e8", "#ffffff", "#d4405a"];
    const w = window.innerWidth;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span");
      p.className = "confetti";
      p.style.background = colors[i % colors.length];
      document.body.appendChild(p);
      const x0 = w / 2 + (Math.random() - 0.5) * 120;
      const x1 = x0 + (Math.random() - 0.5) * w * 0.9;
      const yPeak = window.innerHeight * (0.15 + Math.random() * 0.3);
      p.animate(
        [
          { transform: `translate(${x0}px, ${window.innerHeight}px) rotate(0deg)`, opacity: 1 },
          { transform: `translate(${(x0 + x1) / 2}px, ${yPeak}px) rotate(${Math.random() * 360}deg)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${x1}px, ${window.innerHeight + 40}px) rotate(${Math.random() * 900}deg)`, opacity: 0.8 },
        ],
        { duration: 1600 + Math.random() * 1200, easing: "cubic-bezier(.2,.7,.4,1)", delay: Math.random() * 200 }
      ).onfinish = () => p.remove();
    }
  }

  function endScreen(el, { score, total, review = [], onRetry, id }) {
    const pct = total ? score / total : 0;
    const msg =
      pct === 1 ? "Perfecto. Mandato cumplido."
      : pct >= 0.8 ? "Muy bien, casi con quórum propio."
      : pct >= 0.5 ? "Vas bien, repasá los errores."
      : "Volvé a la sección y probá de nuevo.";
    el.innerHTML = `
      <div class="end">
        <p class="kicker">Resultado</p>
        <p class="end-score">${score}/${total}</p>
        <p class="end-msg">${msg}</p>
        ${review.length ? `<p class="end-sub">Para repasar:</p><div class="review">${review.map((r) => `<div>${r}</div>`).join("")}</div>` : `<p class="end-sub">Sin errores.</p>`}
        <div class="end-actions"><button class="btn btn-gold" data-retry>Jugar de nuevo</button></div>
      </div>`;
    el.querySelector("[data-retry]").addEventListener("click", onRetry);
    markDone(id);
  }

  /* =========================================================
     Clasificar en dos (deslizar o tocar)
     ========================================================= */
  const BINARY = {
    estado: {
      kicker: "Juego · TP4",
      title: "¿Está en la definición?",
      desc: "¿Esta pieza está en la definición de Estado o es un atributo que le falta? Deslizá, tocá o usá ← →.",
      left: "En la definición",
      right: "Le falta",
      items: [
        { t: "Territorio", a: "L", why: "El espacio geográfico donde ejerce su poder está en la definición." },
        { t: "Población", a: "L", why: "El conjunto de personas sobre las que ejerce el poder está en la definición." },
        { t: "Monopolio de la fuerza", a: "L", why: "El derecho exclusivo al uso de la fuerza está en la definición." },
        { t: "Conjunto de normas", a: "L", why: "El orden jurídico está en la definición." },
        { t: "Forma de organización histórica", a: "L", why: "Es el primer elemento de la definición." },
        { t: "Reconocimiento de otros Estados", a: "L", why: "La definición sí lo incluye." },
        { t: "Monopolio fiscal", a: "R", why: "Controlar sus recursos con impuestos y rentas no aparece en la definición." },
        { t: "Burocracia estatal", a: "R", why: "La organización que hace cumplir las normas no está en la definición." },
        { t: "Soberanía", a: "R", why: "El texto la nombra junto al reconocimiento, pero la definición no la menciona." },
      ],
    },
    regimen: {
      kicker: "Juego · TP5",
      title: "¿Democracia o autocracia?",
      desc: "Clasificá cada rasgo según el régimen al que corresponde.",
      left: "Democracia",
      right: "Autocracia",
      items: [
        { t: "Decide la mayoría y respeta a la minoría", a: "L", why: "Es la definición de democracia (pág. 45)." },
        { t: "El poder se ejerce sin control real del pueblo", a: "R", why: "Es lo que define a la autocracia (pág. 48)." },
        { t: "Los otros poderes están subordinados al ejecutivo", a: "R", why: "En la autocracia los demás poderes no existen o están subordinados." },
        { t: "Elecciones para elegir representantes", a: "L", why: "Es soberanía popular: el pueblo decide con el voto." },
        { t: "Partido único", a: "R", why: "Es un rasgo del régimen totalitario, una forma de autocracia." },
        { t: "El terror como parte del sistema", a: "R", why: "Propio del totalitarismo." },
        { t: "Consultas populares y referéndums", a: "L", why: "Formas de participación de la soberanía popular." },
        { t: "Prensa independiente que publica los actos", a: "L", why: "La publicidad de los actos permite controlar al gobierno." },
        { t: "El mando concentrado en el ejecutivo", a: "R", why: "La autocracia concentra el mando en quien ejerce el ejecutivo." },
        { t: "División de poderes", a: "L", why: "Evita abusos de las autoridades." },
        { t: "La participación ciudadana es casi imposible", a: "R", why: "Así se define el régimen autoritario (pág. 48)." },
      ],
    },
    vueltas: {
      kicker: "Juego · TP6",
      title: "¿Primera vuelta o balotaje?",
      desc: "¿Qué se definió en cada elección de 2023?",
      left: "1ª vuelta · 22/10",
      right: "Balotaje · 19/11",
      items: [
        { t: "Quién es el presidente", a: "R", why: "En el balotaje se elige solamente al presidente." },
        { t: "Las bancas de Diputados", a: "L", why: "La composición del Congreso la definió el voto de octubre." },
        { t: "Las bancas del Senado", a: "L", why: "También salieron de la primera vuelta; el balotaje no las cambia." },
        { t: "Milei con más del 55%", a: "R", why: "Ese es el resultado del balotaje (BAE Negocios)." },
        { t: "Milei con 29,99%", a: "L", why: "Fue su resultado en la primera vuelta, donde quedó segundo." },
        { t: "Massa primero con 36,78%", a: "L", why: "Escrutinio definitivo de la primera vuelta (La Nación)." },
        { t: "UxP primera minoría en las dos cámaras", a: "L", why: "Las bancas se repartieron en octubre." },
        { t: "Bullrich con 23,81%", a: "L", why: "Resultado de la primera vuelta." },
        { t: "Una elección solo entre dos candidatos", a: "R", why: "El balotaje se hace entre los dos más votados." },
      ],
    },
  };

  function binaryGame(el, id) {
    const cfg = BINARY[id];
    let deck, idx, score, review, locked;

    function start() {
      deck = shuffle(cfg.items).slice(0, 10);
      idx = 0; score = 0; review = []; locked = false;
      el.innerHTML = `
        <div class="game-head">
          <div>
            <p class="kicker">${cfg.kicker}${doneBadge(id)}</p>
            <h3 class="game-title">${cfg.title}</h3>
            <p class="game-desc">${cfg.desc}</p>
          </div>
          <span class="game-stat"><b data-score>0</b> aciertos · <span data-idx>1</span>/${deck.length}</span>
        </div>
        <div class="game-bar"><span data-bar style="transform:scaleX(0)"></span></div>
        <div class="bin-stage" data-stage></div>
        <div class="bin-actions">
          <button class="btn bin-left" data-side="L">← ${cfg.left}</button>
          <button class="btn bin-right" data-side="R">${cfg.right} →</button>
        </div>
        <div class="feedback" data-fb>Empezá cuando quieras.</div>`;
      el.querySelectorAll("[data-side]").forEach((b) => b.addEventListener("click", () => answer(b.dataset.side)));
      renderCards();
    }

    function renderCards() {
      const stage = el.querySelector("[data-stage]");
      stage.innerHTML = "";
      const next = deck[idx + 1];
      if (next) {
        const u = document.createElement("div");
        u.className = "bin-card is-under";
        u.textContent = next.t;
        stage.appendChild(u);
      }
      const c = document.createElement("div");
      c.className = "bin-card";
      c.textContent = deck[idx].t;
      stage.appendChild(c);
      if (canAnimate()) c.animate([{ transform: "translateY(14px) scale(.94)", opacity: 0.5 }, { transform: "none", opacity: 1 }], { duration: 300, easing: "cubic-bezier(.2,.8,.2,1)" });
      dragify(c);
    }

    function dragify(card) {
      let x0 = null, dx = 0;
      card.addEventListener("pointerdown", (e) => {
        if (locked) return;
        x0 = e.clientX; dx = 0;
        card.setPointerCapture(e.pointerId);
        card.style.transition = "none";
      });
      card.addEventListener("pointermove", (e) => {
        if (x0 === null) return;
        dx = e.clientX - x0;
        card.style.transform = `translateX(${dx}px) rotate(${dx / 14}deg)`;
        card.style.background = dx < -30 ? "#d8e9f8" : dx > 30 ? "#f6e3bd" : "";
      });
      const release = () => {
        if (x0 === null) return;
        x0 = null;
        if (Math.abs(dx) > 80) {
          answer(dx < 0 ? "L" : "R", dx);
        } else {
          card.style.transition = "transform .35s cubic-bezier(.2,.8,.2,1)";
          card.style.transform = "";
          card.style.background = "";
        }
      };
      card.addEventListener("pointerup", release);
      card.addEventListener("pointercancel", release);
    }

    function answer(side, fromDx) {
      if (locked || idx >= deck.length) return;
      locked = true;
      const item = deck[idx];
      const ok = item.a === side;
      const fb = el.querySelector("[data-fb]");
      const correctName = item.a === "L" ? cfg.left : cfg.right;
      if (ok) {
        score++;
        fb.className = "feedback ok";
        fb.innerHTML = `<b>✓ ${correctName}.</b> ${item.why}`;
      } else {
        fb.className = "feedback bad";
        fb.innerHTML = `<b>✗ Era ${correctName}.</b> ${item.why}`;
        review.push(`<b>${esc(item.t)}</b> → ${correctName}. ${item.why}`);
      }
      el.querySelector("[data-score]").textContent = score;
      const card = el.querySelector(".bin-card:not(.is-under)");
      const dir = side === "L" ? -1 : 1;
      const startX = fromDx || 0;
      const finish = () => {
        idx++;
        el.querySelector("[data-bar]").style.transform = `scaleX(${idx / deck.length})`;
        if (idx >= deck.length) {
          setTimeout(() => endScreen(el, { score, total: deck.length, review, onRetry: start, id }), ok ? 500 : 1400);
          return;
        }
        el.querySelector("[data-idx]").textContent = idx + 1;
        renderCards();
        locked = false;
      };
      if (card && canAnimate()) {
        card.animate(
          [
            { transform: `translateX(${startX}px) rotate(${startX / 14}deg)`, opacity: 1 },
            { transform: `translateX(${dir * 600}px) rotate(${dir * 30}deg)`, opacity: 0 },
          ],
          { duration: 380, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" }
        ).onfinish = () => setTimeout(finish, ok ? 0 : 700);
      } else {
        setTimeout(finish, ok ? 200 : 900);
      }
    }

    el.tabIndex = 0;
    el.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); answer("L"); }
      if (e.key === "ArrowRight") { e.preventDefault(); answer("R"); }
    });
    start();
  }

  /* =========================================================
     Ordená la historia del Estado
     ========================================================= */
  const ERAS = [
    { y: "1", t: "Estado antiguo" },
    { y: "2", t: "Estado medieval" },
    { y: "3", t: "Estado moderno (monarquía absolutista)" },
    { y: "4", t: "Estado liberal" },
    { y: "5", t: "Estado oligárquico" },
    { y: "6", t: "Crisis del 29 y Estado totalitario" },
    { y: "7", t: "Estado social o de Bienestar" },
    { y: "8", t: "Estados burocrático-autoritarios" },
    { y: "9", t: "Restauración liberal o neoliberal" },
  ];

  function orderGame(el) {
    let placed, mistakes;
    function start() {
      placed = 0; mistakes = 0;
      el.innerHTML = `
        <div class="game-head">
          <div>
            <p class="kicker">Juego · TP4${doneBadge("formas")}</p>
            <h3 class="game-title">Ordená la historia del Estado</h3>
            <p class="game-desc">Tocá las formas de Estado en orden, de la más antigua a la más reciente.</p>
          </div>
          <span class="game-stat"><b data-placed>0</b>/${ERAS.length} · <span data-miss>0</span> errores</span>
        </div>
        <div class="game-bar"><span data-bar style="transform:scaleX(0)"></span></div>
        <ol class="tl-line" data-line><li class="tl-empty" style="background:none;border:0;animation:none">Acá se va armando la historia…</li></ol>
        <div class="tl-pool" data-pool></div>
        <div class="feedback" data-fb>¿Cuál es la primera?</div>`;
      const pool = el.querySelector("[data-pool]");
      shuffle(ERAS.map((e, i) => ({ ...e, i }))).forEach((ev) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "tl-chip";
        b.textContent = ev.t;
        b.addEventListener("click", () => pick(ev, b));
        pool.appendChild(b);
      });
    }
    function pick(ev, btn) {
      const fb = el.querySelector("[data-fb]");
      if (ev.i === placed) {
        const line = el.querySelector("[data-line]");
        if (placed === 0) line.innerHTML = "";
        const li = document.createElement("li");
        li.innerHTML = `<b>${ev.y}</b>${esc(ev.t)}`;
        line.appendChild(li);
        btn.remove();
        placed++;
        fb.className = "feedback ok";
        fb.innerHTML = `<b>✓ Bien.</b> ${placed < ERAS.length ? "¿Qué viene después?" : "¡Historia completa!"}`;
        el.querySelector("[data-placed]").textContent = placed;
        el.querySelector("[data-bar]").style.transform = `scaleX(${placed / ERAS.length})`;
        if (placed === ERAS.length) {
          const score = Math.max(0, ERAS.length - mistakes);
          setTimeout(() => endScreen(el, { score, total: ERAS.length, review: mistakes ? [`Tuviste ${mistakes} error(es). Repasá <b>El Estado en la historia</b>.`] : [], onRetry: start, id: "formas" }), 900);
        }
      } else {
        mistakes++;
        el.querySelector("[data-miss]").textContent = mistakes;
        btn.classList.remove("shake");
        void btn.offsetWidth;
        btn.classList.add("shake");
        fb.className = "feedback bad";
        fb.innerHTML = `<b>✗ Todavía no.</b> Eso viene más adelante.`;
      }
    }
    start();
  }

  /* =========================================================
     ¿Qué gobierno es?
     ========================================================= */
  const GOBIERNOS = [
    { d: "Gobierna una sola persona, que llegó al trono por sucesión.", a: "Monarquía" },
    { d: "Gobierna un grupo de los más ricos o de “sangre” noble, supuestamente los mejor formados.", a: "Aristocracia u oligarquía" },
    { d: "Gobierna todo el pueblo, directa o indirectamente: decide la mayoría y respeta a la minoría.", a: "Democracia" },
    { d: "El ejecutivo se elige por un período determinado de tiempo.", a: "República" },
    { d: "Un pequeño núcleo da un golpe, toma el gobierno y se queda todo lo que puede.", a: "Dictadura o gobierno de facto" },
    { d: "Un rey es Jefe de Estado y un primer ministro elegido por el parlamento es Jefe de Gobierno. Ejemplo: España.", a: "Monarquía parlamentaria" },
    { d: "No hay rey: un presidente puede ser Jefe de Estado y el primer ministro, Jefe de Gobierno.", a: "República parlamentaria" },
    { d: "Partido único, control total de la vida política, social e individual, y el terror como parte del sistema.", a: "Régimen totalitario" },
    { d: "La concentración del poder dificulta extremadamente la participación ciudadana. Se lo suele llamar dictadura.", a: "Régimen autoritario" },
  ];
  const GOV_NAMES = GOBIERNOS.map((g) => g.a);

  function quizGame(el) {
    let qs, idx, score, review;
    function start() {
      qs = shuffle(GOBIERNOS).slice(0, 7);
      idx = 0; score = 0; review = [];
      render();
    }
    function render() {
      const q = qs[idx];
      const opts = shuffle([q.a, ...shuffle(GOV_NAMES.filter((t) => t !== q.a)).slice(0, 3)]);
      el.innerHTML = `
        <div class="game-head">
          <div>
            <p class="kicker">Juego · TP5${doneBadge("gobiernos")}</p>
            <h3 class="game-title">¿Qué gobierno es?</h3>
          </div>
          <span class="game-stat"><b>${score}</b> aciertos · ${idx + 1}/${qs.length}</span>
        </div>
        <div class="game-bar"><span style="transform:scaleX(${idx / qs.length})"></span></div>
        <p class="q-prompt">${q.d}</p>
        <div class="q-opts">${opts.map((o) => `<button class="q-opt" type="button">${o}</button>`).join("")}</div>
        <div class="q-next" data-next></div>`;
      el.querySelectorAll(".q-opt").forEach((b) =>
        b.addEventListener("click", () => {
          const ok = b.textContent === q.a;
          el.querySelectorAll(".q-opt").forEach((x) => {
            x.disabled = true;
            if (x.textContent === q.a) x.classList.add("ok");
          });
          if (ok) score++;
          else { b.classList.add("bad"); review.push(`${q.d} → <b>${q.a}</b>`); }
          const last = idx === qs.length - 1;
          el.querySelector("[data-next]").innerHTML = `<button class="btn btn-gold" type="button">${last ? "Ver resultado" : "Siguiente →"}</button>`;
          const nb = el.querySelector("[data-next] button");
          nb.focus({ preventScroll: true });
          nb.addEventListener("click", () => {
            idx++;
            if (idx >= qs.length) endScreen(el, { score, total: qs.length, review, onRetry: start, id: "gobiernos" });
            else render();
          });
        })
      );
    }
    start();
  }

  /* =========================================================
     Verdadero o falso contrarreloj
     ========================================================= */
  const VF = [
    { s: "El Estado existió siempre.", v: false, why: "Es una forma de organización histórica: apareció en un momento." },
    { s: "Solo el Estado puede usar la fuerza de manera legítima.", v: true, why: "Es el monopolio de la fuerza." },
    { s: "La soberanía aparece en la definición de Estado.", v: false, why: "Aparece entre los atributos, pero no en la definición." },
    { s: "La definición fija una fecha de comienzo del Estado.", v: false, why: "No admite una secuencia de tiempo." },
    { s: "Paraguay se separó en 1811.", v: true, why: "Fue la primera separación después de la Revolución de Mayo." },
    { s: "La plataforma continental da soberanía sobre toda el agua del mar.", v: false, why: "Son derechos sobre el lecho y el subsuelo, no sobre toda el agua." },
    { s: "Malvinas es un problema de reconocimiento de la Argentina como Estado.", v: false, why: "Es un problema de soberanía y territorio." },
    { s: "En el Estado medieval el poder del rey era débil.", v: true, why: "Lo limitaban los señores feudales y la Iglesia." },
    { s: "Para Hobbes, el pacto da origen a un gobierno liberal y representativo.", v: false, why: "Eso es Locke. Hobbes lleva a un gobierno autoritario." },
    { s: "Una república siempre es democrática.", v: false, why: "Puede ser aristocrática o democrática (pág. 47)." },
    { s: "“De facto” significa “de hecho”.", v: true, why: "Sin reconocimiento jurídico, por la fuerza de los hechos." },
    { s: "En un gobierno parlamentario, los legisladores eligen al ejecutivo.", v: true, why: "El ejecutivo surge del Parlamento." },
    { s: "En Argentina siempre existieron gobiernos democráticos.", v: false, why: "Hubo gobiernos de facto, como la última dictadura." },
    { s: "Milei ganó la primera vuelta de 2023.", v: false, why: "Quedó segundo con 29,99%; ganó el balotaje." },
    { s: "El quórum en Diputados es de 129 legisladores.", v: true, why: "La mitad más uno de 257." },
    { s: "Si un candidato incumple sus promesas, puede ir preso.", v: false, why: "El mandato es no vinculante: el costo es político, no jurídico." },
    { s: "La coparticipación es el reparto de impuestos nacionales entre Nación y provincias.", v: true, why: "Así la define el TP6." },
    { s: "El Poder Ejecutivo hace las leyes.", v: false, why: "Las hace el Legislativo; el Ejecutivo administra." },
  ];
  const VF_TIME = 75;

  function vfGame(el) {
    let qs, idx, score, review, timer, t0, running;
    function intro() {
      el.innerHTML = `
        <div class="game-head">
          <div>
            <p class="kicker">Juego · Los tres TP${doneBadge("vf")}</p>
            <h3 class="game-title">Verdadero o falso</h3>
            <p class="game-desc">${VF_TIME} segundos. Respondé todas las que puedas. Teclado: V / F.</p>
          </div>
        </div>
        <div class="vf-start"><button class="btn btn-gold" data-go>Arrancar el reloj</button></div>`;
      el.querySelector("[data-go]").addEventListener("click", start);
    }
    function start() {
      qs = shuffle(VF).slice(0, 12);
      idx = 0; score = 0; review = []; running = true;
      el.innerHTML = `
        <div class="game-head">
          <div>
            <p class="kicker">Juego · Contrarreloj</p>
            <h3 class="game-title">Verdadero o falso</h3>
          </div>
          <span class="game-stat"><b data-score>0</b> aciertos · <span data-left>${VF_TIME}</span>s</span>
        </div>
        <div class="vf-timer"><span data-timer></span></div>
        <p class="vf-statement" data-st></p>
        <div class="vf-actions">
          <button class="btn bin-left" data-v="1">Verdadero</button>
          <button class="btn bin-right" data-v="0">Falso</button>
        </div>
        <div class="feedback" data-fb>¡Vamos!</div>`;
      el.querySelectorAll("[data-v]").forEach((b) => b.addEventListener("click", () => answer(b.dataset.v === "1")));
      show();
      t0 = performance.now();
      const bar = el.querySelector("[data-timer]");
      const left = el.querySelector("[data-left]");
      cancelAnimationFrame(timer);
      const tick = (now) => {
        if (!running) return;
        const rem = Math.max(0, VF_TIME - (now - t0) / 1000);
        bar.style.transform = `scaleX(${rem / VF_TIME})`;
        left.textContent = Math.ceil(rem);
        if (rem <= 0) return finish(true);
        timer = requestAnimationFrame(tick);
      };
      timer = requestAnimationFrame(tick);
    }
    function show() {
      const st = el.querySelector("[data-st]");
      st.textContent = qs[idx].s;
      if (canAnimate()) st.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 250 });
    }
    function answer(v) {
      if (!running) return;
      const q = qs[idx];
      const fb = el.querySelector("[data-fb]");
      if (q.v === v) {
        score++;
        fb.className = "feedback ok";
        fb.innerHTML = `<b>✓</b> ${q.why}`;
      } else {
        fb.className = "feedback bad";
        fb.innerHTML = `<b>✗ Era ${q.v ? "verdadero" : "falso"}.</b> ${q.why}`;
        review.push(`“${esc(q.s)}” → <b>${q.v ? "V" : "F"}</b>. ${q.why}`);
      }
      el.querySelector("[data-score]").textContent = score;
      idx++;
      if (idx >= qs.length) return finish(false);
      show();
    }
    function finish(timeout) {
      running = false;
      cancelAnimationFrame(timer);
      const unanswered = qs.slice(idx).map((q) => `“${esc(q.s)}” → <b>${q.v ? "V" : "F"}</b>. ${q.why}`);
      if (timeout) toast("¡Se acabó el tiempo!");
      endScreen(el, { score, total: qs.length, review: review.concat(unanswered), onRetry: start, id: "vf" });
    }
    el.tabIndex = 0;
    el.addEventListener("keydown", (e) => {
      if (!running) return;
      if (e.key.toLowerCase() === "v") answer(true);
      if (e.key.toLowerCase() === "f") answer(false);
    });
    intro();
  }

  /* =========================================================
     Fichas
     ========================================================= */
  const FICHAS = [
    { f: "Estado", b: "Organización histórica con monopolio de la fuerza sobre un territorio y una población, con normas y reconocida por otros Estados." },
    { f: "Monopolio de la fuerza", b: "Solo el Estado puede usar la fuerza de manera legítima para hacer cumplir las normas." },
    { f: "Monopolio fiscal", b: "El Estado controla sus recursos con impuestos y rentas y regula su economía a través de la burocracia." },
    { f: "Burocracia estatal", b: "La organización que lleva a cabo las normas y directivas del Estado." },
    { f: "Soberanía", b: "Poder supremo del Estado sobre su territorio y población. Interna: nadie arriba. Externa: independencia." },
    { f: "Reconocimiento", b: "Los otros Estados aceptan su dominio y renuncian a aplicar sus normas ahí: se legitiman mutuamente." },
    { f: "Estado liberal", b: "Soberanía en el pueblo, derechos individuales, división de poderes y rol subsidiario en la economía." },
    { f: "Estado de Bienestar", b: "Limita el individualismo de los poderosos: planificación económica y derechos sociales." },
    { f: "Contractualismo", b: "El Estado como pacto: del estado de naturaleza al de sociedad. Hobbes, Locke y Rousseau." },
    { f: "Monarquía / Aristocracia / Democracia", b: "Gobierna uno, unos pocos o todo el pueblo." },
    { f: "República", b: "Periodicidad, soberanía popular, división de poderes, responsabilidad de los funcionarios y publicidad de los actos." },
    { f: "Gobierno de facto", b: "“De hecho”: sin reconocimiento jurídico. Un núcleo da un golpe y se queda lo que puede." },
    { f: "Autocracia", b: "Un hombre, grupo o partido gobierna sin control real del pueblo; el mando se concentra en el ejecutivo." },
    { f: "Totalitarismo", b: "El Estado abarca toda la vida: partido único, control total y terror." },
    { f: "Quórum", b: "La mitad más uno de los miembros: 129 en Diputados y 37 en el Senado." },
    { f: "Gobernabilidad", b: "Capacidad de llevar adelante el programa. Ganar la elección no la garantiza." },
    { f: "Mandato no vinculante", b: "Nadie puede obligar jurídicamente a un candidato a cumplir lo prometido; el costo es político." },
    { f: "Coparticipación", b: "Reparto de los impuestos nacionales entre la Nación y las provincias." },
  ];

  function fichasGame(el) {
    let deck, idx, seen;
    function start(shuffled) {
      deck = shuffled ? shuffle(FICHAS) : FICHAS.slice();
      idx = 0; seen = new Set();
      el.innerHTML = `
        <div class="game-head">
          <div>
            <p class="kicker">Repaso${doneBadge("fichas")}</p>
            <h3 class="game-title">Fichas</h3>
            <p class="game-desc">Decí la definición en voz alta y después tocá la ficha para comprobar. Recorrelas todas.</p>
          </div>
          <span class="game-stat"><b data-seen>0</b>/${deck.length} vistas</span>
        </div>
        <div class="fc-wrap"><button class="fc" type="button" data-fc><span class="fc-in"><span class="fc-face fc-front" data-front></span><span class="fc-face fc-back" data-back></span></span></button></div>
        <div class="fc-nav">
          <button class="btn btn-ghost" data-prev type="button">← Anterior</button>
          <span class="fc-count" data-count></span>
          <button class="btn btn-gold" data-nextc type="button">Siguiente →</button>
        </div>
        <div class="fc-nav" style="justify-content:center"><button class="btn btn-ghost" data-shuffle type="button">Mezclar</button></div>`;
      const fc = el.querySelector("[data-fc]");
      fc.addEventListener("click", () => {
        fc.classList.toggle("is-flipped");
        if (fc.classList.contains("is-flipped")) {
          seen.add(deck[idx].f);
          el.querySelector("[data-seen]").textContent = seen.size;
          if (seen.size === deck.length) markDone("fichas");
        }
      });
      el.querySelector("[data-prev]").addEventListener("click", () => go(-1));
      el.querySelector("[data-nextc]").addEventListener("click", () => go(1));
      el.querySelector("[data-shuffle]").addEventListener("click", () => start(true));
      render();
    }
    function go(d) {
      idx = (idx + d + deck.length) % deck.length;
      const fc = el.querySelector("[data-fc]");
      if (fc.classList.contains("is-flipped")) {
        fc.classList.remove("is-flipped");
        setTimeout(render, 250);
      } else render();
    }
    function render() {
      el.querySelector("[data-front]").innerHTML = `${deck[idx].f}<small>Tocá para ver</small>`;
      el.querySelector("[data-back]").textContent = deck[idx].b;
      el.querySelector("[data-count]").textContent = `${idx + 1} / ${deck.length}`;
    }
    start(false);
  }

  /* =========================================================
     Detector de autocracias (TP5 f)
     ========================================================= */
  function detector() {
    const box = $("#detector");
    if (!box) return;
    const inputs = box.querySelectorAll("input");
    const bar = $("#detBar");
    const out = $("#detOut");
    const update = () => {
      const n = [...inputs].filter((i) => i.checked).length;
      bar.style.transform = `scaleX(${n / inputs.length})`;
      out.innerHTML =
        n === 0 ? "Marcá los criterios que se cumplen."
        : n <= 2 ? `<b>${n}/${inputs.length}</b> criterios. Con pocos criterios, cuesta sostener que es una dictadura: fundamentá con cuidado.`
        : n <= 4 ? `<b>${n}/${inputs.length}</b> criterios. Hay rasgos de <b>autocracia</b>: en tu respuesta, nombrá cada uno con su página.`
        : `<b>${n}/${inputs.length}</b> criterios. El caso encaja con lo que el texto llama <b>régimen autoritario o dictadura</b>.`;
    };
    inputs.forEach((i) => i.addEventListener("change", update));
  }

  /* =========================================================
     Simulacro
     ========================================================= */
  const SIM = [
    {
      q: "Defina el Estado e indique qué atributos no aparecen en la definición del texto.",
      kw: [["historic"], ["fuerza"], ["territorio"], ["poblacion"], ["norma", "juridic"], ["reconoc"], ["fiscal"], ["burocracia", "organizacion"], ["soberan"]],
      labels: ["organización histórica", "monopolio de la fuerza", "territorio", "población", "normas", "reconocimiento", "monopolio fiscal", "burocracia", "soberanía"],
      model: "El Estado es una forma de organización histórica que tiene el derecho exclusivo al uso de la fuerza sobre un territorio y una población, se rige generalmente por un conjunto de normas y es reconocido por otros Estados. Quedan fuera de la definición el monopolio fiscal (controla sus recursos con impuestos y rentas), la organización o burocracia estatal (que hace cumplir las normas) y la soberanía.",
    },
    {
      q: "¿Qué es la soberanía? Dé un ejemplo de problema de soberanía en la Argentina.",
      kw: [["poder supremo", "supremo"], ["territorio"], ["reconoc"], ["interna"], ["externa"], ["pueblo"], ["malvinas", "de wert", "ezeiza", "25.880", "25880"]],
      labels: ["poder supremo", "territorio", "reconocimiento", "interna", "externa", "reside en el pueblo", "un caso concreto"],
      model: "La soberanía es el poder supremo del Estado sobre su territorio y su población: decide y hace cumplir sus normas sin depender de otro poder. Está ligada al reconocimiento de los demás Estados. Tiene una dimensión interna (nadie está por encima del Estado) y una externa (independencia de otros Estados), y en democracia reside en el pueblo. Un ejemplo es Malvinas: el Reino Unido ejerce el control desde 1833 y la Argentina no puede ejercer allí su soberanía, aunque la reclama.",
    },
    {
      q: "Explique por qué el Estado es una construcción sociohistórica, con al menos tres formas estatales.",
      kw: [["antiguo"], ["medieval", "feudal"], ["moderno", "absolutis"], ["liberal"], ["oligarquic"], ["totalitari"], ["bienestar", "social"], ["burocratico", "autoritario"], ["neoliberal"]],
      labels: ["antiguo", "medieval", "moderno / absolutista", "liberal", "oligárquico", "totalitario", "de Bienestar", "burocrático-autoritario", "neoliberal"],
      model: "El Estado cambió según la época. En el Estado medieval el poder del rey era débil frente a los señores feudales y la Iglesia. Con el Estado moderno, desde el siglo XV, la monarquía absolutista centralizó el poder con una burocracia. El Estado liberal ubicó la soberanía en el pueblo, con derechos individuales y división de poderes, y tras la crisis de 1929 surgieron el Estado totalitario y el de Bienestar, con derechos sociales. Todas las formas modernas comparten que el Estado es un centro exclusivo de autoridad.",
    },
    {
      q: "Mencione y explique las características de un gobierno republicano.",
      kw: [["res publica", "cosa publica"], ["periodic"], ["soberania popular", "voto"], ["division de poderes", "division"], ["responsab"], ["publicidad", "boletin"], ["aristocrat"]],
      labels: ["res publica", "periodicidad", "soberanía popular", "división de poderes", "responsabilidad", "publicidad", "puede ser aristocrática"],
      model: "República viene de res publica, la cosa pública. Un gobierno republicano tiene periodicidad de mandatos (nadie gobierna indefinidamente), soberanía popular (el pueblo decide con el voto o en consultas), división de poderes (Legislativo, Ejecutivo y Judicial, para evitar abusos), responsabilidad de los funcionarios (juicio político, Auditoría, Defensor del Pueblo) y publicidad de los actos (Boletín Oficial y prensa). No es sinónimo de democracia: puede ser aristocrática o democrática.",
    },
    {
      q: "Diferencie democracia y autocracia, y dentro de esta, régimen autoritario y totalitario.",
      kw: [["mayoria"], ["minoria"], ["control"], ["ejecutivo"], ["subordin"], ["participacion"], ["dictadura"], ["partido unico"], ["terror"]],
      labels: ["decide la mayoría", "respeta a la minoría", "sin control del pueblo", "concentrado en el ejecutivo", "poderes subordinados", "participación", "dictadura", "partido único", "terror"],
      model: "En la democracia gobierna todo el pueblo, directa o indirectamente: decide la mayoría y respeta a la minoría. En la autocracia un hombre, grupo o partido ejerce el poder sin control real del pueblo, con el mando concentrado en el ejecutivo y los otros poderes subordinados. Es autoritaria cuando la concentración del poder impide o dificulta mucho la participación ciudadana (se la suele llamar dictadura), y totalitaria cuando el Estado abarca toda la vida, con partido único, control total y terror.",
    },
    {
      q: "¿Por qué a Milei le cuesta que le voten sus leyes si ganó las elecciones?",
      kw: [["balotaje", "segunda vuelta"], ["primera vuelta", "octubre"], ["29"], ["banca"], ["quorum"], ["129", "37"], ["minoria"], ["bicameral", "dos camaras"], ["division de poderes", "no legisla"], ["negoci", "gobernabilidad"]],
      labels: ["balotaje", "primera vuelta", "29,99%", "pocas bancas", "quórum", "129 / 37", "oposición primera minoría", "bicameral", "el Ejecutivo no legisla", "negociar"],
      model: "Porque ganar la presidencia no le dio mayoría en el Congreso. Ganó el balotaje con más del 55%, pero las bancas se definieron en la primera vuelta, donde sacó 29,99% y quedó segundo. LLA tiene menos del 15% de Diputados y 7 de 72 senadores, lejos del quórum (129 y 37), y Unión por la Patria es primera minoría en ambas cámaras. Como hay división de poderes y el Congreso es bicameral, el Ejecutivo no legisla: necesita negociar. Ganar no es lo mismo que tener gobernabilidad.",
    },
  ];

  function simulacro() {
    const root = $("#sim");
    if (!root) return;
    const saved = readJSON(SIM_KEY);
    const results = {};
    root.innerHTML = SIM.map(
      (s, i) => `
      <article class="sim-q" data-reveal>
        <header><span class="sim-n">${i + 1}</span><h3>${s.q}</h3></header>
        <textarea data-i="${i}" placeholder="Escribí tu respuesta…" aria-label="Respuesta ${i + 1}"></textarea>
        <div class="sim-actions">
          <button class="btn btn-wine" data-check="${i}" type="button">Corregir</button>
          <button class="btn btn-ghost" data-clear="${i}" type="button">Borrar</button>
          <span class="sim-meter" data-meter="${i}"></span>
        </div>
        <div class="sim-result" data-res="${i}"></div>
      </article>`
    ).join("") + `<div class="sim-total"><span>Palabras clave en tus respuestas corregidas</span><b data-total>—</b></div>`;

    root.querySelectorAll("textarea").forEach((ta) => {
      const i = ta.dataset.i;
      ta.value = saved[i] || "";
      ta.addEventListener("input", () => { saved[i] = ta.value; writeJSON(SIM_KEY, saved); });
    });
    root.querySelectorAll("[data-check]").forEach((b) =>
      b.addEventListener("click", () => {
        const i = +b.dataset.check;
        const s = SIM[i];
        const txt = norm(root.querySelector(`textarea[data-i="${i}"]`).value);
        const hits = s.kw.map((alts) => alts.some((a) => txt.includes(a)));
        const n = hits.filter(Boolean).length;
        results[i] = { n, total: s.kw.length };
        const res = root.querySelector(`[data-res="${i}"]`);
        res.innerHTML = `
          <ul class="kw">${s.labels.map((l, k) => `<li class="${hits[k] ? "hit" : ""}">${l}</li>`).join("")}</ul>
          <div class="model"><p class="kicker">Respuesta modelo</p><p>${s.model}</p></div>`;
        res.classList.add("is-on");
        root.querySelector(`[data-meter="${i}"]`).innerHTML = txt.trim() ? `Usaste <b>${n}/${s.kw.length}</b> palabras clave` : "Escribí algo y volvé a corregir";
        const all = Object.values(results);
        const sum = all.reduce((a, r) => a + r.n, 0);
        const tot = all.reduce((a, r) => a + r.total, 0);
        root.querySelector("[data-total]").textContent = `${Math.round((sum / tot) * 100)}%`;
        if (txt.trim() && n / s.kw.length >= 0.7) toast("¡Respuesta de 10!");
      })
    );
    root.querySelectorAll("[data-clear]").forEach((b) =>
      b.addEventListener("click", () => {
        const i = b.dataset.clear;
        root.querySelector(`textarea[data-i="${i}"]`).value = "";
        saved[i] = "";
        writeJSON(SIM_KEY, saved);
        root.querySelector(`[data-res="${i}"]`).classList.remove("is-on");
        root.querySelector(`[data-meter="${i}"]`).textContent = "";
      })
    );
  }

  /* ---------- init ---------- */
  window.Games = {
    init() {
      renderProgress(false);
      [
        ["#gameEstado", (el) => binaryGame(el, "estado")],
        ["#gameRegimen", (el) => binaryGame(el, "regimen")],
        ["#gameVueltas", (el) => binaryGame(el, "vueltas")],
        ["#gameFormas", orderGame],
        ["#gameGobiernos", quizGame],
        ["#gameVF", vfGame],
        ["#gameFichas", fichasGame],
      ].forEach(([sel, fn]) => { const el = $(sel); if (el) fn(el); });
      detector();
      simulacro();
      $("#resetProgress").addEventListener("click", resetProgress);
    },
  };
})();
