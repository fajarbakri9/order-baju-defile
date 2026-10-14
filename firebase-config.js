// Firebase Web configuration for Order Baju Defile.
// Firebase Web API keys are intended to be used in client-side apps;
// access control is enforced by Firebase Authentication and Firestore Security Rules.
window.ORDER_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAstzKZxnDSJrKc6Sq99hKqT0CQj0Str40",
  authDomain: "visualizermaroa.firebaseapp.com",
  projectId: "visualizermaroa",
  storageBucket: "visualizermaroa.firebasestorage.app",
  messagingSenderId: "201719453198",
  appId: "1:201719453198:web:18a3c2f9bf46fa74cc4e5f"
};

// Mobile UI refinements loaded after the main page is rendered.
(() => {
  const style = document.createElement('style');
  style.id = 'mobile-modal-safe-area-fix';
  style.textContent = `
    @media (max-width: 860px) {
      /* Modal harus selalu berada di atas bottom navigation. */
      .backdrop.open {
        z-index: 180 !important;
        align-items: flex-end !important;
        padding: 8px !important;
        overscroll-behavior: contain;
      }

      /* Saat modal terbuka, bottom nav tidak boleh menutupi tombol aksi modal. */
      body:has(.backdrop.open) .mobile-action-dock {
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
        transform: translateY(120%) !important;
        transition: opacity .18s ease, transform .18s ease, visibility .18s ease;
      }

      .backdrop.open .modal {
        width: 100% !important;
        max-width: 100% !important;
        max-height: calc(100dvh - 16px) !important;
        margin: 0 !important;
        border-radius: 22px 22px 16px 16px !important;
        overflow: auto !important;
        overscroll-behavior: contain;
        box-shadow: 0 -18px 50px rgba(7, 27, 44, .24) !important;
      }

      .backdrop.open .modal-head {
        position: sticky !important;
        top: 0 !important;
        z-index: 5 !important;
        padding: 16px 14px 12px !important;
        background: rgba(255,255,255,.98) !important;
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
      }

      .backdrop.open .modal-body {
        padding: 15px 14px 18px !important;
      }

      .backdrop.open .modal-foot {
        position: sticky !important;
        bottom: 0 !important;
        z-index: 6 !important;
        display: grid !important;
        grid-template-columns: auto minmax(0, 1fr) !important;
        align-items: center !important;
        gap: 10px !important;
        padding: 10px 12px max(12px, env(safe-area-inset-bottom)) !important;
        background: rgba(255,255,255,.98) !important;
        border-top: 1px solid #e3eaf0 !important;
        box-shadow: 0 -12px 28px rgba(17, 43, 66, .08) !important;
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
      }

      .backdrop.open .modal-foot > .right {
        min-width: 0 !important;
        display: grid !important;
        grid-template-columns: auto minmax(145px, 1fr) !important;
        gap: 8px !important;
      }

      .backdrop.open .modal-foot .btn {
        min-height: 46px !important;
        border-radius: 13px !important;
        padding: 10px 12px !important;
        font-size: 12px !important;
        white-space: nowrap !important;
      }

      .backdrop.open #saveBtn,
      .backdrop.open #saveSettings {
        min-width: 145px !important;
        background: linear-gradient(135deg, #0f4c81, #1f7a8c) !important;
        border-color: transparent !important;
        color: #fff !important;
        box-shadow: 0 9px 20px rgba(15, 76, 129, .22) !important;
      }

      /* Toast tetap terlihat saat modal dibuka. */
      .toast {
        z-index: 220 !important;
      }
    }

    @media (max-width: 420px) {
      .backdrop.open {
        padding: 4px !important;
      }

      .backdrop.open .modal {
        max-height: calc(100dvh - 8px) !important;
        border-radius: 20px 20px 12px 12px !important;
      }

      .backdrop.open .modal-foot {
        grid-template-columns: 1fr !important;
      }

      .backdrop.open .modal-foot > .right {
        grid-template-columns: 1fr 1.35fr !important;
      }

      .backdrop.open .modal-foot #deleteBtn {
        width: 100% !important;
        order: 2;
      }

      .backdrop.open .modal-foot .right {
        order: 1;
      }
    }
  `;
  document.head.appendChild(style);
})();
