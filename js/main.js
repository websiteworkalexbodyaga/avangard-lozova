/* ФК «Авангард» Лозова: поведінка головної сторінки.
   Everything here is an enhancement: the page reads complete without it. */
(() => {
  "use strict";

  const root = document.documentElement;
  // ?still shows the page with motion off (for review screenshots and slow devices)
  const still = /[?&]still\b/.test(location.search);
  if (still) root.classList.add("still");
  const reduce = still || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  // The crest's lancet, traced from logo.svg (same path as assets/img/lancet.svg).
  const LANCET_D = "M86.36 0C13.22 72.73 0 185.53 0 185.53V237.63C33.16 297.55 69.3 338.76 86.36 356.61C103.43 338.76 139.57 297.55 172.73 237.63V185.53C172.73 185.53 159.5 72.73 86.36 0Z";
  const LANCET_W = 172.73, LANCET_H = 356.61;

  /* ---------------------------------------------------------------
     Entrances: heading, then text, then picture, 70ms apart, once. */
  function setupRises() {
    const groups = [
      [".match", [".match__title", ".fixture", ".fixture__where", ".countdown", ".match__actions", ".board__title", ".board__row"]],
      [".season", [".season__head .h2", ".season__lede", ".table-wrap", ".season__photo", ".scorers"]],
      [".squad", [".squad__head .h2", ".squad__lede", ".filters", ".squad__coach"]],
      [".match90", [".match90__text .h2", ".match90__lede"]],
      [".hometown", [".hometown__text .h2", ".hometown__lede", ".facts li", ".hometown__then"]],
      [".history", [".history__title"]],
      [".town", [".town__text .h2", ".town__cols p"]],
      [".news", [".news__head", ".lead", ".brief"]],
      [".academy", [".academy__text > *", ".academy__photo"]],
      [".foot", [".foot__top"]],
    ];
    const targets = [];
    groups.forEach(([sec, sels]) => {
      const s = $(sec);
      if (!s) return;
      let i = 0;
      sels.forEach((sel) => $$(sel, s).forEach((el) => {
        el.setAttribute("data-rise", "");
        el.style.setProperty("--d", `${Math.min(i++ * 70, 560)}ms`);
        targets.push(el);
      }));
    });
    if (reduce || !("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    targets.forEach((el) => io.observe(el));
  }

  /* ---------------------------------------------------------------
     Bar: steps aside while reading down, returns on the way up.
     Marks the section in view. */
  function setupBar() {
    const bar = $("[data-bar]");
    if (!bar) return;
    const crest = $("[data-crest]");
    // the hero already offers "next match"; the bar's copy of it waits until the hero has gone
    const action = $(".bar__action");
    if (action && hasGsap) {
      ScrollTrigger.create({
        trigger: "[data-hero]", start: "top top", end: "bottom top+=1",
        onToggle: (self) => action.classList.toggle("is-quiet", self.isActive),
      });
      if (window.scrollY < 10) action.classList.add("is-quiet");
    }
    if (crest && hasGsap && !reduce) crest.style.setProperty("--p", "0.08");
    if (hasGsap) {
      ScrollTrigger.create({
        start: 0, end: "max",
        onUpdate: (self) => {
          const y = self.scroll();
          if (crest) crest.style.setProperty("--p", (0.08 + self.progress * 0.92).toFixed(3));
          const menuOpen = !!document.querySelector(".menu[open]");
          bar.classList.toggle("is-hidden", !menuOpen && !bar.contains(document.activeElement) && self.direction === 1 && y > 320);
        },
      });
    }
    bar.addEventListener("focusin", () => bar.classList.remove("is-hidden"));
    const links = $$(".bar__nav a");
    const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const a = map.get(e.target.id);
        if (!a) return;
        if (e.isIntersecting) {
          links.forEach((l) => l.removeAttribute("aria-current"));
          a.setAttribute("aria-current", "true");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });

    // close the phone menu after a jump
    const menu = $(".menu");
    if (menu) {
      $$(".menu__sheet a").forEach((a) => a.addEventListener("click", () => menu.removeAttribute("open")));
      menu.addEventListener("toggle", () => {
        bar.classList.remove("is-hidden");
        document.body.style.overflow = menu.open ? "hidden" : "";
        [$("main"), $("footer")].forEach((el) => { if (el) el.inert = menu.open; });
      });
      window.matchMedia("(min-width: 1081px)").addEventListener("change", (e) => { if (e.matches) menu.removeAttribute("open"); });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && menu.open) { menu.removeAttribute("open"); $(".menu__toggle").focus(); }
      });
    }
  }

  /* ---------------------------------------------------------------
     Hero: the lancet window opens to the whole screen.
     At rest the photo sits inside the crest's shape at the right.
     Scrolling scales the window about its centre while the photo
     inside is counter-scaled, so the window grows over a still picture. */
  function setupHero() {
    const hero = $("[data-hero]");
    if (!hero) return;
    const stage = $(".hero__stage", hero);
    const win = $("[data-window]", hero);
    const photo = $("[data-photo]", hero);
    const copy = $("[data-hero-copy]", hero);
    const statement = $("[data-statement]", hero);
    const lines = $$(".hero__title .line > span", hero);

    // Opening: the name rises out of its own line, the window lifts in.
    if (hasGsap && !reduce) {
      gsap.from(lines, { yPercent: 108, duration: 1.1, ease: "power4.out", stagger: 0.09, delay: 0.1 });
      gsap.from([".hero__lede", ".hero__actions"], { y: 24, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.08, delay: 0.45 });
      gsap.from(win, { opacity: 0, duration: 1.3, ease: "power3.out", delay: 0.05 });
    }
    root.classList.remove("intro");
    if (!hasGsap || reduce) return;

    // short screens (a phone in landscape, Safari with its bars) keep the still layout
    hero.classList.add("hero--live");
    if (window.innerHeight < 560 || copy.offsetTop + copy.offsetHeight > stage.clientHeight + 1) {
      hero.classList.remove("hero--live");
      return;
    }

    const shade = document.createElement("div");
    shade.className = "hero__shade";
    stage.insertBefore(shade, statement);

    const path = new Path2D(LANCET_D);
    const ctx = document.createElement("canvas").getContext("2d");
    const SUBJECT = { x: 0.43, y: 0.22 }; // the player with the flag, as a fraction of the photo
    const ZOOM = 0.16; // resting zoom inside the window
    const IMG = { w: 1800, h: 1202 };

    let geo = null;
    const intro = { z: 0.16 }; // extra zoom that settles on load

    function inside(px, py, g, S) {
      const u = ((px - g.W / 2) / (S * g.w) + 0.5) * LANCET_W;
      const v = ((py - g.H / 2) / (S * g.h) + 0.5) * LANCET_H;
      return ctx.isPointInPath(path, u, v);
    }

    function measure() {
      hero.classList.add("hero--live");
      win.style.transform = ""; photo.style.cssText = "";
      const sr = stage.getBoundingClientRect();
      const wr = win.getBoundingClientRect();
      const g = { W: sr.width, H: sr.height, x: wr.left - sr.left, y: wr.top - sr.top, w: wr.width, h: wr.height };
      g.cx = g.x + g.w / 2; g.cy = g.y + g.h / 2;
      // cover fit of the photo over the stage
      const c = Math.max(g.W / IMG.w, g.H / IMG.h);
      const dw = IMG.w * c, dh = IMG.h * c;
      const sx = (g.W - dw) / 2 + SUBJECT.x * dw;
      const sy = (g.H - dh) / 2 + SUBJECT.y * dh;
      // move the player under the window, but never so far that the photo's edge shows inside it
      const z0 = 1 + ZOOM;
      g.shiftX = Math.min(g.cx - sx, g.x - g.cx * (1 - z0) - 4);
      g.shiftY = Math.max(-(g.H - (g.y + g.h)) , Math.min(g.cy - sy, g.y - g.cy * (1 - z0) - 4));
      // smallest scale at which the lancet, centred, covers every corner
      let lo = 1, hi = 60;
      const corners = [[0, 0], [g.W, 0], [0, g.H], [g.W, g.H], [g.W / 2, 0], [g.W / 2, g.H]];
      for (let k = 0; k < 30; k++) {
        const mid = (lo + hi) / 2;
        if (corners.every(([px, py]) => inside(px, py, g, mid))) hi = mid; else lo = mid;
      }
      g.S = hi * 1.04;
      // the photo fills the stage, in the window's coordinates
      Object.assign(photo.style, {
        left: `${-g.x}px`, top: `${-g.y}px`, width: `${g.W}px`, height: `${g.H}px`,
        objectPosition: "50% 50%", transformOrigin: `${g.x + g.w / 2}px ${g.y + g.h / 2}px`,
      });
      win.style.transformOrigin = "50% 50%";
      geo = g;
    }

    let progress = 0;
    function render() {
      if (!geo) return;
      const g = geo, e = progress;
      // the window comes to the centre first and grows after, so the crest keeps its tips longer
      const eT = 1 - Math.pow(1 - e, 3);
      const eS = e * e;
      const s = 1 + (g.S - 1) * eS;
      const T = { x: (g.W / 2 - g.cx) * eT, y: (g.H / 2 - g.cy) * eT };
      const z = 1 + (ZOOM + intro.z) * (1 - e);
      const shift = { x: g.shiftX * (1 - e) * (1 - e), y: g.shiftY * Math.pow(1 - e, 3) };
      const vl = Math.max(0, g.cx + T.x - s * g.w / 2), vr = Math.min(g.W, g.cx + T.x + s * g.w / 2);
      const vt = Math.max(0, g.cy + T.y - s * g.h / 2), vb = Math.min(g.H, g.cy + T.y + s * g.h / 2);
      shift.x = Math.max(Math.min(shift.x, vl + g.cx * (z - 1)), vr - g.W - (g.W - g.cx) * (z - 1));
      shift.y = Math.max(Math.min(shift.y, vt + g.cy * (z - 1)), vb - g.H - (g.H - g.cy) * (z - 1));
      const k = z / s;
      const d = { x: (shift.x - T.x) / s, y: (shift.y - T.y) / s };
      win.style.transform = `translate3d(${T.x}px, ${T.y}px, 0) scale(${s})`;
      photo.style.transform = `translate3d(${d.x}px, ${d.y}px, 0) scale(${k})`;
      const fadeOut = Math.min(1, Math.max(0, (e - 0.04) / 0.26));
      copy.style.opacity = String(1 - fadeOut);
      copy.style.transform = `translate3d(0, ${-40 * fadeOut}px, 0)`;
      copy.style.pointerEvents = e > 0.3 ? "none" : "";
      const fadeIn = Math.max(0, Math.min(1, (e - 0.5) / 0.26));
      shade.style.opacity = String(fadeIn);
      statement.style.opacity = String(fadeIn);
      statement.style.transform = `translate3d(0, ${30 * (1 - fadeIn)}px, 0)`;
    }

    measure();
    render();
    gsap.to(intro, { z: 0, duration: 2.2, ease: "power3.out", onUpdate: render });

    const st = ScrollTrigger.create({
      trigger: hero,
      start: "top top",
      end: () => `+=${Math.round(window.innerHeight * 1.2)}`,
      pin: stage,
      scrub: 0.6,
      invalidateOnRefresh: true,
      onUpdate: (self) => { progress = gsap.parseEase("power2.inOut")(self.progress); render(); },
      onToggle: (self) => hero.classList.toggle("hero--idle", !self.isActive && self.progress === 1),
      onRefreshInit: () => { win.style.transform = ""; photo.style.transform = ""; },
      onRefresh: () => { measure(); render(); },
    });
    window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    return st;
  }

  /* ---------------------------------------------------------------
     Next match: names and time set like the departures board at
     Lozova station. Each letter turns over a few times, then lands. */
  function setupFlaps() {
    const flaps = $$("[data-flap]");
    if (!flaps.length) return;
    const ABC = "АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЮЯ0123456789";
    flaps.forEach((el) => {
      const text = el.textContent.trim();
      el.textContent = "";
      const sr = document.createElement("span");
      sr.className = "visually-hidden";
      sr.textContent = text;
      el.appendChild(sr);
      [...text.toUpperCase()].forEach((ch) => {
        const c = document.createElement("span");
        c.className = "flap__c" + (ch === " " ? " flap__c--sp" : ch === "-" ? " flap__c--dash" : "");
        c.setAttribute("aria-hidden", "true");
        c.dataset.ch = ch;
        c.textContent = ch;
        el.appendChild(c);
      });
    });
    if (reduce || !("IntersectionObserver" in window)) return;

    const cells = $$(".flap__c:not(.flap__c--sp):not(.flap__c--dash)");
    cells.forEach((c) => { c.textContent = " "; });
    const run = () => {
      cells.forEach((c, i) => {
        const final = c.dataset.ch;
        const turns = 5 + (i % 7);
        let n = 0;
        const start = i * 38;
        setTimeout(function tick() {
          n++;
          const done = n >= turns;
          c.textContent = done ? final : ABC[(Math.random() * ABC.length) | 0];
          c.animate(
            [{ transform: "rotateX(80deg)", opacity: 0.4 }, { transform: "rotateX(0deg)", opacity: 1 }],
            { duration: 90, easing: "cubic-bezier(.2,.7,.3,1)" }
          );
          if (!done) setTimeout(tick, 64);
        }, start);
      });
    };
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { run(); io.disconnect(); }
    }, { threshold: 0.4 });
    io.observe($("[data-fixture]"));
  }

  /* ---------------------------------------------------------------
     Countdown to kick-off, and a calendar file for the fixture. */
  function setupCountdown() {
    const box = $("[data-countdown]");
    const fx = $("[data-fixture]");
    if (!box || !fx) return;
    const kickoff = new Date(fx.dataset.kickoff).getTime();
    const out = { d: $('[data-cd="d"]', box), h: $('[data-cd="h"]', box), m: $('[data-cd="m"]', box), s: $('[data-cd="s"]', box) };
    const label = $(".countdown__label", box);
    const pad = (n) => String(n).padStart(2, "0");
    let last = -1;
    function tick() {
      const left = kickoff - Date.now();
      if (left <= 0) {
        const live = left > -2 * 3600e3;
        label.textContent = live ? "Матч триває" : "Матч зіграно";
        box.querySelector(".countdown__value").textContent = live ? "Дивіться трансляцію на каналі ПФЛ" : "Результат на сайті ПФЛ";
        box.querySelector(".countdown__value").style.fontSize = "clamp(28px, 3.4vw, 48px)";
        const sr = $("[data-cd-sr]", box);
        if (sr) sr.textContent = `${label.textContent}. ${box.querySelector(".countdown__value").textContent}`;
        if (live) setTimeout(tick, left + 2 * 3600e3 + 1000);
        return;
      }
      const t = Math.floor(left / 1000);
      const d = Math.floor(t / 86400), h = Math.floor((t % 86400) / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
      // each figure that changes drops in from above, like a panel on a stadium board
      const next = { d: String(d), h: pad(h), m: pad(m), s: pad(s) };
      Object.keys(next).forEach((k) => {
        if (out[k].textContent === next[k]) return;
        out[k].textContent = next[k];
        if (!reduce && last !== -1) {
          out[k].animate([{ transform: "translateY(-35%)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: k === "s" ? 240 : 420, easing: "cubic-bezier(.16,1,.3,1)" });
        }
      });
      last = m;
      setTimeout(tick, 1000 - (Date.now() % 1000));
    }
    tick();

    const ics = $("[data-ics]");
    if (ics) ics.addEventListener("click", (ev) => {
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

  /* ---------------------------------------------------------------
     Season run: the twelve results come in one after another,
     so the five-win streak arrives as a gold band. */
  function setupRun() {
    const run = $("[data-run]");
    if (!run || !hasGsap || reduce) return;
    const tiles = $$(".res", run);
    const streak = $("[data-streak]", run);
    gsap.set(tiles, { yPercent: 40, opacity: 0 });
    gsap.set(streak, { opacity: 0, x: -24 });
    ScrollTrigger.create({
      trigger: run, start: "top 78%", once: true,
      onEnter: () => {
        gsap.to(tiles, { yPercent: 0, opacity: 1, duration: 0.7, ease: "power3.out", stagger: 0.07 });
        gsap.to(streak, { opacity: 1, x: 0, duration: 0.8, ease: "power3.out", delay: 0.07 * 9 });
      },
    });
  }

  /* ---------------------------------------------------------------
     Squad: light up the local players, or one line of the team. */
  function setupSquad() {
    const box = $("[data-squad]");
    if (!box) return;
    const chips = $$(".chip", box);
    const players = $$(".p", box);
    chips.forEach((chip) => chip.addEventListener("click", () => {
      const f = chip.dataset.filter;
      chips.forEach((c) => { const on = c === chip; c.classList.toggle("is-on", on); c.setAttribute("aria-pressed", String(on)); });
      // the chosen players step forward out of the line, the rest step back
      let k = 0;
      players.forEach((p) => {
        const match = f === "all" || (f === "local" ? p.hasAttribute("data-local") : p.dataset.pos === f);
        p.classList.toggle("is-dim", !match);
        p.classList.toggle("is-lit", match && f !== "all");
        const img = p.querySelector("img");
        img.style.transitionDelay = match && f !== "all" && !reduce ? `${k++ * 40}ms` : "0ms";
      });
      if (count) count.textContent = f === "all" ? "" : `${LABEL[f]}: ${k} з ${players.length}`;
    }));
    const count = $("[data-count]", box);
    const LABEL = { local: "Гравці з Лозівщини", gk: "Воротарі", df: "Захисники", mf: "Півзахисники", fw: "Нападники" };

    if (!hasGsap || reduce) return;
    // the team walks into the frame row by row
    const imgs = players.map((p) => p.querySelector("img"));
    gsap.set(imgs, { yPercent: 18, opacity: 0 });
    ScrollTrigger.batch(imgs, {
      start: "top 88%", once: true,
      onEnter: (batch) => gsap.to(batch, { yPercent: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.05, clearProps: "transform,translate,rotate,scale,opacity" }),
    });
  }

  /* ---------------------------------------------------------------
     The season as one match. Scroll runs the clock from 0 to 90+4.
     Each of the twelve league goals lights at its real minute, the
     tally turns over, and the scorer steps into the crest's lancet.
     After 90 the fourth official's board is raised: +1 ... +4. */
  function setupSeasonMatch() {
    const sec = $("[data-goals]");
    if (!sec) return;
    const pin = $(".match90__pin", sec);
    const num = $("[data-clock]", sec);
    const plus = $("[data-plus]", sec);
    const added = $("[data-added]", sec);
    const tally = $("[data-tally]", sec);
    const scorer = $("[data-scorer]", sec);
    const rows = $$(".goal", sec);
    const lancet = $(".match90__lancet", sec);
    if (!hasGsap || reduce) return;
    sec.classList.add("is-live");
    const mins = rows.map((r) => Number(r.dataset.min));
    let lastMin = -1, lastLit = -1, lastAdded = -1;

    // preload every scorer so the swap never waits on the network
    const srcOf = (n) => `assets/img/webp/p${n}.webp`;
    [...new Set(rows.map((r) => r.dataset.n))].forEach((n) => { const i = new Image(); i.src = srcOf(n); });

    const roll = (el) => el.animate(
      [{ transform: "translateY(-30%)", opacity: 0 }, { transform: "none", opacity: 1 }],
      { duration: 260, easing: "cubic-bezier(.3,.7,.2,1)" }
    );

    function show(m) {
      const shown = Math.min(90, Math.floor(m));
      if (shown !== lastMin) { num.textContent = String(shown); lastMin = shown; }

      const extra = m > 90 ? Math.min(4, Math.ceil(m - 90)) : 0;
      if (extra !== lastAdded) {
        if (extra > 0) {
          added.textContent = `+${extra}`;
          if (lastAdded <= 0) { gsap.set(plus, { opacity: 1 }); gsap.fromTo(added, { yPercent: 110 }, { yPercent: 0, duration: 0.4, ease: "power3.out" }); }
          else roll(added);
        } else {
          gsap.to(added, { yPercent: 110, duration: 0.2, onComplete: () => gsap.set(plus, { opacity: 0 }) });
        }
        lastAdded = extra;
      }

      let lit = -1;
      rows.forEach((r, i) => {
        const on = m >= mins[i];
        r.classList.toggle("is-lit", on);
        if (on) lit = i;
      });
      if (lit !== lastLit) {
        tally.textContent = String(lit + 1);
        if (lastLit !== -1 || lit !== -1) roll(tally);
        if (lit >= 0) {
          const n = rows[lit].dataset.n;
          const src = srcOf(n);
          if (!scorer.src.endsWith(src)) {
            gsap.fromTo(scorer, { yPercent: 8, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: "power3.out" });
            scorer.src = src;
          }
          rows.forEach((r, i) => r.classList.toggle("is-now", i === lit));
        } else {
          gsap.to(scorer, { opacity: 0, duration: 0.2 });
          rows.forEach((r) => r.classList.remove("is-now"));
        }
        lastLit = lit;
      }
    }

    // a clock with a pause at half-time and the added minutes at the end
    const toMinute = (p) => (p < 0.47 ? (p / 0.47) * 45 : p < 0.53 ? 45 : 45 + Math.min(1, (p - 0.53) / 0.42) * 49);

    scorer.style.opacity = "0";
    gsap.set(plus, { opacity: 0 });
    show(0);

    const mm = gsap.matchMedia();
    mm.add("(min-width: 900px)", () => {
      sec.classList.add("is-pinned");
      const st = ScrollTrigger.create({
        trigger: pin, start: "top top", end: () => `+=${Math.round(window.innerHeight * 1.8)}`,
        pin: true, scrub: 0.4,
        onUpdate: (self) => show(toMinute(self.progress)),
      });
      return () => { sec.classList.remove("is-pinned"); st.kill(); };
    });
    mm.add("(max-width: 899px)", () => {
      const st = ScrollTrigger.create({
        trigger: $("[data-goal-list]", sec), start: "top 75%", end: "bottom 45%", scrub: 0.4,
        onUpdate: (self) => show(toMinute(self.progress)),
      });
      return () => st.kill();
    });

    gsap.fromTo(lancet, { scaleY: 0.25, transformOrigin: "50% 100%" }, {
      scaleY: 1, ease: "power2.out",
      scrollTrigger: { trigger: sec, start: "top 85%", end: "top 25%", scrub: 0.6 },
    });
  }

  /* ---------------------------------------------------------------
     History: on wide screens the years travel sideways while the
     section holds still. Elsewhere they are a swipeable row. */
  function setupHistory() {
    const sec = $("[data-history]");
    if (!sec || !hasGsap || reduce) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 900px)", () => {
      sec.classList.add("is-pinned");
      const pin = $(".history__pin", sec);
      const track = $("[data-years]", sec);
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const tween = gsap.to(track, {
        x: () => -dist(), ease: "none",
        scrollTrigger: {
          trigger: pin, start: "top top", end: () => `+=${dist()}`, pin: true, scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });
      $$(".year", track).forEach((y) => {
        gsap.from($(".year__n", y), {
          yPercent: 30, opacity: 0.15, ease: "none",
          scrollTrigger: { trigger: y, containerAnimation: tween, start: "left 95%", end: "left 55%", scrub: true },
        });
      });
      return () => sec.classList.remove("is-pinned");
    });
  }

  /* ---------------------------------------------------------------
     Small things: the town photo drifts, the footer name rises. */
  function setupDetails() {
    if (!hasGsap || reduce) return;
    // the same station: the 1880 plate gives way to the 2008 night photo as the frame passes
    const frame = $(".town__frame");
    if (frame) {
      const now = $(".town__now", frame);
      const year = $("[data-year]");
      if (year) year.textContent = "1880";
      gsap.fromTo($$("img", frame), { yPercent: -12 }, {
        yPercent: 0, ease: "none",
        scrollTrigger: { trigger: frame, start: "top bottom", end: "bottom top", scrub: true },
      });
      gsap.fromTo(now, { opacity: 0 }, {
        opacity: 1, ease: "none",
        scrollTrigger: {
          trigger: frame, start: "top 55%", end: "bottom 65%", scrub: 0.4,
          onUpdate: (self) => {
            const y = self.progress < 0.5 ? "1880" : "2008";
            if (year && year.textContent !== y) {
              year.textContent = y;
              year.animate([{ transform: "translateY(40%)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 320, easing: "cubic-bezier(.16,1,.3,1)" });
            }
          },
        },
      });
    }

    const word = $("[data-word]");
    if (word) {
      const txt = word.textContent;
      word.textContent = "";
      [...txt].forEach((ch) => { const s = document.createElement("span"); s.className = "ch"; s.textContent = ch; word.appendChild(s); });
      gsap.from($$(".ch", word), {
        yPercent: 100, opacity: 0, duration: 1, ease: "power4.out", stagger: 0.05,
        scrollTrigger: { trigger: word, start: "top 92%", once: true },
      });
    }

    $$(".lead__media img, .brief img, .academy__photo img, .year img, .season__photo img").forEach((img) => {
      gsap.fromTo(img, { opacity: 0, scale: 1.08 }, {
        opacity: 1, scale: 1, duration: 1.2, ease: "power3.out", clearProps: "transform,translate,rotate,scale,opacity",
        scrollTrigger: { trigger: img, start: "top 90%", once: true },
      });
    });
  }

  if (!hasGsap) root.classList.remove("intro");
  setupRises();
  setupFlaps();
  setupCountdown();
  if (hasGsap) { setupHero(); setupRun(); }
  setupSquad();
  if (hasGsap) { setupSeasonMatch(); setupHistory(); setupDetails(); }
  setupBar();
  if (hasGsap) { ScrollTrigger.sort(); ScrollTrigger.refresh(); }
})();
