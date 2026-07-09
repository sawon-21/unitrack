import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Security: Block right-click and certain shortcuts
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('keydown', (e) => {
  if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
    (e.ctrlKey && e.key === 'U')
  ) {
    e.preventDefault();
  }
});

// Non-blocking SW update banner (no confirm() dialog)
let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | undefined;

const updateSW = registerSW({
  onNeedRefresh() {
    // Show a non-blocking update notification via a custom DOM banner
    const banner = document.createElement('div');
    banner.id = 'sw-update-banner';
    banner.style.cssText = `
      position:fixed;bottom:100px;left:50%;transform:translateX(-50%);
      background:#0f172a;border:1px solid rgba(255,255,255,0.08);
      color:#f1f5f9;padding:12px 20px;border-radius:999px;
      display:flex;align-items:center;gap:12px;font-size:13px;font-weight:600;
      z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,0.5);
      backdrop-filter:blur(16px);white-space:nowrap;
    `;
    banner.innerHTML = `
      <span>🔄 New version available</span>
      <button id="sw-update-btn" style="background:#38bdf8;color:#0f172a;border:none;padding:5px 14px;border-radius:999px;cursor:pointer;font-weight:700;font-size:12px;">Update</button>
      <button id="sw-dismiss-btn" style="background:transparent;color:#64748b;border:none;cursor:pointer;font-size:18px;line-height:1;">×</button>
    `;
    document.body.appendChild(banner);

    document.getElementById('sw-update-btn')?.addEventListener('click', () => {
      banner.remove();
      updateSWFn?.(true);
    });
    document.getElementById('sw-dismiss-btn')?.addEventListener('click', () => {
      banner.remove();
    });
  },
  onOfflineReady() {
    console.log('App is ready to work offline');
  },
});

updateSWFn = updateSW;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
