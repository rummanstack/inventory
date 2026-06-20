import { useEffect, useMemo, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { buildDailyRows, buildSheetData } from '../../../models/inventoryViewData.js';
import { getCssVar } from '../../../utils/theme.js';

const DAY_SCOPE_PAGE_SIZE = 100;

export function useDailyReportsViewModel({ products, dsrs, today, t, tenantName }) {
  const [date, setDate] = useState(today);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [dayIssues, setDayIssues] = useState([]);
  const [daySettlements, setDaySettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    if (!date) {
      return undefined;
    }

    async function load() {
      try {
        setLoading(true);
        setError('');
        const [issuesResult, settlementsResult] = await Promise.all([
          inventoryApi.listIssues({ dateFrom: date, dateTo: date, pageSize: DAY_SCOPE_PAGE_SIZE }),
          inventoryApi.listSettlements({ dateFrom: date, dateTo: date, pageSize: DAY_SCOPE_PAGE_SIZE }),
        ]);

        if (cancelled) {
          return;
        }

        setDayIssues(issuesResult.items || []);
        setDaySettlements(settlementsResult.items || []);
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message);
          setDayIssues([]);
          setDaySettlements([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [date]);

  const rows = useMemo(() => buildDailyRows({ date, dsrs, issues: dayIssues, settlements: daySettlements, products }), [date, dsrs, dayIssues, daySettlements, products]);
  const totals = rows.reduce(
    (sum, row) => ({
      issuedPieces: sum.issuedPieces + row.issuedPieces,
      returnedPieces: sum.returnedPieces + row.returnedPieces,
      soldPieces: sum.soldPieces + row.soldPieces,
      totalPayable: sum.totalPayable + row.totalPayable,
    }),
    { issuedPieces: 0, returnedPieces: 0, soldPieces: 0, totalPayable: 0 },
  );
  const chartRows = rows
    .filter((row) => row.status !== 'No Issue')
    .sort((a, b) => b.totalPayable - a.totalPayable)
    .slice(0, 6)
    .map((row) => ({
      label: row.dsrName,
      meta: row.area,
      issued: row.issuedPieces,
      returned: row.returnedPieces,
      sold: row.soldPieces,
      totalPayable: row.totalPayable,
    }));
  const reportMix = [
    { label: t('dashboard.completed'), value: rows.filter((row) => row.status === 'Completed').length, color: getCssVar('--success', '#37a864') },
    { label: t('dashboard.pending'), value: rows.filter((row) => row.status === 'Pending').length, color: getCssVar('--warning', '#f8aa17') },
    { label: t('dashboard.noIssue'), value: rows.filter((row) => row.status === 'No Issue').length, color: getCssVar('--muted', '#8c8f9e') },
  ];

  useEffect(() => {
    setSelectedSheet(null);
  }, [date]);

  function viewSheet(row) {
    if (row.status === 'No Issue') {
      return;
    }

    setSelectedSheet(buildSheetData({ date, dsrId: row.dsrId, dsrs, issues: dayIssues, settlements: daySettlements, products, tenantName }));
  }

  return {
    date,
    setDate,
    loading,
    error,
    rows,
    totals,
    chartRows,
    reportMix,
    selectedSheet,
    viewSheet,
  };
}
