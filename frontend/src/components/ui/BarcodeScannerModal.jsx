import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Flashlight, FlashlightOff, X } from 'lucide-react';
import { useInventoryApp } from '../../app/useInventoryApp.jsx';

// Full-screen camera scanner. Loads @zxing/browser lazily (only when a scan
// is actually opened) since it's a sizeable library that most sessions never
// touch. facingMode: 'environment' asks for the back camera on a phone —
// browsers ignore it harmlessly on a laptop with only a front-facing webcam.
export function BarcodeScannerModal({ onDetected, onClose, title }) {
  const { t } = useInventoryApp();
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const detectedRef = useRef(false);
  const [error, setError] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const zxing = await import('@zxing/browser');
        const reader = new zxing.BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current,
          (result, _err, ctl) => {
            if (cancelled || detectedRef.current || !result) return;
            detectedRef.current = true;
            ctl.stop();
            onDetected(result.getText());
          },
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setTorchSupported(typeof controls.switchTorch === 'function');
      } catch (err) {
        if (cancelled) return;
        setError(
          err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
            ? t('common.scannerPermissionDenied')
            : t('common.scannerStartFailed'),
        );
      }
    }

    start();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  async function toggleTorch() {
    if (!controlsRef.current?.switchTorch) return;
    try {
      await controlsRef.current.switchTorch(!torchOn);
      setTorchOn((value) => !value);
    } catch {
      // Torch control is experimental and unsupported on many devices/browsers — no-op.
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <h2 className="text-base font-semibold">{title || t('common.scannerTitle')}</h2>
        <div className="flex items-center gap-2">
          {torchSupported ? (
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white"
              onClick={toggleTorch}
              title={t('common.scannerToggleTorch')}
            >
              {torchOn ? <Flashlight size={18} /> : <FlashlightOff size={18} />}
            </button>
          ) : null}
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white"
            onClick={onClose}
            title={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-1/3 w-4/5 max-w-sm rounded-2xl border-2 border-white/80" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }} />
        </div>
        {error ? (
          <div className="absolute inset-x-4 bottom-6 rounded-xl bg-rose-600/95 px-4 py-3 text-sm font-medium text-white">{error}</div>
        ) : (
          <p className="absolute inset-x-0 bottom-6 text-center text-sm font-medium text-white/80">{t('common.scannerHint')}</p>
        )}
      </div>
    </div>,
    document.body,
  );
}
