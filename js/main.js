/* ============================================================
   YEON's DESIGN — Portfolio interactions
   Requires js/data.js (window.PORTFOLIO)
   ============================================================ */
(function () {
  "use strict";

  var projects = window.PORTFOLIO || [];
  var CATS = { all: "ALL", web: "WEB DESIGN", brand: "BRAND DESIGN" };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  /* ---------------------------------------------------------
     Grid rendering
     --------------------------------------------------------- */
  var grid = $("#grid");
  var activeFilter = "all";
  var visibleProjects = projects.slice();

  /* ALL tab opens with this many works; the rest sit behind "작업물 더보기" */
  var INITIAL_COUNT = 9;
  var expanded = false;
  var moreWrap = $("#workMore");
  var moreBtn = $("#moreBtn");
  var moreCount = $("[data-more-count]");

  function cardHTML(p) {
    return (
      '<article class="card reveal" data-category="' + p.category + '" data-id="' + p.id + '">' +
        '<button class="card-btn" type="button" aria-haspopup="dialog" aria-label="' +
          p.title + " — " + CATS[p.category] + ' 작업 상세 보기">' +
          '<div class="card-media">' +
            '<img src="' + p.thumb + '" alt="' + p.title + ' 썸네일" loading="lazy" decoding="async" width="800" height="800">' +
          "</div>" +
          '<div class="card-body">' +
            "<div>" +
              '<h3 class="card-title">' + p.title + "</h3>" +
              '<p class="card-sub">' + p.subtitle + "</p>" +
            "</div>" +
          "</div>" +
        "</button>" +
      "</article>"
    );
  }

  function renderGrid() {
    grid.innerHTML = projects.map(cardHTML).join("");
    applyFilter(activeFilter, true);
    observeReveals(grid);
  }

  /* ---------------------------------------------------------
     Filters + "작업물 더보기" paging
     --------------------------------------------------------- */
  function remainingCount() {
    return Math.max(projects.length - INITIAL_COUNT, 0);
  }

  function revealCard(card, immediate) {
    if (card.classList.contains("is-in")) return;
    if (immediate) card.classList.add("is-in");
    else window.requestAnimationFrame(function () { card.classList.add("is-in"); });
  }

  function applyFilter(cat, immediate) {
    activeFilter = cat;
    visibleProjects = projects.filter(function (p) {
      return cat === "all" || p.category === cat;
    });

    $$(".filter").forEach(function (btn) {
      var on = btn.dataset.filter === cat;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });

    // paging applies to ALL only, and only until the visitor expands it
    var paged = cat === "all" && !expanded && remainingCount() > 0;

    $$(".card", grid).forEach(function (card, i) {
      var inCat = cat === "all" || card.dataset.category === cat;
      var beyond = paged && i >= INITIAL_COUNT;
      card.classList.toggle("is-paged", inCat && beyond);
      card.classList.toggle("is-hidden", !inCat);
      if (inCat && !beyond) {
        card.classList.remove("is-hiding");
        revealCard(card, immediate);
      }
    });

    if (moreWrap) {
      moreWrap.hidden = !paged;
      moreWrap.classList.remove("is-fading");
    }
    if (moreBtn) {
      moreBtn.disabled = false;
      moreBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
    }
    if (moreCount) moreCount.textContent = "+" + remainingCount();

    updateNav();
  }

  $$(".filter").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (btn.dataset.filter === activeFilter) return;
      applyFilter(btn.dataset.filter, false);
    });
  });

  /* ---------------------------------------------------------
     Show more: reveal the remaining works once, then retire
     --------------------------------------------------------- */
  if (moreBtn) {
    moreBtn.addEventListener("click", function () {
      if (expanded) return;
      expanded = true;
      moreBtn.disabled = true;
      moreBtn.setAttribute("aria-expanded", "true");
      if (moreWrap) moreWrap.classList.add("is-fading");

      var fresh = $$(".card.is-paged", grid);

      fresh.forEach(function (card) { card.classList.remove("is-paged"); });
      // commit the hidden start state before revealing, so the fade actually runs
      void grid.offsetHeight;

      fresh.forEach(function (card, i) {
        if (card.classList.contains("is-in")) return;
        var delay = Math.min(i, 14) * 42;
        card.style.transitionDelay = delay + "ms";
        card.classList.add("is-in");
        window.setTimeout(function () { card.style.transitionDelay = ""; }, 950 + delay);
      });

      window.setTimeout(function () {
        if (moreWrap) {
          moreWrap.hidden = true;
          moreWrap.classList.remove("is-fading");
        }
        moreBtn.disabled = false;
        var firstCard = fresh[0] && $(".card-btn", fresh[0]);
        if (firstCard) firstCard.focus({ preventScroll: true });
      }, 260);
    });
  }

  /* ---------------------------------------------------------
     Reveal on scroll
     --------------------------------------------------------- */
  var io = null;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
  }

  function observeReveals(root) {
    $$(".reveal", root || document).forEach(function (el) {
      if (el.classList.contains("is-in")) return;
      if (io) io.observe(el);
      else el.classList.add("is-in");
    });
  }

  /* ---------------------------------------------------------
     Modal
     --------------------------------------------------------- */
  var modal = $("#modal");
  var modalScroll = $(".modal-scroll", modal);
  var modalImages = $(".modal-images", modal);
  var modalTitle = $("#modalTitle");
  var modalCat = $(".modal-cat", modal);
  var modalDesc = $(".modal-desc", modal);
  var modalMeta = $(".modal-meta", modal);
  var btnPrev = $("[data-prev]", modal);
  var btnNext = $("[data-next]", modal);
  var labelPrev = $("[data-prev-label]", modal);
  var labelNext = $("[data-next-label]", modal);
  var lastFocused = null;
  var currentIndex = -1;

  function buildMeta(p) {
    return (
      "<div><dt>Category</dt><dd>" + CATS[p.category] + "</dd></div>" +
      "<div><dt>Type</dt><dd>" + p.subtitle + "</dd></div>" +
      "<div><dt>Participation</dt><dd>" + p.participation + "</dd></div>"
    );
  }

  function openModal(index) {
    var p = projects[index];
    if (!p) return;
    currentIndex = index;

    modalTitle.textContent = p.title;
    modalCat.textContent = CATS[p.category];
    modalDesc.textContent = p.description;
    modalMeta.innerHTML = buildMeta(p);
    modalImages.innerHTML = p.images
      .map(function (src, i) {
        return (
          '<img src="' + src + '" alt="' + p.title + " 작업 이미지 " + (i + 1) +
          '" loading="lazy" decoding="async">'
        );
      })
      .join("");

    var prev = projects[index - 1];
    var next = projects[index + 1];
    btnPrev.disabled = !prev;
    btnNext.disabled = !next;
    labelPrev.textContent = prev ? prev.title : "첫 번째 작업";
    labelNext.textContent = next ? next.title : "마지막 작업";

    lastFocused = document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    modalScroll.scrollTop = 0;
    setTimeout(function () { $(".modal-panel", modal).focus({ preventScroll: true }); }, 40);

    // preload neighbours for smooth navigation
    [prev, next].forEach(function (n) {
      if (n && n.images[0]) { var im = new Image(); im.src = n.images[0]; }
    });
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    currentIndex = -1;
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function step(delta) {
    var next = currentIndex + delta;
    if (next >= 0 && next < projects.length) openModal(next);
  }

  grid.addEventListener("click", function (e) {
    var btn = e.target.closest(".card-btn");
    if (!btn) return;
    var card = btn.closest(".card");
    var id = card.getAttribute("data-id");
    var index = projects.findIndex(function (p) { return p.id === id; });
    if (index > -1) openModal(index);
  });

  modal.addEventListener("click", function (e) {
    if (e.target.closest("[data-close]")) closeModal();
  });
  btnPrev.addEventListener("click", function () { step(-1); });
  btnNext.addEventListener("click", function () { step(1); });

  // swipe on touch devices
  var touchX = null;
  modalScroll.addEventListener("touchstart", function (e) {
    touchX = e.changedTouches[0].clientX;
  }, { passive: true });
  modalScroll.addEventListener("touchend", function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 90) step(dx < 0 ? 1 : -1);
  }, { passive: true });

  document.addEventListener("keydown", function (e) {
    if (!modal.classList.contains("is-open")) return;
    if (e.key === "Escape") { e.preventDefault(); closeModal(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    else if (e.key === "Tab") {
      // keep focus inside the dialog
      var focusables = $$('button, [href], input, [tabindex]:not([tabindex="-1"])', modal)
        .filter(function (el) { return !el.disabled && el.offsetParent !== null; });
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------------------------------------------------------
     Header state + active nav
     --------------------------------------------------------- */
  var header = $(".site-header");
  var onScroll = function () {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  document.body.addEventListener("click", function (e) {
    var a = e.target.closest(".nav a[data-filter-link]");
    if (a) {
      var cat = a.getAttribute("data-filter-link");
      applyFilter(cat, false);
    }
  });

  /* ---------------------------------------------------------
     Mobile menu
     --------------------------------------------------------- */
  var toggle = $(".menu-toggle");
  toggle.addEventListener("click", function () {
    var open = document.body.classList.toggle("menu-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  $$(".mobile-nav a").forEach(function (a) {
    a.addEventListener("click", function () {
      document.body.classList.remove("menu-open");
      toggle.setAttribute("aria-expanded", "false");
      var f = a.getAttribute("data-filter-link");
      if (f) setTimeout(function () { applyFilter(f, false); }, 10);
    });
  });

  /* ---------------------------------------------------------
     Nav active section highlight
     --------------------------------------------------------- */
  var sections = ["about", "work"]
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  var navLinks = $$(".nav a");

  function updateNav() {
    var line = window.scrollY + window.innerHeight * 0.5;
    var current = null;
    sections.forEach(function (s) {
      if (s.offsetTop <= line) current = s.id;
    });

    navLinks.forEach(function (l) {
      var target = l.getAttribute("href").replace("#", "");
      var f = l.getAttribute("data-filter-link");
      var on = false;
      if (f) on = current === "work" && activeFilter === f;
      else on = current === target;
      l.classList.toggle("is-active", on);
    });
  }

  var navTick = false;
  window.addEventListener("scroll", function () {
    if (navTick) return;
    navTick = true;
    window.requestAnimationFrame(function () { navTick = false; updateNav(); });
  }, { passive: true });

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */
  renderGrid();
  observeReveals(document);
  updateNav();
  window.addEventListener("resize", updateNav, { passive: true });

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    $$(".reveal").forEach(function (el) { el.classList.add("is-in"); });
  }
})();
