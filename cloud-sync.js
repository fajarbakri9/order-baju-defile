(() => {
  "use strict";

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
    lastError: ""
  };

  const originalSave = save;
  const originalRender = render;
  const originalOpenEdit = openEdit;
  const originalOpenSettings = openSettings;

  function ensureCloudUi() {
    if (!document.getElementById("cloudStatusBtn")) {
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
        @media(max-width:560px){.cloud-status-btn{padding:8px}.cloud-status-btn .cloud-label{display:none}}
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
      note.textContent = "Mode publik aktif. Data tersinkron realtime; perubahan hanya dapat dilakukan oleh admin yang login.";
      const panel = document.querySelector("main.panel");
      if (panel) panel.insertBefore(note, panel.firstChild);
    }
  }

  function setCloudUi(mode, text) {
    ensureCloudUi();
    const btn = document.getElementById("cloudStatusBtn");
    const label = document.getElementById("cloudStatusText");
    if (btn) {
      btn.classList.remove("sync", "wait", "err");
      if (mode) btn.classList.add(mode);
    }
    if (label) label.textContent = text || "Lokal";
    const readonly = CLOUD.configured && !CLOUD.admin;
    document.body.classList.toggle("cloud-readonly", readonly);
    const editable = !CLOUD.configured || CLOUD.admin;
    ["settingsBtn", "addBtn"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = editable ? "" : "none";
    });
    document.querySelectorAll(".edit-row").forEach(el => {
      el.style.display = editable ? "" : "none";
    });
    if (btn && CLOUD.user) {
      btn.title = CLOUD.admin
        ? `Admin: ${CLOUD.user.email || CLOUD.user.displayName || CLOUD.user.uid} • klik untuk keluar`
        : `${CLOUD.user.email || CLOUD.user.displayName || "Akun"} tidak memiliki akses admin`;
    } else if (btn) {
      btn.title = CLOUD.configured ? "Klik untuk login admin" : "Sinkronisasi cloud belum dikonfigurasi";
    }
  }

  function scheduleCloudSave() {
    if (!CLOUD.configured || !CLOUD.ready || !CLOUD.admin || CLOUD.applyingRemote) return;
    clearTimeout(CLOUD.saveTimer);
    setCloudUi("wait", "Menyimpan…");
    CLOUD.saveTimer = setTimeout(pushCloudState, 300);
  }

  async function pushCloudState() {
    if (!CLOUD.configured || !CLOUD.ready || !CLOUD.admin || !CLOUD.docRef) return;
    try {
      await CLOUD.api.setDoc(
        CLOUD.docRef,
        {
          data: data.map(d => ({ ...d })),
          pricing: { ...pricing },
          version: 1,
          updatedAt: CLOUD.api.serverTimestamp(),
          updatedBy: CLOUD.user
            ? {
                uid: CLOUD.user.uid,
                email: CLOUD.user.email || "",
                name: CLOUD.user.displayName || ""
              }
            : null
        },
        { merge: true }
      );
      setCloudUi("sync", "Admin • Sinkron");
    } catch (err) {
      console.error("Cloud save failed", err);
      CLOUD.lastError = String(err?.message || err);
      setCloudUi("err", "Gagal sinkron");
      toast("Perubahan tersimpan di perangkat, tetapi gagal dikirim ke cloud.");
    }
  }

  save = function () {
    originalSave();
    scheduleCloudSave();
  };

  render = function () {
    originalRender();
    setCloudUi(
      CLOUD.configured ? (CLOUD.lastError ? "err" : CLOUD.ready ? "sync" : "wait") : "",
      CLOUD.configured ? (CLOUD.admin ? "Admin • Sinkron" : CLOUD.ready ? "Realtime" : "Menghubungkan…") : "Lokal"
    );
  };

  openEdit = function (id) {
    if (CLOUD.configured && !CLOUD.admin) {
      toast("Login admin diperlukan untuk mengubah data.");
      return;
    }
    return originalOpenEdit(id);
  };

  openSettings = function () {
    if (CLOUD.configured && !CLOUD.admin) {
      toast("Login admin diperlukan untuk mengubah harga.");
      return;
    }
    return originalOpenSettings();
  };

  async function cloudButtonAction() {
    if (!CLOUD.configured) {
      toast("Backend Firebase belum dihubungkan. Data masih tersimpan lokal di perangkat ini.");
      return;
    }
    if (!CLOUD.ready) {
      toast("Koneksi cloud sedang disiapkan.");
      return;
    }
    try {
      if (CLOUD.user) {
        if (CLOUD.admin) {
          if (confirm("Keluar dari mode admin?")) await CLOUD.api.signOut(CLOUD.auth);
        } else {
          toast("Akun ini tidak memiliki hak admin.");
        }
        return;
      }
      const provider = new CLOUD.api.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await CLOUD.api.signInWithPopup(CLOUD.auth, provider);
    } catch (err) {
      console.error("Login failed", err);
      if (String(err?.code || "").includes("popup-closed")) return;
      toast("Login admin gagal. Pastikan Google Sign-In sudah diaktifkan di Firebase.");
    }
  }

  async function initCloud() {
    ensureCloudUi();
    const cfg = window.ORDER_FIREBASE_CONFIG;
    if (!cfg || !cfg.apiKey || String(cfg.apiKey).includes("GANTI_")) {
      CLOUD.configured = false;
      setCloudUi("", "Lokal");
      return;
    }

    CLOUD.configured = true;
    setCloudUi("wait", "Menghubungkan…");

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

      CLOUD.unsub = fs.onSnapshot(
        CLOUD.docRef,
        snap => {
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
              render();
            } finally {
              CLOUD.applyingRemote = false;
            }
          } else if (CLOUD.admin) {
            pushCloudState();
          } else {
            setCloudUi("sync", "Realtime");
          }
        },
        err => {
          console.error("Firestore listener failed", err);
          CLOUD.lastError = String(err?.message || err);
          setCloudUi("err", "Cloud bermasalah");
        }
      );

      au.onAuthStateChanged(CLOUD.auth, async user => {
        CLOUD.user = user || null;
        CLOUD.admin = false;
        CLOUD.lastError = "";
        if (user) {
          try {
            const adminSnap = await fs.getDoc(fs.doc(CLOUD.db, "admins", user.uid));
            CLOUD.admin = adminSnap.exists() && adminSnap.data()?.active !== false;
          } catch (err) {
            console.warn("Admin check failed", err);
          }
        }
        render();
        if (CLOUD.admin) {
          const stateSnap = await fs.getDoc(CLOUD.docRef);
          if (!stateSnap.exists()) await pushCloudState();
        }
      });
    } catch (err) {
      console.error("Firebase init failed", err);
      CLOUD.lastError = String(err?.message || err);
      setCloudUi("err", "Cloud gagal");
      toast("Firebase belum dapat dihubungkan. Aplikasi tetap memakai data lokal.");
    }
  }

  window.orderDefileCloud = {
    get state() {
      return {
        configured: CLOUD.configured,
        ready: CLOUD.ready,
        admin: CLOUD.admin,
        user: CLOUD.user ? { uid: CLOUD.user.uid, email: CLOUD.user.email } : null,
        lastError: CLOUD.lastError
      };
    },
    syncNow: pushCloudState
  };

  initCloud();
})();
