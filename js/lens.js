/* "Lens" — visual product search.
   Upload/select an image, it finds the most visually similar
   products (colour-based) and, when Gemini is available, uses
   its description too. Works fully offline via palette match. */
window.App = window.App || {};

App.Lens = (function () {
  const U = App.Utils;
  const S = App.Store;
  const AI = App.AI;

  function ensurePalette(product, img) {
    if (product.palette && product.palette.length) return product.palette;
    try {
      return U.extractPalette(img, 24, 4);
    } catch (e) { return null; }
  }

  async function searchByImage(fileOrDataURL) {
    let dataUrl = fileOrDataURL;
    if (typeof fileOrDataURL === "object" && fileOrDataURL.type) {
      dataUrl = await U.fileToDataURL(fileOrDataURL);
    }
    const img = await U.loadImage(dataUrl);
    const pal = U.extractPalette(img, 24, 4);

    const products = S.getProducts();
    // Colour similarity
    const byColor = products.map((p) => {
      const d = p.palette ? U.paletteDistance(pal, p.palette) : 1e9;
      return { product: p, d };
    }).sort((a, b) => a.d - b.d);

    // Gemini text boost (best effort)
    let label = "";
    try {
      label = await AI.callGemini(
        "Name this product photo in 3-5 simple keywords (category and colour). One line only.", dataUrl);
    } catch (e) { /* offline */ }

    if (label) {
      const textScores = AI.localMatch(label, products);
      const boost = {};
      textScores.forEach((r, i) => { boost[r.product.id] = Math.max(0, 4 - i); });
      byColor.forEach((r) => { r.score = r.d - (boost[r.product.id] || 0) * 60; });
    } else {
      byColor.forEach((r) => { r.score = r.d; });
    }

    const results = byColor
      .filter((r) => r.d < 300 || (label && r.score < 0))
      .sort((a, b) => a.score - b.score)
      .slice(0, 8)
      .map((r) => ({ product: r.product, similarity: Math.max(0, Math.round(100 - r.d / 3)) }));

    return { dataUrl, palette: pal, label, results };
  }

  return { searchByImage, ensurePalette };
})();
