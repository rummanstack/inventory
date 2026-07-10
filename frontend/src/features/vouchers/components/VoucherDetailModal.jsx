import { useEffect, useState } from 'react';
import { Download, Paperclip, Upload } from 'lucide-react';
import { Badge, CopyableText, Modal } from '../../../components/ui.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/calculations.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';

function toneForStatus(status) {
  if (status === 'POSTED') return 'emerald';
  if (status === 'APPROVED') return 'blue';
  if (status === 'SUBMITTED') return 'amber';
  if (status === 'REVERSED') return 'rose';
  return 'slate';
}

export default function VoucherDetailModal({ voucher, onClose, onRefresh }) {
  const { language, pushToast, confirm } = useInventoryApp();
  const [attachments, setAttachments] = useState(voucher.attachments || []);
  const [uploading, setUploading] = useState(false);
  const editableAttachments = ['DRAFT', 'SUBMITTED', 'APPROVED'].includes(voucher.status);

  useEffect(() => {
    setAttachments(voucher.attachments || []);
  }, [voucher]);

  async function reloadAttachments() {
    try {
      const result = await inventoryApi.listVoucherAttachments(voucher.id);
      setAttachments(result.attachments || []);
      onRefresh?.();
    } catch {
      // ignore attachment refresh failures inside the modal
    }
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await inventoryApi.uploadVoucherAttachment(voucher.id, { file, title: file.name });
      await reloadAttachments();
      pushToast('success', 'Voucher Attachment', 'Attachment uploaded.');
    } catch (error) {
      pushToast('error', 'Voucher Attachment', error?.message || 'Failed to upload attachment.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleDeleteAttachment(attachment) {
    const { confirmed, reason } = await confirm({
      title: 'Delete attachment',
      description: `Delete ${attachment.title || attachment.originalFilename}?`,
      confirmLabel: 'Delete',
      tone: 'rose',
      requireReason: true,
      reasonLabel: 'Reason',
      reasonPlaceholder: 'Optional note for the audit trail',
    });
    if (!confirmed) return;
    try {
      await inventoryApi.deleteVoucherAttachment(voucher.id, attachment.id, reason);
      await reloadAttachments();
      pushToast('success', 'Voucher Attachment', 'Attachment deleted.');
    } catch (error) {
      pushToast('error', 'Voucher Attachment', error?.message || 'Failed to delete attachment.');
    }
  }

  return (
    <Modal title={`Voucher ${voucher.voucherNumber}`} description={`${voucher.voucherType} voucher details`} onClose={onClose} width="max-w-5xl">
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Voucher</div>
            <div className="mt-2"><CopyableText value={voucher.voucherNumber} displayValue={voucher.voucherNumber} copyLabel="voucher number" textClassName="font-semibold text-slate-950" /></div>
            <div className="mt-2 text-sm text-slate-500">{formatDate(voucher.voucherDate, language)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Status</div>
            <div className="mt-2"><Badge tone={toneForStatus(voucher.status)}>{voucher.status}</Badge></div>
            <div className="mt-2 text-sm text-slate-500">Created {formatDateTime(voucher.createdAt, language)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Journal Entry</div>
            <div className="mt-2">
              <CopyableText value={voucher.journalEntryId} displayValue={voucher.journalEntryId ? voucher.journalEntryId.slice(0, 16) : '-'} copyLabel="journal entry id" textClassName="font-mono text-sm text-slate-950" />
            </div>
            {voucher.reversalJournalEntryId ? <div className="mt-2"><CopyableText value={voucher.reversalJournalEntryId} displayValue={voucher.reversalJournalEntryId.slice(0, 16)} copyLabel="reversal journal entry id" textClassName="font-mono text-xs text-rose-700" /></div> : null}
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Totals</div>
            <div className="mt-2 text-sm text-slate-700">Debit: {formatCurrency(voucher.totalDebit, language)}</div>
            <div className="text-sm text-slate-700">Credit: {formatCurrency(voucher.totalCredit, language)}</div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Reference</div>
            <div className="mt-2 text-sm text-slate-700">{voucher.referenceNumber || '-'}</div>
            <div className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Counterparty</div>
            <div className="mt-2 text-sm text-slate-700">{voucher.counterpartyName || '-'}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Narration</div>
            <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{voucher.narration || '-'}</div>
            <div className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Notes</div>
            <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{voucher.notes || '-'}</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Account</th>
                <th className="px-4 py-3 text-left">Reference</th>
                <th className="px-4 py-3 text-left">Note</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {voucher.lines.map((line) => (
                <tr key={line.id}>
                  <td className="table-cell">{line.lineNo}</td>
                  <td className="table-cell"><div className="font-semibold text-slate-950">{line.accountCode}</div><div className="text-xs text-slate-500">{line.accountName}</div></td>
                  <td className="table-cell text-sm text-slate-600">{line.referenceType ? `${line.referenceType}: ${line.referenceName || line.referenceId}` : '-'}</td>
                  <td className="table-cell text-sm text-slate-600">{line.note || '-'}</td>
                  <td className="table-cell text-right">{line.side === 'DEBIT' ? formatCurrency(line.amount, language) : '-'}</td>
                  <td className="table-cell text-right">{line.side === 'CREDIT' ? formatCurrency(line.amount, language) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Attachments</div>
              <div className="text-sm text-slate-500">Invoice, slip, cheque, receipt, or supporting document.</div>
            </div>
            <div className="flex items-center gap-2">
              {editableAttachments ? (
                <label className="btn-secondary cursor-pointer">
                  <Upload size={16} />
                  {uploading ? 'Uploading...' : 'Upload'}
                  <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
              ) : null}
              <button type="button" className="btn-secondary" onClick={() => window.print()}>Print</button>
            </div>
          </div>
          {attachments.length ? (
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-medium text-slate-900"><Paperclip size={14} className="text-slate-400" /> {attachment.title || attachment.originalFilename}</div>
                    <div className="mt-1 text-xs text-slate-500">{attachment.originalFilename} • {formatDateTime(attachment.createdAt, language)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn-secondary" onClick={() => inventoryApi.downloadVoucherAttachment(voucher.id, attachment.id)}><Download size={16} /> Download</button>
                    {editableAttachments ? <button type="button" className="btn-secondary text-rose-600" onClick={() => handleDeleteAttachment(attachment)}>Delete</button> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500">No attachments added.</div>
          )}
        </div>
      </div>
    </Modal>
  );
}
