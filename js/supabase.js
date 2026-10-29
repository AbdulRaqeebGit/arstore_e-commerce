/* Supabase REST sync using the publishable key.
   Works only after the tables in supabase-schema.sql exist;
   otherwise it silently falls back to the local server store. */
window.App = window.App || {};

App.Supabase = (function () {
  const CFG = (App.CONFIG && App.CONFIG.supabase) || {};
  const baseUrl = (CFG.url || "").replace(/\/+$/, "");
  const key = CFG.publishableKey || "";
  let available = null; // null = unknown, true = works, false = unavailable

  function configured() { return !!(baseUrl && key); }
  function isAvailable() { return available; }

  function headers(extra) {
    const h = {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
    };
    if (extra) Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
    return h;
  }

  async function request(path, opts) {
    if (!configured()) throw new Error("supabase-not-configured");
    const o = opts || {};
    const res = await fetch(baseUrl + "/rest/v1/" + path, {
      method: o.method || "GET",
      headers: headers(o.headers),
      body: o.body,
    });
    if (!res.ok) {
      let text = "";
      try { text = await res.text(); } catch (e) {}
      const err = new Error("supabase-" + res.status);
      err.status = res.status;
      err.body = text;
      err.tableMissing = /PGRST205|Could not find the table|does not exist/i.test(text);
      throw err;
    }
    if (res.status === 204) return null;
    const t = await res.text();
    return t ? JSON.parse(t) : null;
  }

  async function pull() {
    if (!configured()) return null;
    const out = { users: [], products: [], reviews: [], orders: [] };
    const tables = ["users", "products", "reviews", "orders"];
    for (let i = 0; i < tables.length; i++) {
      const t = tables[i];
      try {
        out[t] = (await request(t + "?select=*")) || [];
      } catch (e) {
        if (e.tableMissing || e.status === 404 || e.status === 401) { available = false; return null; }
        throw e;
      }
    }
    available = true;
    return out;
  }

  async function syncTable(table, rows) {
    if (!configured() || available === false) return false;
    try {
      await request(table + "?id=not.is.null", { method: "DELETE", headers: { Prefer: "return=minimal" } });
      if (rows && rows.length) {
        await request(table, { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(rows) });
      }
      available = true;
      return true;
    } catch (e) {
      if (e.tableMissing || e.status === 404 || e.status === 401) available = false;
      return false;
    }
  }

  return { configured: configured, isAvailable: isAvailable, pull: pull, syncTable: syncTable };
})();
