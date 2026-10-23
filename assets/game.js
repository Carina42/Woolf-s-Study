(() => {
  const desk = document.getElementById("desk");
  const dialog = document.getElementById("plant-dialog");
  const stamp = document.getElementById("target-stamp");
  const view = document.querySelector(".desk-top-view");
  const folioHover = document.getElementById("folio-hover");
  let oakChosen = false,
    dossierUnlocked = false,
    openingTimer = null;
  document.querySelectorAll(".plant-target").forEach((button) =>
    button.addEventListener("click", () => {
      if (button.dataset.plant === "oak") {
        oakChosen = true;
        dialog.classList.add("visible");
      } else {
        const old = button.getAttribute("aria-label");
        button.setAttribute("aria-label", "此植物档案待开放");
        window.setTimeout(() => button.setAttribute("aria-label", old), 1200);
      }
    }),
  );
  document.getElementById("confirm-plant").addEventListener("click", () => {
    dialog.classList.remove("visible");
  });
  desk.addEventListener("toggle", () => {
    if (!desk.open) return;
    view.classList.remove("case-hidden");
    if (oakChosen && !dossierUnlocked) {
      window.clearTimeout(openingTimer);
      view.classList.remove("unlocked", "unlocking");
      void view.offsetWidth;
      view.classList.add("unlocking");
      openingTimer = window.setTimeout(() => {
        if (!desk.open) return;
        dossierUnlocked = true;
        stamp.hidden = false;
        view.classList.add("unlocked");
        folioHover.textContent = "卷宗已解封 · 山顶的橡树";
      }, 560);
    } else if (dossierUnlocked) {
      stamp.hidden = false;
      view.classList.add("unlocked");
    }
  });
  const openedCase = document.getElementById("opened-case");
  const reopenCase = document.getElementById("case-reopen");
  const closeDossier = (event) => {
    event?.preventDefault();
    event?.stopPropagation();
    window.clearTimeout(openingTimer);
    openedCase.classList.add("case-hidden");
    reopenCase.hidden = false;
    reopenCase.focus({ preventScroll: true });
  };
  document
    .getElementById("close-dossier")
    .addEventListener("click", closeDossier);
  reopenCase.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openedCase.classList.remove("case-hidden");
    reopenCase.hidden = true;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !openedCase.classList.contains("case-hidden"))
      closeDossier(event);
  });
  const pages = [...document.querySelectorAll(".case-page")];
  let page = 0;
  const prev = document.getElementById("case-prev"),
    next = document.getElementById("case-next"),
    indicator = document.getElementById("case-page-indicator");
  function showPage(n) {
    page = Math.max(0, Math.min(pages.length - 1, n));
    pages.forEach((el, i) => el.classList.toggle("active", i === page));
    prev.disabled = page === 0;
    next.disabled = page === pages.length - 1;
    indicator.textContent = ["I", "II", "III"][page] + " / III";
  }
  prev.addEventListener("click", () => showPage(page - 1));
  next.addEventListener("click", () => showPage(page + 1));
  const clueNames = {
    root: "树根",
    canopy: "树冠",
    leaf: "叶片",
    poem: "诗稿",
    time: "时间",
  };
  const found = new Set();
  const feedback = document.getElementById("case-feedback");
  const clueCounter = document.getElementById("clue-count");
  const treePieces = new Map();
  document.querySelectorAll(".tree-piece[data-tree-key]").forEach((piece) => {
    const key = piece.dataset.treeKey;
    if (!treePieces.has(key)) treePieces.set(key, []);
    treePieces.get(key).push(piece);
  });
  document.querySelectorAll(".sentence-target").forEach((el) => {
    const selectSentence = () => {
      const keys = (el.dataset.keys || "").split(/\s+/).filter(Boolean);
      if (!keys.length) {
        el.classList.remove("wrong");
        void el.offsetWidth;
        el.classList.add("wrong");
        feedback.textContent = "这句话与橡树的植物属性无关。";
        return;
      }
      const newly = [];
      keys.forEach((key) => {
        if (!found.has(key)) {
          found.add(key);
          newly.push(key);
          (treePieces.get(key) || []).forEach((piece) =>
            piece.classList.add("collected"),
          );
        }
      });
      el.classList.add("found");
      clueCounter.textContent = found.size + " / 5 条线索";
      feedback.textContent = newly.length
        ? "线索记录：" + newly.map((key) => clueNames[key]).join("、")
        : "这条线索已经记录过了。";
      if (found.size === 5)
        document.getElementById("case-complete").classList.add("visible");
    };
    el.addEventListener("click", selectSentence);
    el.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectSentence();
      }
    });
  });
})();

