import { getCssVar } from './theme.js';

function getSeriesColors() {
  const secondary = getCssVar('--secondary', '#5e5b8e');
  const success = getCssVar('--success', '#37a864');
  return [success, secondary];
}

export function toBarChartData(items = [], { labelField, valueField, metaFields = [] }) {
  const colors = getSeriesColors();
  return items.map((item, index) => ({
    label: item[labelField],
    value: Number(item[valueField] || 0),
    meta: metaFields.map((field) => item[field]).find(Boolean) || '',
    color: colors[index % colors.length],
  }));
}
