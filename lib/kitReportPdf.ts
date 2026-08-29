import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface KitReportPdfOptions {
  orientation?: 'portrait' | 'landscape';
  reportTitle: string;
  department?: string;
  year?: string | number;
  section?: string;
  academicYear?: string;
  mentorName?: string;
  mentorEmail?: string;
  totalRecords?: number;
  columns: { header: string; dataKey?: string; width?: number; align?: 'left' | 'center' | 'right' }[];
  data: any[][];
  filename: string;
  extraInfo?: { label: string; value: string }[];
}

/**
 * Loads an image from URL and converts it to Base64 Data URL
 */
async function getBase64ImageFromUrl(imageUrl: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 200;
        canvas.height = img.naturalHeight || img.height || 200;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } catch (e) {
        console.warn('Canvas conversion for KIT logo failed:', e);
        resolve(null);
      }
    };
    img.onerror = () => {
      console.warn('Failed to load KIT logo for PDF generation');
      resolve(null);
    };
    img.src = imageUrl;
  });
}

/**
 * Generates an official KIT college PDF report
 */
export async function generateKitOfficialPdf(options: KitReportPdfOptions): Promise<void> {
  const orientation = options.orientation || 'portrait';
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const isLandscape = orientation === 'landscape';

  // 1. Fetch KIT logo as Data URL
  const logoDataUrl = await getBase64ImageFromUrl('/kit-logo.png');

  // Define brand colors
  const primaryMaroon = [143, 11, 40]; // #8F0B28
  const deepMaroon = [118, 8, 32]; // #760820
  const goldAccent = [217, 119, 6]; // #D97706
  const textDark = [30, 41, 59]; // #1E293B
  const textMuted = [100, 116, 139]; // #64748B
  const borderLight = [226, 232, 240]; // #E2E8F0

  const headerHeight = isLandscape ? 24 : 26;

  const drawHeaderOnPage = (docInstance: jsPDF, pageNum: number) => {
    // Top full-width dark red header
    docInstance.setFillColor(primaryMaroon[0], primaryMaroon[1], primaryMaroon[2]);
    docInstance.rect(0, 0, pageWidth, headerHeight, 'F');

    // Subtle Gold accent line under header
    docInstance.setFillColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    docInstance.rect(0, headerHeight, pageWidth, 1.2, 'F');

    // KIT Logo (circular badge on left)
    if (logoDataUrl) {
      try {
        const logoSize = headerHeight - 6;
        const logoX = 10;
        const logoY = 3;
        // White circular background for crisp contrast
        docInstance.setFillColor(255, 255, 255);
        docInstance.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 'F');
        docInstance.addImage(logoDataUrl, 'PNG', logoX + 0.5, logoY + 0.5, logoSize - 1, logoSize - 1);
      } catch (e) {
        console.warn('Could not draw logo on PDF page:', e);
      }
    }

    // College Title Text in Top Center/Left
    const titleStartX = logoDataUrl ? (isLandscape ? 34 : 34) : 14;
    const centerTitleX = pageWidth / 2 + (logoDataUrl ? 8 : 0);

    docInstance.setTextColor(255, 255, 255);
    docInstance.setFont('helvetica', 'bold');
    docInstance.setFontSize(isLandscape ? 12 : 12.5);
    docInstance.text(
      'KIT - KALAIGNARKARUNANIDHI INSTITUTE OF TECHNOLOGY',
      centerTitleX,
      9,
      { align: 'center' }
    );

    docInstance.setFont('helvetica', 'normal');
    docInstance.setFontSize(isLandscape ? 8 : 8.5);
    docInstance.setTextColor(255, 235, 238);
    docInstance.text(
      'An Autonomous Institution, Coimbatore - 641 402',
      centerTitleX,
      15,
      { align: 'center' }
    );

    docInstance.setFontSize(6.8);
    docInstance.setTextColor(254, 205, 211);
    docInstance.text(
      'Approved by AICTE, New Delhi | Affiliated to Anna University, Chennai | Accredited by NAAC with \'A\' Grade & NBA',
      centerTitleX,
      20,
      { align: 'center' }
    );
  };

  // Draw Page 1 header
  drawHeaderOnPage(doc, 1);

  // 2. Report Title
  const titleY = headerHeight + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isLandscape ? 13 : 13.5);
  doc.setTextColor(primaryMaroon[0], primaryMaroon[1], primaryMaroon[2]);
  doc.text(options.reportTitle.toUpperCase(), pageWidth / 2, titleY, { align: 'center' });

  // Thin underline under title
  const titleWidth = doc.getTextWidth(options.reportTitle.toUpperCase());
  doc.setDrawColor(primaryMaroon[0], primaryMaroon[1], primaryMaroon[2]);
  doc.setLineWidth(0.4);
  doc.line(pageWidth / 2 - titleWidth / 2 - 2, titleY + 1.8, pageWidth / 2 + titleWidth / 2 + 2, titleY + 1.8);

  // 3. Information Meta Box
  const metaBoxY = titleY + 4.5;
  const metaBoxHeight = isLandscape ? 16 : 18;
  const metaMargin = 12;
  const metaBoxWidth = pageWidth - metaMargin * 2;

  // Background frame
  doc.setFillColor(254, 248, 249); // subtle light rose tint
  doc.setDrawColor(245, 206, 214); // soft maroon border
  doc.setLineWidth(0.3);
  doc.roundedRect(metaMargin, metaBoxY, metaBoxWidth, metaBoxHeight, 2, 2, 'FD');

  const currentDateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const academicYearStr = options.academicYear || '2025 - 2026';
  const deptStr = options.department || 'Artificial Intelligence & Data Science';
  const classStr = options.year || options.section ? `Year ${options.year || '—'}  |  Section ${options.section || '—'}` : null;

  doc.setFontSize(8);
  const col1X = metaMargin + 4;
  const col2X = metaMargin + (metaBoxWidth / 2) + 2;

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Department:', col1X, metaBoxY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(deptStr, col1X + 20, metaBoxY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Academic Year:', col2X, metaBoxY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(academicYearStr, col2X + 24, metaBoxY + 5.5);

  // Row 2
  if (classStr) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text('Class / Batch:', col1X, metaBoxY + 11.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(classStr, col1X + 20, metaBoxY + 11.5);
  } else if (options.mentorName) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text('Mentor Name:', col1X, metaBoxY + 11.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(options.mentorName + (options.mentorEmail ? ` (${options.mentorEmail})` : ''), col1X + 22, metaBoxY + 11.5);
  }

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Generated Date:', col2X, metaBoxY + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(currentDateStr, col2X + 24, metaBoxY + 11.5);

  // 4. Student Data Table with AutoTable
  const tableStartY = metaBoxY + metaBoxHeight + 4;
  const headers = options.columns.map((c) => c.header);

  autoTable(doc, {
    startY: tableStartY,
    head: [headers],
    body: options.data,
    theme: 'grid',
    margin: { left: metaMargin, right: metaMargin, bottom: 16 },
    headStyles: {
      fillColor: [primaryMaroon[0], primaryMaroon[1], primaryMaroon[2]],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      minCellHeight: 8,
    },
    bodyStyles: {
      fontSize: 7.2,
      textColor: [30, 41, 59],
      valign: 'middle',
      cellPadding: { top: 2.2, bottom: 2.2, left: 2, right: 2 },
      overflow: 'linebreak',
    },
    alternateRowStyles: {
      fillColor: [254, 250, 251], // clean subtle tint
    },
    columnStyles: {
      0: { fontStyle: 'bold' }, // Student / Candidate name bold
    },
    didParseCell: (data) => {
      // Highlight status fields
      if (data.section === 'body') {
        const val = String(data.cell.raw || '').toLowerCase();
        
        // Success status
        if (
          val.includes('reviewed') ||
          val.includes('completed') ||
          val.includes('verified') ||
          val.includes('active') ||
          val.includes('selected') ||
          val.includes('offered') ||
          val.includes('offer') ||
          val.includes('placed') ||
          val.includes('80%') ||
          val.includes('90%') ||
          val.includes('100%')
        ) {
          data.cell.styles.textColor = [22, 101, 52]; // Dark emerald
          data.cell.styles.fontStyle = 'bold';
        }
        // Warning / Pending status
        else if (
          val.includes('pending') ||
          val.includes('in progress') ||
          val.includes('applied') ||
          val.includes('registered') ||
          val.includes('uploaded') ||
          val.includes('partial')
        ) {
          data.cell.styles.textColor = [180, 83, 9]; // Amber
          data.cell.styles.fontStyle = 'bold';
        }
        // Danger / Missing status
        else if (
          val.includes('missing') ||
          val.includes('not uploaded') ||
          val.includes('rejected') ||
          val.includes('unassigned') ||
          val.includes('failed') ||
          val === 'no' ||
          val === '0%'
        ) {
          data.cell.styles.textColor = [185, 28, 28]; // Maroon/Red
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    didDrawPage: (data) => {
      // Header for subsequent pages
      if (data.pageNumber > 1) {
        drawHeaderOnPage(doc, data.pageNumber);
      }

      // Footer on every page
      const footerY = pageHeight - 8;
      doc.setDrawColor(primaryMaroon[0], primaryMaroon[1], primaryMaroon[2]);
      doc.setLineWidth(0.4);
      doc.line(metaMargin, footerY - 3, pageWidth - metaMargin, footerY - 3);

      doc.setFontSize(6.8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(
        'KIT CareerAI Platform — Placement & Training Cell | Confidential Academic Report',
        metaMargin,
        footerY
      );

      const pageStr = `Page ${data.pageNumber}`;
      doc.setFont('helvetica', 'bold');
      doc.text(pageStr, pageWidth - metaMargin, footerY, { align: 'right' });
    },
  });

  // Save the PDF
  doc.save(options.filename);
}