(() => {
  const music = document.getElementById("music-audio");
  const player = document.getElementById("record-player");
  const recordSurface = document.getElementById("record-spin-layer");
  const recordHit = document.getElementById("record-player-hit");
  const shellacRevolutionMs = 60000 / 78;
  let spinFrame = 0,
    spinStarted = 0,
    spinAngle = 0,
    sequenceId = 0,
    needleTimer = 0,
    soundTimer = 0;
  function spinRecord(now) {
    spinAngle =
      (((now - spinStarted) % shellacRevolutionMs) / shellacRevolutionMs) * 360;
    recordSurface.setAttribute("transform", `rotate(${spinAngle})`);
    spinFrame = requestAnimationFrame(spinRecord);
  }
  function startRecord() {
    if (spinFrame) return;
    spinStarted = performance.now() - (spinAngle / 360) * shellacRevolutionMs;
    spinFrame = requestAnimationFrame(spinRecord);
  }
  function stopRecord() {
    if (!spinFrame) return;
    cancelAnimationFrame(spinFrame);
    spinFrame = 0;
  }
  const clips = [{ audio: music, start: 28, end: 80 }];
  clips.forEach(({ audio, start, end }) => {
    audio.addEventListener("timeupdate", () => {
      if (audio.currentTime >= end) audio.currentTime = start;
    });
    audio.addEventListener("play", () => {
      if (audio.currentTime < start || audio.currentTime >= end)
        audio.currentTime = start;
    });
  });

  function stopPlayback() {
    sequenceId++;
    clearTimeout(needleTimer);
    clearTimeout(soundTimer);
    music.pause();
    stopRecord();
    player.classList.remove("needle-down", "record-spinning");
    recordHit.setAttribute("title", "点击播放留声机");
  }

  function startPlayback() {
    if (
      player.classList.contains("needle-down") ||
      player.classList.contains("record-spinning")
    ) {
      stopPlayback();
      return;
    }
    const token = ++sequenceId;
    recordHit.setAttribute("title", "正在把唱针放上唱片");
    player.classList.add("needle-down");

    needleTimer = window.setTimeout(() => {
      if (token !== sequenceId) return;
      player.classList.add("record-spinning");
      startRecord();
      recordHit.setAttribute("title", "唱片转动中");

      soundTimer = window.setTimeout(async () => {
        if (token !== sequenceId) return;
        try {
          music.volume = 0.2;
          await music.play();
          recordHit.setAttribute("title", "暂停留声机");
        } catch (error) {
          recordHit.setAttribute("title", "浏览器未能播放，请再点一次");
          stopPlayback();
        }
      }, 650);
    }, 850);
  }

  recordHit.addEventListener("click", () => {
    if (
      music.paused &&
      !player.classList.contains("needle-down") &&
      !player.classList.contains("record-spinning")
    )
      startPlayback();
    else stopPlayback();
  });

  music.addEventListener("ended", stopPlayback);
})();

