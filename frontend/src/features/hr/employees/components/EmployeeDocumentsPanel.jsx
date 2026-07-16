import { useEffect, useRef, useState } from 'react';
import { Download, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { Alert, Select } from '../../../../components/ui.jsx';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { useMutation } from '@tanstack/react-query';
import { useTenantApiQuery } from '../../../../queries/useTenantApiQuery.js';

const DOCUMENT_TYPES = [
  ['NID', 'NID'],
  ['APPOINTMENT_LETTER', 'Appointment Letter'],
  ['CONTRACT', 'Contract'],
  ['OTHER', 'Other'],
];

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename || 'employee-document';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function EmployeeDocumentsPanel({ employeeId }) {
  const { t, confirm, pushToast } = useInventoryApp();
  const inputRef = useRef(null);
  const [documentType, setDocumentType] = useState('NID');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const documentsQuery = useTenantApiQuery({
    scope: 'employee-documents',
    params: { employeeId },
    queryFn: () => inventoryApi.listEmployeeDocuments(employeeId),
    enabled: Boolean(employeeId),
  });
  const uploadMutation = useMutation({
    mutationFn: ({ file, documentType: type, title: documentTitle }) =>
      inventoryApi.uploadEmployeeDocument(employeeId, { file, documentType: type, title: documentTitle }),
  });
  const deleteMutation = useMutation({
    mutationFn: ({ documentId, reason }) => inventoryApi.deleteEmployeeDocument(employeeId, documentId, reason),
  });
  const documents = Array.isArray(documentsQuery.data?.items) ? documentsQuery.data.items : [];
  const loading = documentsQuery.isLoading;
  const uploading = uploadMutation.isPending;
  const loadDocuments = () => documentsQuery.refetch();

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    try {
      await uploadMutation.mutateAsync({ file, documentType, title });
      setTitle('');
      await loadDocuments();
      pushToast('success', t('employees.documents'), t('alerts.created'));
    } catch (err) {
      setError(err?.message || t('alerts.requestFailed'));
    }
  }

  async function handleDownload(document) {
    try {
      const result = await inventoryApi.downloadEmployeeDocument(employeeId, document.id);
      saveBlob(result.blob, result.filename || document.originalFilename);
    } catch (err) {
      pushToast('error', t('employees.documents'), err?.message || t('alerts.requestFailed'));
    }
  }

  async function handleDelete(document) {
    const { confirmed, reason } = await confirm({
      title: t('employees.deleteDocumentTitle'),
      description: t('employees.deleteDocumentConfirm', { name: document.title || document.originalFilename }),
      confirmLabel: t('common.delete'),
      tone: 'rose',
      requireReason: true,
      reasonLabel: t('common.deleteReasonLabel'),
      reasonPlaceholder: t('common.deleteReasonPlaceholder'),
    });
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync({ documentId: document.id, reason });
      await loadDocuments();
      pushToast('success', t('employees.documents'), t('alerts.deleted'));
    } catch (err) {
      pushToast('error', t('employees.documents'), err?.message || t('alerts.requestFailed'));
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-48">
          <label className="label">{t('employees.documentType')}</label>
          <Select className="input" value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
            {DOCUMENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </div>
        <div className="flex-1">
          <label className="label">{t('employees.documentTitle')}</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('employees.documentTitlePlaceholder')} />
        </div>
        <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? t('common.saving') : t('employees.uploadDocument')}
        </button>
        <input ref={inputRef} type="file" className="hidden" accept="application/pdf,image/jpeg,image/png,image/webp,.doc,.docx" onChange={handleFileChange} />
      </div>

      {error ? <div className="mt-3"><Alert type="error">{error}</Alert></div> : null}

      <div className="mt-4 divide-y divide-slate-100 rounded-md border border-slate-100">
        {loading ? (
          <div className="flex items-center gap-2 p-3 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> {t('common.loading')}</div>
        ) : documents.length ? documents.map((document) => (
          <div key={document.id} className="flex items-center gap-3 p-3">
            <FileText size={18} className="text-slate-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{document.title || document.originalFilename}</p>
              <p className="text-xs text-slate-500">{document.documentType} · {Math.ceil((document.fileSize || 0) / 1024)} KB</p>
            </div>
            <button type="button" className="icon-btn" title={t('common.download')} onClick={() => handleDownload(document)}><Download size={16} /></button>
            <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={() => handleDelete(document)}><Trash2 size={16} /></button>
          </div>
        )) : (
          <p className="p-3 text-sm text-slate-500">{t('employees.noDocuments')}</p>
        )}
      </div>
    </div>
  );
}
