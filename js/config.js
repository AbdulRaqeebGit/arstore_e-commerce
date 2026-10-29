/* =========================================================
   ARstore — configuration. Edit credentials here.
   ========================================================= */
window.App = window.App || {};

App.CONFIG = {
  appName: "ARstore",
  tagline: "Buy • Sell • Discover",

  /* Demo products OFF: shop shows only products sellers upload.
     Set to true if you ever want the 24 sample products back. */
  seedDemoProducts: false,

  /* ---------- Admin (hardcoded) ---------- */
  admin: {
    email: "abdulraqeebkumhar7000@gmail.com",
    password: "RaqEEb@7OO",
    name: "Abdul Raqeeb Kumhar",
  },

  /* ---------- Supabase ---------- */
  supabase: {
    url: "https://myslkxzvnnwqhmcgjqel.supabase.co",
    publishableKey: "sb_publishable_JO8GP8k4tVrj4u2dK9RbEA_x1CF61PX",
  },

  /* ---------- Cloudinary (image hosting) ---------- */
  cloudinary: {
    cloudName: "352162861548782",
    uploadPreset: "ml_default",
  },

  /* ---------- Gemini AI ---------- */
gemini: {
  key: "",
  model: "gemini-4-argon",
},

  /* ---------- Maps ---------- */
  maps: {
    provider: "osm", // "osm" | "google"
    googleKey: "",
    defaultCity: "Karachi",
    defaultLat: 24.8607,
    defaultLng: 67.0011,
  },
};