// 天气与日夜切换逻辑（含自动雨声控制）
(() => {
  let isNight = true;
  let weather = "rain";
  const stage = document.querySelector(".stage");
  const timeToggle = document.getElementById("time-toggle");
  const weatherToggle = document.getElementById("weather-toggle");
  const rainAudio = document.getElementById("rain-audio");

  function updateEnvironment() {
    // 昼夜
    if (isNight) {
      stage.classList.add("is-night");
      stage.classList.remove("is-day");
      timeToggle.textContent = "🌙 夜晚";
    } else {
      stage.classList.remove("is-night");
      stage.classList.add("is-day");
      timeToggle.textContent = "☀️ 白天";
    }

    // 天气
    stage.classList.remove("weather-rain", "weather-cloudy", "weather-sunny");
    stage.classList.add("weather-" + weather);

    if (weather === "rain") {
      weatherToggle.textContent = "🌧️ 雨天";
      if (rainAudio.paused) {
        rainAudio.volume = 0.46;
        rainAudio.play().catch((e) => console.warn("雨声播放被拦截", e));
      }
    } else if (weather === "cloudy") {
      weatherToggle.textContent = "☁️ 阴天";
      rainAudio.pause();
    } else if (weather === "sunny") {
      weatherToggle.textContent = "☀️ 晴天";
      rainAudio.pause();
    }
  }

  timeToggle.addEventListener("click", () => {
    isNight = !isNight;
    updateEnvironment();
  });

  weatherToggle.addEventListener("click", () => {
    if (weather === "rain") weather = "cloudy";
    else if (weather === "cloudy") weather = "sunny";
    else weather = "rain";
    updateEnvironment();
  });

  // 初始化
  updateEnvironment();
})();

// 下方两扇唱片柜门：小型操作条与独立居中提示。
(() => {
  const stage = document.querySelector(".stage");
  const cabinetHit = document.getElementById("cabinet-hit");
  const original = document.getElementById("cabinet-original");
  const opened = document.getElementById("cabinet-opened");
  const menu = document.getElementById("cabinet-menu");
  const notice = document.getElementById("record-selection");
  const change = document.getElementById("change-record");
  const confirm = document.getElementById("confirm-record-notice");
  let cabinetOpen = false;

  function hideMenu(restoreFocus = false) {
    menu.hidden = true;
    if (restoreFocus) cabinetHit.focus({ preventScroll: true });
  }
  function setCabinetOpen(on) {
    cabinetOpen = on;
    original.style.display = on ? "none" : "block";
    opened.style.display = on ? "block" : "none";
    cabinetHit.setAttribute("aria-expanded", String(on));
    cabinetHit.setAttribute("aria-label", on ? "查看唱片柜选项" : "打开唱片柜");
    cabinetHit.title = on ? "查看唱片柜选项" : "打开唱片柜";
    hideMenu();
    notice.hidden = true;
  }
  function dismissNotice() {
    notice.hidden = true;
    menu.hidden = false;
    change.focus({ preventScroll: true });
  }
  cabinetHit.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!cabinetOpen) {
      setCabinetOpen(true);
    } else if (!menu.hidden) {
      hideMenu(true);
    } else {
      notice.hidden = true;
      menu.hidden = false;
      change.focus({ preventScroll: true });
    }
  });
  change.addEventListener("click", () => {
    hideMenu();
    notice.hidden = false;
    confirm.focus({ preventScroll: true });
  });
  confirm.addEventListener("click", dismissNotice);
  document.getElementById("close-cabinet").addEventListener("click", () => {
    setCabinetOpen(false);
    cabinetHit.focus({ preventScroll: true });
  });
  stage.addEventListener("click", (event) => {
    if (!menu.contains(event.target) && event.target !== cabinetHit && !notice.contains(event.target)) hideMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || (menu.hidden && notice.hidden)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!notice.hidden) dismissNotice();
    else hideMenu(true);
  }, true);
  ["desk", "bookshelf"].forEach((id) => {
    document.getElementById(id).addEventListener("toggle", () => {
      hideMenu();
      notice.hidden = true;
    });
  });
})();

