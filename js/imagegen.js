/* AI image generation (Pollinations — free, no API key).
   Creates an aesthetic product photo from the product details. */
window.App = window.App || {};

App.ImageGen = (function () {
  function buildPrompt(opts) {
    opts = opts || {};
    const parts = [];
    if (opts.title) parts.push(opts.title);
    if (opts.category) parts.push(opts.category);
    if (opts.description) parts.push(String(opts.description).slice(0, 140));
    parts.push("professional product photography, single product, studio lighting, soft shadows, clean minimal white background, high detail, commercial advertising photo");
    return parts.join(", ");
  }

  function url(prompt, seed) {
    const s = seed || Math.floor(Math.random() * 1000000);
    return "https://image.pollinations.ai/prompt/" + encodeURIComponent(prompt) +
      "?width=768&height=768&nologo=true&seed=" + s;
  }

  async function generate(prompt) {
    const u = url(prompt);
    let dataUrl = null;
    try {
      const r = await fetch(u, { cache: "no-store" });
      if (!r.ok) throw new Error("gen-" + r.status);
      const blob = await r.blob();
      dataUrl = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = rej;
        fr.readAsDataURL(blob);
      });
    } catch (e) {
      /* CORS / offline — the direct URL still renders in an <img> */
    }
    return { url: u, dataUrl: dataUrl, src: dataUrl || u };
  }

  return { buildPrompt, url, generate };
})();
