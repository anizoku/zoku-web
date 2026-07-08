import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Service Worker — apenas em produção (build otimizado pelo Vite)
// Em DEV, desregistra SWs stale e limpa caches para evitar servir chunks JS antigos
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
} else if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .then(() => {
        if ('caches' in window) {
          return caches.keys().then((keys) =>
            Promise.all(keys.map((k) => caches.delete(k)))
          );
        }
      })
      .catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)