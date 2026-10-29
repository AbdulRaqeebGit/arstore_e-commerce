/* App bootstrap: router, topbar, guards, delete actions. */
window.App = window.App || {};

App.router = (function () {
  const U = App.Utils;
  const S = App.Store;
  const A = App.Auth;
  const V = App.Views;

  const roleHome = { admin: "admin", seller: "seller", customer: "customer" };

  function go(route, param) {
    const hash = "#/" + route + (param ? "/" + param : "");
    if (location.hash === hash) { render(); }
    else location.hash = hash;
  }

  function refresh() { render(); }

  function goHomeForRole(role) { go(roleHome[role] || "customer"); }

  function parseHash() {
    const h = location.hash.replace(/^#\/?/, "");
    const parts = h.split("/").filter(Boolean);
    return { route: parts[0] || "", param: parts[1] || null };
  }

  function guard(route) {
    const me = A.current();
    // Shop is viewable by any logged-in user (customer, seller, admin).
    if (route === "customer") {
      if (!me) { go("login"); return false; }
      return true;
    }
    if (route === "seller") {
      if (!me) { go("login"); return false; }
      if (me.role !== "seller") { goHomeForRole(me.role); return false; }
      return true;
    }
    if (route === "admin") {
      if (!me) { go("login"); return false; }
      if (me.role !== "admin") { goHomeForRole(me.role); return false; }
      return true;
    }
    if (route === "buy") {
      if (!me) { go("login"); return false; }
      if (me.role !== "customer") { goHomeForRole(me.role); return false; }
      return true;
    }
    if (route === "settings") {
      if (!me) { go("login"); return false; }
      return true;
    }
    return true;
  }

  function renderTopbar() {
    const me = A.current();
    const links = [];
    const home = me ? (me.role === "admin" ? "#/admin" : me.role === "seller" ? "#/seller" : "#/customer") : "#/login";
    if (!me) {
      links.push('<li class="nav-item"><a href="#/login" class="nav-link"><i class="bi bi-box-arrow-in-right"></i> Login</a></li>');
    } else if (me.role === "admin") {
      links.push('<li class="nav-item"><a href="#/admin" class="nav-link"><i class="bi bi-speedometer2"></i> Admin</a></li>');
      links.push('<li class="nav-item"><a href="#/customer" class="nav-link"><i class="bi bi-shop"></i> Shop</a></li>');
    } else if (me.role === "seller") {
      links.push('<li class="nav-item"><a href="#/seller" class="nav-link"><i class="bi bi-bag-plus"></i> Sell</a></li>');
      links.push('<li class="nav-item"><a href="#/customer" class="nav-link"><i class="bi bi-shop"></i> Shop</a></li>');
    } else {
      links.push('<li class="nav-item"><a href="#/customer" class="nav-link"><i class="bi bi-shop"></i> Shop</a></li>');
    }
    const userChip = me
      ? '<span class="d-flex align-items-center gap-2 border rounded-pill px-2 py-1">' +
        '<span class="brand-badge" style="width:28px;height:28px;font-size:11px;border-radius:8px">' + U.esc(me.name[0].toUpperCase()) + '</span>' +
        '<span class="fw-semibold small d-none d-sm-inline">' + U.esc(me.name.split(" ")[0]) + '</span>' +
        '<span class="badge rounded-pill ' + (me.role === "admin" ? "text-bg-dark" : "text-bg-light border") + ' text-uppercase" style="font-size:9px">' + me.role + '</span>' +
        '</span>' +
        '<a href="#/settings" class="btn btn-sm btn-outline-dark" title="Settings"><i class="bi bi-gear"></i> <span class="d-none d-sm-inline">Settings</span></a>' +
        '<button class="btn btn-sm btn-dark" id="logoutBtn"><i class="bi bi-box-arrow-right"></i> <span class="d-none d-sm-inline">Logout</span></button>'
      : '<a href="#/login" class="btn btn-sm btn-dark"><i class="bi bi-box-arrow-in-right"></i> Login</a>';

    document.getElementById("topbar").innerHTML =
      '<nav class="navbar navbar-expand-lg bg-white border-bottom sticky-top">' +
      '<div class="container">' +
      '<a href="' + home + '" class="navbar-brand d-flex align-items-center gap-2 fw-bold">' +
      '<span class="brand-badge">AR</span>' + U.esc(App.CONFIG.appName) + '</a>' +
      '<button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-label="Menu">' +
      '<span class="navbar-toggler-icon"></span></button>' +
      '<div class="collapse navbar-collapse" id="mainNav">' +
      '<ul class="navbar-nav me-auto mb-2 mb-lg-0">' + links.join("") + '</ul>' +
      '<div class="d-flex align-items-center gap-2 flex-wrap">' + userChip + '</div>' +
      '</div></div></nav>';

    const cr = parseHash().route || "customer";
    document.querySelectorAll("#topbar .nav-link").forEach(function (a) {
      if ((a.getAttribute("href") || "").indexOf("/" + cr) >= 0) a.classList.add("active");
    });

    if (me) {
      document.getElementById("logoutBtn").addEventListener("click", () => {
        A.logout(); U.toast("Logged out.", "info"); go("login");
      });
    }
  }

  /* ---------- admin / seller delete actions ---------- */
  async function deleteUser(id) {
    const target = S.findById(id);
    if (!target || target.role === "admin") return;
    U.modal(
      '<div class="switch-box"><h5 class="fw-bold mb-1">Delete user?</h5><p class="text-secondary small">Remove <b>' + U.esc(target.name) + '</b> (' + U.esc(target.email) + ')? Their products will also be removed.</p>' +
      '<div class="d-flex gap-2"><button class="btn btn-outline-dark flex-fill" onclick="App.Utils.closeModal()">Cancel</button>' +
      '<button class="btn btn-dark flex-fill" id="confirmDelUser">Delete</button></div></div>'
    );
    document.getElementById("confirmDelUser").addEventListener("click", () => {
      S.saveUsers(S.getUsers().filter((u) => u.id !== id));
      S.saveProducts(S.getProducts().filter((p) => p.sellerId !== id));
      S.saveReviews(S.getReviews().filter((r) => r.userId !== id));
      U.closeModal();
      U.toast("User deleted.", "success");
      refresh();
    });
  }

  function deleteProduct(id) {
    U.modal(
      '<div class="switch-box"><h5 class="fw-bold mb-1">Delete product?</h5><p class="text-secondary small">This will permanently remove the product and its reviews.</p>' +
      '<div class="d-flex gap-2"><button class="btn btn-outline-dark flex-fill" onclick="App.Utils.closeModal()">Cancel</button>' +
      '<button class="btn btn-dark flex-fill" id="confirmDelProd">Delete</button></div></div>'
    );
    document.getElementById("confirmDelProd").addEventListener("click", () => {
      S.saveProducts(S.getProducts().filter((p) => p.id !== id));
      S.saveReviews(S.getReviews().filter((r) => r.productId !== id));
      U.closeModal();
      U.toast("Product deleted.", "success");
      refresh();
    });
  }

  /* ---------- main render ---------- */
  function render() {
    renderTopbar();
    const { route, param } = parseHash();
    const app = document.getElementById("app");

    if (!guard(route)) return;

    switch (route) {
      case "":
      case "customer":
        if (!A.current()) { app.innerHTML = V.renderAuth(); V.bindAuth(); }
        else if (A.current().role === "customer" || A.current().role === "seller" || A.current().role === "admin") {
          app.innerHTML = V.renderCustomer(); V.bindCustomer();
        }
        break;
      case "login":
        app.innerHTML = V.renderAuth(); V.bindAuth();
        break;
      case "seller":
        app.innerHTML = V.renderSeller(); V.bindSeller();
        break;
      case "admin":
        app.innerHTML = V.renderAdmin(); V.bindAdmin();
        break;
      case "product":
        app.innerHTML = V.renderProduct(param); V.bindProduct(param);
        break;
      case "buy":
        app.innerHTML = V.renderBuy(param); V.bindBuy(param);
        break;
      case "settings":
        app.innerHTML = V.renderSettings(); V.bindSettings();
        break;
      case "cart":
        app.innerHTML = V.renderCart(); V.bindCart();
        break;
      case "wishlist":
        app.innerHTML = V.renderWishlist(); V.bindWishlist();
        break;
      case "orders":
        app.innerHTML = V.renderOrders(); V.bindOrders();
        break;
      default:
        app.innerHTML = V.renderCustomer(); V.bindCustomer();
    }
    window.scrollTo(0, 0);
    initReveal();
    animateCounters();
  }

  function initReveal() {
    const els = document.querySelectorAll(".reveal:not(.in)");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (e) { e.classList.add("in"); });
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (e) { io.observe(e); });
    setTimeout(function () { els.forEach(function (e) { e.classList.add("in"); }); }, 1500);
  }

  function animateCounters() {
    const els = document.querySelectorAll("[data-count]");
    if (!els.length) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      els.forEach(function (e) { e.textContent = Number(e.dataset.count).toLocaleString(); });
      return;
    }
    els.forEach(function (el) {
      const target = Number(el.dataset.count) || 0;
      const dur = 900;
      const start = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * eased).toLocaleString();
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  function skeleton() {
    let cards = "";
    for (let i = 0; i < 8; i++) {
      cards += '<div class="col-6 col-md-3"><div class="skeleton skeleton-card"></div></div>';
    }
    return '<div class="skeleton-wrap">' +
      '<div class="skeleton skeleton-hero"></div>' +
      '<div class="row g-3 mt-2">' + cards + '</div></div>';
  }

  function updateCloudStatus() {
    const el = document.getElementById("cloudStatus");
    if (!el) return;
    const st = S.getStatus();
    el.textContent = st === "supabase" ? "☁ Supabase connected"
      : st === "cloud" ? "☁ Server sync active" : "💾 Local only";
    el.className = "cloud-badge " + st;
  }

  function setOnlineBadge() {
    const b = document.getElementById("netBadge");
    if (!b) return;
    const update = () => {
      b.textContent = navigator.onLine ? "" : "Offline mode — data saved locally";
      b.className = "net-badge" + (navigator.onLine ? " online" : " offline");
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
  }

  async function init() {
    const app = document.getElementById("app");
    if (app) app.innerHTML = skeleton();
    await S.init();
    window.addEventListener("hashchange", render);
    setOnlineBadge();
    render();
    updateCloudStatus();
  }

  return { go, refresh, goHomeForRole, deleteUser, deleteProduct, init };
})();

// boot
document.addEventListener("DOMContentLoaded", function () {
  App.router.init();
});
