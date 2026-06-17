export async function downloadExcel(rows, columns, fileName) {
  const { utils, writeFile } = await import('xlsx');

  const header = columns.map((col) => col.label);
  const data = rows.map((row) => columns.map((col) => col.value(row)));

  const worksheet = utils.aoa_to_sheet([header, ...data]);

  const colWidths = columns.map((col) => ({ wch: col.width || 16 }));
  worksheet['!cols'] = colWidths;

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Report');

  writeFile(workbook, fileName);
}
