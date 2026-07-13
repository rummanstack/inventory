import { useState } from 'react';
import { Alert, Modal, Select } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import PhotoUploadField from '../../../components/PhotoUploadField.jsx';

const DOCUMENT_TYPES = ['NATIONAL_ID', 'CUSTOMER_PHOTO', 'GUARANTOR_PHOTO', 'SIGNED_AGREEMENT', 'INCOME_PROOF', 'OTHER'];

export default function DocumentFormModal({ onClose, onSave }) {
  const { t } = useInventoryApp();
  const [documentType, setDocumentType] = useState('NATIONAL_ID');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submitForm(event) {
    event.preventDefault();
    setError('');

    if (!url) {
      setError(t('installments.documents.validation.imageRequired'));
      return;
    }

    setSaving(true);
    const result = await onSave({ documentType, url });
    setSaving(false);
    if (!result?.ok) {
      setError(result?.message || t('installments.documents.saveFailed'));
    }
  }

  return (
    <Modal title={t('installments.documents.add')} description={t('installments.documents.imagesOnly')} onClose={onClose} width="max-w-lg">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div>
          <label className="label">{t('installments.documents.type')}</label>
          <Select className="input" value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
            {DOCUMENT_TYPES.map((value) => (
              <option key={value} value={value}>{t(`installments.documents.types.${value}`)}</option>
            ))}
          </Select>
        </div>
        <PhotoUploadField label={t('installments.documents.uploadImage')} value={url} onChange={setUrl} shape="square" />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button>
        </div>
      </form>
    </Modal>
  );
}
