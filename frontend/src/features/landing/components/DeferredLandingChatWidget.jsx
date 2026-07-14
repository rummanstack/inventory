import { lazy, Suspense, useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';

const LandingChatWidget = lazy(() => import('./LandingChatWidget.jsx'));

function FallbackLauncher({ t, onActivate }) {
  return (
    <div className="landing-chat-root">
      <button type="button" className="landing-live-chat landing-live-chat-idle" aria-label={t('landing.chat.launch')} onClick={onActivate}>
        <MessageCircle size={18} />
        <span className="hidden sm:inline">{t('landing.chat.launch')}</span>
      </button>
    </div>
  );
}

export default function DeferredLandingChatWidget({ t }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const enable = () => setEnabled(true);
    const idleId = window.setTimeout(enable, 1800);

    window.addEventListener('pointerdown', enable, { once: true });
    window.addEventListener('keydown', enable, { once: true });
    window.addEventListener('scroll', enable, { once: true, passive: true });

    return () => {
      window.clearTimeout(idleId);
      window.removeEventListener('pointerdown', enable);
      window.removeEventListener('keydown', enable);
      window.removeEventListener('scroll', enable);
    };
  }, []);

  if (!enabled) {
    return <FallbackLauncher t={t} onActivate={() => setEnabled(true)} />;
  }

  return (
    <Suspense fallback={<FallbackLauncher t={t} onActivate={() => setEnabled(true)} />}>
      <LandingChatWidget t={t} />
    </Suspense>
  );
}
