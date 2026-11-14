import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// shortcut: observer global sobre el DOM; si molesta el rendimiento, crear un <Icon aria-hidden> y reemplazar los spans.
const hideIcons = () =>
  document
    .querySelectorAll('.material-symbols-outlined:not([aria-hidden]):not([aria-label])')
    .forEach((el) => el.setAttribute('aria-hidden', 'true'));
new MutationObserver(hideIcons).observe(document.body, { childList: true, subtree: true });
hideIcons();