/* 全屏按钮：兼容微信 X5 / 安卓 Chrome / iOS 伪全屏 */
(function () {
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "fs-toggle";
  btn.textContent = "⛶";
  btn.setAttribute("aria-label", "全屏游玩");
  btn.title = "全屏游玩（建议横屏）";
  document.body.appendChild(btn);

  var isWeChat = /MicroMessenger/i.test(navigator.userAgent);
  var isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  function sync() {
    btn.textContent = document.fullscreenElement ? "⤫" : "⛶";
  }

  btn.addEventListener("click", async function () {
    /* 退出标准全屏 */
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (e) {}
      sync();
      return;
    }

    /* 退出伪全屏 */
    if (document.body.classList.contains("pseudo-fullscreen")) {
      document.body.classList.remove("pseudo-fullscreen");
      btn.dataset.pseudo = "";
      sync();
      return;
    }

    /* 微信 X5 内核提示 */
    if (isWeChat) {
      showTip(
        "微信内置浏览器不支持网页全屏，请点击右上角 ··· → 在浏览器中打开",
      );
      return;
    }

    var el = document.documentElement;
    var request =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.msRequestFullscreen;

    if (request) {
      try {
        await request.call(el);
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock("landscape").catch(function () {});
        }
        sync();
        return;
      } catch (e) {
        console.warn("Fullscreen request failed:", e);
      }
    }

    /* 伪全屏兜底 */
    document.body.classList.add("pseudo-fullscreen");
    if (isIOS) {
      showTip("请横置手机以获得最佳全屏效果");
    }
    btn.dataset.pseudo = "true";
    sync();
  });

  function showTip(text) {
    var tip = document.createElement("div");
    tip.textContent = text;
    tip.style.cssText =
      "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);" +
      "z-index:99999;padding:12px 18px;background:rgba(18,25,21,.96);" +
      'border:2px solid #c9a45c;color:#f0dfb9;font:13px "Courier New",monospace;' +
      "white-space:nowrap;box-shadow:4px 4px rgba(0,0,0,.4);max-width:90vw;text-align:center;";
    document.body.appendChild(tip);
    setTimeout(function () {
      tip.remove();
    }, 3200);
  }

  document.addEventListener("fullscreenchange", sync);
})();

(function () {
  const touch = window.matchMedia(
    "(hover: none) and (pointer: coarse)",
  ).matches;
  const TIP_MS = 600;

  if (touch) {
    ["desk", "bookshelf"].forEach(function (id) {
      const details = document.getElementById(id);
      if (!details) return;
      const summary = details.querySelector("summary");
      if (!summary) return;
      let busy = false;
      summary.addEventListener(
        "click",
        function (e) {
          if (busy) return;
          if (details.open) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          busy = true;
          summary.classList.add("tip-force-show");
          setTimeout(function () {
            summary.classList.remove("tip-force-show");
            busy = false;
            details.open = true;
          }, 600);
        },
        true,
      );
    });

    document.querySelectorAll(".plant-target").forEach(function (btn) {
      let bypass = false;
      btn.addEventListener(
        "click",
        function (e) {
          if (bypass) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          btn.classList.add("tip-force-show");
          setTimeout(function () {
            btn.classList.remove("tip-force-show");
            bypass = true;
            btn.click();
            bypass = false;
          }, 600);
        },
        true,
      );
    });
  }

  const hit = document.getElementById("record-player-hit");
  const music = document.getElementById("music-audio");
  if (hit && music) {
    let timer = 0;
    hit.setAttribute("data-tip", "播放留声机");

    function showGramTip(text) {
      hit.setAttribute("data-tip", text);
      hit.classList.add("tip-show");
      clearTimeout(timer);
      timer = setTimeout(function () {
        hit.classList.remove("tip-show");
      }, TIP_MS);
    }

    hit.addEventListener(
      "click",
      function () {
        showGramTip(music.paused ? "播放留声机" : "暂停留声机");
      },
      true,
    );

    hit.addEventListener("mouseenter", function () {
      hit.setAttribute("data-tip", music.paused ? "播放留声机" : "暂停留声机");
    });
  }

  const counter = document.getElementById("clue-count");
  const modal = document.getElementById("trophy-modal");
  if (counter && modal) {
    let fired = false;
    const trigger = function () {
      if (fired) return;
      if (!/5\s*\/\s*5/.test(counter.textContent)) return;
      fired = true;
      modal.hidden = false;
      modal.setAttribute("aria-hidden", "false");
      const btn = document.getElementById("close-trophy");
      if (btn)
        setTimeout(function () {
          try {
            btn.focus({ preventScroll: true });
          } catch (e) {}
        }, 60);
    };
    new MutationObserver(trigger).observe(counter, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    const closeBtn = document.getElementById("close-trophy");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        modal.hidden = true;
        modal.setAttribute("aria-hidden", "true");
        const activePage = document.querySelector(".case-page.active");
        if (activePage) {
          try {
            activePage.scrollTo({
              top: activePage.scrollHeight,
              behavior: "smooth",
            });
          } catch (e) {
            activePage.scrollTop = activePage.scrollHeight;
          }
        }
      });
    }
  }
})();

