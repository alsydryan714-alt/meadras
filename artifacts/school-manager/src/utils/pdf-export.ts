import jsPDF from "jspdf";
import { toPng } from "html-to-image";

export async function exportElementToPDF(
  elementId: string,
  filename: string,
  title?: string
): Promise<void> {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`Element #${elementId} not found`);

  // toPng with skipFonts=true avoids CORS SecurityError from cross-origin CSS
  const dataUrl = await toPng(el, {
    quality: 1,
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    skipFonts: true,          // avoids cssRules CORS error
    preferredFontFormat: undefined,
    style: { direction: "rtl", fontFamily: "Tajawal, Arial, sans-serif" },
  });

  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>(res => { img.onload = () => res(); });

  const pdf = new jsPDF({
    orientation: img.width > img.height ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2;
  let yPos = margin;

  if (title) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(10, 36, 99);
    pdf.text(title, pageW / 2, yPos + 6, { align: "center" });
    yPos += 12;
  }

  const imgH = (img.height * usableW) / img.width;
  const availH = usableH - (yPos - margin);

  if (imgH <= availH) {
    pdf.addImage(dataUrl, "PNG", margin, yPos, usableW, imgH);
  } else {
    // Multi-page split
    const scale = usableW / img.width;
    const sliceHPx = availH / scale;
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    const ctx = canvas.getContext("2d")!;
    let srcY = 0;
    let firstPage = true;

    while (srcY < img.height) {
      const thisSlice = Math.min(sliceHPx, img.height - srcY);
      canvas.height = thisSlice;
      ctx.clearRect(0, 0, canvas.width, thisSlice);
      ctx.drawImage(img, 0, -srcY);
      const sliceUrl = canvas.toDataURL("image/png");
      const drawH = thisSlice * scale;

      if (!firstPage) { pdf.addPage(); yPos = margin; }
      pdf.addImage(sliceUrl, "PNG", margin, yPos, usableW, drawH);
      srcY += thisSlice;
      firstPage = false;
    }
  }

  pdf.save(filename);
}

export function buildSubstitutionText(
  date: string,
  absentNames: string[],
  assignments: { period: number; className: string; absentTeacherName: string; substituteTeacherName: string }[]
): string {
  const dayNames: Record<string, string> = {
    "0": "الأحد", "1": "الاثنين", "2": "الثلاثاء", "3": "الأربعاء", "4": "الخميس"
  };
  const d = new Date(date);
  const dayName = dayNames[String(d.getDay())] || date;

  let text = `📅 *جدول حصص الانتظار — ${dayName} ${date}*\n\n`;
  text += `🚫 *الغائبون:*\n${absentNames.map(n => `• ${n}`).join("\n")}\n\n`;
  text += `📋 *التوزيع:*\n`;
  assignments.sort((a, b) => a.period - b.period).forEach(a => {
    text += `• الحصة ${a.period} | فصل ${a.className}\n  👤 ${a.substituteTeacherName} ← بدلاً من ${a.absentTeacherName}\n\n`;
  });
  text += `\n_مدعوم بنظام مدراس للإدارة المدرسية_`;
  return text;
}

export function openWhatsApp(phone: string, text: string) {
  const clean = phone.replace(/[^0-9]/g, "");
  const encoded = encodeURIComponent(text);
  window.open(clean ? `https://wa.me/${clean}?text=${encoded}` : `https://wa.me/?text=${encoded}`, "_blank");
}

export function openWhatsAppNoPhone(text: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}
