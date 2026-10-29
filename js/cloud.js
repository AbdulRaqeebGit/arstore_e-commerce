/* Image upload.
   1) Upload to our server  -> returns a hosted /uploads/... URL
      (so product photos are NOT stored as local base64).
   2) Fallback: Cloudinary (needs an unsigned upload preset).
   3) Last fallback: local data URL (offline). */
window.App = window.App || {};

App.Cloud = (function () {
  const CONFIG = App.CONFIG.cloudinary;
  const U = App.Utils;

  async function upload(file) {
    const dataUrl = await U.fileToDataURL(file);

    // 1) our server
    try {
      const r = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, data: dataUrl }),
      });
      if (r.ok) {
        const j = await r.json();
        if (j && j.url) return { url: j.url, local: dataUrl };
      }
    } catch (e) { /* offline / file:// */ }

    // 2) Cloudinary (only if a preset is configured)
    if (CONFIG.uploadPreset) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("upload_preset", CONFIG.uploadPreset);
        const resp = await fetch("https://api.cloudinary.com/v1_1/" + CONFIG.cloudName + "/image/upload", {
          method: "POST", body: fd,
        });
        if (resp.ok) {
          const j = await resp.json();
          if (j.secure_url) return { url: j.secure_url, local: dataUrl };
        }
      } catch (e) { /* ignore */ }
    }

    // 3) local fallback
    return { url: dataUrl, local: dataUrl };
  }

  return { upload };
})();
