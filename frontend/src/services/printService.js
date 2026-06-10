export function buildPdfFileName(sheet) {
  const safeName = String(sheet?.dsrName || 'dsr-sheet')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `${safeName || 'dsr-sheet'}-${sheet?.date || 'report'}.pdf`;
}

export async function downloadSheetPdf(targetId, fileName) {
  const element = document.getElementById(targetId);
  if (!element) {
    throw new Error('Printable sheet not found.');
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const { getCssVar } = await import('../utils/theme.js');
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: getCssVar('--surface-white', '#ffffff'),
  });

  const imageData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imageWidth = pageWidth;
  const imageHeight = (canvas.height * imageWidth) / canvas.width;

  let heightLeft = imageHeight;
  let position = 0;

  pdf.addImage(imageData, 'PNG', 0, position, imageWidth, imageHeight, undefined, 'FAST');
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imageHeight;
    pdf.addPage();
    pdf.addImage(imageData, 'PNG', 0, position, imageWidth, imageHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
  }

  pdf.save(fileName);
}
