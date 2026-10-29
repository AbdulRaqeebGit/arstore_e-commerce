/* UI extras: Lens modal, AI assistant chat widget. */
window.App = window.App || {};

App.UI = (function () {
  const U = App.Utils;
  const S = App.Store;
  const A = App.Auth;

  /* ---------- Lens modal ---------- */
  async function openLens(seedImage) {
    U.closeModal();
    U.modal(
      '<div class="lens">' +
      '<div class="lens-head"><h2><i class="bi bi-camera"></i> Visual search</h2><button class="close-x" onclick="App.Utils.closeModal()"><i class="bi bi-x-lg"></i></button></div>' +
      '<div class="lens-drop" id="lensDrop">' +
      '<input type="file" id="lensFile" accept="image/*" hidden>' +
      '<div id="lensHint"><span class="lens-ic"><i class="bi bi-image"></i></span><p>Drop or tap to upload a product photo</p></div>' +
      '<img id="lensImg" style="display:none">' +
      '</div>' +
      '<div id="lensResults" class="lens-results"></div>' +
      '</div>'
    );
    const drop = document.getElementById("lensDrop");
    const file = document.getElementById("lensFile");
    drop.addEventListener("click", () => file.click());
    drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("drag"); });
    drop.addEventListener("dragleave", () => drop.classList.remove("drag"));
    drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("drag"); if (e.dataTransfer.files[0]) run(e.dataTransfer.files[0]); });
    file.addEventListener("change", () => { if (file.files[0]) run(file.files[0]); });

    if (seedImage) {
      try {
        const img = await U.loadImage(seedImage);
        document.getElementById("lensHint").style.display = "none";
        const im = document.getElementById("lensImg");
        im.src = seedImage; im.style.display = "block";
        const pal = U.extractPalette(img, 24, 4);
        const ranked = S.getProducts().map((p) => ({ product: p, d: p.palette ? U.paletteDistance(pal, p.palette) : 1e9 }))
          .sort((a, b) => a.d - b.d).slice(0, 6);
        renderLensResults(document.getElementById("lensResults"), ranked.map((r) => ({ product: r.product, similarity: Math.max(0, Math.round(100 - r.d / 3)) })));
      } catch (e) { /* ignore */ }
      return;
    }

    async function run(f) {
      const resultsBox = document.getElementById("lensResults");
      resultsBox.innerHTML = '<div class="spinner">Searching visually…</div>';
      const dataUrl = await U.fileToDataURL(f);
      document.getElementById("lensHint").style.display = "none";
      const im = document.getElementById("lensImg");
      im.src = dataUrl; im.style.display = "block";
      const res = await App.Lens.searchByImage(f);
      renderLensResults(resultsBox, res.results);
    }
  }

  function renderLensResults(box, results) {
    if (!box) return;
    box.innerHTML = results.length ? results.map((r) =>
      '<div class="lens-item" onclick="App.router.go(\'product\',\'' + r.product.id + '\');App.Utils.closeModal()">' +
      '<img src="' + U.esc(r.product.image) + '" onerror="this.onerror=null;this.src=\'' + S.svgProduct("🛍️", "#2e2e2e", "#111111") + '\'">' +
      '<div><b>' + U.esc(r.product.title) + '</b>' +
      '<span>' + U.money(r.product.price) + '</span></div>' +
      '<span class="sim">' + r.similarity + '%</span></div>'
    ).join("") : '<p class="empty">No similar products found. Try another photo.</p>';
  }

  function lensFromProduct(id) {
    const p = S.getProducts().find((x) => x.id === id);
    openLens(p ? p.image : null);
  }

  /* ---------- AI assistant chat widget ---------- */
  let chatOpen = false;

  function toggleChat() {
    if (chatOpen) { closeChat(); return; }
    chatOpen = true;
    const host = document.getElementById("assistant");
    host.classList.add("open");
    if (!document.getElementById("chatLog")) buildChat();
  }

  function buildChat() {
    const host = document.getElementById("assistant");
    host.innerHTML =
      '<div class="chat-head"><span><i class="bi bi-stars"></i> AI Assistant</span>' +
      '<button class="close-x" onclick="App.UI.closeChat()"><i class="bi bi-x-lg"></i></button></div>' +
      '<div class="chat-log" id="chatLog"></div>' +
      '<div class="chat-input">' +
      '<button id="chatImgBtn" title="Ask with a photo"><i class="bi bi-image"></i></button>' +
      '<input id="chatText" placeholder="Ask about a product…">' +
      '<button id="chatSend"><i class="bi bi-send"></i></button>' +
      '</div>' +
      '<input type="file" id="chatImg" accept="image/*" hidden>';
    const log = document.getElementById("chatLog");
    const me = A.current();
    log.innerHTML = botMsg("Hi " + U.esc(me ? me.name.split(" ")[0] : "there") + "! Ask me about any product (e.g. \u201cI forgot that watch I saw\u201d) or upload its photo.");

    const send = async () => {
      const input = document.getElementById("chatText");
      const text = input.value.trim();
      const imgEl = document.getElementById("chatImg");
      const img = imgEl.files[0] ? await U.fileToDataURL(imgEl.files[0]) : null;
      if (!text && !img) return;
      if (text) { addUser(text); input.value = ""; }
      if (img) { addUser("🖼️ [photo]", img); }
      addTyping();
      const reply = await App.AI.askAssistant(text, img);
      removeTyping();
      addBot(reply);
    };
    document.getElementById("chatSend").addEventListener("click", send);
    document.getElementById("chatText").addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
    document.getElementById("chatImgBtn").addEventListener("click", () => document.getElementById("chatImg").click());
    document.getElementById("chatImg").addEventListener("change", send);

    function addUser(t, img) {
      const d = document.createElement("div");
      d.className = "msg user";
      if (img) { const im = document.createElement("img"); im.src = img; d.appendChild(im); }
      else d.textContent = t;
      log.appendChild(d); scrollBottom();
    }
    function addTyping() {
      const d = document.createElement("div");
      d.className = "msg bot typing"; d.id = "typing"; d.textContent = "…";
      log.appendChild(d); scrollBottom();
    }
    function removeTyping() { const t = document.getElementById("typing"); if (t) t.remove(); }
    function addBot(t) {
      const d = document.createElement("div");
      d.className = "msg bot";
      d.textContent = t;
      log.appendChild(d); scrollBottom();
    }
    function botMsg(t) { return '<div class="msg bot">' + U.esc(t) + '</div>'; }
    function scrollBottom() { log.scrollTop = log.scrollHeight; }
  }

  function closeChat() {
    chatOpen = false;
    document.getElementById("assistant").classList.remove("open");
    setTimeout(() => { if (!chatOpen) document.getElementById("assistant").innerHTML = ""; }, 250);
  }

  return { openLens, lensFromProduct, toggleChat, closeChat, renderLensResults };
})();
