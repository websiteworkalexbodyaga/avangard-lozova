/* ФК «Авангард» Лозова: поведінка головної сторінки, версія 3.
   The page reads complete without any of this. Motion is kept calm:
   content settles in once, and the 1880 station photo gives way to the 2008 one. */
(() => {
  "use strict";

  const still = /[?&]still\b/.test(location.search); // review mode: motion off
  const reduce = still || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* Content settles in once as it enters. */
  function setupReveals() {
    const groups = [
      ".match__main, .later",
      ".news__head, .lead, .briefs li",
      ".season__table, .season__results, .season__grid--goals > div",
      ".squad__head, .roster",
      ".hometown__text, .hometown__then",
      ".academy__text, .academy__photo",
      "#history .h2, .yr",
      ".town__text",
    ];
    const els = [];
    groups.forEach((sel) => $$(sel).forEach((el, i) => {
      el.classList.add("reveal");
      el.style.setProperty("--d", `${Math.min(i * 70, 280)}ms`);
      els.push(el);
    }));
    if (reduce || !("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }), { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    els.forEach((el) => io.observe(el));
  }

  /* Bar: steps aside while reading down, comes back on the way up; marks the section in view. */
  function setupBar() {
    const bar = $("[data-bar]");
    if (!bar) return;
    let lastY = window.scrollY, ticking = false;
    const update = () => {
      const y = window.scrollY;
      const menuOpen = !!$(".menu[open]");
      const holdsFocus = bar.contains(document.activeElement);
      bar.classList.toggle("is-hidden", !menuOpen && !holdsFocus && y > lastY && y > 320);
      lastY = y; ticking = false;
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    bar.addEventListener("focusin", () => bar.classList.remove("is-hidden"));

    const links = $$(".bar__nav a");
    const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => entries.forEach((e) => {
        const a = map.get(e.target.id);
        if (a && e.isIntersecting) { links.forEach((l) => l.removeAttribute("aria-current")); a.setAttribute("aria-current", "true"); }
      }), { rootMargin: "-45% 0px -50% 0px" });
      map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    }

    const menu = $(".menu");
    if (!menu) return;
    $$(".menu__sheet a").forEach((a) => a.addEventListener("click", () => menu.removeAttribute("open")));
    menu.addEventListener("toggle", () => {
      bar.classList.remove("is-hidden");
      document.body.style.overflow = menu.open ? "hidden" : "";
      [$("main"), $("footer")].forEach((el) => { if (el) el.inert = menu.open; });
    });
    window.matchMedia("(min-width: 961px)").addEventListener("change", (e) => { if (e.matches) menu.removeAttribute("open"); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.open) { menu.removeAttribute("open"); $(".menu__toggle").focus(); }
    });
  }

  /* Next match: a countdown to kick-off and a calendar file for the fixture. */
  function setupCountdown() {
    const box = $("[data-countdown]");
    const fx = $("[data-fixture]");
    if (!box || !fx) return;
    const kickoff = new Date(fx.dataset.kickoff).getTime();
    const label = $(".countdown__label", box);
    const value = $(".countdown__value", box);
    const sr = $("[data-cd-sr]", box);
    const plural = (n, one, few, many) => {
      const a = n % 10, b = n % 100;
      if (a === 1 && b !== 11) return one;
      if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
      return many;
    };
    function tick() {
      const left = kickoff - Date.now();
      if (left <= 0) {
        const live = left > -2 * 3600e3;
        label.textContent = live ? "Матч триває" : "Матч зіграно";
        value.textContent = live ? "Трансляція на каналі ПФЛ" : "Результат на сайті ПФЛ";
        if (sr) sr.textContent = `${label.textContent}. ${value.textContent}`;
        if (live) setTimeout(tick, left + 2 * 3600e3 + 1000);
        return;
      }
      const t = Math.floor(left / 60000);
      const d = Math.floor(t / 1440), h = Math.floor((t % 1440) / 60), m = t % 60;
      value.innerHTML = `<span>${d}</span>${plural(d, "день", "дні", "днів")} <span>${h}</span>год <span>${m}</span>хв`;
      setTimeout(tick, 60000 - (Date.now() % 60000) + 50);
    }
    tick();

    const ics = $("[data-ics]");
    if (!ics) return;
    ics.addEventListener("click", (ev) => {
      ev.preventDefault();
      const fmt = (ms) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      const enc = new TextEncoder();
      const fold = (line) => {
        const out = []; let cur = "", n = 0;
        for (const ch of line) {
          const b = enc.encode(ch).length;
          if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ""; n = 0; }
          cur += ch; n += b;
        }
        out.push(cur);
        return out.join("\r\n ");
      };
      const body = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FC Avangard Lozova//UK", "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT",
        `UID:avangard-r15-${kickoff}@avangard-lozova.com`,
        `DTSTAMP:${fmt(Date.now())}`,
        `DTSTART:${fmt(kickoff)}`,
        `DTEND:${fmt(kickoff + 115 * 60e3)}`,
        "SUMMARY:«Полтава-2» проти «Авангарду»\\, 15-й тур Другої ліги",
        "LOCATION:«Кремінь-Арена» ім. О. Бабаєва\\, Кременчук",
        "DESCRIPTION:Трансляція на YouTube-каналі ПФЛ.",
        "END:VEVENT", "END:VCALENDAR",
      ].map(fold).join("\r\n");
      const url = URL.createObjectURL(new Blob([body], { type: "text/calendar;charset=utf-8" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: "avangard-poltava2-15-11-2026.ics" });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    });
  }

  /* Squad: show the local players, or one line of the team. */
  function setupSquad() {
    const box = $("[data-squad]");
    if (!box) return;
    const filters = $$(".filter", box);
    const players = $$(".p", box);
    const count = $("[data-count]", box);
    const LABEL = { local: "З Лозівщини", gk: "Воротарі", df: "Захисники", mf: "Півзахисники", fw: "Нападники" };
    filters.forEach((btn) => btn.addEventListener("click", () => {
      const f = btn.dataset.filter;
      filters.forEach((b) => { const on = b === btn; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on)); });
      let k = 0;
      players.forEach((p) => {
        const match = f === "all" || (f === "local" ? p.hasAttribute("data-local") : p.dataset.pos === f);
        p.classList.toggle("is-hidden", !match);
        if (match) k++;
      });
      if (count) count.textContent = f === "all" ? "" : `${LABEL[f]}: ${k} з ${players.length}`;
    }));
  }

  /* The same station, 1880 and 2008: the night photo comes up over the old plate as the frame passes. */
  function setupTown() {
    const frame = $(".town__frame");
    if (!frame || !hasGsap || reduce) return;
    const now = $(".town__now", frame);
    const cap = $("[data-cap]");
    const caps = ["Дерев’яний вокзал станції Лозова, 1880 рік", "Той самий вокзал уночі, 2008 рік"];
    if (cap) cap.textContent = caps[0];
    gsap.fromTo(now, { opacity: 0 }, {
      opacity: 1, ease: "none",
      scrollTrigger: {
        trigger: frame, start: "top 55%", end: "bottom 60%", scrub: 0.4,
        onUpdate: (self) => { if (cap) cap.textContent = caps[self.progress < 0.5 ? 0 : 1]; },
      },
    });
  }

  setupReveals();
  setupCountdown();
  setupSquad();
  if (hasGsap) setupTown();
  setupBar();
  if (hasGsap) {
    window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
})();
