/* Data layer: localStorage-backed "database" with seed data.
   Works fully offline. Product photos are real (Unsplash). */
window.App = window.App || {};

App.Store = (function () {
  const U = App.Utils;
  const KEYS = {
    users: "ar_users",
    products: "ar_products",
    reviews: "ar_reviews",
    orders: "ar_orders",
    session: "ar_session",
    cart: "ar_cart",
    wishlist: "ar_wishlist",
    seeded: "ar_seeded_v4",
  };

  function read(key, def) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : def;
    } catch (e) {
      return def;
    }
  }

  /* ---------------- persistence layer ----------------
     Order of truth: Supabase (if tables exist) -> local
     server (/api/data) -> localStorage. Every change is
     written locally instantly and pushed to the cloud. */

  const API = "/api/data";
  const TABLE_BY_KEY = {};
  TABLE_BY_KEY[KEYS.users] = "users";
  TABLE_BY_KEY[KEYS.products] = "products";
  TABLE_BY_KEY[KEYS.reviews] = "reviews";
  TABLE_BY_KEY[KEYS.orders] = "orders";
  const SYNC_KEYS = Object.keys(TABLE_BY_KEY);

  let pushTimer = null;
  let sbTimer = null;
  let status = "local"; // "supabase" | "cloud" | "local"

  function write(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
    if (SYNC_KEYS.indexOf(key) >= 0) {
      queuePush();
      queueSupabase(key);
    }
  }

  /* ---- local server (/api/data) ---- */
  function queuePush() {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushNow, 400);
  }

  async function pushNow() {
    try {
      await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          users: getUsers(),
          products: getProducts(),
          reviews: getReviews(),
          orders: getOrders(),
        }),
      });
    } catch (e) { /* offline / no server */ }
  }

  /* ---- Supabase ---- */
  function queueSupabase(key) {
    const sb = App.Supabase;
    if (!sb || !sb.configured()) return;
    clearTimeout(sbTimer);
    sbTimer = setTimeout(function () {
      const table = TABLE_BY_KEY[key];
      if (table) sb.syncTable(table, read(key, []));
    }, 700);
  }

  async function pullFromSupabase() {
    const sb = App.Supabase;
    if (!sb || !sb.configured()) return false;
    let d;
    try { d = await sb.pull(); } catch (e) { return false; }
    if (!d) return false;

    // Supabase is the source of truth once its tables exist.
    // Products come ONLY from sellers — never from local demo data.
    const hasProducts = Array.isArray(d.products) && d.products.length > 0;
    const users = (Array.isArray(d.users) && d.users.length) ? d.users : getUsers();
    const orders = Array.isArray(d.orders) ? d.orders : getOrders();
    const reviews = hasProducts && Array.isArray(d.reviews) ? d.reviews : [];

    localStorage.setItem(KEYS.users, JSON.stringify(users));
    localStorage.setItem(KEYS.products, JSON.stringify(hasProducts ? d.products : []));
    localStorage.setItem(KEYS.reviews, JSON.stringify(reviews));
    localStorage.setItem(KEYS.orders, JSON.stringify(orders));
    localStorage.setItem(KEYS.seeded, JSON.stringify(true));
    status = "supabase";
    return true;
  }

  /* ---- local server pull ---- */
  async function hydrate() {
    try {
      const r = await fetch(API, { cache: "no-store" });
      if (!r.ok) return false;
      const d = await r.json();
      if (d && Array.isArray(d.products) && d.products.length) {
        localStorage.setItem(KEYS.users, JSON.stringify(d.users || []));
        localStorage.setItem(KEYS.products, JSON.stringify(d.products));
        localStorage.setItem(KEYS.reviews, JSON.stringify(d.reviews || []));
        localStorage.setItem(KEYS.orders, JSON.stringify(d.orders || []));
        localStorage.setItem(KEYS.seeded, JSON.stringify(true));
        return true;
      }
    } catch (e) { /* no server */ }
    return false;
  }

  async function init() {
    if (await pullFromSupabase()) return;
    const remote = await hydrate();
    if (remote) { status = "cloud"; return; }
    await seed();
    status = "cloud";
    queuePush();
    SYNC_KEYS.forEach(function (k) { queueSupabase(k); });
  }

  function getStatus() { return status; }

  function getUsers() { return read(KEYS.users, []); }
  function saveUsers(u) { write(KEYS.users, u); }
  function getProducts() { return read(KEYS.products, []); }
  function saveProducts(p) { write(KEYS.products, p); }
  function getReviews() { return read(KEYS.reviews, []); }
  function saveReviews(r) { write(KEYS.reviews, r); }
  function getOrders() { return read(KEYS.orders, []); }
  function saveOrders(o) { write(KEYS.orders, o); }
  function getCart() { return read(KEYS.cart, []); }
  function saveCart(c) { write(KEYS.cart, c); }
  function getWishlist() { return read(KEYS.wishlist, []); }
  function saveWishlist(w) { write(KEYS.wishlist, w); }

  /* ---- fallback placeholder (only if a photo fails to load) ---- */
  function svgProduct(emoji, c1, c2) {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + c1 + '"/>' +
      '<stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs>' +
      '<rect width="600" height="600" fill="url(#g)"/>' +
      '<circle cx="480" cy="120" r="160" fill="rgba(255,255,255,0.10)"/>' +
      '<circle cx="120" cy="500" r="140" fill="rgba(0,0,0,0.10)"/>' +
      '<text x="50%" y="52%" font-size="220" text-anchor="middle" dominant-baseline="middle">' +
      emoji + '</text></svg>';
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  function img(pid) {
    return "https://images.unsplash.com/" + pid + "?auto=format&fit=crop&w=900&q=80";
  }

  /* ---- seed demo data ---- */
  async function seed() {
    if (read(KEYS.seeded, false)) return;

    const adminPw = await U.hashPassword(App.CONFIG.admin.password, "admin");
    const sellerPw = await U.hashPassword("seller123", "demo");
    const custPw = await U.hashPassword("customer123", "demo");

    const now = Date.now();
    const users = [
      { id: "u_admin", name: App.CONFIG.admin.name, email: App.CONFIG.admin.email, role: "admin", pw: adminPw, salt: "admin", createdAt: now, phone: "+92 300 0000000", city: "Karachi" },
      { id: "u_seller1", name: "Sara Traders", email: "seller@demo.com", role: "seller", pw: sellerPw, salt: "demo", createdAt: now - 86400000, phone: "+92 321 1112233", city: "Karachi" },
      { id: "u_seller2", name: "Tech House", email: "tech@demo.com", role: "seller", pw: sellerPw, salt: "demo", createdAt: now - 2 * 86400000, phone: "+92 322 4445566", city: "Lahore" },
      { id: "u_seller3", name: "Style Hub", email: "style@demo.com", role: "seller", pw: sellerPw, salt: "demo", createdAt: now - 3 * 86400000, phone: "+92 323 7778899", city: "Islamabad" },
      { id: "u_cust1", name: "Ahmed Khan", email: "customer@demo.com", role: "customer", pw: custPw, salt: "demo", createdAt: now - 3600000, phone: "+92 333 7778899", city: "Karachi" },
    ];

    // [sellerId, sellerName, title, emoji, category, price, stock, desc, photoId, palette, city, lat, lng]
    const rows = [
      ["u_seller1", "Sara Traders", "Premium Leather Wallet", "👝", "Accessories", 1499, 20,
        "Hand-stitched full-grain leather wallet with RFID protection. Slim, durable and classy.",
        "photo-1627123424574-724758594e93", [[75, 79, 77], [24, 31, 33], [44, 54, 55], [94, 95, 91]], "Karachi", 24.8607, 67.0011],
      ["u_seller1", "Sara Traders", "Classic White Shirt", "👔", "Clothing", 2299, 15,
        "Crisp cotton formal shirt with a tailored fit. Perfect for office and evening wear.",
        "photo-1596755094514-f87e34085b2c", [[198, 198, 198], [89, 111, 128], [197, 198, 199], [200, 199, 199]], "Karachi", 24.8607, 67.0011],
      ["u_seller3", "Style Hub", "Cotton Crew T-Shirt", "👕", "Clothing", 1299, 30,
        "Soft 100% cotton crew-neck tee in a relaxed fit — an everyday essential.",
        "photo-1521572163474-6864f9cf17ab", [[70, 54, 46], [154, 150, 153], [228, 228, 234], [209, 208, 214]], "Islamabad", 33.6844, 73.0479],
      ["u_seller1", "Sara Traders", "Aroma Candles (Set of 3)", "🕯️", "Home", 999, 40,
        "Soy wax scented candles — vanilla, lavender and sandalwood. Calming vibes.",
        "photo-1602874801007-bd458bb1b8b6", [[65, 51, 38], [88, 71, 57], [40, 33, 25], [113, 95, 79]], "Karachi", 24.8607, 67.0011],
      ["u_seller1", "Sara Traders", "Scented Candle Jar", "🕯️", "Home", 799, 25,
        "Hand-poured candle in a reusable glass jar with a warm wooden wick.",
        "photo-1603006905003-be475563bc59", [[20, 19, 13], [41, 33, 24], [102, 81, 64], [154, 129, 109]], "Karachi", 24.8607, 67.0011],
      ["u_seller2", "Tech House", "Wireless Earbuds Pro", "🎧", "Electronics", 3999, 12,
        "Deep bass wireless earbuds with 30h battery, ENC mic and fast charging.",
        "photo-1606220945770-b5b6c2c55bf1", [[68, 30, 33], [13, 10, 26], [118, 51, 71], [50, 23, 34]], "Lahore", 31.5204, 74.3587],
      ["u_seller2", "Tech House", "Smart Watch Series 8", "⌚", "Electronics", 12499, 8,
        "AMOLED display, heart-rate + SpO2 tracking, 7-day battery and IP68 water resistance.",
        "photo-1523275335684-37898b6baf30", [[220, 218, 219], [218, 218, 218], [193, 192, 192], [225, 225, 225]], "Lahore", 31.5204, 74.3587],
      ["u_seller2", "Tech House", "Smart Watch Ultra", "⌚", "Electronics", 15499, 6,
        "Rugged titanium smartwatch with GPS, always-on display and 100m water resistance.",
        "photo-1546868871-7041f2a55e12", [[255, 255, 255], [64, 55, 53], [254, 255, 254], [244, 244, 245]], "Lahore", 31.5204, 74.3587],
      ["u_seller2", "Tech House", "Mechanical Keyboard", "⌨️", "Electronics", 7499, 10,
        "RGB backlit mechanical keyboard with hot-swappable switches and a sturdy aluminium frame.",
        "photo-1587829741301-dc798b83add3", [[167, 165, 159], [178, 177, 173], [184, 186, 188], [135, 135, 130]], "Lahore", 31.5204, 74.3587],
      ["u_seller1", "Sara Traders", "Ceramic Coffee Mug", "☕", "Home", 799, 60,
        "Matte-finish 350ml ceramic mug — microwave and dishwasher safe.",
        "photo-1514228742587-6b1558fcca3d", [[213, 213, 212], [225, 225, 225], [194, 193, 193], [233, 233, 233]], "Karachi", 24.8607, 67.0011],
      ["u_seller2", "Tech House", "Bluetooth Speaker", "🔊", "Electronics", 5499, 18,
        "360° sound, deep bass, 20h playtime and a waterproof IPX7 body.",
        "photo-1608043152269-423dbba4e7e1", [[32, 30, 34], [207, 208, 213], [193, 185, 179], [189, 159, 133]], "Lahore", 31.5204, 74.3587],
      ["u_seller2", "Tech House", "Studio Headphones", "🎧", "Electronics", 8999, 9,
        "Over-ear studio headphones with rich bass and excellent noise isolation.",
        "photo-1505740420928-5e560c06d30e", [[252, 198, 19], [254, 212, 51], [255, 220, 84], [134, 103, 22]], "Lahore", 31.5204, 74.3587],
      ["u_seller3", "Style Hub", "Aviator Sunglasses", "🕶️", "Accessories", 1999, 22,
        "Classic aviator frames with UV400 polarized lenses and a lightweight metal build.",
        "photo-1572635196237-14b3f281503f", [[243, 243, 243], [225, 225, 225], [86, 86, 86], [248, 248, 248]], "Islamabad", 33.6844, 73.0479],
      ["u_seller3", "Style Hub", "Running Sneakers", "👟", "Sports", 4499, 14,
        "Lightweight running shoes with responsive cushioning and breathable mesh.",
        "photo-1542291026-7eec264c27ff", [[206, 2, 30], [172, 1, 23], [186, 60, 78], [184, 15, 31]], "Islamabad", 33.6844, 73.0479],
      ["u_seller3", "Style Hub", "Travel Backpack", "🎒", "Accessories", 3499, 16,
        "Water-resistant 25L backpack with laptop sleeve and a built-in USB port.",
        "photo-1553062407-98eeb64c6a62", [[165, 171, 184], [191, 195, 205], [59, 66, 83], [203, 208, 216]], "Islamabad", 33.6844, 73.0479],
      ["u_seller2", "Tech House", "Mirrorless Camera", "📷", "Electronics", 89999, 4,
        "24MP mirrorless camera with 4K video and an 18-55mm kit lens.",
        "photo-1526170375885-4d8ecf77b99f", [[208, 205, 212], [218, 217, 223], [216, 215, 220], [134, 132, 140]], "Lahore", 31.5204, 74.3587],
      ["u_seller3", "Style Hub", "Eau de Parfum", "🧴", "Beauty", 3299, 26,
        "Long-lasting floral-woody fragrance with notes of jasmine and amber.",
        "photo-1541643600914-78b084683601", [[183, 211, 236], [176, 204, 226], [218, 158, 133], [192, 215, 230]], "Islamabad", 33.6844, 73.0479],
      ["u_seller1", "Sara Traders", "Minimal Desk Lamp", "💡", "Home", 2599, 13,
        "Adjustable LED desk lamp with 3 brightness levels and a USB charging port.",
        "photo-1507473885765-e6ed057f782c", [[221, 223, 223], [232, 234, 234], [251, 251, 253], [166, 169, 170]], "Karachi", 24.8607, 67.0011],
      ["u_seller1", "Sara Traders", "Potted Plant", "🪴", "Home", 1299, 35,
        "Easy-care indoor plant in a modern ceramic pot — naturally air-purifying.",
        "photo-1485955900006-10f4d324d411", [[238, 240, 241], [252, 252, 252], [255, 255, 255], [242, 250, 249]], "Karachi", 24.8607, 67.0011],
      ["u_seller1", "Sara Traders", "Leather Notebook", "📓", "Accessories", 899, 50,
        "A5 hardcover notebook with smooth 120gsm paper and a ribbon bookmark.",
        "photo-1531346878377-a5be20888e57", [[216, 213, 214], [226, 226, 227], [232, 232, 233], [230, 230, 232]], "Karachi", 24.8607, 67.0011],
      ["u_seller3", "Style Hub", "Steel Water Bottle", "🚰", "Sports", 1599, 28,
        "Insulated stainless steel bottle — keeps drinks cold 24h and hot 12h.",
        "photo-1602143407151-7111542de6e8", [[243, 243, 242], [232, 233, 233], [104, 127, 111], [247, 247, 245]], "Islamabad", 33.6844, 73.0479],
      ["u_seller3", "Style Hub", "Leather Handbag", "👜", "Accessories", 5999, 7,
        "Structured leather handbag with an adjustable strap and gold-tone hardware.",
        "photo-1548036328-c9fa89d128fa", [[51, 51, 50], [23, 24, 22], [102, 100, 93], [42, 42, 41]], "Islamabad", 33.6844, 73.0479],
      ["u_seller3", "Style Hub", "White Sneakers", "👟", "Sports", 5499, 11,
        "Clean minimalist white sneakers that pair with absolutely everything.",
        "photo-1600185365483-26d7a4cc7519", [[206, 204, 200], [210, 209, 205], [213, 212, 208], [195, 175, 166]], "Islamabad", 33.6844, 73.0479],
      ["u_seller3", "Style Hub", "Skin Care Set", "🧴", "Beauty", 2999, 19,
        "4-piece hydrating skincare set with serum, cleanser, moisturizer and SPF.",
        "photo-1583394838336-acd977736f90", [[246, 246, 246], [108, 108, 108], [240, 240, 240], [213, 213, 213]], "Islamabad", 33.6844, 73.0479],
    ];

    // Demo products are OFF by default: the shop only shows
    // products that sellers actually upload.
    const products = (App.CONFIG.seedDemoProducts === true) ? rows.map((r, i) => ({
      id: "p_" + (i + 1) + "_" + Math.random().toString(36).slice(2, 6),
      sellerId: r[0], sellerName: r[1], title: r[2], emoji: r[3], category: r[4],
      price: r[5], stock: r[6], description: r[7], image: img(r[8]), palette: r[9],
      city: r[10], lat: r[11], lng: r[12],
      createdAt: now - i * 1800000 - Math.floor(Math.random() * 900000),
    })) : [];

    write(KEYS.users, users);
    write(KEYS.products, products);
    write(KEYS.reviews, []);
    write(KEYS.orders, []);
    write(KEYS.cart, []);
    write(KEYS.seeded, true);
  }

  /* ---- session ---- */
  function getSession() { return read(KEYS.session, null); }
  function setSession(s) { write(KEYS.session, s); }
  function clearSession() { localStorage.removeItem(KEYS.session); }

  /* ---- user helpers ---- */
  function findByEmail(email) {
    return getUsers().find((u) => u.email.toLowerCase() === String(email).toLowerCase().trim());
  }
  function findById(id) {
    return getUsers().find((u) => u.id === id);
  }

  return {
    seed, init, hydrate, pushNow, getStatus,
    getUsers, saveUsers, getProducts, saveProducts,
    getReviews, saveReviews, getOrders, saveOrders,
    getCart, saveCart, getWishlist, saveWishlist,
    getSession, setSession, clearSession,
    findByEmail, findById, svgProduct,
    KEYS,
  };
})();
