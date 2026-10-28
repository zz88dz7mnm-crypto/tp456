/* =========================================================
   Animaciones, navegación e interacciones
   ========================================================= */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

  // Los juegos generan HTML (con data-reveal), así que van primero.
  if (window.Games) window.Games.init();

  function splitChars(el) {
    const text = el.textContent;
    el.setAttribute("aria-label", text);
    el.innerHTML = text
      .split(" ")
      .map((w) => `<span class="word" aria-hidden="true">${[...w].map((c) => `<span class="char">${c}</span>`).join("")}</span>`)
      .join(" ");
    return $$(".char", el);
  }

  /* =========================================================
     Navegación
     ========================================================= */
  const sections = $$("main section[data-label]");
  const menu = $("#menu");
  const menuBtn = $("#menuBtn");
  const menuList = $("#menuList");
  menuList.innerHTML = sections.map((s) => `<li><a href="#${s.id}" data-target="${s.id}">${s.dataset.label}</a></li>`).join("");

  function setMenu(open) {
    menu.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
    if (open && hasGSAP && !reduced) gsap.fromTo($$("li", menuList), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.03, ease: "power3.out" });
  }
  menuBtn.addEventListener("click", () => setMenu(menu.hidden));
  menuList.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) setMenu(false); });

  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => {
      if (en.isIntersecting) $$("a", menuList).forEach((a) => a.classList.toggle("is-current", a.dataset.target === en.target.id));
    }),
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sections.forEach((s) => io.observe(s));

  const bar = $(".progress-bar");
  const topbar = $(".topbar");
  let ticking = false;
  function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    topbar.classList.toggle("is-solid", window.scrollY > 40);
    ticking = false;
  }
  window.addEventListener("scroll", () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();

  /* =========================================================
     Interacciones que no dependen de GSAP
     ========================================================= */
  // Tabs de la zona de juegos
  const arenaTabs = $$("#arenaTabs .tab");
  arenaTabs.forEach((t) =>
    t.addEventListener("click", () => {
      arenaTabs.forEach((x) => { x.classList.toggle("is-on", x === t); x.setAttribute("aria-selected", String(x === t)); });
      $$(".panel").forEach((p) => {
        const on = p.dataset.panel === t.dataset.tab;
        p.hidden = !on;
        p.classList.toggle("is-on", on);
      });
      if (hasGSAP) {
        if (!reduced) gsap.fromTo(`.panel[data-panel="${t.dataset.tab}"]`, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "power3.out" });
        ScrollTrigger.refresh();
      }
    })
  );

  // Parlamentario vs presidencial
  const sys = $("#sys");
  sys.dataset.mode = "parl";
  $$("[data-sys]").forEach((t) =>
    t.addEventListener("click", () => {
      $$("[data-sys]").forEach((x) => { x.classList.toggle("is-on", x === t); x.setAttribute("aria-selected", String(x === t)); });
      sys.dataset.mode = t.dataset.sys;
      $$("[data-sys-panel]", sys).forEach((p) => { p.hidden = p.dataset.sysPanel !== t.dataset.sys; });
    })
  );

  // Hemiciclo (se dibuja una vez y cambia por clases)
  const hemi = $("#hemi");
  const CHAMBERS = {
    dip: { name: "Diputados · 257 bancas", total: 257, lla: 38, q: 129, rows: 8 },
    sen: { name: "Senado · 72 bancas", total: 72, lla: 7, q: 37, rows: 4 },
  };
  function seatPositions(total, rows) {
    const r0 = 70, r1 = 190;
    const radii = Array.from({ length: rows }, (_, i) => r0 + ((r1 - r0) * i) / Math.max(1, rows - 1));
    const sum = radii.reduce((a, r) => a + r, 0);
    const counts = radii.map((r) => Math.round((total * r) / sum));
    counts[counts.length - 1] += total - counts.reduce((a, c) => a + c, 0);
    const seats = [];
    radii.forEach((r, i) => {
      const n = counts[i];
      for (let k = 0; k < n; k++) {
        const a = Math.PI - (Math.PI * k) / Math.max(1, n - 1);
        seats.push({ x: 200 + r * Math.cos(a), y: 205 - r * Math.sin(a), a });
      }
    });
    return seats.sort((s1, s2) => s2.a - s1.a);
  }
  function drawChamber(key, stage) {
    const c = CHAMBERS[key];
    const seats = seatPositions(c.total, c.rows);
    const rad = key === "dip" ? 5.2 : 9;
    hemi.innerHTML =
      seats.map((s, i) => `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${rad}" class="${stage >= 1 && i < c.lla ? "lla" : ""}" />`).join("") +
      (stage >= 1 ? `<text class="q-label" x="200" y="236" text-anchor="middle">Quórum: ${c.q} · LLA: ${key === "dip" ? "menos del 15%" : c.lla}</text>` : "");
    // Marca hasta dónde llega el quórum
    if (stage >= 1) {
      $$("circle", hemi).forEach((el, i) => { if (i < c.q && i >= c.lla) el.style.fill = "rgba(232,182,76,.28)"; });
    }
    $("#chamberName").textContent = c.name;
  }
  drawChamber("dip", 0);

  if (!hasGSAP) return;
  document.documentElement.classList.add("has-gsap");
  gsap.registerPlugin(ScrollTrigger);

  // Scroll suave para anclas
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = document.getElementById(a.getAttribute("href").slice(1));
    if (!target) return;
    e.preventDefault();
    const y = target.getBoundingClientRect().top + window.scrollY - (target.id === "inicio" ? 0 : 60);
    window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
  });

  /* =========================================================
     Steps activos de cada scrolly
     ========================================================= */
  // El step activo es el que cruza la mitad de la pantalla. Se calcula por posición
  // (y no por toggles) para que los saltos de ancla dejen siempre el estado correcto.
  const initSteps = () => $$(".scrolly").forEach((scrolly) => {
    const steps = $$(".step", scrolly);
    let current = -1;
    const pick = () => {
      const mid = window.innerHeight / 2;
      let idx = -1;
      steps.forEach((s, i) => { if (s.getBoundingClientRect().top < mid) idx = i; });
      idx = Math.max(0, idx);
      if (idx === current) return;
      current = idx;
      steps.forEach((s, i) => s.classList.toggle("is-active", i === idx));
      scrolly.dispatchEvent(new CustomEvent("step", { detail: +steps[idx].dataset.step }));
    };
    ScrollTrigger.create({ trigger: scrolly, start: "top bottom", end: "bottom top", onUpdate: pick, onRefresh: pick });
  });

  /* ---------- TP4: el Estado se arma ---------- */
  const build = $("#build");
  $('[data-scrolly="estado"]').addEventListener("step", (e) => {
    const n = e.detail;
    $$("[data-b]", build).forEach((p) => p.classList.toggle("is-on", +p.dataset.b <= n));
    build.classList.toggle("is-full", n >= 5);
    $("#buildCount").textContent = n + 1;
  });

  /* ---------- TP5: cuántos gobiernan ---------- */
  const people = $("#people");
  people.innerHTML = Array.from({ length: 96 }, () => "<span></span>").join("");
  const dots = $$("span", people);
  const few = [17, 20, 30, 41, 46, 53, 62, 67, 75, 82];
  const captions = ["Uno solo", "Unos pocos", "Todo el pueblo"];
  $('[data-scrolly="cantidad"]').addEventListener("step", (e) => {
    const n = e.detail;
    dots.forEach((d, i) => {
      d.classList.toggle("crown", n === 0 && i === 42);
      d.classList.toggle("on", (n === 1 && few.includes(i)) || n === 2);
    });
    $("#peopleCaption").textContent = captions[n];
  });

  /* ---------- TP6: el Congreso ---------- */
  const congStages = [["dip", 0], ["dip", 1], ["sen", 1], ["dip", 1], ["sen", 1]];
  $('[data-scrolly="congreso"]').addEventListener("step", (e) => {
    const [key, stage] = congStages[e.detail];
    drawChamber(key, stage);
    if (!reduced) gsap.from($$("circle", hemi), { scale: 0, transformOrigin: "50% 50%", duration: 0.5, stagger: { each: 0.002, from: "start" }, ease: "back.out(2)" });
  });

  if (reduced) {
    // Sin animaciones: cada visual muestra su estado final.
    $$(".step").forEach((s) => s.classList.add("is-active"));
    $$(".scrolly").forEach((sc) => sc.dispatchEvent(new CustomEvent("step", { detail: $$(".step", sc).length - 1 })));
    return;
  }
  initSteps();

  /* =========================================================
     HERO
     ========================================================= */
  const heroChars = splitChars($("#heroTitle"));
  gsap.timeline({ defaults: { ease: "power4.out" } })
    .from(".hero-kicker", { y: 20, opacity: 0, duration: 0.8 })
    .from(heroChars, { yPercent: 110, rotate: 8, opacity: 0, duration: 1.1, stagger: 0.035 }, "-=0.4")
    .from(".hero-sun", { scale: 0.4, opacity: 0, duration: 1.6, ease: "power3.out" }, 0.2)
    .from(".hero-sub", { y: 24, opacity: 0, duration: 0.9 }, "-=0.8")
    .from(".hero-meta > *", { y: 12, opacity: 0, duration: 0.5, stagger: 0.04 }, "-=0.6")
    .from(".scroll-cue", { opacity: 0, duration: 0.8 }, "-=0.2");
  gsap.to(".hero-inner", { yPercent: -18, opacity: 0, scale: 0.96, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  gsap.to(".hero-sun", { scale: 1.6, opacity: 0, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  const glow = $(".hero-glow");
  window.addEventListener("pointermove", (e) => {
    if (window.scrollY > window.innerHeight) return;
    gsap.to(glow, { x: (e.clientX / window.innerWidth - 0.5) * 120, y: (e.clientY / window.innerHeight - 0.5) * 80, duration: 1.2, ease: "power2.out" });
  });

  /* =========================================================
     Revelado genérico y parallax
     ========================================================= */
  gsap.set("[data-reveal]", { opacity: 0, y: 40 });
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 88%",
    once: true,
    onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.08, overwrite: true }),
  });
  ScrollTrigger.addEventListener("refresh", () => {
    $$("[data-reveal]").forEach((el) => { if (el.getBoundingClientRect().bottom < 0) gsap.set(el, { opacity: 1, y: 0 }); });
  });
  $$(".chapter-num").forEach((n) => {
    gsap.fromTo(n, { yPercent: 30 }, { yPercent: -30, ease: "none", scrollTrigger: { trigger: n, start: "top bottom", end: "bottom top", scrub: true } });
  });

  /* ---------- Portadas de TP: el número gigante ---------- */
  $$(".tp-cover").forEach((cover) => {
    gsap.timeline({ scrollTrigger: { trigger: cover, start: "top top", end: "+=" + window.innerHeight, scrub: 0.6, pin: true, anticipatePin: 1 } })
      .from($(".tp-big", cover), { scale: 0.3, rotate: -12, opacity: 0, duration: 1, ease: "power3.out" })
      .to($(".tp-big", cover), { color: "rgba(232,182,76,.12)", duration: 0.5 }, "-=0.3")
      .from($(".tp-title", cover), { y: 60, opacity: 0, duration: 0.6 }, "-=0.4")
      .from($(".tp-sub", cover), { y: 30, opacity: 0, duration: 0.5 }, "-=0.3")
      .to({}, { duration: 0.4 });
  });

  /* ---------- TP4: definición completa palabra por palabra ---------- */
  const hl = $(".hl-text");
  const KEYS = ["histórica", "fuerza", "territorio", "población", "fiscal)", "burocracia", "normativo", "soberano", "reconocen"];
  hl.innerHTML = hl.textContent.split(" ").map((w) => `<span class="w${KEYS.some((k) => w.startsWith(k)) ? " key" : ""}">${w}</span>`).join(" ");
  const words = $$(".w", hl);
  ScrollTrigger.create({
    trigger: "#fullDef",
    start: "top 75%",
    end: "bottom 45%",
    scrub: true,
    onUpdate: (self) => {
      const n = Math.round(self.progress * words.length);
      words.forEach((w, i) => w.classList.toggle("on", i < n));
    },
  });

  /* ---------- TP4: territorio horizontal ---------- */
  const track = $("#vidaTrack");
  const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
  const terrTween = gsap.to(track, {
    x: () => -dist(),
    ease: "none",
    scrollTrigger: {
      trigger: "#territorio", start: "top top", end: () => "+=" + dist(), scrub: 0.5, pin: ".vida-pin", anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: (self) => gsap.set("#vidaBar", { scaleX: self.progress }),
    },
  });
  $$(".hito").forEach((h) => {
    gsap.from(h.children, {
      y: 30, opacity: 0, stagger: 0.08, duration: 0.6, ease: "power3.out",
      scrollTrigger: { trigger: h, containerAnimation: terrTween, start: "left 85%", toggleActions: "play none none reverse" },
    });
    gsap.from($(".size i", h), { scaleX: 0, transformOrigin: "0 50%", duration: 1, ease: "power3.out", scrollTrigger: { trigger: h, containerAnimation: terrTween, start: "left 80%" } });
  });

  /* ---------- TP4: barras de los atributos ---------- */
  $$(".hl-bar i").forEach((b) => {
    gsap.from(b, { scaleX: 0, duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: b, start: "top 90%" } });
  });

  /* ---------- TP4: línea de las eras ---------- */
  ScrollTrigger.create({
    trigger: "#eras", start: "top 60%", end: "bottom 60%", scrub: true,
    onUpdate: (self) => $("#eras").style.setProperty("--p", self.progress),
  });
  gsap.from(".pact-card", { y: 60, rotate: (i) => (i - 1) * 4, opacity: 0, duration: 0.9, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger: ".pact", start: "top 85%" } });

  /* ---------- TP5: duración del ejecutivo ---------- */
  gsap.from(".dur-fill", { scaleX: 0, duration: 1, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger: ".duration", start: "top 80%" } });

  /* ---------- TP5: el templo republicano ---------- */
  gsap.timeline({ scrollTrigger: { trigger: "#temple", start: "top 75%", end: "bottom 60%", scrub: 0.6 } })
    .from(".temple-base", { scaleX: 0, duration: 0.6 })
    .from(".p-col", { scaleY: 0, transformOrigin: "bottom", duration: 1, stagger: 0.25, ease: "power2.out" })
    .from(".pillar h4, .pillar p", { opacity: 0, y: 20, duration: 0.6, stagger: 0.08 }, "-=0.8")
    .from(".temple-roof", { y: -120, opacity: 0, duration: 0.8, ease: "bounce.out" });

  /* ---------- TP5: árbol de regímenes ---------- */
  gsap.from(".tree-leaf", { y: 30, opacity: 0, duration: 0.7, stagger: 0.15, scrollTrigger: { trigger: ".tree-sub", start: "top 85%" } });

  /* ---------- TP6: barras de la primera vuelta ---------- */
  ScrollTrigger.create({
    trigger: "#bars", start: "top 75%", once: true,
    onEnter: () => $$("#bars .bar-track i").forEach((b, i) => setTimeout(() => b.style.setProperty("--w", b.dataset.v), i * 120)),
  });

  /* ---------- TP6: contadores ---------- */
  $$(".stat [data-count]").forEach((el) => {
    const to = parseFloat(el.dataset.count);
    const dec = +el.dataset.dec;
    const fmt = (v) => (el.dataset.prefix || "") + v.toFixed(dec).replace(".", ",") + (el.dataset.suffix || "");
    el.textContent = fmt(0);
    const obj = { v: 0 };
    gsap.to(obj, {
      v: to, duration: 1.6, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 90%" },
      onUpdate: () => (el.textContent = fmt(obj.v)),
    });
  });
  gsap.from(".fed-card", { y: 60, opacity: 0, duration: 0.9, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger: ".fed", start: "top 85%" } });

  gsap.from(".final", { scale: 0.8, opacity: 0, duration: 1.2, ease: "elastic.out(1, 0.6)", scrollTrigger: { trigger: ".final", start: "top 90%" } });

  /* ---------- refrescos ---------- */
  window.addEventListener("load", () => ScrollTrigger.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  let lastW = window.innerWidth;
  window.addEventListener("resize", () => {
    if (window.innerWidth !== lastW) { lastW = window.innerWidth; ScrollTrigger.refresh(); }
  });
  ScrollTrigger.config({ ignoreMobileResize: true });
})();
