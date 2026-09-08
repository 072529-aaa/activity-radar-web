/* ActivityRadar v2.3: live auto-sync, official source verification, quick registration */
(function () {
  "use strict";

  var doc = document;
  var win = window;
  var radarSyncing = false;
  var radarLastOkUrl = "";
  var radarSourceMeta = null;
  var radarPayloadOrigin = "";
  var radarUsingFallback = false;
  var radarSyncStartedAt = 0;
  var radarTickDate = "";
  var radarSyncTimer = null;
  var radarNewIds = [];

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function parseYmd(s) {
    if (!s) return null;
    var p = String(s).split("-").map(Number);
    if (p.length < 3 || p.some(function (n) { return Number.isNaN(n); })) return null;
    return { year: p[0], month: p[1], day: p[2] };
  }

  function fullDate(s) {
    var d = parseYmd(s);
    if (!d) return s || "";
    return d.year + "年" + d.month + "月" + d.day + "日";
  }

  function dateRange(s, e) {
    return s === e ? fullDate(s) : fullDate(s) + " 至 " + fullDate(e);
  }

  function radarDateTimeText(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (Number.isNaN(d.getTime())) return fullDate(iso);
    var pad = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日 " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function radarRegText(a, rs) {
    var deadline = rs.deadline;
    var deadlineText = deadline ? (String(deadline).indexOf("T") >= 0 || String(deadline).indexOf(":") >= 0 ? radarDateTimeText(deadline) : fullDate(deadline)) : "";
    if (rs.open) {
      return deadline ? "报名 " + deadlineText + " 截止" : liveLabel(a);
    }
    if (rs.closed) {
      return deadline ? deadlineText + " 已截止" : "报名已截止";
    }
    if (rs.soon && rs.opening) {
      return "报名 " + radarDateTimeText(rs.opening) + " 开放";
    }
    return "报名见官方";
  }

  function relativeTime(iso) {
    if (!iso) return "";
    var t = new Date(iso).getTime();
    if (Number.isNaN(t)) return "";
    var diff = Math.max(0, Date.now() - t);
    var min = Math.floor(diff / 60000);
    if (min < 1) return "刚刚";
    if (min < 60) return min + " 分钟前";
    var h = Math.floor(min / 60);
    if (h < 24) return h + " 小时前";
    return Math.floor(h / 24) + " 天前";
  }

  function liveLabel(a) {
    var s = radarRegState(a);
    if (a.volunteer && a.volunteer.recruiting) {
      return "志愿者招募中";
    }
    if (s.open) return "报名中";
    if (s.closed) return "报名已截止";
    return "报名见官方";
  }

  function radarRegState(a) {
    if (!a) return { open: false, closed: false, announced: true };
    var reg = a.register || {};
    var vol = a.volunteer || {};
    var useDeadline = reg.deadline || vol.deadline || "";
    var status = String(reg.status || "").toLowerCase();
    var volunteerOpen = !!(vol.recruiting && a.type !== "volunteer");
    var deadlineDays = useDeadline ? getDaysUntil(useDeadline) : null;
    if (reg.opensAt) {
      var opensAtTime = new Date(reg.opensAt).getTime();
      if (!Number.isNaN(opensAtTime) && Date.now() < opensAtTime) {
        return { open: false, closed: false, soon: true, announced: false, deadline: useDeadline, opening: reg.opensAt };
      }
    }
    if (a.type === "volunteer") {
      if (vol.recruiting && (deadlineDays === null || deadlineDays >= 0)) {
        return { open: true, closed: false, announced: false, deadline: useDeadline };
      }
      if (deadlineDays !== null && deadlineDays < 0) {
        return { open: false, closed: true, announced: false, deadline: useDeadline };
      }
    }
    if (volunteerOpen && (deadlineDays === null || deadlineDays >= 0)) {
      return { open: true, closed: false, announced: false, deadline: useDeadline };
    }
    if (status === "open" || status === "recruiting") {
      if (deadlineDays !== null && deadlineDays < 0) {
        return { open: false, closed: true, announced: false, deadline: useDeadline };
      }
      return { open: true, closed: false, announced: false, deadline: useDeadline };
    }
    if (status === "closed" || status === "ended") {
      return { open: false, closed: true, announced: false, deadline: useDeadline };
    }
    return { open: false, closed: false, announced: true, deadline: useDeadline };
  }

  function typeLabel(a) {
    if (!a) return "活动";
    if (a.type === "marathon") return "马拉松";
    if (a.type === "ai") return "AI 活动";
    if (a.type === "volunteer") return "志愿项目";
    return a.category || "官方活动";
  }

  function radarNormalize(input) {
    var a = Object.assign({}, input);
    a.tags = Array.isArray(a.tags) ? a.tags : [];
    a.register = a.register && typeof a.register === "object" ? Object.assign({}, a.register) : {};
    a.register.deadline = a.register.deadline || "";
    a.register.opensAt = a.register.opensAt || a.register.openAt || "";
    a.register.url = a.register.url || a.registerUrl || "";
    a.register.channel = a.register.channel || a.registerChannel || "";
    a.register.fee = a.register.fee || "";
    a.register.requirements = a.register.requirements || a.requirements || "";
    a.volunteer = a.volunteer && typeof a.volunteer === "object" ? Object.assign({}, a.volunteer) : {};
    a.volunteer.roles = Array.isArray(a.volunteer.roles) ? a.volunteer.roles : [];
    a.volunteer.benefits = Array.isArray(a.volunteer.benefits) ? a.volunteer.benefits : [];
    a.volunteer.requirements = a.volunteer.requirements || "";
    a.volunteer.registerUrl = a.volunteer.registerUrl || a.volunteer.url || "";
    a.volunteer.registerChannel = a.volunteer.registerChannel || a.volunteer.contact || "";
    a.volunteer.contact = a.volunteer.contact || a.volunteer.registerChannel || "";
    a.volunteer.deadline = a.volunteer.deadline || "";
    if (!a.register.url) a.register.url = a.volunteer.registerUrl || a.officialUrl || "";
    a.officialUrl = a.officialUrl || a.sourceUrl || a.register.url || "";
    a.sourceName = a.sourceName || a.source || a.sourceLabel || (a.verified ? "官方发布" : "");
    a.sourceKind = a.sourceKind || (a.verified ? "official" : "");
    a.verified = !!(a.verified || a.sourceKind === "official" || /官|发布|协会|官方|组委会/i.test(String(a.sourceName || "")));
    if (a.city) a.isWuhan = a.city === "武汉";
    return a;
  }

  function radarApplyRemoteData(payload) {
    var items = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.items) ? payload.items : null);
    if (!Array.isArray(items) || !items.length) return false;
    var oldIds = {};
    try {
      (activities || []).forEach(function (x) { oldIds[String(x.id)] = true; });
    } catch (_) {}
    var normalized = items.map(radarNormalize);
    try {
      activities = normalized;
    } catch (_) {
      return false;
    }
    radarNewIds = normalized.filter(function (a) { return !oldIds[String(a.id)]; }).map(function (a) { return a.id; });
    var uniqueCities = [];
    normalized.forEach(function (a) {
      if (a.city && uniqueCities.indexOf(a.city) < 0) uniqueCities.push(a.city);
    });
    if (uniqueCities.length) {
      cities = ["武汉"].concat(uniqueCities.filter(function (c) { return c && c !== "武汉"; }));
    }
    if (state.currentCity !== "全部" && cities.indexOf(state.currentCity) < 0) {
      state.currentCity = "全部";
    }
    var activeInCurrent = normalized.filter(function (a) { return !isEnded(a); });
    if (state.currentCity === "武汉" && !activeInCurrent.some(function (a) { return a.city === "武汉"; })) {
      state.currentCity = "全部";
    }
    dataUpdatedAt = (payload && (payload.updatedAt || payload.lastUpdated)) || "";
    radarSourceMeta = (payload && payload.meta && Array.isArray(payload.meta.sources)) ? payload.meta.sources : null;
    radarPayloadOrigin = (payload && (payload.source || payload.generator || "")) || "";
    radarUsingFallback = !!(payload && payload.fallback);
    return true;
  }

  function radarDataCandidateUrls() {
    var urls = [];
    var t = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    var bust = function (u) { return u + (u.indexOf("?") >= 0 ? "&" : "?") + "_v=2.3&_t=" + t; };
    var pagesUrl = "https://072529-aaa.github.io/activity-radar-web/data/activities.json";
    var rawUrl = "https://raw.githubusercontent.com/072529-aaa/activity-radar-web/main/data/activities.json";
    var cdnUrl = "https://cdn.jsdelivr.net/gh/072529-aaa/activity-radar-web@main/data/activities.json";
    var fastUrl = "https://fastly.jsdelivr.net/gh/072529-aaa/activity-radar-web@main/data/activities.json";
    if (location.protocol === "http:" || location.protocol === "https:") {
      var localUrl = new URL("data/activities.json", location.href).href;
      if (!isNativeContainer()) urls.push(bust(localUrl));
    }
    urls.push(bust(pagesUrl), bust(rawUrl), bust(cdnUrl), bust(fastUrl));
    if (isNativeContainer() && location.protocol === "https:") {
      urls.push(new URL("data/activities.json", location.href).href);
    }
    return Array.from(new Set(urls));
  }

  function saveCache(payload) {
    try {
      localStorage.setItem("activity-radar-data-v3", JSON.stringify(payload));
      localStorage.setItem("activity-radar-last-url", radarLastOkUrl || "");
    } catch (_) {}
  }

  function radarRenderDataMeta() {
    var el = doc.getElementById("dataMeta");
    if (!el) return;
    if (radarSyncing) {
      el.textContent = "正在自动同步官方活动源，请稍候…";
      return;
    }
    if (dataUpdatedAt) {
      var sourceName = radarSourceMeta && radarSourceMeta[0] ? radarSourceMeta[0].name : (radarPayloadOrigin || "官方数据源");
      var suffix = radarUsingFallback ? " · 离线缓存" : " · 已连接官方源";
      el.textContent = "最新数据已同步 · " + relativeTime(dataUpdatedAt) + " · " + sourceName + suffix;
      return;
    }
    if (radarSyncStartedAt) {
      el.textContent = "联网同步暂不可用 · 正在使用最近缓存或内置离线数据";
      return;
    }
    el.textContent = "打开应用时自动联网更新 · 离线时使用最近缓存";
  }

  function radarSetSyncStatus(mode, message, pct) {
    radarRenderDataMeta();
    var bar = doc.getElementById("radarLiveBar");
    if (!bar) return;
    bar.classList.toggle("syncing", mode === "syncing");
    bar.classList.toggle("error", mode === "error");
    var dot = bar.querySelector(".radar-dot");
    var title = bar.querySelector(".radar-live-title");
    var sub = bar.querySelector(".radar-live-sub");
    var barEl = bar.querySelector(".radar-progress-bar");
    var pill = bar.querySelector(".radar-source-pill");
    if (dot) dot.style.background = mode === "error" ? "#c0392b" : (mode === "syncing" ? "var(--accent)" : "#32a06c");
    if (title) title.textContent = mode === "syncing" ? "正在自动更新" : (mode === "error" ? "联网检查未完成" : "动态数据已开启");
    if (sub) sub.textContent = message || (dataUpdatedAt ? "最近同步：" + relativeTime(dataUpdatedAt) : "应用每次打开都会自动检查最新活动");
    if (barEl) barEl.style.width = (pct == null ? (mode === "syncing" ? 58 : 100) : pct) + "%";
    if (pill) {
      var sourceCount = radarSourceMeta ? radarSourceMeta.length : 0;
      pill.className = "radar-source-pill " + (radarUsingFallback ? "offline" : "ok");
      pill.textContent = radarUsingFallback ? "离线缓存" : (sourceCount ? sourceCount + " 个官方源" : "官方源");
    }
  }

  function radarFinishSync(mode, message) {
    radarSyncing = false;
    radarRenderDataMeta();
    radarSetSyncStatus(mode, message);
  }

  function radarRenderSkeleton() {
    if (doc.getElementById("radarSkeleton")) return;
    var grids = doc.querySelectorAll(".activity-grid");
    grids.forEach(function (grid) {
      var skeleton = doc.createElement("div");
      skeleton.id = "radarSkeleton";
      skeleton.className = "radar-skeleton-grid";
      var html = "";
      for (var i = 0; i < 3; i++) {
        html += '<div class="radar-skeleton-card"><div class="radar-skeleton-line short"></div><div class="radar-skeleton-line title"></div><div class="radar-skeleton-line"></div><div class="radar-skeleton-line"></div><div class="radar-skeleton-line"></div></div>';
      }
      skeleton.innerHTML = html;
      grid.after(skeleton);
    });
  }

  function radarRemoveSkeleton() {
    var sk = doc.getElementById("radarSkeleton");
    if (sk) sk.remove();
  }

  function radarRenderCard(a) {
    var rs = radarRegState(a);
    var typeCls = a.type === "marathon" ? "run" : (a.type === "volunteer" ? "vol" : "ai");
    var regClass = rs.open ? "open" : (rs.closed ? "closed" : (rs.soon ? "soon" : ""));
    var regText = radarRegText(a, rs);
    var verified = a.verified ? '<span class="radar-verified-pill">官方核验</span>' : '<span class="radar-live-pill">示例</span>';
    var isNew = radarNewIds.indexOf(a.id) >= 0;
    return '<article class="activity-card ' + (isNew ? "radar-new-card" : "radar-live-card") + '" data-id="' + a.id + '" role="button" tabindex="0" aria-label="查看活动详情：' + esc(a.title) + '">' +
      '<div class="card-head"><span class="type-pill ' + typeCls + '">' + esc(typeLabel(a)) + " · " + esc(a.city || "全国") + '</span><span class="card-date-tag">' + esc(getCardDateLabel(a)) + "</span></div>" +
      "<h3 class=\"card-title\">" + esc(a.title) + "</h3>" +
      '<dl class="card-info">' +
      '<div class="card-info-row"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg><dt>时间</dt><dd>' + esc(dateRange(a.date, a.endDate)) + "</dd></div>" +
      '<div class="card-info-row"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><dt>地点</dt><dd>' + esc(a.city) + " · " + esc(a.location || "地点以官方为准") + "</dd></div>" +
      '<div class="card-info-row"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg><dt>报名</dt><dd class="' + regClass + '">' + esc(regText) + "</dd></div>" +
      "</dl>" +
      '<div class="radar-card-badges">' + verified + (a.volunteer && a.volunteer.recruiting ? '<span class="radar-verified-pill" style="background:var(--vol-soft);color:var(--vol);">志愿者招募中</span>' : "") + "</div>" +
      "</article>";
  }

  function radarAttachCards(grid) {
    if (!grid) return;
    Array.prototype.forEach.call(grid.querySelectorAll(".activity-card"), function (card) {
      card.addEventListener("click", function () { openModal(Number(card.getAttribute("data-id"))); });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal(Number(card.getAttribute("data-id")));
        }
      });
    });
  }

  function radarRenderList() {
    radarRemoveSkeleton();
    var list = getFiltered();
    var grid = doc.getElementById("activityGrid");
    var empty = doc.getElementById("emptyState");
    var count = doc.getElementById("resultCount");
    if (count) count.textContent = list.length + " 场";
    if (!grid) return;
    grid.innerHTML = list.map(radarRenderCard).join("");
    empty.style.display = list.length ? "none" : "block";
    radarAttachCards(grid);
    var cards = grid.querySelectorAll(".activity-card");
    cards.forEach(function (card, i) {
      card.style.animationDelay = Math.min(i * 40, 360) + "ms";
    });
  }

  function radarRenderVolZone() {
    radarRemoveSkeleton();
    var list = getVolunteerActivities();
    var grid = doc.getElementById("volunteerGrid");
    var empty = doc.getElementById("volunteerEmpty");
    var count = doc.getElementById("zoneCount");
    var roles = doc.getElementById("zoneRoles");
    if (count) count.textContent = list.length;
    if (!grid) return;
    if (roles) {
      var roleSet = {};
      list.forEach(function (a) {
        (a.volunteer && a.volunteer.roles || []).forEach(function (r) { roleSet[r] = true; });
      });
      roles.textContent = Object.keys(roleSet).length;
    }
    grid.innerHTML = list.map(radarRenderCard).join("");
    empty.style.display = list.length ? "none" : "block";
    radarAttachCards(grid);
  }

  function openExternal(url) {
    if (!url) return false;
    try {
      if (isNativeContainer()) {
        var opened = window.open(url, "_system");
        if (!opened) window.location.href = url;
      } else {
        var win2 = window.open(url, "_blank", "noopener,noreferrer");
        if (win2) win2.opener = null;
      }
      return true;
    } catch (_) {
      window.location.href = url;
      return true;
    }
  }

  function radarUseGeolocation() {
    var btn = doc.getElementById("locBtn");
    if (!btn) return;
    var label = btn.querySelector("span");
    var setBusy = function (busy) {
      btn.classList.toggle("locating", busy);
      if (label) label.textContent = busy ? "定位中" : "定位";
    };
    var applyPosition = function (lat, lng) {
      var known = {};
      try {
        (activities || []).forEach(function (a) {
          if (a && a.city && cityCoords && cityCoords[a.city]) known[a.city] = true;
        });
      } catch (_) {}
      if (!Object.keys(known).length && cityCoords) {
        Object.keys(cityCoords).forEach(function (c) { known[c] = true; });
      }
      var nearest = null;
      var minDist = Infinity;
      Object.keys(known).forEach(function (city) {
        var coord = cityCoords[city];
        if (!coord) return;
        var d = distance(lat, lng, coord.lat, coord.lng);
        if (d < minDist) {
          minDist = d;
          nearest = city;
        }
      });
      if (nearest && minDist <= 500) {
        selectCity(nearest);
        showToast("已定位到 " + nearest + "，距您约 " + minDist.toFixed(0) + " 公里");
      } else {
        selectCity("全部");
        showToast("附近暂无可匹配的活动城市，已为您显示全部活动");
      }
      setBusy(false);
    };
    var fail = function () {
      setBusy(false);
      showToast("定位失败，请检查定位权限和系统定位开关后重试");
    };
    if (isNativeContainer()) {
      var plugin = registerNativeGeolocationPlugin();
      var runNative = async function () {
        try {
          if (!plugin) throw new Error("no plugin");
          try {
            var perm = await plugin.checkPermissions();
            var granted = perm && (perm.location === "granted" || perm.coarseLocation === "granted");
            if (!granted) {
              try {
                var req = await plugin.requestPermissions({ permissions: ["location", "coarseLocation"] });
                var afterGranted = req && (req.location === "granted" || req.coarseLocation === "granted");
                if (!afterGranted) throw new Error("denied");
              } catch (e) { throw new Error("denied"); }
            }
          } catch (e) {
            if (e && e.message === "denied") throw e;
          }
          var pos = await plugin.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
          applyPosition(pos.coords.latitude, pos.coords.longitude);
        } catch (_) {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (p) { applyPosition(p.coords.latitude, p.coords.longitude); }, fail, { timeout: 10000, maximumAge: 60000 });
          } else {
            fail();
          }
        }
      };
      runNative();
      return;
    }
    if (!navigator.geolocation) {
      setBusy(false);
      showToast("当前浏览器不支持定位");
      return;
    }
    navigator.geolocation.getCurrentPosition(function (p) { applyPosition(p.coords.latitude, p.coords.longitude); }, fail, { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false });
  }

  function radarRenderRegisterPanel(a) {
    var registerWrap = doc.getElementById("radarRegisterWrap");
    if (!registerWrap) {
      registerWrap = doc.createElement("section");
      registerWrap.id = "radarRegisterWrap";
      registerWrap.className = "radar-register-wrap";
      var channelSection = doc.getElementById("channelSection");
      if (channelSection && channelSection.parentNode) {
        channelSection.parentNode.insertBefore(registerWrap, channelSection);
      }
    }
    var rs = radarRegState(a);
    var reg = a.register || {};
    var vol = a.volunteer || {};
    var deadline = rs.deadline || reg.deadline || vol.deadline || "";
    var statusClass = rs.open ? "" : (rs.closed ? "closed" : "live");
    var statusText = radarRegText(a, rs);
    var url = reg.url || a.officialUrl || "";
    var channel = reg.channel || (a.type === "volunteer" ? vol.registerChannel || vol.contact : a.sourceName) || "活动主办方官方发布";
    registerWrap.innerHTML =
      '<div class="radar-panel-head"><h3>报名与参与</h3><span class="radar-state-pill ' + statusClass + '">' + esc(statusText) + "</span></div>" +
      '<dl class="radar-panel-list">' +
      (deadline ? '<div class="radar-panel-row"><dt>报名截止</dt><dd>' + esc(fullDate(deadline)) + "</dd></div>" : "") +
      (reg.fee ? '<div class="radar-panel-row"><dt>费用</dt><dd>' + esc(reg.fee) + "</dd></div>" : "") +
      (channel ? '<div class="radar-panel-row"><dt>报名渠道</dt><dd>' + esc(channel) + "</dd></div>" : "") +
      (reg.requirements || vol.requirements ? '<div class="radar-panel-row"><dt>报名要求</dt><dd>' + esc(reg.requirements || vol.requirements) + "</dd></div>" : "") +
      "</dl>" +
      '<div class="radar-inline-actions">' +
      (url ? '<button class="btn ' + (rs.open ? "btn-vol" : "btn-primary") + '" id="radarQuickApply" type="button">' + (rs.open ? "立即报名" : "查看报名/官方发布") + "</button>" : "") +
      '<button class="btn btn-outline" id="radarQuickCopy" type="button">复制报名信息</button>' +
      "</div>";
    var apply = registerWrap.querySelector("#radarQuickApply");
    var copy = registerWrap.querySelector("#radarQuickCopy");
    if (apply) apply.addEventListener("click", function () { openExternal(url); });
    if (copy) copy.addEventListener("click", function () { copyText(buildActivityInfo(a), "报名信息已复制"); });
  }

  function radarRenderDetail(a) {
    if (!a) return;
    var v = a.volunteer || {};
    var s = getVolunteerStatus(a);
    var rs = radarRegState(a);
    var typeCls = a.type === "marathon" ? "run" : (a.type === "volunteer" ? "vol" : "ai");
    var pill = doc.getElementById("detailStatusChip");
    pill.className = "type-pill " + typeCls;
    pill.textContent = (a.volunteer && a.volunteer.recruiting) ? "志愿者招募中" : (rs.open ? "报名中" : getCardDateLabel(a));
    doc.getElementById("detailEyebrow").innerHTML = '<span class="type-pill ' + typeCls + '">' + esc(typeLabel(a)) + " · " + esc(a.city || "全国") + "</span>";
    doc.getElementById("detailTitle").textContent = a.title;
    doc.getElementById("detailOrganizer").textContent = "主办方：" + (a.organizer || "以官方公告为准");
    var startDays = getDaysUntil(a.date);
    var endDays = getDaysUntil(a.endDate || a.date);
    var countdown = "";
    if (endDays < 0) countdown = "活动已结束，可查看官方回顾与后续信息";
    else if (startDays < 0) countdown = "活动正在进行中";
    else if (startDays === 0) countdown = "活动今天开始";
    else if (startDays === 1) countdown = "距离活动开始还有 1 天";
    else countdown = "距离活动开始还有 " + startDays + " 天";
    doc.getElementById("detailCountdown").textContent = countdown;

    var regValue = radarRegText(a, rs);
    var fee = (a.register && a.register.fee) || (v.benefits && v.benefits[0] ? "" : "以官方为准");
    var facts = [
      ["活动时间", dateRange(a.date, a.endDate)],
      ["活动地点", (a.city ? a.city + " · " : "") + (a.location || "地点以官方为准")],
      ["报名时间", regValue],
      ["活动类型", typeLabel(a) + " · " + (a.category || "")],
      ["主办方", a.organizer || "以官方公告为准"],
      ["费用", fee || (a.register && a.register.fee) || "以官方公告为准"]
    ];
    doc.getElementById("detailFacts").innerHTML = facts.map(function (f) {
      return '<div class="fact"><div class="fact-label">' + esc(f[0]) + '</div><div class="fact-value">' + esc(f[1]) + "</div></div>";
    }).join("");
    doc.getElementById("detailDesc").textContent = a.description || "活动详情以官方发布为准。";
    doc.getElementById("detailTags").innerHTML = (a.tags || []).map(function (t) { return '<span class="detail-tag">' + esc(t) + "</span>"; }).join("");

    var valueItems = Array.from(new Set((a.tags || []).concat((v.benefits || []).slice(0, 5))));
    var valueSection = doc.getElementById("valueSection");
    if (valueItems.length) {
      valueSection.hidden = false;
      doc.getElementById("detailValues").innerHTML = valueItems.map(function (x) { return '<span class="value-item">' + esc(x) + "</span>"; }).join("");
    } else {
      valueSection.hidden = true;
    }

    radarRenderRegisterPanel(a);

    var channel = doc.getElementById("detailChannels");
    var officialUrl = a.officialUrl || (a.register && a.register.url) || (v.registerUrl) || "";
    var sourceName = a.sourceName || "官方发布";
    channel.innerHTML =
      '<div class="radar-verified-banner"><span>官方来源已核验</span></div>' +
      '<div class="radar-source-card" style="margin-top:10px;">' +
      '<div class="radar-source-main"><strong>' + esc(sourceName) + "</strong><span>更新时间：" + esc(relativeTime(a.lastChecked || a.updatedAt || dataUpdatedAt) || "以远程同步为准") + "</span>" +
      (officialUrl ? '<a href="' + esc(officialUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(officialUrl) + "</a>" : "<span>请在官方平台搜索活动名称核验</span>") +
      "</div></div>";

    var volBox = doc.getElementById("detailVolunteer");
    if (s.open) {
      var vDeadline = v.deadline ? fullDate(v.deadline) : "以官方公告为准";
      var vUrl = v.registerUrl || a.officialUrl || (a.register && a.register.url) || "";
      volBox.innerHTML =
        '<div class="vol-detail-box"><div class="detail-section-head" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><strong style="color:var(--vol);">招募中</strong>' +
        (v.count ? '<span class="detail-tag" style="background:rgba(184,146,42,.12);color:var(--vol);">拟招募 ' + v.count + ' 人</span>' : '<span class="detail-tag" style="background:rgba(184,146,42,.12);color:var(--vol);">名额以官方为准</span>') +
        "</div>" +
        '<div class="role-line">' + (v.roles || []).map(function (r) { return '<span class="vol-role-chip">' + esc(r) + "</span>"; }).join("") + "</div>" +
        '<div class="vol-meta-line"><div>报名截止：' + esc(vDeadline) + '</div><div>官方渠道：' + esc(v.registerChannel || v.contact || "官方公告") + "</div></div>" +
        (v.requirements ? '<div style="margin-top:10px;font-size:13px;color:var(--text-secondary);line-height:1.7;"><strong style="color:var(--vol);">招募条件：</strong>' + esc(v.requirements) + "</div>" : "") +
        (v.benefits && v.benefits.length ? '<div style="margin-top:8px;font-size:13px;color:var(--text-secondary);line-height:1.7;"><strong style="color:var(--vol);">保障与激励：</strong>' + v.benefits.map(function (b) { return esc(b); }).join("、") + "</div>" : "") +
        (vUrl ? '<div class="radar-vol-actions"><button class="btn btn-vol" id="radarVolApply" type="button">立即报名志愿者</button></div>' : "") +
        "</div>";
      var volApply = volBox.querySelector("#radarVolApply");
      if (volApply) volApply.addEventListener("click", function () { openExternal(vUrl); });
    } else if (s.closed) {
      volBox.innerHTML = '<div class="vol-detail-box" style="background:var(--bg-soft);border-color:var(--border);"><strong style="color:var(--text-muted);">报名已截止</strong><p style="margin-top:6px;font-size:13px;color:var(--text-secondary);line-height:1.7;">志愿者报名已于 ' + (v.deadline ? fullDate(v.deadline) : "官方公布日期") + ' 截止，请关注活动方后续通知。</p></div>';
    } else {
      volBox.innerHTML = '<div class="vol-detail-box" style="background:var(--bg-soft);border-color:var(--border);"><strong style="color:var(--text-muted);">暂无公开志愿者招募</strong><p style="margin-top:6px;font-size:13px;color:var(--text-secondary);line-height:1.7;">该活动暂未开放官方志愿者岗位，可打开上方官方源查看后续公告。</p></div>';
    }

    var actionBar = doc.getElementById("detailActions");
    var registerUrl = (a.register && a.register.url) || v.registerUrl || a.officialUrl || "";
    var mapQuery = encodeURIComponent((a.city || "") + " " + (a.location || a.title || ""));
    var mapUrl = "https://uri.amap.com/search?keyword=" + mapQuery;
    actionBar.className = "detail-actions radar-detail-actions";
    actionBar.innerHTML =
      '<button class="btn btn-vol btn-main" id="radarBottomApply" type="button">' + (rs.open ? "立即报名" : "官方报名页") + "</button>" +
      '<button class="btn btn-primary" id="radarBottomOfficial" type="button">官方源</button>' +
      '<button class="btn btn-outline" id="radarBottomMap" type="button">地图</button>' +
      '<button class="btn btn-outline" id="radarBottomCopy" type="button">复制</button>';
    if (registerUrl) {
      actionBar.querySelector("#radarBottomApply").addEventListener("click", function () { openExternal(registerUrl); });
    } else {
      actionBar.querySelector("#radarBottomApply").addEventListener("click", function () { copyText(buildActivityInfo(a), "报名入口暂未公布，信息已复制"); });
    }
    actionBar.querySelector("#radarBottomOfficial").addEventListener("click", function () { if (officialUrl) openExternal(officialUrl); else copyText(buildActivityInfo(a), "暂无直达链接，请按官方来源搜索"); });
    actionBar.querySelector("#radarBottomMap").addEventListener("click", function () { openExternal(mapUrl); });
    actionBar.querySelector("#radarBottomCopy").addEventListener("click", function () { copyText(buildActivityInfo(a), "活动详情已复制"); });
    doc.title = a.title + " · 活动雷达";

    var tabBar = doc.getElementById("radarDetailTabs");
    if (!tabBar) {
      tabBar = doc.createElement("div");
      tabBar.id = "radarDetailTabs";
      tabBar.className = "radar-detail-tabs";
      var countdownEl = doc.getElementById("detailCountdown");
      if (countdownEl && countdownEl.parentNode) countdownEl.parentNode.appendChild(tabBar);
    }
    tabBar.innerHTML =
      '<button class="radar-tab-chip active" data-target="detailPage" type="button">活动</button>' +
      '<button class="radar-tab-chip" data-target="radarRegisterWrap" type="button">报名</button>' +
      '<button class="radar-tab-chip" data-target="volSection" type="button">志愿者</button>';
    tabBar.querySelectorAll(".radar-tab-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        tabBar.querySelectorAll(".radar-tab-chip").forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        var target = doc.getElementById(chip.getAttribute("data-target"));
        if (target && target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function radarRefreshOpenDetail() {
    if (!detailOpenId) return;
    var a = activities.find(function (x) { return x.id === detailOpenId; });
    if (a) radarRenderDetail(a);
    else goHome();
  }

  function radarTick() {
    var today = new Date().toDateString();
    radarRenderDataMeta();
    radarSetSyncStatus(radarUsingFallback ? "error" : "ok", dataUpdatedAt ? "最近同步：" + relativeTime(dataUpdatedAt) : "");
    if (today !== radarTickDate) {
      radarTickDate = today;
      try {
        renderViews();
        radarRefreshOpenDetail();
      } catch (_) {}
    }
  }

  function radarInjectLiveBar() {
    if (doc.getElementById("radarLiveBar")) return;
    var hero = doc.querySelector(".hero");
    var bar = doc.createElement("div");
    bar.id = "radarLiveBar";
    bar.className = "radar-livebar syncing";
    bar.innerHTML =
      '<span class="radar-dot"></span>' +
      '<div class="radar-live-main"><strong class="radar-live-title">正在自动更新</strong><span class="radar-live-sub">连接活动官方源，请稍候…</span></div>' +
      '<div class="radar-progress"><div class="radar-progress-bar" style="width:38%;"></div></div>' +
      '<span class="radar-source-pill">官方源</span>';
    if (hero && hero.parentNode) hero.parentNode.insertBefore(bar, hero);
    else doc.body.insertBefore(bar, doc.body.firstChild);
  }

  async function radarLoadRemoteData(opts) {
    if (radarSyncing) return false;
    var options = opts || {};
    radarSyncing = true;
    radarSyncStartedAt = Date.now();
    radarSetSyncStatus("syncing", options.auto ? "打开应用，正在自动更新" : "正在同步官方活动源…", 12);
    try {
      var urls = radarDataCandidateUrls();
      for (var i = 0; i < urls.length; i++) {
        radarSetSyncStatus("syncing", "正在连接数据源 " + (i + 1) + " / " + urls.length, Math.round(((i + 1) / urls.length) * 88) + 6);
        var payload = await fetchJson(urls[i]);
        if (payload && radarApplyRemoteData(payload)) {
          radarLastOkUrl = urls[i];
          saveCache(payload);
          radarUsingFallback = false;
          renderViews();
          radarRefreshOpenDetail();
          radarRemoveSkeleton();
          radarFinishSync("ok", "已连接 " + (radarSourceMeta && radarSourceMeta[0] ? radarSourceMeta[0].name : "官方数据源") + " · " + relativeTime(dataUpdatedAt));
          if (!options.quiet && !options.auto) {
            showToast(radarNewIds.length ? "已同步 " + activities.length + " 场官方活动" : "已获取最新官方活动数据");
          }
          return true;
        }
      }
      try {
        var raw = localStorage.getItem("activity-radar-data-v3") || localStorage.getItem("activity-radar-data-v2");
        if (raw) {
          var cached = JSON.parse(raw);
          if (radarApplyRemoteData(cached)) {
            radarUsingFallback = true;
            renderViews();
            radarRefreshOpenDetail();
            radarRemoveSkeleton();
            radarFinishSync("ok", "网络暂不可用，已读取最近同步缓存");
            return true;
          }
        }
      } catch (_) {}
      radarUsingFallback = true;
      radarFinishSync("error", "未能连接远程官方源，正在使用离线数据");
      if (!options.quiet) showToast("网络暂不可用，正在使用离线数据");
      return false;
    } finally {
      if (radarSyncing) radarSyncing = false;
      radarRemoveSkeleton();
      radarRenderDataMeta();
    }
  }

  async function radarForceRefresh() {
    try {
      if ("serviceWorker" in navigator) {
        var regs = await navigator.serviceWorker.getRegistrations();
        regs.forEach(function (reg) { try { reg.update(); } catch (_) {} });
      }
      if ("caches" in window) {
        var keys = await caches.keys();
        await Promise.all(keys.map(function (key) { return caches.delete(key); }));
      }
    } catch (_) {}
    return radarLoadRemoteData({ quiet: false, auto: false });
  }

  function radarSetRefreshButton() {
    var btn = doc.getElementById("refreshBtn");
    if (!btn) return;
    var clone = btn.cloneNode(true);
    if (btn.parentNode) btn.parentNode.replaceChild(clone, btn);
    clone.addEventListener("click", async function () {
      clone.classList.add("checking");
      clone.disabled = true;
      await radarForceRefresh();
      clone.classList.remove("checking");
      clone.disabled = false;
    });
  }

  win.applyRemoteData = radarApplyRemoteData;
  win.dataCandidateUrls = radarDataCandidateUrls;
  win.renderDataMeta = radarRenderDataMeta;
  win.loadRemoteData = radarLoadRemoteData;
  win.renderCard = radarRenderCard;
  win.renderList = radarRenderList;
  win.renderVolZone = radarRenderVolZone;
  win.renderDetail = radarRenderDetail;
  win.refreshOpenDetail = radarRefreshOpenDetail;
  win.useGeolocation = radarUseGeolocation;

  doc.addEventListener("DOMContentLoaded", function () {
    radarInjectLiveBar();
    radarSetRefreshButton();
    radarRenderDataMeta();
    if (!radarSyncTimer) {
      radarSyncTimer = setInterval(function () {
        radarLoadRemoteData({ quiet: true, auto: false });
      }, 4 * 60 * 1000);
    }
    radarTickDate = new Date().toDateString();
    setInterval(radarTick, 30000);
    doc.addEventListener("visibilitychange", function () {
      if (doc.visibilityState === "visible") {
        radarLoadRemoteData({ quiet: true, auto: true });
      }
    });
    setTimeout(function () {
      if (!dataUpdatedAt && !radarSyncing) radarLoadRemoteData({ quiet: true, auto: true });
    }, 350);
  });
})();
