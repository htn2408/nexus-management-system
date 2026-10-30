// Báo cáo PDF tóm tắt cho bộ phận Kỹ thuật: số đơn, kết nối, thiết bị, tồn kho và đơn theo trạng thái.
import { orderStatusLabel } from '../types/nexus';

const QUEUE_STATUSES = ['Pending', 'Feasible', 'Not Feasible', 'Connection Provided'];

export async function exportTechnicalReportPdf({ orders, connections, equipments, inventory, language }) {
  const isVi = language === 'vi';
  const [{ jsPDF }, { registerFonts, loadFontBase64, FONT_FAMILY }] = await Promise.all([
    import('jspdf'),
    import('./pdfFonts'),
  ]);
  const pdf = new jsPDF();
  registerFonts(pdf, await loadFontBase64());
  const font = (style, size) => {
    pdf.setFont(FONT_FAMILY, style);
    pdf.setFontSize(size);
  };

  const generatedAt = new Date().toLocaleString(isVi ? 'vi-VN' : 'en-US');
  const labels = isVi
    ? ['Thời gian tạo', 'Đơn hàng', 'Kết nối', 'Thiết bị', 'Tồn kho']
    : ['Generated at', 'Orders', 'Connections', 'Equipment', 'Inventory'];

  pdf.setFillColor(14, 116, 144);
  pdf.rect(0, 0, 210, 34, 'F');
  pdf.setTextColor(255, 255, 255);
  font('bold', 20);
  pdf.text(isVi ? 'BÁO CÁO KỸ THUẬT' : 'TECHNICAL REPORT', 16, 18);
  font('normal', 9);
  pdf.text('NEXUS TELECOM • FIELD ENGINEERING', 16, 27);

  pdf.setTextColor(30, 41, 59);
  font('bold', 11);
  pdf.text(labels[0], 16, 50);
  font('normal', 11);
  pdf.text(generatedAt, 62, 50);

  const values = [orders.length, connections.length, equipments.length, inventory.length];
  labels.slice(1).forEach((label, index) => {
    const x = 16 + index * 46;
    pdf.setFillColor(241, 245, 249);
    pdf.roundedRect(x, 62, 40, 25, 3, 3, 'F');
    font('bold', 8);
    pdf.setTextColor(71, 85, 105);
    pdf.text(label, x + 4, 70);
    font('bold', 16);
    pdf.setTextColor(14, 116, 144);
    pdf.text(String(values[index]), x + 4, 82);
  });

  pdf.setTextColor(30, 41, 59);
  font('bold', 11);
  pdf.text(isVi ? 'Tổng quan hàng đợi kỹ thuật' : 'Technical queue overview', 16, 108);
  font('normal', 10);
  QUEUE_STATUSES.forEach((status, index) => {
    const count = orders.filter((order) => order.status === status).length;
    pdf.text(`${orderStatusLabel(status, language)}: ${count}`, 20, 120 + index * 8);
  });

  pdf.setDrawColor(203, 213, 225);
  pdf.line(16, 158, 194, 158);
  font('normal', 8);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Nexus System • Technical role', 16, 170);
  pdf.save(`technical-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
