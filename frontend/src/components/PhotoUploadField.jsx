import { useRef } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { useInventoryApp } from '../app/useInventoryApp.jsx';
import { inventoryApi } from '../services/inventoryApi.js';
import { useMutation } from '@tanstack/react-query';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export default function PhotoUploadField({ label, value, onChange, shape = 'circle', disabled = false }) {
  const { t, pushToast } = useInventoryApp();
  const inputRef = useRef(null);
  const uploadMutation = useMutation({
    mutationFn: (file) => inventoryApi.uploadPhoto(file),
  });
  const uploading = uploadMutation.isPending;

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      pushToast('error', t('photoUpload.title'), t('photoUpload.invalidType'));
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      pushToast('error', t('photoUpload.title'), t('photoUpload.tooLarge'));
      return;
    }

    try {
      const result = await uploadMutation.mutateAsync(file);
      onChange(result.url);
    } catch (error) {
      pushToast('error', t('photoUpload.title'), error?.message || t('photoUpload.uploadFailed'));
    }
  }

  const shapeClass = shape === 'square' ? 'rounded-xl' : 'rounded-full';

  return (
    <div>
      {label ? <span className="label">{label}</span> : null}
      <div className={label ? 'mt-2 flex items-center gap-4' : 'flex items-center gap-4'}>
        <div className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-50 ${shapeClass}`}>
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <Camera size={20} className="text-slate-400" />}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()} disabled={disabled || uploading}>
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            {uploading ? t('photoUpload.uploading') : t('photoUpload.changePhoto')}
          </button>
          {value ? (
            <button
              type="button"
              className="icon-btn text-rose-600 hover:text-rose-700"
              title={t('photoUpload.remove')}
              onClick={() => onChange('')}
              disabled={disabled || uploading}
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
    </div>
  );
}
