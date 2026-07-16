import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App.jsx';
import { loadLanguage, supportedLanguages } from './i18n/translations.js';
import './index.css';
import './mobile.css';

const LANGUAGE_STORAGE_KEY = 'stockledger.language';

function getBootstrapLanguage() {
  const pathname = window.location.pathname;
  if (pathname === '/bn' || pathname.startsWith('/bn/')) return 'bn';

  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return supportedLanguages.includes(stored) ? stored : 'en';
  } catch {
    return 'en';
  }
}

async function bootstrap() {
  await loadLanguage(getBootstrapLanguage());

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

bootstrap().catch((error) => {
  console.error('Failed to load the application language.', error);
  document.getElementById('root').textContent = 'Unable to load the application. Please refresh and try again.';
});
