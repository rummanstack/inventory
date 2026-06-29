import { Building2, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { Badge, EmptyState, Modal } from '../../../components/ui.jsx';
import { useManufacturersViewModel } from '../viewmodels/useManufacturersViewModel.js';

const COUNTRIES = [
  'Bangladesh', 'India', 'China', 'USA', 'UK', 'Germany', 'France',
  'Switzerland', 'South Korea', 'Japan', 'Pakistan', 'Other',
];

export default function ManufacturersPage() {
  const { t } = useInventoryApp();
  const vm = useManufacturersViewModel();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('pharmacy.manufacturers')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('pharmacy.manufacturersSubtitle')}</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={vm.openCreate}>
          <Plus className="h-4 w-4" />
          {t('pharmacy.addManufacturer')}
        </button>
      </div>

      {vm.loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      ) : vm.manufacturers.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={t('pharmacy.noManufacturers')}
          description={t('pharmacy.noManufacturersHint')}
          action={{ label: t('pharmacy.addManufacturer'), onClick: vm.openCreate }}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('pharmacy.manufacturerName')}</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('pharmacy.shortName')}</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('pharmacy.country')}</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('pharmacy.dgdaLicense')}</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('common.status')}</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">{t('common.products')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vm.manufacturers.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{m.name}</td>
                  <td className="px-4 py-3 text-slate-600">{m.shortName || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{m.country || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{m.dgdaLicense || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge color={m.status === 'ACTIVE' ? 'green' : 'slate'}>{m.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {m.productCount ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        onClick={() => vm.openEdit(m)}
                        title={t('common.edit')}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        onClick={() => vm.setDeleteTarget(m)}
                        title={t('common.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      {vm.modalOpen && (
        <Modal
          title={vm.editTarget ? t('pharmacy.editManufacturer') : t('pharmacy.addManufacturer')}
          onClose={vm.closeModal}
          size="lg"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">{t('pharmacy.manufacturerName')} *</label>
              <input
                className="input"
                value={vm.form.name}
                onChange={(e) => vm.setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Beximco Pharmaceuticals Ltd."
                autoFocus
              />
            </div>
            <div>
              <label className="label">{t('pharmacy.shortName')}</label>
              <input
                className="input"
                value={vm.form.shortName}
                onChange={(e) => vm.setForm((f) => ({ ...f, shortName: e.target.value }))}
                placeholder="e.g. Beximco"
              />
            </div>
            <div>
              <label className="label">{t('pharmacy.country')}</label>
              <select
                className="input"
                value={vm.form.country}
                onChange={(e) => vm.setForm((f) => ({ ...f, country: e.target.value }))}
              >
                <option value="">{t('common.select')}</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('pharmacy.dgdaLicense')}</label>
              <input
                className="input"
                value={vm.form.dgdaLicense}
                onChange={(e) => vm.setForm((f) => ({ ...f, dgdaLicense: e.target.value }))}
                placeholder="DGDA registration number"
              />
            </div>
            <div>
              <label className="label">{t('pharmacy.phone')}</label>
              <input
                className="input"
                value={vm.form.phone}
                onChange={(e) => vm.setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">{t('pharmacy.address')}</label>
              <textarea
                className="input"
                rows={2}
                value={vm.form.address}
                onChange={(e) => vm.setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">{t('common.status')}</label>
              <select
                className="input"
                value={vm.form.status}
                onChange={(e) => vm.setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button className="btn-secondary" onClick={vm.closeModal} disabled={vm.saving}>
              {t('common.cancel')}
            </button>
            <button className="btn-primary flex items-center gap-2" onClick={vm.save} disabled={vm.saving}>
              {vm.saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('common.save')}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {vm.deleteTarget && (
        <Modal
          title={t('pharmacy.deleteManufacturer')}
          onClose={() => vm.setDeleteTarget(null)}
          size="sm"
        >
          <p className="text-slate-700">
            {t('pharmacy.deleteManufacturerConfirm', { name: vm.deleteTarget.name })}
          </p>
          {vm.deleteTarget.productCount > 0 && (
            <p className="mt-2 rounded-xl bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
              {t('pharmacy.deleteManufacturerHasProducts', { count: vm.deleteTarget.productCount })}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => vm.setDeleteTarget(null)} disabled={vm.saving}>
              {t('common.cancel')}
            </button>
            <button
              className="btn-danger flex items-center gap-2"
              onClick={vm.confirmDelete}
              disabled={vm.saving || vm.deleteTarget.productCount > 0}
            >
              {vm.saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('common.delete')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
