(() => {
  "use strict";

  // ================= Utilidades =================
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const h = (tag, cls, html) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html != null) el.innerHTML = html;
    return el;
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
  };

  // ================= Idioma =================
  let LANG = store.get("sdle:lang", null) || ((navigator.language || "es").toLowerCase().startsWith("es") ? "es" : "en");
  function t(key, vars = {}) {
    const v = (I18N[LANG] && I18N[LANG][key]) ?? I18N.es[key] ?? key;
    if (typeof v !== "string") return v;
    if ("n" in vars) vars = { s: vars.n === 1 ? "" : "s", es: vars.n === 1 ? "" : "es", ...vars };
    return v.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  }
  const actionOf = (s) => (LANG === "en" ? s.en : s.action);
  const appName = (id) => (LANG === "en" && APPS[id].nameEn) || APPS[id].name;
  const appCat = (id) => (LANG === "en" ? APPS[id].catEn : APPS[id].cat);

  function applyStatic() {
    document.documentElement.lang = LANG;
    $$("[data-i18n]").forEach((el) => { el.innerHTML = t(el.dataset.i18n); });
    $$("[data-i18n-title]").forEach((el) => { el.title = t(el.dataset.i18nTitle); el.setAttribute("aria-label", el.title); });
    $$("[data-i18n-placeholder]").forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    $$("[data-i18n-content]").forEach((el) => { el.content = t(el.dataset.i18nContent); });
    $("#btn-lang").textContent = LANG === "es" ? "EN" : "ES";
  }

  // PRNG con semilla (mulberry32)
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffled(arr, seed) {
    const r = rng(seed), a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ================= Teclas =================
  const MODS = ["Ctrl", "Win", "Shift", "Alt"];
  const isMod = (k) => MODS.includes(k);
  const sortKeys = (keys) => {
    const mods = MODS.filter((m) => keys.includes(m));
    return mods.concat(keys.filter((k) => !isMod(k)));
  };
  const DISPLAY = {
    es: { Delete: "Supr", Space: "Espacio", Home: "Inicio", End: "Fin", PgUp: "RePág", PgDn: "AvPág", Backspace: "⌫", PrtSc: "ImpPt" },
    en: { Delete: "Del", Backspace: "⌫" },
  };
  const label = (k) => DISPLAY[LANG][k] || k;
  const sameSet = (a, b) => a.length === b.length && a.every((k) => b.includes(k));
  const keyType = (k) => {
    if (/^[A-Z]$/.test(k)) return "letter";
    if (/^[0-9]$/.test(k)) return "number";
    if (/^F\d+$/.test(k)) return "fkey";
    if ("↑↓←→".includes(k)) return "arrow";
    if (isMod(k)) return "modifier";
    if (k.length === 1) return "symbol";
    return "special";
  };
  const finalKey = (keys) => keys[keys.length - 1];

  SHORTCUTS.forEach((s) => {
    s.keys = sortKeys(s.keys);
    s.alt = (s.alt || []).map(sortKeys);
  });

  const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const CODE_MAP = {
    ControlLeft: "Ctrl", ControlRight: "Ctrl", ShiftLeft: "Shift", ShiftRight: "Shift",
    AltLeft: "Alt", AltRight: "Alt",
    MetaLeft: IS_MAC ? "Ctrl" : "Win", MetaRight: IS_MAC ? "Ctrl" : "Win", OSLeft: "Win", OSRight: "Win",
    Escape: "Esc", Tab: "Tab", Enter: "Enter", NumpadEnter: "Enter", Space: "Space",
    Backspace: "Backspace", Delete: "Delete", Home: "Home", End: "End",
    PageUp: "PgUp", PageDown: "PgDn", PrintScreen: "PrtSc",
    ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→",
    Backquote: "`", Minus: "-", Equal: "=", BracketLeft: "[", BracketRight: "]",
    Backslash: "\\", IntlBackslash: "\\", Semicolon: ";", Quote: "'", Comma: ",", Period: ".", Slash: "/",
    NumpadAdd: "=", NumpadDecimal: ".", NumpadDivide: "/", NumpadSubtract: "-",
  };
  function codeToKey(e) {
    const c = e.code;
    if (CODE_MAP[c]) return CODE_MAP[c];
    let m;
    if ((m = c.match(/^Key([A-Z])$/))) return m[1];
    if ((m = c.match(/^(?:Digit|Numpad)([0-9])$/))) return m[1];
    if ((m = c.match(/^F([0-9]{1,2})$/))) return "F" + m[1];
    if (e.key === "Meta" || e.key === "OS") return IS_MAC ? "Ctrl" : "Win";
    return null;
  }

  const keycap = (k, cls = "") => `<span class="key ${cls}">${esc(label(k))}</span>`;
  const comboHTML = (keys, cls = "") => keys.map((k) => keycap(k, cls)).join('<span class="plus">+</span>');
  const kbdInline = (keys) => `<span class="combo-inline">${keys.map((k) => `<kbd>${esc(label(k))}</kbd>`).join("")}</span>`;
  const appChip = (appId) => {
    const a = APPS[appId];
    return `<span class="app-ico">${a.icon}</span>${esc(appName(appId))}`;
  };

  // ================= Fecha / reto diario =================
  const EPOCH = new Date(2026, 9, 6); // 6 de octubre de 2026 = reto #1
  function dayNumber(d = new Date()) {
    const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.round((local - EPOCH) / 864e5) + 1;
  }
  const TODAY = dayNumber();
  const ORDER = {
    combo: shuffled(SHORTCUTS.map((s) => s.id), 84841),
    classic: shuffled(SHORTCUTS.map((s) => s.id), 13371),
  };
  const dailyAnswer = (mode, day) => {
    const n = ORDER[mode].length;
    return SHORTCUTS[ORDER[mode][(((day - 1) % n) + n) % n]];
  };

  // ================= Estado =================
  const MAX_COMBO = 6;
  const state = {
    mode: store.get("sdle:mode", "combo"),
    variant: "daily",
    answer: null,
    guesses: [],
    done: false,
    won: false,
    staged: [],
  };

  const saveKey = () => `sdle:${state.mode}:day${TODAY}`;
  function persist() {
    if (state.variant !== "daily") return;
    store.set(saveKey(), {
      guesses: state.guesses,
      done: state.done,
      won: state.won,
    });
  }

  function newRound() {
    state.staged = [];
    state.done = false;
    state.won = false;
    state.guesses = [];
    if (state.variant === "daily") {
      state.answer = dailyAnswer(state.mode, TODAY);
      const saved = store.get(saveKey(), null);
      if (saved) Object.assign(state, saved);
    } else {
      let a;
      do { a = SHORTCUTS[Math.floor(Math.random() * SHORTCUTS.length)]; } while (state.answer && a.id === state.answer.id);
      state.answer = a;
    }
    render();
  }

  // ================= Render general =================
  function render() {
    $$(".mode-tab").forEach((b) => b.classList.toggle("active", b.dataset.mode === state.mode));
    $$(".switch-btn").forEach((b) => b.classList.toggle("active", b.dataset.variant === state.variant));
    $("#mode-combo").classList.toggle("hidden", state.mode !== "combo");
    $("#mode-classic").classList.toggle("hidden", state.mode !== "classic");
    $$(".puzzle-label").forEach((el) => { el.textContent = state.variant === "daily" ? `#${TODAY}` : t("puzzle.practice"); });
    if (state.mode === "combo") renderCombo();
    else renderClassic();
    renderResult();
  }

  // ================= MODO COMBO =================
  function comboFeedback(guess, answer) {
    if (isComboCorrect(guess, answer)) return guess.map(() => "ok");
    return guess.map((k) => (answer.keys.includes(k) ? "ok" : "bad"));
  }
  const isComboCorrect = (guess, ans) => sameSet(guess, ans.keys) || ans.alt.some((a) => sameSet(guess, a));

  function renderCombo() {
    const a = state.answer;
    const app = APPS[a.app];
    const appEl = $("#combo-app");
    appEl.innerHTML = appChip(a.app);
    appEl.style.background = app.color;
    $("#combo-action").textContent = actionOf(a) + "?";

    // Pistas
    const fails = state.guesses.length;
    const nMods = a.keys.filter(isMod).length;
    const hints = [
      { at: 2, text: nMods ? t("combo.hintMods", { n: nMods, s: nMods > 1 ? (LANG === "es" ? "es" : "s") : "" }) : t("combo.hintNoMods") },
      { at: 4, text: t("combo.hintFinal", { k: label(finalKey(a.keys)) }) },
    ];
    $("#combo-hints").innerHTML = hints.map((x) => {
      const open = fails >= x.at || state.done;
      return `<span class="hint ${open ? "unlocked" : ""}">${esc(open ? x.text : t("hint.locked", { n: x.at - fails }))}</span>`;
    }).join("");

    // Tablero
    const board = $("#combo-board");
    board.innerHTML = "";
    const rows = state.done ? state.guesses.length : MAX_COMBO;
    for (let i = 0; i < rows; i++) {
      const g = state.guesses[i];
      const row = h("div", "brow" + (g ? " filled" : ""));
      row.appendChild(h("span", "num", String(i + 1)));
      const keys = h("div", "keys");
      if (g) {
        const fb = comboFeedback(g, a);
        keys.innerHTML = g.map((k, j) => `<span class="key st-${fb[j]}" style="animation-delay:${j * 0.12}s">${esc(label(k))}</span>`).join('<span class="plus">+</span>');
        row.appendChild(keys);
        const diff = a.keys.length - g.length;
        const chip = h("span", "count-chip " + (diff === 0 ? "ok" : diff > 0 ? "up" : "down"),
          diff === 0 ? `${g.length} ✓` : `${a.keys.length > g.length ? "⬆️" : "⬇️"}`);
        chip.title = t(diff === 0 ? "combo.countOk" : diff > 0 ? "combo.countUp" : "combo.countDown");
        row.appendChild(chip);
      } else {
        row.appendChild(keys);
      }
      board.appendChild(row);
    }

    $("#combo-input").classList.toggle("hidden", state.done);
    $("#mode-combo .tiny-note").classList.toggle("hidden", state.done);
    renderStaging();
    paintKeyboard();
  }

  function renderStaging() {
    const st = $("#combo-staging");
    st.innerHTML = state.staged.length
      ? comboHTML(state.staged)
      : `<span class="staging-empty">${esc(t("combo.empty"))}</span>`;
    $("#combo-submit").disabled = !state.staged.length;
    $$(".vkey").forEach((b) => b.classList.toggle("selected", state.staged.includes(b.dataset.key)));
  }

  function setStaged(keys) {
    const mods = keys.filter(isMod);
    const rest = keys.filter((k) => !isMod(k));
    // Como máximo una tecla "normal": la última pulsada
    state.staged = sortKeys([...new Set(mods)].concat(rest.length ? [rest[rest.length - 1]] : []));
    renderStaging();
  }

  function toggleStaged(k) {
    if (state.done) return;
    if (state.staged.includes(k)) setStaged(state.staged.filter((x) => x !== k));
    else setStaged(state.staged.concat(k));
  }

  function submitCombo() {
    if (state.done || !state.staged.length) return;
    const g = state.staged.slice();
    if (state.guesses.some((x) => sameSet(x, g))) {
      toast(t("combo.repeat"));
      shake($("#combo-staging"));
      return;
    }
    state.guesses.push(g);
    state.staged = [];
    if (isComboCorrect(g, state.answer)) {
      state.done = true; state.won = true;
      // Si acertó con una alternativa, la mostramos tal cual en verde
    } else if (state.guesses.length >= MAX_COMBO) {
      state.done = true; state.won = false;
    }
    persist();
    if (state.done) finishRound();
    render();
  }

  function paintKeyboard() {
    const ok = new Set(), bad = new Set();
    if (state.mode === "combo") {
      state.guesses.forEach((g) => g.forEach((k) => (state.answer.keys.includes(k) ? ok : bad).add(k)));
    }
    $$(".vkey").forEach((b) => {
      const k = b.dataset.key;
      b.classList.toggle("st-ok", ok.has(k));
      b.classList.toggle("st-bad", !ok.has(k) && bad.has(k));
    });
  }

  function buildKeyboard() {
    const rows = [
      { cls: "small", keys: ["Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "PrtSc"] },
      { keys: ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"] },
      { keys: ["Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"] },
      { keys: ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter"] },
      { keys: ["Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "↑"] },
      { keys: ["Ctrl", "Win", "Alt", "Space", "←", "↓", "→"] },
      { cls: "small spacer", keys: ["Home", "End", "PgUp", "PgDn", "Delete"] },
    ];
    const wide = new Set(["Tab", "Enter", "Shift", "Ctrl", "Win", "Alt", "Backspace", "Esc", "PrtSc", "Home", "End", "PgUp", "PgDn", "Delete"]);
    const kb = $("#vkeyboard");
    rows.forEach((r) => {
      const row = h("div", "vrow " + (r.cls || ""));
      r.keys.forEach((k) => {
        const b = h("button", "vkey" + (wide.has(k) ? " wide" : "") + (k === "Space" ? " xwide" : "") + (isMod(k) ? " mod" : ""));
        b.type = "button";
        b.dataset.key = k;
        b.addEventListener("click", () => toggleStaged(k));
        row.appendChild(b);
      });
      kb.appendChild(row);
    });
    relabelKeyboard();
  }
  function relabelKeyboard() {
    $$(".vkey").forEach((b) => {
      const k = b.dataset.key;
      b.textContent = k === "Win" ? (IS_MAC ? "Win" : "⊞ Win") : label(k);
      b.title = label(k);
    });
  }

  // Captura del teclado físico
  const held = new Set();
  let chord = [];
  function onKeyDown(e) {
    if (state.mode !== "combo" || state.done || modalOpen()) return;
    if (e.target.matches("input, textarea")) return;
    const k = codeToKey(e);
    if (!k) return;
    e.preventDefault();
    if (e.repeat) return;
    held.add(k);
    if (!chord.includes(k)) chord.push(k);
    pressVisual(k, true);
  }
  function onKeyUp(e) {
    if (state.mode !== "combo") return;
    const k = codeToKey(e);
    if (!k) return;
    if (e.target.matches && e.target.matches("input, textarea")) return;
    e.preventDefault();
    held.delete(k);
    pressVisual(k, false);
    // En Mac, al soltar ⌘ no llegan los keyup del resto de teclas
    if (e.key === "Meta") { held.clear(); $$(".vkey.pressed").forEach((b) => b.classList.remove("pressed")); }
    if (held.size === 0 && chord.length) {
      const c = chord; chord = [];
      if (state.done || modalOpen()) return;
      if (c.length === 1 && c[0] === "Enter" && state.staged.length) return submitCombo();
      if (c.length === 1 && c[0] === "Backspace") return setStaged([]);
      setStaged(c);
    }
  }
  function pressVisual(k, on) {
    const b = $(`.vkey[data-key="${CSS.escape(k)}"]`);
    if (b) b.classList.toggle("pressed", on);
  }

  // ================= MODO CLÁSICO =================
  function compareClassic(g, a) {
    const gm = g.keys.filter(isMod), am = a.keys.filter(isMod);
    const inter = gm.filter((m) => am.includes(m));
    const gf = finalKey(g.keys), af = finalKey(a.keys);
    let finalSt = gf === af ? "ok" : keyType(gf) === keyType(af) ? "part" : "bad";
    let finalArrow = "";
    if (finalSt === "part" && ["letter", "number"].includes(keyType(gf))) finalArrow = af > gf ? "⬆️" : "⬇️";
    return {
      app: g.app === a.app ? "ok" : "bad",
      cat: APPS[g.app].cat === APPS[a.app].cat ? "ok" : "bad",
      mods: sameSet(gm, am) ? "ok" : inter.length ? "part" : "bad",
      count: g.keys.length === a.keys.length ? "ok" : "bad",
      countArrow: g.keys.length === a.keys.length ? "" : a.keys.length > g.keys.length ? "⬆️" : "⬇️",
      final: finalSt,
      finalArrow,
    };
  }

  function renderClassic() {
    const a = state.answer;
    const n = state.guesses.length;
    const hints = [
      { at: 4, text: `${APPS[a.app].icon} ${t("classic.hintApp", { a: appName(a.app) })}` },
      { at: 8, text: t("classic.hintStart", { w: actionOf(a).split(" ")[0] }) },
      { at: 12, text: `🔑 ${a.keys.map(label).join(" + ")}` },
    ];
    $("#classic-hints").innerHTML = hints.map((x) => {
      const open = n >= x.at || state.done;
      return `<span class="hint ${open ? "unlocked" : ""}">${esc(open ? x.text : t("hint.locked", { n: x.at - n }))}</span>`;
    }).join("");

    $("#classic-search").classList.toggle("hidden", state.done);
    const table = $("#classic-table");
    $$(".crow:not(.chead)", table).forEach((r) => r.remove());
    const list = state.guesses.slice().reverse();
    list.forEach((id, idx) => {
      const g = SHORTCUTS[id];
      const c = compareClassic(g, a);
      const animate = idx === 0 && state._justGuessed;
      const row = h("div", "crow");
      const mods = g.keys.filter(isMod);
      const cells = [
        `<div class="cell name"><b>${esc(actionOf(g))}</b>${kbdInline(g.keys)}</div>`,
        `<div class="cell ${c.app}"><span class="big">${APPS[g.app].icon}</span>${esc(appName(g.app))}</div>`,
        `<div class="cell ${c.cat}">${esc(appCat(g.app))}</div>`,
        `<div class="cell ${c.mods}">${mods.length ? mods.map(label).join(" + ") : t("mods.none")}</div>`,
        `<div class="cell ${c.count}"><span class="big">${g.keys.length}</span><span class="arrow">${c.countArrow}</span></div>`,
        `<div class="cell ${c.final}"><kbd>${esc(label(finalKey(g.keys)))}</kbd><small>${esc(t("type." + keyType(finalKey(g.keys))))}</small><span class="arrow">${c.finalArrow}</span></div>`,
      ];
      row.innerHTML = cells.join("");
      $$(".cell", row).forEach((cell, j) => {
        cell.style.animationDelay = animate ? `${j * 0.18}s` : "0s";
        if (!animate) cell.style.animation = "none";
      });
      table.appendChild(row);
    });
    state._justGuessed = false;
  }

  function haystack(s) {
    const a = APPS[s.app];
    const labels = s.keys.map((k) => [DISPLAY.es[k], DISPLAY.en[k]].filter(Boolean).join(" ")).join(" ");
    return norm(`${s.action} ${s.en} ${a.name} ${a.nameEn || ""} ${a.cat} ${a.catEn} ${s.keys.join("+")} ${labels}`);
  }
  SHORTCUTS.forEach((s) => { s._hay = haystack(s); });

  let sugIndex = -1;
  function updateSuggestions() {
    const q = norm($("#classic-input").value.trim());
    const ul = $("#classic-suggestions");
    if (!q) { ul.classList.add("hidden"); ul.innerHTML = ""; return; }
    const tokens = q.split(/\s+/).filter(Boolean);
    const res = SHORTCUTS.filter((s) => !state.guesses.includes(s.id) && tokens.every((t) => s._hay.includes(t)))
      .sort((x, y) => (norm(actionOf(x)).startsWith(q) ? -1 : 0) - (norm(actionOf(y)).startsWith(q) ? -1 : 0))
      .slice(0, 40);
    sugIndex = res.length ? 0 : -1;
    ul.innerHTML = res.length
      ? res.map((s, i) => `<li data-id="${s.id}" class="${i === 0 ? "active" : ""}"><span class="sug-ico">${APPS[s.app].icon}</span><span class="sug-text"><b>${esc(actionOf(s))}</b><small>${esc(appName(s.app))}</small></span>${kbdInline(s.keys)}</li>`).join("")
      : `<li style="cursor:default"><span class="sug-text"><small>${esc(t("classic.noResults"))}</small></span></li>`;
    ul.classList.remove("hidden");
  }
  function moveSug(d) {
    const items = $$("#classic-suggestions li[data-id]");
    if (!items.length) return;
    sugIndex = (sugIndex + d + items.length) % items.length;
    items.forEach((li, i) => li.classList.toggle("active", i === sugIndex));
    items[sugIndex].scrollIntoView({ block: "nearest" });
  }
  function guessClassic(id) {
    if (state.done || state.guesses.includes(id)) return;
    state.guesses.push(id);
    state._justGuessed = true;
    $("#classic-input").value = "";
    updateSuggestions();
    if (id === state.answer.id) { state.done = true; state.won = true; }
    persist();
    if (state.done) finishRound();
    render();
    if (!state.done) $("#classic-input").focus();
  }

  // ================= Resultado / estadísticas =================
  function statsKey(mode) { return `sdle:stats:${mode}`; }
  function getStats(mode) {
    return store.get(statsKey(mode), { played: 0, wins: 0, streak: 0, maxStreak: 0, dist: {}, lastDay: null, lastWinDay: null });
  }
  function bucket(mode, n, won) {
    if (!won) return "✗";
    if (mode === "combo") return String(n);
    if (n <= 3) return String(n);
    if (n <= 6) return "4-6";
    if (n <= 10) return "7-10";
    return "11+";
  }
  function finishRound() {
    if (state.won) setTimeout(confetti, state.mode === "combo" ? 500 : 1100);
    setTimeout(() => $("#result").scrollIntoView({ behavior: "smooth", block: "center" }), state.mode === "combo" ? 700 : 1300);
    if (state.variant !== "daily") return;
    const s = getStats(state.mode);
    if (s.lastDay === TODAY) return;
    s.played++;
    s.lastDay = TODAY;
    if (state.won) {
      s.wins++;
      s.streak = s.lastWinDay === TODAY - 1 ? s.streak + 1 : 1;
      s.maxStreak = Math.max(s.maxStreak, s.streak);
      s.lastWinDay = TODAY;
    } else {
      s.streak = 0;
    }
    const b = bucket(state.mode, state.guesses.length, state.won);
    s.dist[b] = (s.dist[b] || 0) + 1;
    store.set(statsKey(state.mode), s);
  }

  function renderResult() {
    const box = $("#result");
    if (!state.done) { box.classList.add("hidden"); return; }
    box.classList.remove("hidden");
    const a = state.answer, n = state.guesses.length;
    const winMsgs = t("result.wins");
    $("#result-emoji").textContent = state.won ? (n === 1 ? "🤯" : n <= 3 ? "🏆" : "🎉") : "😵";
    $("#result-title").textContent = state.won
      ? (state.mode === "combo" ? winMsgs[Math.min(n, 6) - 1] : t(n <= 3 ? "result.classicGreat" : "result.classicWin"))
      : t("result.lose");
    $("#result-text").textContent = state.won
      ? t("result.solved", { n })
      : t("result.failed");
    $("#result-answer").innerHTML = `<span class="prompt-app" style="background:${APPS[a.app].color}">${appChip(a.app)}</span>
      <div style="width:100%;font-weight:800;margin:4px 0">${esc(actionOf(a))}</div>${comboHTML(a.keys, "st-ok")}`
      + (a.alt.length ? `<div style="width:100%;color:var(--muted);font-weight:600;font-size:14px">${esc(t("result.alsoValid"))} ${a.alt.map((x) => x.map(label).join("+")).join(" · ")}</div>` : "");
    $("#btn-next").textContent = t(state.variant === "daily" ? "result.playPractice" : "result.another");
    updateCountdown();
  }

  function updateCountdown() {
    const el = $("#countdown");
    if (state.variant !== "daily" || !state.done) { el.textContent = ""; return; }
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const s = Math.max(0, Math.floor((next - now) / 1000));
    const pad = (x) => String(x).padStart(2, "0");
    el.textContent = t("result.countdown", { t: `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` });
  }
  setInterval(updateCountdown, 1000);

  function shareText() {
    const a = state.answer, n = state.guesses.length;
    const tag = state.variant === "daily" ? `#${TODAY}` : t("share.practice");
    let lines;
    if (state.mode === "combo") {
      lines = [`Shortcut-dle ⌨️ Combo ${tag} ${state.won ? n : "X"}/${MAX_COMBO}`];
      state.guesses.forEach((g) => lines.push(comboFeedback(g, a).map((x) => (x === "ok" ? "🟩" : "🟥")).join("")));
    } else {
      lines = [`Shortcut-dle 🔎 ${t("share.classic")} ${tag} — ${t("share.tries", { n })}`];
      const em = { ok: "🟩", part: "🟨", bad: "🟥" };
      state.guesses.slice(-6).forEach((id) => {
        const c = compareClassic(SHORTCUTS[id], a);
        lines.push([c.app, c.cat, c.mods, c.count, c.final].map((x) => em[x]).join(""));
      });
      if (n > 6) lines.splice(1, 0, "…");
    }
    lines.push(location.href.split("#")[0].split("?")[0]);
    return lines.join("\n");
  }

  function renderStats() {
    const s = getStats(state.mode);
    $("#stats-mode").textContent = state.mode === "combo" ? "· Combo" : `· ${t("share.classic")}`;
    const pct = s.played ? Math.round((s.wins / s.played) * 100) : 0;
    $("#stats-grid").innerHTML = [
      [s.played, t("stats.played")], [pct + "%", t("stats.wins")], [s.streak, t("stats.streak")], [s.maxStreak, t("stats.maxStreak")],
    ].map(([v, l]) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`).join("");
    const buckets = state.mode === "combo" ? ["1", "2", "3", "4", "5", "6", "✗"] : ["1", "2", "3", "4-6", "7-10", "11+"];
    const max = Math.max(1, ...buckets.map((b) => s.dist[b] || 0));
    const mine = state.variant === "daily" && state.done && s.lastDay === TODAY ? bucket(state.mode, state.guesses.length, state.won) : null;
    $("#stats-dist").innerHTML = buckets.map((b) => {
      const v = s.dist[b] || 0;
      return `<div class="dist-row"><span style="width:44px">${b}</span><span class="dist-bar ${b === mine ? "hl" : ""}" style="width:${8 + (v / max) * 82}%">${v}</span></div>`;
    }).join("");
  }

  // ================= UI varios =================
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.remove("hidden");
    t.style.animation = "none"; void t.offsetWidth; t.style.animation = "";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add("hidden"), 2000);
  }
  function shake(el) {
    el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake");
  }
  const modalOpen = () => $$(".modal").some((m) => !m.classList.contains("hidden"));
  function openModal(id) { $(id).classList.remove("hidden"); }
  function closeModals() { $$(".modal").forEach((m) => m.classList.add("hidden")); }

  function confetti() {
    const cv = $("#confetti"), ctx = cv.getContext("2d");
    const W = (cv.width = innerWidth), H = (cv.height = innerHeight);
    const colors = ["#7c5cff", "#ff5da2", "#ffd23f", "#2bd67b", "#3a8dff"];
    const glyphs = ["⌘", "⌥", "⇧", "⌃", "⏎"];
    const parts = Array.from({ length: 140 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * 160, y: H * 0.35,
      vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
      r: Math.random() * 6 + 4, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3,
      c: colors[Math.floor(Math.random() * colors.length)],
      g: Math.random() < 0.15 ? glyphs[Math.floor(Math.random() * glyphs.length)] : null,
    }));
    let frame = 0;
    (function tick() {
      ctx.clearRect(0, 0, W, H);
      parts.forEach((p) => {
        p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
        ctx.fillStyle = p.c;
        if (p.g) { ctx.font = "bold 22px sans-serif"; ctx.fillText(p.g, -8, 8); }
        else { ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.strokeStyle = "#1b1530"; ctx.lineWidth = 1.5; ctx.strokeRect(-p.r, -p.r / 2, p.r * 2, p.r); }
        ctx.restore();
      });
      if (++frame < 160) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    })();
  }

  function floatingKeys() {
    const wrap = $(".bg-keys");
    const keys = ["Ctrl", "Alt", "⌘", "Shift", "Tab", "Esc", "F5", "Z", "C", "V", "⏎", "Fn", "⌥", "Del"];
    keys.forEach((k, i) => {
      const s = h("span", "", esc(k));
      s.style.left = `${(i * 73) % 96}%`;
      s.style.top = `${(i * 41 + 7) % 92}%`;
      s.style.setProperty("--r", `${(i % 2 ? 1 : -1) * (4 + (i % 5) * 2)}deg`);
      s.style.animationDelay = `${-i * 0.7}s`;
      wrap.appendChild(s);
    });
  }

  function applyTheme(t) {
    if (t) document.documentElement.dataset.theme = t;
    const dark = t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    $("#btn-theme").textContent = dark ? "☀️" : "🌙";
  }

  // ================= Eventos =================
  function bind() {
    $$(".mode-tab").forEach((b) => b.addEventListener("click", () => {
      if (state.mode === b.dataset.mode) return;
      state.mode = b.dataset.mode;
      store.set("sdle:mode", state.mode);
      state.answer = null;
      newRound();
    }));
    $$(".switch-btn").forEach((b) => b.addEventListener("click", () => {
      if (state.variant === b.dataset.variant) return;
      state.variant = b.dataset.variant;
      state.answer = null;
      newRound();
    }));
    $("#combo-submit").addEventListener("click", submitCombo);
    $("#combo-clear").addEventListener("click", () => setStaged([]));
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", () => { held.clear(); chord = []; $$(".vkey.pressed").forEach((b) => b.classList.remove("pressed")); });

    const input = $("#classic-input");
    input.addEventListener("input", updateSuggestions);
    input.addEventListener("focus", updateSuggestions);
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); moveSug(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); moveSug(-1); }
      else if (e.key === "Enter") {
        const items = $$("#classic-suggestions li[data-id]");
        if (items[sugIndex]) guessClassic(Number(items[sugIndex].dataset.id));
      } else if (e.key === "Escape") { $("#classic-suggestions").classList.add("hidden"); }
    });
    $("#classic-suggestions").addEventListener("click", (e) => {
      const li = e.target.closest("li[data-id]");
      if (li) guessClassic(Number(li.dataset.id));
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#classic-search")) $("#classic-suggestions").classList.add("hidden");
    });

    $("#btn-help").addEventListener("click", () => openModal("#modal-help"));
    $("#btn-stats").addEventListener("click", () => { renderStats(); openModal("#modal-stats"); });
    $$("[data-close]").forEach((b) => b.addEventListener("click", closeModals));
    $$(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target === m) closeModals(); }));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modalOpen()) closeModals(); });

    $("#btn-theme").addEventListener("click", () => {
      const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const t = cur === "dark" ? "light" : "dark";
      store.set("sdle:theme", t);
      applyTheme(t);
    });

    $("#btn-lang").addEventListener("click", () => {
      LANG = LANG === "es" ? "en" : "es";
      store.set("sdle:lang", LANG);
      applyStatic();
      relabelKeyboard();
      render();
      if (!$("#modal-stats").classList.contains("hidden")) renderStats();
    });
    $("#btn-share").addEventListener("click", async () => {
      const text = shareText();
      try {
        if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ text });
        else { await navigator.clipboard.writeText(text); toast(t("toast.copied")); }
      } catch {
        toast(t("toast.copyFail"));
      }
    });
    $("#btn-next").addEventListener("click", () => {
      state.variant = "practice";
      newRound();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // ================= Inicio =================
  applyStatic();
  applyTheme(store.get("sdle:theme", null));
  floatingKeys();
  buildKeyboard();
  bind();
  newRound();
  if (!store.get("sdle:seenHelp", false)) {
    openModal("#modal-help");
    store.set("sdle:seenHelp", true);
  }
})();
