/* Views (Bootstrap 5 + white/black theme + vector icons):
   auth, customer, seller, settings, admin, product, checkout. */
window.App = window.App || {};

App.Views = (function () {
  const U = App.Utils;
  const S = App.Store;
  const A = App.Auth;

  /* ================= shared components ================= */
  function starsHtml(rating, cls) {
    const r = Math.round(rating || 0);
    let s = "";
    for (let i = 1; i <= 5; i++) {
      s += '<span class="star' + (i <= r ? " on" : "") + '"><i class="bi bi-star-fill"></i></span>';
    }
    return '<span class="stars ' + (cls || "") + '">' + s + '</span>';
  }

  function ratingSummary(productId) {
    const rs = S.getReviews().filter((r) => r.productId === productId);
    if (!rs.length) return { avg: 0, n: 0 };
    const avg = rs.reduce((a, b) => a + b.rating, 0) / rs.length;
    return { avg, n: rs.length };
  }

  function productCard(p) {
    const r = ratingSummary(p.id);
    return (
      '<div class="col">' +
      '<div class="card h-100 product-card border-0 shadow-sm" onclick="App.router.go(\'product\',\'' + p.id + '\')">' +
      '<div class="ratio ratio-1x1 product-img">' +
      '<img src="' + U.esc(p.image) + '" alt="' + U.esc(p.title) + '" loading="lazy" ' +
      'onerror="this.onerror=null;this.src=\'' + S.svgProduct(p.emoji || "🛍️", "#ededed", "#d8d8d8") + '\'">' +
      '<div class="product-hover"><span><i class="bi bi-eye"></i> View details</span></div>' +
      '</div>' +
      '<div class="card-body d-flex flex-column p-3">' +
      '<span class="text-uppercase small text-secondary fw-semibold" style="letter-spacing:.5px">' + U.esc(p.category || "Other") + '</span>' +
      '<h6 class="card-title mt-1 mb-1 fw-bold">' + U.esc(p.title) + '</h6>' +
      '<div class="d-flex align-items-center gap-1 small">' + starsHtml(r.avg) +
      '<span class="text-secondary">' + (r.n ? r.avg.toFixed(1) + " (" + r.n + ")" : "New") + '</span></div>' +
      '<div class="mt-auto d-flex justify-content-between align-items-center pt-2">' +
      '<span class="fw-bold fs-6">' + U.money(p.price) + '</span>' +
      '<span class="small text-secondary text-truncate" style="max-width:110px">' + U.esc(p.sellerName || "Seller") + '</span>' +
      '</div></div></div></div>'
    );
  }

  function emptyState(iconClass, title, sub) {
    return '<div class="text-center py-5 text-secondary"><div class="empty-ic"><i class="bi ' + (iconClass || "bi-inbox") + '"></i></div>' +
      '<h5 class="mt-2 text-dark">' + U.esc(title) + '</h5><p class="mb-0">' + U.esc(sub || "") + '</p></div>';
  }

  /* ================= AUTH ================= */
  function renderAuth() {
    return (
      '<div class="auth-wrap">' +
      '<div class="card border-0 shadow-lg auth-card">' +
      '<div class="card-body p-4 p-md-5">' +
      '<div class="text-center mb-4">' +
      '<div class="brand-badge mx-auto mb-3" style="width:58px;height:58px;font-size:20px;border-radius:16px">AR</div>' +
      '<h3 class="fw-bold mb-1">' + U.esc(App.CONFIG.appName) + '</h3>' +
      '<p class="text-secondary mb-0">' + U.esc(App.CONFIG.tagline) + '</p>' +
      '</div>' +
      '<ul class="nav nav-pills nav-fill mb-4" id="authTabs">' +
      '<li class="nav-item"><button class="nav-link active" data-tab="login">Login</button></li>' +
      '<li class="nav-item"><button class="nav-link" data-tab="signup">Sign up</button></li>' +
      '<li class="nav-item"><button class="nav-link" data-tab="forgot">Forgot?</button></li>' +
      '</ul>' +
      '<div id="authPanel"></div>' +
      '<p class="text-center text-secondary small mt-4 mb-0">Demo: seller@demo.com / seller123 &nbsp;•&nbsp; customer@demo.com / customer123</p>' +
      '</div></div></div>'
    );
  }

  function renderLoginForm() {
    return (
      '<form id="loginForm">' +
      '<div class="mb-3"><label class="form-label">Email</label>' +
      '<input type="email" id="liEmail" class="form-control" placeholder="you@email.com" required></div>' +
      '<div class="mb-3"><label class="form-label">Password</label>' +
      '<input type="password" id="liPass" class="form-control" placeholder="••••••••" required></div>' +
      '<button class="btn btn-dark w-100 py-2" type="submit"><i class="bi bi-box-arrow-in-right"></i> Login</button>' +
      '<p class="ferr" id="liErr"></p></form>'
    );
  }

  function renderSignupForm() {
    return (
      '<form id="signupForm">' +
      '<div class="mb-3"><label class="form-label">Full name</label>' +
      '<input id="suName" class="form-control" placeholder="Your name" required></div>' +
      '<div class="mb-3"><label class="form-label">Email</label>' +
      '<input type="email" id="suEmail" class="form-control" placeholder="you@email.com" required></div>' +
      '<div class="mb-3"><label class="form-label">Password</label>' +
      '<input type="password" id="suPass" class="form-control" placeholder="min 6 characters" required></div>' +
      '<div class="mb-3"><label class="form-label">Join as</label>' +
      '<div class="row g-2">' +
      '<div class="col-6"><input type="radio" class="btn-check" name="suRole" id="roleCust" value="customer" checked>' +
      '<label class="btn btn-outline-dark w-100" for="roleCust"><i class="bi bi-bag"></i> Customer</label></div>' +
      '<div class="col-6"><input type="radio" class="btn-check" name="suRole" id="roleSell" value="seller">' +
      '<label class="btn btn-outline-dark w-100" for="roleSell"><i class="bi bi-shop"></i> Seller</label></div>' +
      '</div></div>' +
      '<button class="btn btn-dark w-100 py-2" type="submit"><i class="bi bi-person-plus"></i> Create account</button>' +
      '<p class="ferr" id="suErr"></p></form>'
    );
  }

  function renderForgotForm() {
    return (
      '<form id="forgotForm">' +
      '<div class="mb-3"><label class="form-label">Email</label>' +
      '<input type="email" id="fgEmail" class="form-control" placeholder="you@email.com" required></div>' +
      '<button id="fgSendBtn" class="btn btn-dark w-100 py-2" type="button"><i class="bi bi-envelope-paper"></i> Send reset code</button>' +
      '<div id="resetStep" class="mt-3 d-none">' +
      '<p class="hint small" id="resetHint"></p>' +
      '<div class="mb-2"><label class="form-label">6-digit code</label><input id="fgCode" class="form-control" placeholder="123456"></div>' +
      '<div class="mb-3"><label class="form-label">New password</label><input type="password" id="fgPass" class="form-control" placeholder="min 6 characters"></div>' +
      '<button id="fgResetBtn" class="btn btn-dark w-100 py-2" type="submit"><i class="bi bi-shield-check"></i> Reset password</button>' +
      '</div>' +
      '<p class="ferr" id="fgErr"></p></form>'
    );
  }

  function bindAuth() {
    const tabs = document.querySelectorAll("#authTabs .nav-link");
    const panel = document.getElementById("authPanel");
    const forms = { login: renderLoginForm, signup: renderSignupForm, forgot: renderForgotForm };
    function show(tab) {
      tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
      panel.innerHTML = forms[tab]();
      if (tab === "login") bindLogin();
      else if (tab === "signup") bindSignup();
      else bindForgot();
    }
    tabs.forEach((t) => t.addEventListener("click", () => show(t.dataset.tab)));
    show("login");
  }

  function bindLogin() {
    document.getElementById("loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = document.getElementById("liErr");
      err.textContent = "";
      const btn = e.target.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      try {
        const u = await A.login(document.getElementById("liEmail").value, document.getElementById("liPass").value);
        U.toast("Welcome back, " + u.name + "!", "success");
        App.router.goHomeForRole(u.role);
      } catch (ex) {
        err.textContent = ex.message;
        if (btn) btn.disabled = false;
      }
    });
  }
  function bindSignup() {
    document.getElementById("signupForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = document.getElementById("suErr");
      err.textContent = "";
      const role = document.querySelector('input[name="suRole"]:checked').value;
      const btn = e.target.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      try {
        await A.signup({
          name: document.getElementById("suName").value,
          email: document.getElementById("suEmail").value,
          password: document.getElementById("suPass").value,
          role: role,
        });
        U.toast("Account created! Please login.", "success");
        document.querySelector('#authTabs .nav-link[data-tab="login"]').click();
      } catch (ex) {
        err.textContent = ex.message;
        if (btn) btn.disabled = false;
      }
    });
  }
  function bindForgot() {
    let pendingCode = null;
    const sendBtn = document.getElementById("fgSendBtn");
    const err = document.getElementById("fgErr");
    const step = document.getElementById("resetStep");

    function doSendCode() {
      err.textContent = "";
      const email = document.getElementById("fgEmail").value.trim();
      if (!email) { err.textContent = "Please enter your email."; return; }
      try {
        const r = A.requestReset(email);
        pendingCode = r.code;
        step.classList.remove("d-none");
        sendBtn.classList.add("d-none");
        document.getElementById("fgEmail").readOnly = true;
        document.getElementById("resetHint").textContent =
          "Demo mode: your reset code is " + r.code + " (normally emailed).";
        document.getElementById("fgCode").value = r.code;
      } catch (ex) { err.textContent = ex.message; }
    }

    sendBtn.addEventListener("click", doSendCode);

    document.getElementById("forgotForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      err.textContent = "";
      if (!pendingCode) {
        doSendCode();
        return;
      }
      const email = document.getElementById("fgEmail").value.trim();
      const code = document.getElementById("fgCode").value.trim();
      const newPw = document.getElementById("fgPass").value;
      try {
        if (code !== pendingCode) throw new Error("Incorrect reset code.");
        await A.resetPassword(email, code, newPw);
        U.toast("Password reset! Please login.", "success");
        document.querySelector('#authTabs .nav-link[data-tab="login"]').click();
      } catch (ex) { err.textContent = ex.message; }
    });
  }

  /* ================= CUSTOMER ================= */
  function renderCustomer() {
    const all = S.getProducts();
    const cats = ["All"].concat([...new Set(all.map((p) => p.category))].filter(Boolean));
    return (
      '<div class="view">' +
      '<section class="hero text-center">' +
      '<div class="hero-deco" aria-hidden="true"><span class="orb orb-1"></span><span class="orb orb-2"></span></div>' +
      '<div class="position-relative">' +
      '<span class="hero-badge"><i class="bi bi-patch-check-fill"></i> ' + all.length + ' products • trusted local sellers</span>' +
      '<h1 class="fw-bold display-5 mb-2">Discover something <span class="shimmer">amazing</span></h1>' +
      '<p class="text-secondary mb-4">Search, filter and buy from trusted local sellers.</p>' +
      '<div class="row justify-content-center"><div class="col-12 col-lg-8">' +
      '<div class="input-group input-group-lg search-shell shadow-sm">' +
      '<span class="input-group-text bg-white border-end-0"><i class="bi bi-search"></i></span>' +
      '<input id="custSearch" class="form-control border-start-0" placeholder="Search products… e.g. earbuds, watch, mug">' +
      '<button class="btn btn-outline-dark" id="lensBtn" title="Search by photo"><i class="bi bi-camera"></i> Lens</button>' +
      '</div></div></div>' +
      '<div class="d-flex flex-wrap gap-2 justify-content-center mt-4" id="catChips">' +
      cats.map((c, i) =>
        '<button class="btn btn-sm rounded-pill chip-btn ' + (i === 0 ? "btn-dark" : "btn-outline-dark") + '" data-cat="' + (i === 0 ? "" : U.esc(c)) + '">' + U.esc(c) + '</button>'
      ).join("") +
      '</div>' +
      '<div class="row g-2 justify-content-center mt-3">' +
      '<div class="col-6 col-sm-auto"><input id="minPrice" type="number" class="form-control form-control-sm" placeholder="Min Rs"></div>' +
      '<div class="col-auto d-none d-sm-flex align-items-center text-secondary">—</div>' +
      '<div class="col-6 col-sm-auto"><input id="maxPrice" type="number" class="form-control form-control-sm" placeholder="Max Rs"></div>' +
      '<div class="col-12 col-sm-auto"><select id="sortSel" class="form-select form-select-sm">' +
      '<option value="new">Newest</option><option value="low">Price: Low → High</option>' +
      '<option value="high">Price: High → Low</option><option value="rating">Top rated</option>' +
      '</select></div></div>' +
      '</div></section>' +
      '<div class="d-flex justify-content-between align-items-center mt-4 mb-2">' +
      '<h5 class="fw-bold mb-0">All products</h5><span class="text-secondary small" id="resultCount"></span></div>' +
      '<div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-3 grid-stagger" id="custGrid"></div>' +
      '</div>'
    );
  }

  function bindCustomer() {
    let cat = "", q = "", min = "", max = "", sort = "new";

    function refresh() {
      let list = S.getProducts().slice();
      if (cat) list = list.filter((p) => p.category === cat);
      if (q) {
        const qq = q.toLowerCase();
        list = list.filter((p) => [p.title, p.description, p.category, p.sellerName]
          .filter(Boolean).join(" ").toLowerCase().includes(qq));
      }
      if (min !== "") list = list.filter((p) => p.price >= Number(min));
      if (max !== "") list = list.filter((p) => p.price <= Number(max));
      if (sort === "low") list.sort((a, b) => a.price - b.price);
      else if (sort === "high") list.sort((a, b) => b.price - a.price);
      else if (sort === "rating") list.sort((a, b) => ratingSummary(b.id).avg - ratingSummary(a.id).avg);
      else list.sort((a, b) => b.createdAt - a.createdAt);

      const grid = document.getElementById("custGrid");
      grid.innerHTML = list.length
        ? list.map(productCard).join("")
        : '<div class="col-12">' + emptyState("bi-box-seam", "No products yet", "Sellers ki products yahan aayengi.") + '</div>';
      const rc = document.getElementById("resultCount");
      if (rc) rc.textContent = list.length + " item" + (list.length === 1 ? "" : "s");
    }

    const searchEl = document.getElementById("custSearch");
    searchEl.addEventListener("input", (e) => { q = e.target.value.trim(); refresh(); });
    searchEl.addEventListener("keydown", (e) => { if (e.key === "Enter") refresh(); });
    document.getElementById("lensBtn").addEventListener("click", () => App.UI.openLens());

    document.querySelectorAll("#catChips .chip-btn").forEach((c) => c.addEventListener("click", () => {
      document.querySelectorAll("#catChips .chip-btn").forEach((x) => {
        x.classList.remove("btn-dark"); x.classList.add("btn-outline-dark");
      });
      c.classList.remove("btn-outline-dark"); c.classList.add("btn-dark");
      cat = c.dataset.cat;
      refresh();
    }));

    document.getElementById("minPrice").addEventListener("input", (e) => { min = e.target.value; refresh(); });
    document.getElementById("maxPrice").addEventListener("input", (e) => { max = e.target.value; refresh(); });
    document.getElementById("sortSel").addEventListener("change", (e) => { sort = e.target.value; refresh(); });
    refresh();
  }

  /* ================= SELLER ================= */
  function renderSeller() {
    const me = A.current();
    const catOpts = ["Electronics", "Clothing", "Home", "Accessories", "Sports", "Beauty", "Other"]
      .map((c) => '<option>' + c + '</option>').join("");
    return (
      '<div class="view">' +
      '<div class="mb-4"><h3 class="fw-bold mb-1">Seller Studio</h3><p class="text-secondary mb-0">List your products and reach customers.</p></div>' +
      '<div class="row g-4">' +
      '<div class="col-lg-6 reveal">' +
      '<div class="card border-0 shadow-sm"><div class="card-body p-4">' +
      '<h6 class="fw-bold mb-3"><i class="bi bi-box-seam"></i> New product</h6>' +
      '<form id="uploadForm">' +
      '<div class="dropzone mb-3" id="dropzone">' +
      '<input type="file" id="upImg" accept="image/*" hidden>' +
      '<div id="dzEmpty"><div class="dz-ic"><i class="bi bi-image"></i></div><div class="fw-semibold mt-1">Click to add a photo</div><small class="text-secondary">JPG / PNG / WebP</small></div>' +
      '<img id="dzPreview" class="d-none rounded" style="max-height:220px;margin:0 auto">' +
      '</div>' +
      '<div class="mb-3"><label class="form-label">Title</label><input id="upTitle" class="form-control" placeholder="Product name" required></div>' +
      '<div class="mb-3"><label class="form-label">Category</label><select id="upCat" class="form-select">' + catOpts + '</select></div>' +
      '<div class="row g-2 mb-3">' +
      '<div class="col-6"><label class="form-label">Price (Rs)</label><input id="upPrice" type="number" min="1" class="form-control" placeholder="1499" required></div>' +
      '<div class="col-6"><label class="form-label">Stock</label><input id="upStock" type="number" min="1" class="form-control" value="10"></div>' +
      '</div>' +
      '<div class="mb-3"><label class="form-label">Description</label><textarea id="upDesc" class="form-control" rows="3" placeholder="Describe your product…"></textarea></div>' +
      '<div class="mb-3"><label class="form-label">City</label><input id="upCity" class="form-control" placeholder="' + U.esc(me.city || App.CONFIG.maps.defaultCity) + '"></div>' +
      '<button type="button" class="btn btn-outline-dark w-100 mb-2" id="genImageBtn"><i class="bi bi-palette"></i> Generate aesthetic image</button>' +
      '<div class="d-flex gap-2">' +
      '<button type="button" class="btn btn-outline-dark flex-fill" id="aiBeautify"><i class="bi bi-magic"></i> AI text</button>' +
      '<button type="submit" class="btn btn-dark flex-fill"><i class="bi bi-upload"></i> Publish</button>' +
      '</div>' +
      '<p class="small text-secondary mt-2 mb-0">Tip: photo add na karein aur palette button dabayein — AI aesthetic picture bana dega.</p>' +
      '<p class="ferr" id="upErr"></p>' +
      '</form></div></div></div>' +
      '<div class="col-lg-6 reveal">' +
      '<div class="card border-0 shadow-sm"><div class="card-body p-4">' +
      '<h6 class="fw-bold mb-3"><i class="bi bi-clipboard-list"></i> My products <span class="badge text-bg-dark" id="myCount"></span></h6>' +
      '<div id="myProducts" class="d-flex flex-column gap-2"></div>' +
      '</div></div></div>' +
      '</div></div>'
    );
  }

  function bindSeller() {
    const me = A.current();
    let chosenImg = null;
    let genImage = null;

    function renderMyProducts() {
      const mine = S.getProducts().filter((p) => p.sellerId === me.id);
      const box = document.getElementById("myProducts");
      const cnt = document.getElementById("myCount");
      if (cnt) cnt.textContent = mine.length;
      box.innerHTML = mine.length ? mine.map((p) =>
        '<div class="d-flex align-items-center gap-3 border rounded-3 p-2">' +
        '<div class="ratio ratio-1x1" style="width:54px;flex:0 0 auto"><img src="' + U.esc(p.image) + '" class="object-fit-cover rounded-2" ' +
        'onerror="this.onerror=null;this.src=\'' + S.svgProduct(p.emoji || "🛍️", "#ededed", "#d8d8d8") + '\'"></div>' +
        '<div class="flex-grow-1 min-w-0"><div class="fw-semibold text-truncate">' + U.esc(p.title) + '</div>' +
        '<div class="small text-secondary">' + U.money(p.price) + ' • ' + U.esc(p.category) + '</div></div>' +
        '<button class="btn btn-sm btn-outline-dark" onclick="App.router.deleteProduct(\'' + p.id + '\')"><i class="bi bi-trash"></i></button>' +
        '</div>'
      ).join("") : emptyState("bi-box-seam", "No products yet", "Upload your first product!");
    }

    const dz = document.getElementById("dropzone");
    const fileInput = document.getElementById("upImg");
    dz.addEventListener("click", () => fileInput.click());
    dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("drag"); });
    dz.addEventListener("dragleave", () => dz.classList.remove("drag"));
    dz.addEventListener("drop", (e) => { e.preventDefault(); dz.classList.remove("drag"); if (e.dataTransfer.files[0]) setImg(e.dataTransfer.files[0]); });
    fileInput.addEventListener("change", () => { if (fileInput.files[0]) setImg(fileInput.files[0]); });

    async function setImg(file) {
      chosenImg = file;
      genImage = null;
      const dataUrl = await U.fileToDataURL(file);
      document.getElementById("dzEmpty").classList.add("d-none");
      const prev = document.getElementById("dzPreview");
      prev.src = dataUrl; prev.classList.remove("d-none");
    }

    document.getElementById("genImageBtn").addEventListener("click", async () => {
      const title = document.getElementById("upTitle").value.trim();
      const cat = document.getElementById("upCat").value;
      const desc = document.getElementById("upDesc").value.trim();
      if (!title) { U.toast("Pehle product ka title likhein.", "warn"); document.getElementById("upTitle").focus(); return; }
      const btn = document.getElementById("genImageBtn");
      btn.disabled = true;
      btn.innerHTML = '<i class="bi bi-stars"></i> Generating…';
      try {
        const prompt = App.ImageGen.buildPrompt({ title: title, category: cat, description: desc });
        const out = await App.ImageGen.generate(prompt);
        genImage = out;
        chosenImg = null;
        document.getElementById("dzEmpty").classList.add("d-none");
        const prev = document.getElementById("dzPreview");
        prev.src = out.src; prev.classList.remove("d-none");
        btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Regenerate image';
        U.toast("Aesthetic image ban gayi!", "success");
      } catch (e) {
        btn.innerHTML = '<i class="bi bi-palette"></i> Generate aesthetic image';
        U.toast("Image generate nahi ho saki, dobara koshish karein.", "warn");
      }
      btn.disabled = false;
    });

    document.getElementById("aiBeautify").addEventListener("click", async () => {
      const title = document.getElementById("upTitle").value;
      const desc = document.getElementById("upDesc").value;
      const btn = document.getElementById("aiBeautify");
      btn.disabled = true;
      btn.innerHTML = '<i class="bi bi-stars"></i> Thinking…';
      let imgUrl = null;
      if (chosenImg) imgUrl = await U.fileToDataURL(chosenImg);
      else if (genImage) imgUrl = genImage.src;
      const out = await App.AI.sellerAesthetic(title, desc, imgUrl);
      if (out.title) document.getElementById("upTitle").value = out.title;
      if (out.description) document.getElementById("upDesc").value = out.description + (out.hashtags ? "\n" + out.hashtags : "");
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-magic"></i> AI text';
      U.toast("Listing beautified!", "success");
    });

    document.getElementById("uploadForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = document.getElementById("upErr");
      err.textContent = "";
      const title = document.getElementById("upTitle").value.trim();
      const price = Number(document.getElementById("upPrice").value);
      if (!title) { err.textContent = "Add a title."; return; }
      if (!price || price <= 0) { err.textContent = "Add a valid price."; return; }
      if (!chosenImg && !genImage) { err.textContent = "Photo add karein ya palette button dabayein."; return; }

      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Saving…';
      try {
        let imageUrl, palette = null;
        if (chosenImg) {
          const up = await App.Cloud.upload(chosenImg);
          imageUrl = up.url;
          try { const im = await U.loadImage(up.local || imageUrl); palette = U.extractPalette(im, 24, 4); } catch (_) {}
        } else {
          imageUrl = genImage.dataUrl || genImage.url;
          try { const im = await U.loadImage(genImage.dataUrl || genImage.url); palette = U.extractPalette(im, 24, 4); } catch (_) {}
        }
        const city = document.getElementById("upCity").value.trim() || me.city || App.CONFIG.maps.defaultCity;
        const product = {
          id: U.uid("p"), sellerId: me.id, sellerName: me.name,
          title: title, category: document.getElementById("upCat").value,
          price: price, stock: Math.max(1, Number(document.getElementById("upStock").value) || 1),
          description: document.getElementById("upDesc").value.trim(),
          image: imageUrl, palette: palette, emoji: "🛍️", city: city,
          lat: App.CONFIG.maps.defaultLat, lng: App.CONFIG.maps.defaultLng,
          createdAt: Date.now(),
        };
        const products = S.getProducts();
        products.unshift(product);
        S.saveProducts(products);
        e.target.reset();
        chosenImg = null;
        genImage = null;
        document.getElementById("dzEmpty").classList.remove("d-none");
        document.getElementById("dzPreview").classList.add("d-none");
        document.getElementById("genImageBtn").innerHTML = '<i class="bi bi-palette"></i> Generate aesthetic image';
        U.toast("Product published!", "success");
        renderMyProducts();
      } catch (ex) { err.textContent = ex.message; }
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-upload"></i> Publish';
    });

    renderMyProducts();
  }

  /* ================= SETTINGS ================= */
  function renderSettings() {
    const me = A.current();
    const isAdmin = me.role === "admin";
    return (
      '<div class="view">' +
      '<div class="mb-4 reveal"><h3 class="fw-bold mb-1">Settings</h3><p class="text-secondary mb-0">Manage your profile and account.</p></div>' +
      '<div class="row g-4">' +
      '<div class="col-lg-6">' +
      '<div class="card border-0 shadow-sm reveal"><div class="card-body p-4">' +
      '<h6 class="fw-bold mb-3"><i class="bi bi-person"></i> Profile</h6>' +
      '<form id="profileForm">' +
      '<div class="mb-3"><label class="form-label">Username</label><input id="stName" class="form-control" value="' + U.esc(me.name) + '" required></div>' +
      '<div class="mb-3"><label class="form-label">Email</label><input class="form-control" value="' + U.esc(me.email) + '" disabled></div>' +
      '<div class="row g-2 mb-3">' +
      '<div class="col-6"><label class="form-label">Phone</label><input id="stPhone" class="form-control" value="' + U.esc(me.phone || "") + '"></div>' +
      '<div class="col-6"><label class="form-label">City</label><input id="stCity" class="form-control" value="' + U.esc(me.city || "") + '"></div>' +
      '</div>' +
      '<button class="btn btn-dark" type="submit"><i class="bi bi-check-lg"></i> Save changes</button>' +
      '<p class="ferr" id="profErr"></p>' +
      '</form></div></div>' +
      '</div>' +
      '<div class="col-lg-6">' +
      '<div class="card border-0 shadow-sm reveal"><div class="card-body p-4">' +
      '<h6 class="fw-bold mb-3"><i class="bi bi-shield-lock"></i> Change password</h6>' +
      '<form id="pwForm">' +
      '<div class="mb-2"><label class="form-label">Current password</label><input id="pwCur" type="password" class="form-control" required></div>' +
      '<div class="mb-2"><label class="form-label">New password</label><input id="pwNew" type="password" class="form-control" required></div>' +
      '<div class="mb-3"><label class="form-label">Confirm new password</label><input id="pwNew2" type="password" class="form-control" required></div>' +
      '<button class="btn btn-dark" type="submit"><i class="bi bi-shield-check"></i> Update password</button>' +
      '<p class="ferr" id="pwErr"></p>' +
      '</form></div></div>' +
      (isAdmin ? "" :
        '<div class="card border-0 shadow-sm reveal mt-4"><div class="card-body p-4">' +
        '<h6 class="fw-bold mb-1"><i class="bi bi-arrow-left-right"></i> Switch account type</h6>' +
        '<p class="small text-secondary">Customer aur Seller ke darmiyan switch karein. Email same rahega — sirf password chahiye.</p>' +
        '<form id="roleForm">' +
        '<div class="row g-2 mb-3">' +
        '<div class="col-6"><input type="radio" class="btn-check" name="newRole" id="nrCust" value="customer"' + (me.role === "customer" ? " checked" : "") + '>' +
        '<label class="btn btn-outline-dark w-100" for="nrCust"><i class="bi bi-bag"></i> Customer</label></div>' +
        '<div class="col-6"><input type="radio" class="btn-check" name="newRole" id="nrSell" value="seller"' + (me.role === "seller" ? " checked" : "") + '>' +
        '<label class="btn btn-outline-dark w-100" for="nrSell"><i class="bi bi-shop"></i> Seller</label></div>' +
        '</div>' +
        '<div class="mb-3"><label class="form-label">Password</label><input id="rolePass" type="password" class="form-control" placeholder="Enter your password" required></div>' +
        '<button class="btn btn-dark w-100" type="submit"><i class="bi bi-arrow-left-right"></i> Switch account type</button>' +
        '<p class="ferr" id="roleErr"></p>' +
        '</form></div></div>') +
      '</div></div></div>'
    );
  }

  function bindSettings() {
    document.getElementById("profileForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const err = document.getElementById("profErr");
      err.textContent = "";
      try {
        A.updateProfile({
          name: document.getElementById("stName").value,
          phone: document.getElementById("stPhone").value,
          city: document.getElementById("stCity").value,
        });
        U.toast("Profile updated", "success");
        App.router.refresh();
      } catch (ex) { err.textContent = ex.message; }
    });

    document.getElementById("pwForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = document.getElementById("pwErr");
      err.textContent = "";
      const a = document.getElementById("pwNew").value;
      const b = document.getElementById("pwNew2").value;
      if (a !== b) { err.textContent = "New passwords do not match."; return; }
      try {
        await A.changePassword(document.getElementById("pwCur").value, a);
        U.toast("Password updated", "success");
        e.target.reset();
      } catch (ex) { err.textContent = ex.message; }
    });

    const roleForm = document.getElementById("roleForm");
    if (roleForm) {
      roleForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const err = document.getElementById("roleErr");
        err.textContent = "";
        const role = document.querySelector('input[name="newRole"]:checked').value;
        try {
          const s = await A.changeRole(role, document.getElementById("rolePass").value);
          U.toast("Account type changed to " + s.role, "success");
          App.router.goHomeForRole(s.role);
        } catch (ex) { err.textContent = ex.message; }
      });
    }
  }

  /* ================= PRODUCT DETAIL ================= */
  function renderProduct(id) {
    const p = S.getProducts().find((x) => x.id === id);
    if (!p) return emptyState("bi-emoji-frown", "Product not found", "It may have been removed.");
    const r = ratingSummary(p.id);
    const reviews = S.getReviews().filter((x) => x.productId === p.id).sort((a, b) => b.createdAt - a.createdAt);
    const me = A.current();
    return (
      '<div class="view">' +
      '<button class="btn btn-link text-dark ps-0 mb-2 text-decoration-none" onclick="App.router.go(\'customer\')"><i class="bi bi-arrow-left"></i> Back to shop</button>' +
      '<div class="row g-4">' +
      '<div class="col-lg-6">' +
      '<div class="ratio ratio-1x1 rounded-4 overflow-hidden shadow-sm border bg-white">' +
      '<img src="' + U.esc(p.image) + '" alt="' + U.esc(p.title) + '" class="object-fit-cover" ' +
      'onerror="this.onerror=null;this.src=\'' + S.svgProduct(p.emoji || "🛍️", "#ededed", "#d8d8d8") + '\'"></div>' +
      '<button class="btn btn-outline-dark w-100 mt-2" onclick="App.UI.lensFromProduct(\'' + p.id + '\')"><i class="bi bi-camera"></i> Find similar with Lens</button>' +
      '</div>' +
      '<div class="col-lg-6">' +
      '<span class="badge rounded-pill text-bg-light border">' + U.esc(p.category || "Other") + '</span>' +
      '<h2 class="fw-bold mt-2 mb-1">' + U.esc(p.title) + '</h2>' +
      '<div class="d-flex align-items-center gap-2 mb-2">' + starsHtml(r.avg) +
      '<span class="text-secondary small">' + (r.n ? r.avg.toFixed(1) + " • " + r.n + " reviews" : "No reviews yet") + '</span></div>' +
      '<div class="fs-2 fw-bold mb-3">' + U.money(p.price) + '</div>' +
      '<p class="text-secondary">' + U.esc(p.description || "No description.") + '</p>' +
      '<ul class="list-group list-group-flush mb-3">' +
      '<li class="list-group-item px-0 bg-transparent"><i class="bi bi-shop"></i> <b>' + U.esc(p.sellerName) + '</b></li>' +
      '<li class="list-group-item px-0 bg-transparent"><i class="bi bi-geo-alt"></i> ' + U.esc(p.city || App.CONFIG.maps.defaultCity) + '</li>' +
      '<li class="list-group-item px-0 bg-transparent"><i class="bi bi-box-seam"></i> Stock: <b>' + p.stock + '</b> left</li>' +
      '</ul>' +
      (!me ?
        '<button class="btn btn-dark btn-lg w-100" onclick="App.router.go(\'login\')"><i class="bi bi-box-arrow-in-right"></i> Login to buy</button>' :
        (me.role === "customer" ?
          '<button class="btn btn-dark btn-lg w-100" ' + (p.stock < 1 ? "disabled" : "") +
          ' onclick="App.router.go(\'buy\',\'' + p.id + '\')">' +
          (p.stock < 1 ? '<i class="bi bi-x-circle"></i> Out of stock' : '<i class="bi bi-bag-check"></i> Buy now') + '</button>' :
          '<button class="btn btn-outline-dark btn-lg w-100" disabled><i class="bi bi-lock"></i> Customer-only feature</button>' +
          '<p class="hint small mt-2 mb-0">You are logged in as <b>' + U.esc(me.role) + '</b>. Settings se account type switch karein.</p>'
        )
      ) +
      '<div class="d-flex gap-2 mt-2">' +
      '<button class="btn btn-outline-dark flex-fill" id="addToCartBtn"><i class="bi bi-cart-plus"></i> Add to Cart</button>' +
      '<button class="btn btn-outline-dark" id="addToWishBtn" title="Add to Wishlist"><i class="bi bi-heart"></i></button>' +
      '</div>' +
      '</div></div>' +
      '<div class="mt-5">' +
      '<h4 class="fw-bold mb-3">Reviews & comments <span class="text-secondary fs-6">(' + reviews.length + ')</span></h4>' +
      '<div class="card border-0 shadow-sm mb-3"><div class="card-body">' +
      (!me ?
        '<p class="hint small mb-0"><a href="#/login">Login</a> to share your review or rate this product.</p>' :
        '<form id="reviewForm">' +
        '<div class="d-flex gap-1 rate-stars mb-2" id="rateStars">' +
        [1, 2, 3, 4, 5].map((i) => '<span data-v="' + i + '"><i class="bi bi-star-fill"></i></span>').join("") + '</div>' +
        '<input id="revRating" type="hidden" value="5">' +
        '<textarea id="revComment" class="form-control" rows="2" placeholder="Share your review or ask a question…"></textarea>' +
        '<button class="btn btn-dark mt-2" type="submit"><i class="bi bi-chat-dots"></i> Post review</button>' +
        '</form>'
      ) +
      '</div></div>' +
      '<div id="reviewList"></div>' +
      '</div></div>'
    );
  }

  function bindProduct(id) {
    const p = S.getProducts().find((x) => x.id === id);
    if (!p) return;

    const stars = document.querySelectorAll("#rateStars span");
    let selectedRating = 5;
    function paint(v) {
      stars.forEach((s) => s.classList.toggle("on", Number(s.dataset.v) <= v));
    }
    stars.forEach((s) => {
      s.addEventListener("click", () => {
        selectedRating = Number(s.dataset.v);
        const inp = document.getElementById("revRating");
        if (inp) inp.value = selectedRating;
        paint(selectedRating);
      });
      s.addEventListener("mouseenter", () => paint(Number(s.dataset.v)));
    });
    const starBox = document.getElementById("rateStars");
    if (starBox) starBox.addEventListener("mouseleave", () => paint(selectedRating));
    paint(5);

    const rForm = document.getElementById("reviewForm");
    if (rForm) {
      rForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const me = A.current();
        if (!me) {
          U.toast("Please login to post a review.", "warn");
          App.router.go("login");
          return;
        }
        const comment = document.getElementById("revComment").value.trim();
        if (!comment) { U.toast("Write something first.", "warn"); return; }
        const reviews = S.getReviews();
        reviews.push({
          id: U.uid("r"), productId: p.id, userId: me.id, userName: me.name,
          rating: Number(document.getElementById("revRating").value) || 5,
          comment: comment, createdAt: Date.now(),
        });
        S.saveReviews(reviews);
        App.router.refresh();
        U.toast("Review posted!", "success");
      });
    }

    const cartBtn = document.getElementById("addToCartBtn");
    if (cartBtn) {
      cartBtn.addEventListener("click", () => {
        const cart = S.getCart();
        const existing = cart.find((x) => x.id === p.id);
        if (existing) {
          existing.qty = (existing.qty || 1) + 1;
        } else {
          cart.push({ id: p.id, title: p.title, price: p.price, image: p.image, emoji: p.emoji, qty: 1 });
        }
        S.saveCart(cart);
        U.toast("Added to Cart!", "success");
      });
    }

    const wishBtn = document.getElementById("addToWishBtn");
    if (wishBtn) {
      wishBtn.addEventListener("click", () => {
        const wish = S.getWishlist();
        if (!wish.some((x) => x.id === p.id)) {
          wish.push(p);
          S.saveWishlist(wish);
          U.toast("Added to Wishlist!", "success");
        } else {
          U.toast("Already in Wishlist!", "info");
        }
      });
    }

    renderReviewList(id);
  }

  function renderReviewList(productId) {
    const reviews = S.getReviews().filter((x) => x.productId === productId).sort((a, b) => b.createdAt - a.createdAt);
    const box = document.getElementById("reviewList");
    if (!box) return;
    box.innerHTML = reviews.length ? reviews.map((rv) =>
      '<div class="d-flex gap-3 py-3 border-bottom">' +
      '<div class="rev-avatar">' + U.esc((rv.userName || "A")[0].toUpperCase()) + '</div>' +
      '<div class="flex-grow-1"><div class="d-flex align-items-center gap-2 flex-wrap">' +
      '<b>' + U.esc(rv.userName) + '</b>' + starsHtml(rv.rating) + '</div>' +
      '<p class="mb-1 mt-1">' + U.esc(rv.comment) + '</p>' +
      '<small class="text-secondary">' + U.timeAgo(rv.createdAt) + '</small></div></div>'
    ).join("") : emptyState("bi-chat-dots", "No reviews yet", "Be the first to review!");
  }

  /* ================= CHECKOUT ================= */
  function renderBuy(id) {
    const p = S.getProducts().find((x) => x.id === id);
    if (!p) return emptyState("bi-emoji-frown", "Product not found", "");
    const me = A.current();
    return (
      '<div class="view d-flex justify-content-center">' +
      '<div class="card border-0 shadow-lg w-100" style="max-width:540px">' +
      '<div class="card-body p-4">' +
      '<h4 class="fw-bold mb-3"><i class="bi bi-bag"></i> Checkout</h4>' +
      '<div class="d-flex align-items-center gap-3 border rounded-3 p-2 mb-3">' +
      '<div class="ratio ratio-1x1" style="width:64px;flex:0 0 auto"><img src="' + U.esc(p.image) + '" class="object-fit-cover rounded-2" ' +
      'onerror="this.onerror=null;this.src=\'' + S.svgProduct(p.emoji || "🛍️", "#ededed", "#d8d8d8") + '\'"></div>' +
      '<div><div class="fw-semibold">' + U.esc(p.title) + '</div><div class="text-secondary small">' + U.money(p.price) + ' • Stock: ' + p.stock + '</div></div>' +
      '</div>' +
      '<form id="buyForm">' +
      '<div class="row g-2 mb-3">' +
      '<div class="col-6"><label class="form-label">Full name</label><input id="byName" class="form-control" value="' + U.esc(me ? me.name : '') + '" required></div>' +
      '<div class="col-6"><label class="form-label">Phone</label><input id="byPhone" class="form-control" value="' + U.esc(me ? (me.phone || '') : '') + '" placeholder="+92 300 1234567" required></div>' +
      '</div>' +
      '<div class="mb-3"><label class="form-label">Delivery address</label><textarea id="byAddr" class="form-control" rows="2" placeholder="Street, area, city" required>' + U.esc(me ? (me.city || '') : '') + '</textarea></div>' +
      '<div class="row g-2 mb-3">' +
      '<div class="col-6"><label class="form-label">Quantity</label><input id="byQty" type="number" min="1" max="' + p.stock + '" value="1" class="form-control" required></div>' +
      '<div class="col-6"><label class="form-label">Payment</label><select id="byPayment" class="form-select"><option>Cash on Delivery</option><option>Bank Transfer</option></select></div>' +
      '</div>' +
      '<div class="d-flex justify-content-between align-items-center border-top pt-3 mb-3">' +
      '<span class="text-secondary">Total</span><b class="fs-4" id="coTotal">' + U.money(p.price) + '</b></div>' +
      '<button class="btn btn-dark btn-lg w-100" type="submit"><i class="bi bi-check-lg"></i> Place order</button>' +
      '<p class="ferr" id="byErr"></p>' +
      '</form></div></div></div>'
    );
  }

  function bindBuy(id) {
    const p = S.getProducts().find((x) => x.id === id);
    if (!p) return;
    const qty = document.getElementById("byQty");
    if (qty) {
      qty.addEventListener("input", () => {
        const val = Math.max(1, Number(qty.value) || 1);
        document.getElementById("coTotal").textContent = U.money(p.price * val);
      });
    }
    const buyForm = document.getElementById("buyForm");
    if (!buyForm) return;

    buyForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const err = document.getElementById("byErr");
      err.textContent = "";
      const me = A.current();
      if (!me) {
        U.toast("Please log in to complete checkout.", "warn");
        App.router.go("login");
        return;
      }
      const n = Number(qty.value) || 1;
      if (n < 1) { err.textContent = "Quantity must be at least 1."; return; }
      if (p.stock < 1) { err.textContent = "Product is out of stock."; return; }
      if (n > p.stock) { err.textContent = "Only " + p.stock + " in stock."; return; }

      const name = document.getElementById("byName").value.trim();
      const phone = document.getElementById("byPhone").value.trim();
      const addr = document.getElementById("byAddr").value.trim();
      const payEl = document.getElementById("byPayment");
      const payment = payEl ? payEl.value : "Cash on Delivery";

      const orders = S.getOrders();
      orders.push({
        id: U.uid("o"),
        productId: p.id,
        buyerId: me.id,
        buyerName: name || me.name,
        buyerPhone: phone,
        buyerAddress: addr,
        sellerId: p.sellerId,
        productTitle: p.title,
        qty: n,
        total: p.price * n,
        paymentMethod: payment,
        createdAt: Date.now(),
        status: "Pending",
      });
      S.saveOrders(orders);

      const products = S.getProducts().map((x) => x.id === p.id ? Object.assign({}, x, { stock: Math.max(0, x.stock - n) }) : x);
      S.saveProducts(products);

      // Remove from cart if item was there
      const cart = S.getCart().filter((c) => c.id !== p.id);
      S.saveCart(cart);

      U.toast("Order placed successfully! Seller will process your order.", "success");
      App.router.go("orders");
    });
  }

  /* ================= ORDERS ================= */
  function renderOrders() {
    const me = A.current();
    if (!me) return emptyState("bi-receipt", "Please log in", "Log in to view your orders.");

    let orders = S.getOrders();
    let title = "Orders";
    let subtitle = "View and manage orders.";

    if (me.role === "customer") {
      orders = orders.filter((o) => o.buyerId === me.id);
      title = "My Orders";
      subtitle = "Track products you have ordered.";
    } else if (me.role === "seller") {
      orders = orders.filter((o) => o.sellerId === me.id);
      title = "Customer Orders";
      subtitle = "Orders placed for your store products.";
    } else if (me.role === "admin") {
      title = "All Marketplace Orders";
      subtitle = "Admin view of all customer transactions.";
    }

    orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return (
      '<div class="view">' +
      '<div class="d-flex justify-content-between align-items-center mb-4 reveal">' +
      '<div><h3 class="fw-bold mb-1">' + U.esc(title) + '</h3>' +
      '<p class="text-secondary mb-0">' + U.esc(subtitle) + '</p></div>' +
      '<span class="badge text-bg-dark rounded-pill px-3 py-2 fs-6">' + orders.length + ' order' + (orders.length === 1 ? '' : 's') + '</span>' +
      '</div>' +
      '<div id="ordersContainer">' +
      (orders.length ?
        '<div class="table-responsive card border-0 shadow-sm p-3">' +
        '<table class="table table-hover align-middle mb-0">' +
        '<thead><tr>' +
        '<th>Order #</th>' +
        '<th>Product</th>' +
        (me.role !== "customer" ? '<th>Customer Details</th>' : '<th>Seller</th>') +
        '<th>Qty</th>' +
        '<th>Total</th>' +
        '<th>Payment</th>' +
        '<th>Status</th>' +
        '<th>Date</th>' +
        (me.role === "seller" || me.role === "admin" ? '<th>Action</th>' : '') +
        '</tr></thead>' +
        '<tbody>' +
        orders.map((o) => {
          const seller = S.findById(o.sellerId);
          return (
            '<tr>' +
            '<td class="small font-monospace fw-semibold">' + U.esc(o.id.slice(-8)) + '</td>' +
            '<td><div class="fw-semibold">' + U.esc(o.productTitle || "Product") + '</div></td>' +
            (me.role !== "customer" ?
              '<td><div class="fw-semibold">' + U.esc(o.buyerName || "Customer") + '</div>' +
              (o.buyerPhone ? '<div class="small text-secondary"><i class="bi bi-telephone"></i> ' + U.esc(o.buyerPhone) + '</div>' : '') +
              (o.buyerAddress ? '<div class="small text-secondary"><i class="bi bi-geo-alt"></i> ' + U.esc(o.buyerAddress) + '</div>' : '') +
              '</td>' :
              '<td><div class="small text-secondary">' + U.esc(seller ? seller.name : "Seller") + '</div></td>'
            ) +
            '<td>' + (o.qty || 1) + '</td>' +
            '<td class="fw-bold">' + U.money(o.total) + '</td>' +
            '<td class="small text-secondary">' + U.esc(o.paymentMethod || "COD") + '</td>' +
            '<td><span class="badge rounded-pill ' + (o.status === "Completed" ? "bg-success" : "bg-warning text-dark") + '">' + U.esc(o.status || "Pending") + '</span></td>' +
            '<td class="text-secondary small">' + U.timeAgo(o.createdAt) + '</td>' +
            (me.role === "seller" || me.role === "admin" ?
              '<td><button class="btn btn-sm btn-outline-dark toggle-order-btn" data-id="' + o.id + '">' +
              (o.status === "Completed" ? '<i class="bi bi-arrow-counterclockwise"></i> Pending' : '<i class="bi bi-check-lg"></i> Complete') +
              '</button></td>' : '') +
            '</tr>'
          );
        }).join('') +
        '</tbody></table></div>' :
        emptyState("bi-receipt", "No orders yet", me.role === "customer" ? "Explore products and place your first order!" : "Orders from customers will appear here.")
      ) +
      '</div></div>'
    );
  }

  function bindOrders() {
    document.querySelectorAll(".toggle-order-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const orders = S.getOrders().map((o) => {
          if (o.id === id) {
            return Object.assign({}, o, { status: o.status === "Completed" ? "Pending" : "Completed" });
          }
          return o;
        });
        S.saveOrders(orders);
        U.toast("Order status updated!", "success");
        App.router.refresh();
      });
    });
  }

  /* ================= CART ================= */
  function renderCart() {
    const cart = S.getCart();
    const total = cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 1), 0);

    return (
      '<div class="view">' +
      '<div class="d-flex justify-content-between align-items-center mb-4 reveal">' +
      '<div><h3 class="fw-bold mb-1">Shopping Cart</h3>' +
      '<p class="text-secondary mb-0">Review items before checkout.</p></div>' +
      '<span class="badge text-bg-dark rounded-pill px-3 py-2 fs-6">' + cart.length + ' item' + (cart.length === 1 ? '' : 's') + '</span>' +
      '</div>' +
      (cart.length ?
        '<div class="row g-4"><div class="col-lg-8">' +
        '<div class="card border-0 shadow-sm p-3">' +
        cart.map((item, idx) =>
          '<div class="d-flex align-items-center gap-3 py-3 ' + (idx < cart.length - 1 ? 'border-bottom' : '') + '">' +
          '<div class="ratio ratio-1x1" style="width:65px;flex:0 0 auto">' +
          '<img src="' + U.esc(item.image) + '" class="object-fit-cover rounded-2" onerror="this.onerror=null;this.src=\'' + S.svgProduct(item.emoji || "🛍️", "#ededed", "#d8d8d8") + '\'">' +
          '</div>' +
          '<div class="flex-grow-1 min-w-0">' +
          '<h6 class="fw-bold mb-1 text-truncate">' + U.esc(item.title) + '</h6>' +
          '<div class="text-secondary small">' + U.money(item.price) + ' &times; ' + item.qty + '</div>' +
          '</div>' +
          '<div class="fw-bold fs-6">' + U.money((item.price || 0) * (item.qty || 1)) + '</div>' +
          '<button class="btn btn-sm btn-outline-dark remove-cart-btn" data-id="' + item.id + '"><i class="bi bi-trash"></i></button>' +
          '</div>'
        ).join('') +
        '</div></div>' +
        '<div class="col-lg-4">' +
        '<div class="card border-0 shadow-sm p-4">' +
        '<h5 class="fw-bold mb-3">Order Summary</h5>' +
        '<div class="d-flex justify-content-between mb-2"><span class="text-secondary">Subtotal</span><b>' + U.money(total) + '</b></div>' +
        '<div class="d-flex justify-content-between mb-3"><span class="text-secondary">Shipping</span><span class="text-success fw-semibold">Free</span></div>' +
        '<div class="d-flex justify-content-between border-top pt-3 mb-4"><span class="fs-5 fw-bold">Total</span><span class="fs-4 fw-bold">' + U.money(total) + '</span></div>' +
        '<button class="btn btn-dark btn-lg w-100" id="checkoutCartBtn"><i class="bi bi-bag-check"></i> Checkout</button>' +
        '</div></div></div>' :
        emptyState("bi-cart", "Your cart is empty", "Browse our shop and add some items.")
      ) +
      '</div>'
    );
  }

  function bindCart() {
    document.querySelectorAll(".remove-cart-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const cart = S.getCart().filter((x) => x.id !== id);
        S.saveCart(cart);
        U.toast("Item removed from cart.", "info");
        App.router.refresh();
      });
    });
    const coBtn = document.getElementById("checkoutCartBtn");
    if (coBtn) {
      coBtn.addEventListener("click", () => {
        const cart = S.getCart();
        if (!cart.length) return;
        const me = A.current();
        if (!me) {
          U.toast("Please login to checkout.", "warn");
          App.router.go("login");
          return;
        }
        App.router.go("buy", cart[0].id);
      });
    }
  }

  /* ================= WISHLIST ================= */
  function renderWishlist() {
    const list = S.getWishlist();
    return (
      '<div class="view">' +
      '<div class="d-flex justify-content-between align-items-center mb-4 reveal">' +
      '<div><h3 class="fw-bold mb-1">My Wishlist</h3>' +
      '<p class="text-secondary mb-0">Saved products for later.</p></div>' +
      '<span class="badge text-bg-dark rounded-pill px-3 py-2 fs-6">' + list.length + ' item' + (list.length === 1 ? '' : 's') + '</span>' +
      '</div>' +
      (list.length ?
        '<div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-3 grid-stagger">' +
        list.map((p) =>
          '<div class="col">' +
          '<div class="card h-100 product-card border-0 shadow-sm">' +
          '<div class="ratio ratio-1x1 product-img">' +
          '<img src="' + U.esc(p.image) + '" alt="' + U.esc(p.title) + '" loading="lazy" ' +
          'onerror="this.onerror=null;this.src=\'' + S.svgProduct(p.emoji || "🛍️", "#ededed", "#d8d8d8") + '\'">' +
          '</div>' +
          '<div class="card-body d-flex flex-column p-3">' +
          '<h6 class="card-title fw-bold">' + U.esc(p.title) + '</h6>' +
          '<div class="fw-bold mt-auto mb-2">' + U.money(p.price) + '</div>' +
          '<div class="d-flex gap-2">' +
          '<button class="btn btn-sm btn-dark flex-fill" onclick="App.router.go(\'product\',\'' + p.id + '\')"><i class="bi bi-eye"></i> View</button>' +
          '<button class="btn btn-sm btn-outline-dark remove-wish-btn" data-id="' + p.id + '"><i class="bi bi-trash"></i></button>' +
          '</div></div></div></div>'
        ).join('') +
        '</div>' :
        emptyState("bi-heart", "Your wishlist is empty", "Save products to your wishlist to find them easily.")
      ) +
      '</div>'
    );
  }

  function bindWishlist() {
    document.querySelectorAll(".remove-wish-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const list = S.getWishlist().filter((x) => x.id !== id);
        S.saveWishlist(list);
        U.toast("Removed from wishlist.", "info");
        App.router.refresh();
      });
    });
  }

  /* ================= ADMIN ================= */
  function renderAdmin() {
    const users = S.getUsers();
    const products = S.getProducts();
    const orders = S.getOrders();
    const revenue = orders.reduce((a, b) => a + (Number(b.total) || 0), 0);
    const sellers = users.filter((u) => u.role === "seller").length;
    const customers = users.filter((u) => u.role === "customer").length;
    return (
      '<div class="view">' +
      '<div class="mb-4 reveal"><h3 class="fw-bold mb-1">Admin Dashboard</h3><p class="text-secondary mb-0">Manage users, products, and orders.</p></div>' +
      '<div class="row row-cols-2 row-cols-md-4 g-3 mb-4">' +
      '<div class="col"><div class="card stat-card border-0 shadow-sm text-center"><div class="card-body">' +
      '<div class="stat-ic"><i class="bi bi-people"></i></div><div class="fs-4 fw-bold" data-count="' + customers + '">0</div><small class="text-secondary">Customers</small></div></div></div>' +
      '<div class="col"><div class="card stat-card border-0 shadow-sm text-center"><div class="card-body">' +
      '<div class="stat-ic"><i class="bi bi-shop"></i></div><div class="fs-4 fw-bold" data-count="' + sellers + '">0</div><small class="text-secondary">Sellers</small></div></div></div>' +
      '<div class="col"><div class="card stat-card border-0 shadow-sm text-center"><div class="card-body">' +
      '<div class="stat-ic"><i class="bi bi-box-seam"></i></div><div class="fs-4 fw-bold" data-count="' + products.length + '">0</div><small class="text-secondary">Products</small></div></div></div>' +
      '<div class="col"><div class="card stat-card border-0 shadow-sm text-center"><div class="card-body">' +
      '<div class="stat-ic"><i class="bi bi-cash-stack"></i></div><div class="fs-5 fw-bold">' + U.money(revenue) + '</div><small class="text-secondary">Revenue</small></div></div></div>' +
      '</div>' +
      '<div class="card border-0 shadow-sm reveal"><div class="card-body p-0">' +
      '<ul class="nav nav-pills p-3 pb-0 gap-2" id="adminTabs">' +
      '<li class="nav-item"><button class="nav-link active" data-tab="users">Users</button></li>' +
      '<li class="nav-item"><button class="nav-link" data-tab="products">Products</button></li>' +
      '<li class="nav-item"><button class="nav-link" data-tab="orders">Orders</button></li>' +
      '</ul>' +
      '<div id="adminTable" class="p-3"></div>' +
      '</div></div></div>'
    );
  }

  function bindAdmin() {
    const tabs = document.querySelectorAll("#adminTabs .nav-link");
    const box = document.getElementById("adminTable");
    function showUsers() {
      const users = S.getUsers();
      box.innerHTML = '<div class="table-responsive"><table class="table table-hover align-middle mb-0">' +
        '<thead><tr><th>User</th><th>Email</th><th>Role</th><th>Joined</th><th></th></tr></thead><tbody>' +
        users.map((u) =>
          '<tr><td class="fw-semibold">' + U.esc(u.name) + '</td><td class="text-secondary">' + U.esc(u.email) + '</td>' +
          '<td><span class="badge rounded-pill ' + (u.role === "admin" ? "text-bg-dark" : "text-bg-light border") + '">' + u.role + '</span></td>' +
          '<td class="text-secondary small">' + U.timeAgo(u.createdAt) + '</td>' +
          '<td>' + (u.role === "admin" ? '<span class="text-secondary">—</span>' :
            '<button class="btn btn-sm btn-outline-dark" onclick="App.router.deleteUser(\'' + u.id + '\')"><i class="bi bi-trash"></i> Delete</button>') + '</td></tr>'
        ).join("") + '</tbody></table></div>';
    }
    function showProducts() {
      const products = S.getProducts();
      box.innerHTML = products.length ? '<div class="table-responsive"><table class="table table-hover align-middle mb-0">' +
        '<thead><tr><th>Product</th><th>Seller</th><th>Category</th><th>Price</th><th>Stock</th><th></th></tr></thead><tbody>' +
        products.map((p) =>
          '<tr><td><div class="d-flex align-items-center gap-2"><div class="ratio ratio-1x1" style="width:40px;flex:0 0 auto">' +
          '<img src="' + U.esc(p.image) + '" class="object-fit-cover rounded-2" onerror="this.onerror=null;this.src=\'' + S.svgProduct(p.emoji || "🛍️", "#ededed", "#d8d8d8") + '\'"></div>' +
          '<span class="fw-semibold">' + U.esc(p.title) + '</span></div></td>' +
          '<td class="text-secondary">' + U.esc(p.sellerName) + '</td><td>' + U.esc(p.category) + '</td>' +
          '<td class="fw-semibold">' + U.money(p.price) + '</td><td>' + p.stock + '</td>' +
          '<td><button class="btn btn-sm btn-outline-dark" onclick="App.router.deleteProduct(\'' + p.id + '\')"><i class="bi bi-trash"></i> Delete</button></td></tr>'
        ).join("") + '</tbody></table></div>'
        : emptyState("bi-box-seam", "No products yet", "Sellers ki products yahan aayengi.");
    }
    function showOrders() {
      const orders = S.getOrders().slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      box.innerHTML = orders.length ? '<div class="table-responsive"><table class="table table-hover align-middle mb-0">' +
        '<thead><tr><th>Order #</th><th>Product</th><th>Customer</th><th>Qty</th><th>Total</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody>' +
        orders.map((o) =>
          '<tr><td class="small font-monospace">' + U.esc(o.id.slice(-8)) + '</td>' +
          '<td class="fw-semibold">' + U.esc(o.productTitle) + '</td>' +
          '<td>' + U.esc(o.buyerName) + (o.buyerPhone ? '<div class="small text-secondary">' + U.esc(o.buyerPhone) + '</div>' : '') + '</td>' +
          '<td>' + o.qty + '</td>' +
          '<td class="fw-bold">' + U.money(o.total) + '</td>' +
          '<td><span class="badge rounded-pill ' + (o.status === "Completed" ? "bg-success" : "bg-warning text-dark") + '">' + U.esc(o.status || "Pending") + '</span></td>' +
          '<td class="text-secondary small">' + U.timeAgo(o.createdAt) + '</td>' +
          '<td><button class="btn btn-sm btn-outline-dark toggle-order-btn" data-id="' + o.id + '">' +
          (o.status === "Completed" ? '<i class="bi bi-arrow-counterclockwise"></i> Pending' : '<i class="bi bi-check-lg"></i> Complete') +
          '</button></td></tr>'
        ).join("") + '</tbody></table></div>'
        : emptyState("bi-receipt", "No orders yet", "Customer orders will appear here.");

      box.querySelectorAll(".toggle-order-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.id;
          const updated = S.getOrders().map((o) => o.id === id ? Object.assign({}, o, { status: o.status === "Completed" ? "Pending" : "Completed" }) : o);
          S.saveOrders(updated);
          U.toast("Order updated.", "success");
          showOrders();
        });
      });
    }

    tabs.forEach((t) => t.addEventListener("click", () => {
      tabs.forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      if (t.dataset.tab === "users") showUsers();
      else if (t.dataset.tab === "products") showProducts();
      else showOrders();
    }));
    showUsers();
  }

  return {
    renderAuth, bindAuth, renderCustomer, bindCustomer,
    renderSeller, bindSeller, renderSettings, bindSettings,
    renderProduct, bindProduct, renderBuy, bindBuy,
    renderAdmin, bindAdmin, renderOrders, bindOrders,
    renderCart, bindCart, renderWishlist, bindWishlist,
    productCard, ratingSummary,
  };
})();
