/* Authentication: signup, login, forgot-password,
   session, role-switch password gate. */
window.App = window.App || {};

App.Auth = (function () {
  const S = App.Store;
  const U = App.Utils;

  const ADMIN_EMAIL = App.CONFIG.admin.email;

  async function signup({ name, email, password, role }) {
    email = String(email || "").trim().toLowerCase();
    if (!name || !email || !password) throw new Error("Please fill all fields.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Invalid email address.");
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");
    if (!role || !["customer", "seller"].includes(role)) role = "customer";
    if (S.findByEmail(email)) throw new Error("An account with this email already exists.");
    if (email === ADMIN_EMAIL) throw new Error("This email is reserved for admin.");

    const salt = U.uid("s");
    const pw = await U.hashPassword(password, salt);
    const user = {
      id: U.uid("u"), name: String(name).trim(), email, role,
      pw, salt, createdAt: Date.now(), phone: "", city: App.CONFIG.maps.defaultCity,
    };
    const users = S.getUsers();
    users.push(user);
    S.saveUsers(users);
    return user;
  }

  async function login(email, password) {
    email = String(email || "").trim().toLowerCase();
    if (!email || !password) throw new Error("Enter email and password.");
    const user = S.findByEmail(email);
    if (!user) throw new Error("No account found with this email.");
    const pw = await U.hashPassword(password, user.salt);
    if (pw !== user.pw) throw new Error("Incorrect password.");
    return createSession(user);
  }

  function createSession(user) {
    const session = {
      userId: user.id, role: user.role, name: user.name, email: user.email,
      loginAt: Date.now(),
    };
    S.setSession(session);
    return session;
  }

  function logout() {
    S.clearSession();
  }

  function current() {
    const s = S.getSession();
    if (!s) return null;
    const u = S.findById(s.userId);
    if (!u) { S.clearSession(); return null; }
    return u;
  }

  /* ---- switch ACCOUNT TYPE (same email, password only) ---- */
  async function changeRole(newRole, password) {
    const me = current();
    if (!me) throw new Error("Please login first.");
    if (["customer", "seller"].indexOf(newRole) < 0) throw new Error("Choose customer or seller.");
    if (!password) throw new Error("Password required.");
    const pw = await U.hashPassword(password, me.salt);
    if (pw !== me.pw) throw new Error("Incorrect password.");
    const users = S.getUsers().map((u) => (u.id === me.id ? Object.assign({}, u, { role: newRole }) : u));
    S.saveUsers(users);
    return createSession(Object.assign({}, me, { role: newRole }));
  }

  /* ---- profile (username, phone, city) ---- */
  function updateProfile(fields) {
    const me = current();
    if (!me) throw new Error("Please login first.");
    const name = String(fields.name || "").trim();
    if (!name) throw new Error("Username cannot be empty.");
    const users = S.getUsers().map((u) => u.id === me.id ? Object.assign({}, u, {
      name: name,
      phone: fields.phone != null ? String(fields.phone).trim() : u.phone,
      city: fields.city != null ? String(fields.city).trim() : u.city,
    }) : u);
    S.saveUsers(users);
    return createSession(S.findById(me.id));
  }

  async function changePassword(currentPw, newPw) {
    const me = current();
    if (!me) throw new Error("Please login first.");
    const ok = await U.hashPassword(currentPw || "", me.salt);
    if (ok !== me.pw) throw new Error("Current password is incorrect.");
    if (!newPw || newPw.length < 6) throw new Error("New password must be at least 6 characters.");
    const salt = U.uid("s");
    const pw = await U.hashPassword(newPw, salt);
    const users = S.getUsers().map((u) => u.id === me.id ? Object.assign({}, u, { salt: salt, pw: pw }) : u);
    S.saveUsers(users);
    return true;
  }

  /* ---- forgot password (offline demo: code shown on-screen) ---- */
  function requestReset(email) {
    email = String(email || "").trim().toLowerCase();
    const user = S.findByEmail(email);
    if (!user) throw new Error("No account found with this email.");
    // 6-digit demo code (normally emailed).
    const code = String(Math.floor(100000 + Math.random() * 900000));
    return { email, code, name: user.name };
  }

  async function resetPassword(email, code, newPassword) {
    email = String(email || "").trim().toLowerCase();
    const user = S.findByEmail(email);
    if (!user) throw new Error("Account not found.");
    if (!code || code.length < 4) throw new Error("Enter the reset code.");
    if (!newPassword || newPassword.length < 6) throw new Error("New password must be at least 6 characters.");
    user.salt = U.uid("s");
    user.pw = await U.hashPassword(newPassword, user.salt);
    const users = S.getUsers().map((u) => (u.id === user.id ? user : u));
    S.saveUsers(users);
    return true;
  }

  return {
    signup, login, logout, current,
    changeRole, updateProfile, changePassword,
    requestReset, resetPassword, ADMIN_EMAIL,
  };
})();
