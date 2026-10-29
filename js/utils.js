/* Shared utilities: ids, hashing, formatting, sanitizing,
   toasts, image helpers, palette extraction. */
window.App = window.App || {};

App.Utils = (function () {
  function uid(prefix) {
    return (prefix || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* --- SHA-256 hash (async) for passwords --- */
  async function sha256(text) {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async function hashPassword(pw, salt) {
    return await sha256((salt || "mk") + "::" + pw);
  }

  /* --- formatting --- */
  function money(n) {
    const num = Number(n) || 0;
    return "Rs " + num.toLocaleString("en-PK", { maximumFractionDigits: 2 });
  }

  function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    const m = Math.floor(s / 60);
    if (m < 60) return m + "m ago";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h ago";
    const d = Math.floor(h / 24);
    if (d < 30) return d + "d ago";
    return new Date(ts).toLocaleDateString();
  }

  /* --- basic HTML escaping --- */
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* --- toast / notifications --- */
  function toast(msg, type) {
    const host = document.getElementById("toasts") || (function () {
      const d = document.createElement("div");
      d.id = "toasts";
      document.body.appendChild(d);
      return d;
    })();
    const el = document.createElement("div");
    el.className = "toast toast-" + (type || "info");
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => el.classList.add("show"), 10);
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 300);
    }, 3200);
  }

  /* --- modal helper --- */
  function modal(html) {
    closeModal();
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.id = "modalBackdrop";
    wrap.innerHTML = '<div class="modal-card">' + html + "</div>";
    document.body.appendChild(wrap);
    wrap.addEventListener("click", function (e) {
      if (e.target === wrap) closeModal();
    });
    return wrap;
  }
  function closeModal() {
    const m = document.getElementById("modalBackdrop");
    if (m) m.remove();
  }

  /* ---------- Image / palette helpers (for Lens) ---------- */
  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image load failed"));
      img.src = src;
    });
  }

  // Downscale + draw an image, return canvas.
  function toCanvas(img, size) {
    size = size || 32;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, size, size);
    return c;
  }

  // Extract top-N dominant colors (simple bucketed quantization).
  function extractPalette(img, buckets, count) {
    const c = toCanvas(img, 40);
    const ctx = c.getContext("2d", { willReadFrequently: true });
    const d = ctx.getImageData(0, 0, 40, 40).data;
    const step = buckets || 24; // bucket size
    const map = {};
    for (let i = 0; i < d.length; i += 4) {
      const r = Math.round(d[i] / step) * step;
      const g = Math.round(d[i + 1] / step) * step;
      const b = Math.round(d[i + 2] / step) * step;
      const a = d[i + 3];
      if (a < 128) continue; // skip transparent
      const key = r + "," + g + "," + b;
      map[key] = (map[key] || 0) + 1;
    }
    const sorted = Object.keys(map).sort((a, b) => map[b] - map[a]);
    return sorted.slice(0, count || 4).map((k) => {
      const p = k.split(",").map(Number);
      return { r: p[0], g: p[1], b: p[2], n: map[k] };
    });
  }

  function colorDistance(a, b) {
    return Math.sqrt(
      (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2
    );
  }

  // Distance between two palettes (greedy nearest-neighbour).
  function paletteDistance(p1, p2) {
    if (!p1 || !p1.length || !p2 || !p2.length) return 1e9;
    let total = 0;
    const used = new Set();
    for (const c of p1) {
      let best = 1e9;
      let bestI = -1;
      for (let i = 0; i < p2.length; i++) {
        if (used.has(i)) continue;
        const d = colorDistance(c, p2[i]);
        if (d < best) { best = d; bestI = i; }
      }
      if (bestI >= 0) used.add(bestI);
      total += best;
    }
    return total / Math.max(1, p1.length);
  }

  // Detect if a dataURL/source is a real raster (not svg).
  function isRaster(src) {
    return /^data:image\/(png|jpe?g|webp|gif)/i.test(src) ||
      /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(src);
  }

  return {
    uid, sha256, hashPassword, money, timeAgo, esc,
    toast, modal, closeModal,
    fileToDataURL, loadImage, extractPalette, paletteDistance, isRaster,
  };
})();
