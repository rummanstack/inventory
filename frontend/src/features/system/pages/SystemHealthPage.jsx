import { useEffect, useState } from 'react';
import { Activity, Clock, Database, Server, Users } from 'lucide-react';
import { Alert, SectionHeader, StatCard, TableSkeleton } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatNumber } from '../../../utils/calculations.js';
import { inventoryApi } from '../../../services/inventoryApi';

function formatUptime(seconds = 0) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

export default function SystemHealthPage() {
  const { t } = useInventoryApp();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      try {
        setLoading(true);
        setError('');
        const result = await inventoryApi.getSystemHealth();
        if (!cancelled) {
          setHealth(result);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <SectionHeader
        eyebrow={t('nav.systemHealth')}
        title={t('systemHealth.title')}
        description={t('systemHealth.description')}
      />

      {error ? (
        <div className="mb-6">
          <Alert type="error">{error}</Alert>
        </div>
      ) : null}

      {loading ? (
        <TableSkeleton rows={4} columns={3} />
      ) : health ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title={t('systemHealth.database')}
              value={health.database.label === 'dev' ? t('systemHealth.dbDev') : t('systemHealth.dbLive')}
              helper={health.database.host}
              icon={Database}
              tone={health.database.label === 'dev' ? 'amber' : 'emerald'}
            />
            <StatCard
              title={t('systemHealth.uptime')}
              value={formatUptime(health.server.uptimeSeconds)}
              helper={`Node ${health.server.nodeVersion}`}
              icon={Clock}
              tone="blue"
            />
            <StatCard
              title={t('systemHealth.environment')}
              value={health.server.nodeEnv || '-'}
              helper={t('systemHealth.environmentHelper')}
              icon={Server}
              tone="slate"
            />
          </div>

          {health.database.usingFallback ? (
            <Alert type="warning">{t('systemHealth.fallbackWarning')}</Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title={t('systemHealth.poolTotal')}
              value={formatNumber(health.pool.total)}
              helper={t('systemHealth.poolHelper')}
              icon={Activity}
              tone="blue"
            />
            <StatCard
              title={t('systemHealth.poolIdle')}
              value={formatNumber(health.pool.idle)}
              helper={t('systemHealth.poolIdleHelper')}
              icon={Activity}
              tone="emerald"
            />
            <StatCard
              title={t('systemHealth.poolWaiting')}
              value={formatNumber(health.pool.waiting)}
              helper={t('systemHealth.poolWaitingHelper')}
              icon={Activity}
              tone="amber"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title={t('systemHealth.tenants')}
              value={formatNumber(health.counts.tenants)}
              helper={t('systemHealth.tenantsHelper')}
              icon={Users}
              tone="blue"
            />
            <StatCard
              title={t('systemHealth.users')}
              value={formatNumber(health.counts.users)}
              helper={t('systemHealth.usersHelper')}
              icon={Users}
              tone="emerald"
            />
            <StatCard
              title={t('systemHealth.activeSessions')}
              value={formatNumber(health.counts.activeSessions)}
              helper={t('systemHealth.activeSessionsHelper')}
              icon={Users}
              tone="amber"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
