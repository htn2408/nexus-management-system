// Font Roboto nhúng vào PDF: font mặc định của jsPDF (Helvetica) không có dấu tiếng Việt.
import fontRegularUrl from './fonts/Roboto-Regular.ttf';
import fontBoldUrl from './fonts/Roboto-Bold.ttf';
export const FONT_FAMILY = 'Roboto';
const FONT_FILE_REGULAR = 'Roboto-Regular.ttf';
const FONT_FILE_BOLD = 'Roboto-Bold.ttf';
// VFS của jsPDF là theo từng document nên cache chuỗi base64 ở mức module,
// mỗi lần build PDF chỉ cần đăng ký lại vào doc mới.
let fontBase64Cache = null;
async function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
export async function loadFontBase64() {
  if (!fontBase64Cache) {
    fontBase64Cache = (async () => {
      const [regularBuffer, boldBuffer] = await Promise.all([
        fetch(fontRegularUrl).then((res) => {
          if (!res.ok) throw new Error(`Không tải được font Roboto-Regular.ttf (${res.status})`);
          return res.arrayBuffer();
        }),
        fetch(fontBoldUrl).then((res) => {
          if (!res.ok) throw new Error(`Không tải được font Roboto-Bold.ttf (${res.status})`);
          return res.arrayBuffer();
        }),
      ]);
      return {
        regular: await arrayBufferToBase64(regularBuffer),
        bold: await arrayBufferToBase64(boldBuffer),
      };
    })();
  }
  return fontBase64Cache;
}
export function registerFonts(doc, fonts) {
  doc.addFileToVFS(FONT_FILE_REGULAR, fonts.regular);
  doc.addFont(FONT_FILE_REGULAR, FONT_FAMILY, 'normal');
  doc.addFileToVFS(FONT_FILE_BOLD, fonts.bold);
  doc.addFont(FONT_FILE_BOLD, FONT_FAMILY, 'bold');
}