// Keep every interaction frame centered on its SVG artwork after resize/view changes.
(() => {
  const hints = [...document.querySelectorAll("[data-hint-target]")].map((hit) => ({
    hit,
    target: document.querySelector(hit.dataset.hintTarget),
    openTarget: hit.dataset.hintOpenTarget
      ? document.querySelector(hit.dataset.hintOpenTarget)
      : null,
  }));
  let pending = 0;

  function setPixels(element, name, value) {
    const pixels = `${value.toFixed(3)}px`;
    if (element.style.getPropertyValue(name) !== pixels)
      element.style.setProperty(name, pixels);
  }
  function artworkRect(target, box) {
    if (!box) return target.getBoundingClientRect();
    const [x, y, width, height] = box.split(/\s+/).map(Number);
    const matrix = target.getScreenCTM();
    if (!matrix) return null;
    const corners = [[x, y], [x + width, y], [x, y + height], [x + width, y + height]]
      .map(([px, py]) => new DOMPoint(px, py).matrixTransform(matrix));
    const left = Math.min(...corners.map((p) => p.x));
    const top = Math.min(...corners.map((p) => p.y));
    return { left, top, width: Math.max(...corners.map((p) => p.x)) - left,
      height: Math.max(...corners.map((p) => p.y)) - top };
  }
  function alignFrames() {
    pending = 0;
    hints.forEach(({ hit, target, openTarget }) => {
      const details = hit.closest("details");
      if (hit.tagName === "SUMMARY" && details.open) return;
      const parent = hit.offsetParent;
      if (!parent || !target) return;
      const art = openTarget && hit.getAttribute("aria-expanded") === "true"
        ? openTarget : target;
      const box = art === openTarget ? hit.dataset.hintOpenBox : hit.dataset.hintBox;
      const rect = artworkRect(art, box);
      if (!rect || !rect.width || !rect.height) return;
      const bounds = parent.getBoundingClientRect();
      const parentStyle = getComputedStyle(parent);
      const localWidth = parseFloat(parentStyle.width);
      const localHeight = parseFloat(parentStyle.height);
      const scaleX = bounds.width / localWidth;
      const scaleY = bounds.height / localHeight;
      if (!scaleX || !scaleY) return;
      const svg = art.ownerSVGElement;
      const svgBounds = svg.getBoundingClientRect();
      const worldScale = svgBounds.width / svg.viewBox.baseVal.width;
      const padding = Number(hit.dataset.hintPadding || 0) * worldScale;
      const x = (rect.left + rect.width / 2 - bounds.left) / scaleX - parent.clientLeft;
      const y = (rect.top + rect.height / 2 - bounds.top) / scaleY - parent.clientTop;
      setPixels(hit, "--hint-x", x);
      setPixels(hit, "--hint-y", y);
      setPixels(hit, "--hint-width", (rect.width + 2 * padding) / scaleX);
      setPixels(hit, "--hint-height", (rect.height + 2 * padding) / scaleY);
      if (hit.classList.contains("folio-target")) {
        setPixels(parent, "--folio-hint-x", x);
        setPixels(parent, "--folio-hint-y", y);
      }
    });
  }
  function scheduleAlignment() {
    if (!pending) pending = requestAnimationFrame(alignFrames);
  }
  const observer = new ResizeObserver(scheduleAlignment);
  document.querySelectorAll(".stage, .desk-top-view, .shelf-view").forEach((el) => observer.observe(el));
  document.addEventListener("toggle", scheduleAlignment, true);
  document.addEventListener("animationend", scheduleAlignment, true);
  document.addEventListener("fullscreenchange", scheduleAlignment);
  window.addEventListener("resize", scheduleAlignment);
  new MutationObserver((changes) => {
    if (changes.some(({ target, attributeName }) =>
      (target.classList.contains("desk-top-view") && attributeName === "class") ||
      (["cabinet-original", "cabinet-opened"].includes(target.id) && attributeName === "style") ||
      (target.id === "case-reopen" && attributeName === "hidden"))) scheduleAlignment();
  }).observe(document.querySelector(".stage"), { subtree: true, attributes: true,
    attributeFilter: ["class", "style", "hidden"] });
  alignFrames();
})();
