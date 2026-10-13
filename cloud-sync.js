(() => {
  "use strict";

  const ADMIN_EMAIL = "order-baju-defile-admin@visualizermaroa.app";
  const BOOTSTRAP_PIN = "1234";
  const passwordFromPin = pin => `OrderBajuDefile!${pin}!2026`;

  const CLOUD = {
    configured: false,
    ready: false,
    admin: false,
    user: null,
    db: null,
    auth: null,
    docRef: null,
    api: null,
    unsub: null,
    saveTimer: null,
    applyingRemote: false,
    lastError: "",
    cloudHasData: false
  };

  const originalSave = save;
  const originalRender = render;
  const originalOpenEdit = openEdit;
  const originalOpenSettings = openSettings;

  function ensureCloudUi() {
    if (document.getElementById("cloudStatusBtn")) return;

    const style = document.createElement("style");
    style.textContent = `
      .cloud-status-btn{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);background:#fff;border-radius:11px;padding:8px 10px;font-size:11px;font-weight:800;color:var(--muted);cursor:pointer;white-space:nowrap}
      .cloud-status-btn .dot{width:8px;height:8px;border-radius:999px;background:#98a6af;box-shadow:0 0 0 3px rgba(152,166,175,.12)}
      .cloud-status-btn.sync{color:#147d5a;border-color:#bfe7d7;background:#f4fbf7}.cloud-status-btn.sync .dot{background:#18a46f;box-shadow:0 0 0 3px rgba(24,164,111,.12)}
      .cloud-status-btn.wait{color:#996600;border-color:#efd89f;background:#fffbf1}.cloud-status-btn.wait .dot{background:#e5a400}
      .cloud-status-btn.err{color:#a33b32;border-color:#ecc6c2;background:#fff7f6}.cloud-status-btn.err .dot{background:#c4483d}
      .cloud-readonly-note{display:none;margin:0 14px 12px;padding:10px 12px;border:1px solid #d8e5ec;background:#f8fbfd;border-radius:12px;color:#55707f;font-size:11px;line-height:1.5}
      body.cloud-readonly .cloud-readonly-note{display:block}
      body.cloud-readonly .edit-row{display:none!important}
      .pin-overlay{position:fixed;inset:0;z-index:9999;background:rgba(9,25,39,.48);display:grid;place-items:center;padding:18px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      .pin-card{width:min(380px,100%);background:#fff;border:1px solid #dbe6ec;border-radius:22px;padding:24px;box-shadow:0 24px 70px rgba(18,59,86,.24)}
      .pin-card h3{margin:0 0 7px;color:#123b56;font-size:20px}.pin-card p{margin:0 0 18px;color:#6d8390;font-size:12px;line-height:1.6}
      .pin-input{width:100%;height:54px;border:1px solid #cfdae1;border-radius:14px;text-align:center;font-size:24px;font-weight:800;letter-spacing:10px;color:#123b56;outline:none}.pin-input:focus{border-color:#1f7a8c;box-shadow:0 0 0 4px rgba(31,122,140,.10)}
      .pin-error{min-height:18px;margin:8px 0 0;color:#b03c32;font-size:11px;text-align:center}
      .pin-actions{display:grid;grid-template-columns:1fr 1.4fr;gap:8px;margin-top:14px}.pin-actions button{min-height:44px;border-radius:12px;border:1px solid #d7e2e8;background:#fff;color:#123b56;font-weight:800;cursor:pointer}.pin-actions .primary{background:#123b56;color:#fff;border-color:#123b56}
      @media(max-width:560px){.cloud-status-btn{padding:8px}.cloud-status-btn .cloud-label{display:none}.pin-card{padding:20px;border-radius:18px}}
    `;
    document.head.appendChild(style);

    const btn = document.createElement("button");
    btn.id = "cloudStatusBtn";
    btn.type = "button";
    btn.className = "cloud-status-btn";
    btn.title = "Status sinkronisasi";
    btn.innerHTML = '<span class="dot"></span><span class="cloud-label" id="cloudStatusText">Lokal</span>';
    btn.addEventListener("click", cloudButtonAction);
    const actions = document.querySelector(".top-actions");
    if (actions) actions.insertBefore(btn, actions.firstChild);

    const note = document.createElement("div");
    note.className = "cloud-readonly-note";
    note.textContent = "Mode publik aktif. Data cloud dapat dilihat realtime; masukkan PIN admin untuk mengubah data.";
    const panel = document.querySelector("main.panel");
    if (panel) panel.insertBefore(note, panel.firstChild);
  }

  function statusView() {
    if (!CLOUD.configured) return ["", "Lokal"];
    if (CLOUD.lastError) return ["err", "Cloud bermasalah"];
    if (!CLOUD.ready) return ["wait", "Menghubungkan…"];
    if (CLOUD.admin) return CLOUD.cloudHasData ? ["sync", "Admin • Sinkron"] : ["wait", "Admin • Menyiapkan"];
    return CLOUD.cloudHasData ? ["sync", "Realtime"] : ["wait", "Cloud belum berisi data"];
  }

  function setCloudUi() {
    ensureCloudUi();
    const [mode, text] = statusView();
    const btn = document.getElementById("cloudStatusBtn");
    const label = document.getElementById("cloudStatusText");
    if (btn) {
      btn.classList.remove("sync", "wait", "err");
      if (mode) btn.classList.add(mode);
      btn.title = CLOUD.admin ? "Mode admin aktif • klik untuk keluar" : (CLOUD.configured ? "Klik untuk masuk dengan PIN admin" : "Sinkronisasi cloud belum dikonfigurasi");
    }
    if (label) label.textContent = text;

    const editable = !CLOUD.configured || CLOUD.admin;
    document.body.classList.toggle("cloud-readonly", CLOUD.configured && !CLOUD.admin);

    const settings = document.getElementById("settingsBtn");
    if (settings) settings.style.display = editable ? "" : "none";

    ["addBtn", "mobileAddBtn"].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.display = "";
      el.title = editable ? "Tambah data" : "Masukkan PIN admin untuk menambah data";
      el.setAttribute("aria-label", el.title);
    });

    document.querySelectorAll(".edit-row").forEach(el => {
      el.style.display = editable ? "" : "none";
    });
  }

  function scheduleCloudSave() {
    if (!CLOUD.configured || !CLOUD.ready || !CLOUD.admin || CLOUD.applyingRemote) return;
    clearTimeout(CLOUD.saveTimer);
    CLOUD.saveTimer = setTimeout(pushCloudState, 250);
  }

  async function pushCloudState() {
    if (!CLOUD.configured || !CLOUD.ready || !CLOUD.admin || !CLOUD.docRef) return;
    try {
      await CLOUD.api.setDoc(CLOUD.docRef, {
        data: data.map(d => ({ ...d })),
        pricing: { ...pricing },
        version: 2,
        updatedAt: CLOUD.api.serverTimestamp(),
        updatedBy: { uid: CLOUD.user?.uid || "", email: CLOUD.user?.email || ADMIN_EMAIL }
      }, { merge: true });
      CLOUD.cloudHasData = true;
      CLOUD.lastError = "";
      setCloudUi();
    } catch (err) {
      console.error("Cloud save failed", err);
      CLOUD.lastError = String(err?.message || err);
      setCloudUi();
      toast("Perubahan tersimpan di perangkat, tetapi gagal dikirim ke cloud.");
    }
  }

  save = function () {
    originalSave();
    scheduleCloudSave();
  };

  render = function () {
    originalRender();
    setCloudUi();
  };

  openEdit = function (id) {
    if (CLOUD.configured && !CLOUD.admin) {
      openPinModal(() => originalOpenEdit(id));
      return;
    }
    return originalOpenEdit(id);
  };

  openSettings = function () {
    if (CLOUD.configured && !CLOUD.admin) {
      openPinModal(() => originalOpenSettings());
      return;
    }
    return originalOpenSettings();
  };

  function openPinModal(afterLogin) {
    if (!CLOUD.configured) {
      toast("Backend Firebase belum dihubungkan.");
      return;
    }
    if (!CLOUD.ready) {
      toast("Koneksi cloud sedang disiapkan.");
      return;
    }
    if (CLOUD.admin) {
      if (typeof afterLogin === "function") afterLogin();
      return;
    }

    const old = document.getElementById("pinOverlay");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.className = "pin-overlay";
    overlay.id = "pinOverlay";
    overlay.innerHTML = `
      <form class="pin-card" id="pinForm">
        <h3>Masuk Admin</h3>
        <p>Masukkan PIN 4 digit untuk menambah, mengubah, menghapus, atau mengatur data.</p>
        <input class="pin-input" id="pinInput" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="one-time-code" aria-label="PIN admin" />
        <div class="pin-error" id="pinError"></div>
        <div class="pin-actions">
          <button type="button" id="pinCancel">Batal</button>
          <button type="submit" class="primary" id="pinSubmit">Masuk</button>
        </div>
      </form>`;
    document.body.appendChild(overlay);

    const input = overlay.querySelector("#pinInput");
    const error = overlay.querySelector("#pinError");
    const submit = overlay.querySelector("#pinSubmit");
    const close = () => overlay.remove();
    overlay.querySelector("#pinCancel").onclick = close;
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    setTimeout(() => input.focus(), 40);

    overlay.querySelector("#pinForm").onsubmit = async e => {
      e.preventDefault();
      const pin = String(input.value || "").trim();
      if (!/^\d{4}$/.test(pin)) {
        error.textContent = "PIN harus 4 digit.";
        return;
      }
      submit.disabled = true;
      submit.textContent = "Memeriksa…";
      error.textContent = "";
      try {
        await loginWithPin(pin);
        close();
        toast("Mode admin aktif.");
        if (typeof afterLogin === "function") setTimeout(afterLogin, 120);
      } catch (err) {
        console.error("PIN login failed", err);
        const code = String(err?.code || "");
        if (code.includes("operation-not-allowed")) error.textContent = "Aktifkan Email/Password di Firebase Authentication terlebih dahulu.";
        else if (code.includes("too-many-requests")) error.textContent = "Terlalu banyak percobaan. Coba beberapa saat lagi.";
        else error.textContent = "PIN salah atau akun admin belum dapat dibuat.";
      } finally {
        submit.disabled = false;
        submit.textContent = "Masuk";
        input.select();
      }
    };
  }

  async function loginWithPin(pin) {
    const password = passwordFromPin(pin);
    try {
      const cred = await CLOUD.api.signInWithEmailAndPassword(CLOUD.auth, ADMIN_EMAIL, password);
      CLOUD.user = cred.user;
      CLOUD.admin = true;
      setCloudUi();
      return cred.user;
    } catch (err) {
      const code = String(err?.code || "");
      const canBootstrap = ["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password"].some(x => code.includes(x));
      if (!canBootstrap || pin !== BOOTSTRAP_PIN) throw err;
      try {
        const created = await CLOUD.api.createUserWithEmailAndPassword(CLOUD.auth, ADMIN_EMAIL, password);
        CLOUD.user = created.user;
        CLOUD.admin = true;
        setCloudUi();
        return created.user;
      } catch (createErr) {
        if (String(createErr?.code || "").includes("email-already-in-use")) {
          const cred = await CLOUD.api.signInWithEmailAndPassword(CLOUD.auth, ADMIN_EMAIL, password);
          CLOUD.user = cred.user;
          CLOUD.admin = true;
          setCloudUi();
          return cred.user;
        }
        throw createErr;
      }
    }
  }

  async function cloudButtonAction() {
    if (!CLOUD.configured) {
      toast("Backend Firebase belum dihubungkan. Data masih lokal.");
      return;
    }
    if (!CLOUD.ready) {
      toast("Koneksi cloud sedang disiapkan.");
      return;
    }
    if (CLOUD.admin) {
      if (confirm("Keluar dari mode admin?")) await CLOUD.api.signOut(CLOUD.auth);
      return;
    }
    openPinModal();
  }

  async function initCloud() {
    ensureCloudUi();
    const cfg = window.ORDER_FIREBASE_CONFIG;
    if (!cfg || !cfg.apiKey || String(cfg.apiKey).includes("GANTI_")) {
      CLOUD.configured = false;
      setCloudUi();
      return;
    }

    CLOUD.configured = true;
    setCloudUi();

    try {
      const appMod = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js");
      const fs = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");
      const au = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js");

      const app = appMod.initializeApp(cfg);
      CLOUD.db = fs.getFirestore(app);
      CLOUD.auth = au.getAuth(app);
      CLOUD.docRef = fs.doc(CLOUD.db, "apps", "order-baju-defile");
      CLOUD.api = { ...fs, ...au };
      CLOUD.ready = true;
      setCloudUi();

      CLOUD.unsub = fs.onSnapshot(CLOUD.docRef, snap => {
        CLOUD.cloudHasData = snap.exists();
        CLOUD.lastError = "";
        if (snap.exists()) {
          const remote = snap.data();
          CLOUD.applyingRemote = true;
          try {
            if (Array.isArray(remote.data) && remote.data.length) {
              data = remote.data.map(d => ({ ...d }));
              normalizeData();
            }
            if (remote.pricing) pricing = { ...DEFAULT_PRICE, ...remote.pricing };
            originalSave();
            originalRender();
          } finally {
            CLOUD.applyingRemote = false;
          }
        }
        setCloudUi();
      }, err => {
        console.error("Firestore listener failed", err);
        CLOUD.lastError = String(err?.message || err);
        setCloudUi();
      });

      au.onAuthStateChanged(CLOUD.auth, async user => {
        CLOUD.user = user || null;
        CLOUD.admin = !!user && user.email === ADMIN_EMAIL;
        CLOUD.lastError = "";
        setCloudUi();

        if (CLOUD.admin) {
          try {
            const stateSnap = await fs.getDoc(CLOUD.docRef);
            CLOUD.cloudHasData = stateSnap.exists();
            if (!stateSnap.exists()) await pushCloudState();
          } catch (err) {
            console.error("Initial cloud state check failed", err);
            CLOUD.lastError = String(err?.message || err);
            setCloudUi();
          }
        }
      });
    } catch (err) {
      console.error("Firebase init failed", err);
      CLOUD.lastError = String(err?.message || err);
      setCloudUi();
      toast("Firebase belum dapat dihubungkan. Aplikasi tetap memakai data lokal.");
    }
  }

  window.orderDefileCloud = {
    get state() {
      return {
        configured: CLOUD.configured,
        ready: CLOUD.ready,
        admin: CLOUD.admin,
        cloudHasData: CLOUD.cloudHasData,
        user: CLOUD.user ? { uid: CLOUD.user.uid, email: CLOUD.user.email } : null,
        lastError: CLOUD.lastError
      };
    },
    syncNow: pushCloudState,
    login: () => openPinModal()
  };

  initCloud();
})();
