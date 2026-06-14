import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { Alert, Badge, EmptyState } from './ui.jsx';
import { useInventoryApp } from '../app/useInventoryApp.jsx';
import { inventoryApi } from '../services/inventoryApi';
import { formatDateTime } from '../utils/calculations.js';
import { actionTone } from '../models/inventoryViewData.js';

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

export default function AuditHistory({ entityType, entityId }) {
  const { t } = useInventoryApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    if (!entityType || !entityId) {
      setItems([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError('');
    inventoryApi
      .getEntityAuditHistory(entityType, entityId)
      .then((result) => {
        if (!cancelled) {
          setItems(result.items || []);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [entityType, entityId]);

  if (loading) {
    return <p className="text-sm font-medium text-slate-500">{t('auditHistory.loading')}</p>;
  }

  if (error) {
    return <Alert type="error">{error}</Alert>;
  }

  if (!items.length) {
    return <EmptyState title={t('auditHistory.empty')} description="" icon={History} />;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-700">{t('auditHistory.title')}</h3>
      <div className="space-y-2">
        {items.map((item) => {
          const fields = Object.keys(item.afterData || {});
          return (
            <div key={item.id} className="rounded-[18px] border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge tone={actionTone(item.actionType)}>{item.actionType}</Badge>
                  <span className="text-sm font-semibold text-slate-700">{item.userName || '-'}</span>
                </div>
                <span className="text-xs font-semibold text-slate-500">{formatDateTime(item.createdAt)}</span>
              </div>
              {fields.length ? (
                <ul className="mt-2 space-y-1">
                  {fields.map((field) => (
                    <li key={field} className="text-xs text-slate-600">
                      <span className="font-bold">{field}</span>: {formatValue(item.beforeData?.[field])} → {formatValue(item.afterData?.[field])}
                    </li>
                  ))}
                </ul>
              ) : null}
              {item.reason ? (
                <p className="mt-2 text-xs font-medium text-slate-600">
                  <span className="font-bold">{t('activityLogs.reason')}:</span> {item.reason}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
