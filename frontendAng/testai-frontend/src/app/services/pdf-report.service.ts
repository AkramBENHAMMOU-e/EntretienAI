import { Injectable } from '@angular/core';
// pdfmake is dynamically imported when needed to avoid SSR/CommonJS issues

export interface ReportMeta {
  title?: string;
  company?: string;
  candidate?: string;
  role?: string;
  date?: string; // ISO string
}

@Injectable({ providedIn: 'root' })
export class PdfReportService {
  constructor() {}

  async downloadFromMarkdown(markdown: string, meta: ReportMeta = {}, filename = 'interview_report.pdf') {
    const [{ default: pdfMake }, { default: pdfFonts }] = await Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts')
    ]);

    // Robust VFS attach (support both pdfFonts.vfs and pdfFonts.pdfMake.vfs)
    const vfs = (pdfFonts as any).pdfMake?.vfs || (pdfFonts as any).vfs;
    if (!(pdfMake as any) || !vfs) {
      throw new Error('pdfmake or fonts not loaded');
    }
    (pdfMake as any).vfs = vfs;

    const docDef = this.buildDocFromMarkdown(markdown, meta);

    // Use getBlob to ensure download works reliably across browsers
    await new Promise<void>((resolve, reject) => {
      try {
        (pdfMake as any).createPdf(docDef).getBlob((blob: Blob) => {
          try {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  private buildDocFromMarkdown(md: string, meta: ReportMeta) {
    const styles: any = {
      h1: { fontSize: 20, bold: true, color: '#2F3A56', margin: [0, 8, 0, 6] },
      h2: { fontSize: 16, bold: true, color: '#2F3A56', margin: [0, 8, 0, 4] },
      h3: { fontSize: 13, bold: true, color: '#2F3A56', margin: [0, 6, 0, 3] },
      p: { fontSize: 10, lineHeight: 1.25, color: '#333', margin: [0, 2, 0, 2] },
      small: { fontSize: 8, color: '#666' },
      chip: { fontSize: 9, color: '#fff', margin: [0, 0, 8, 0] },
      dividerTitle: { fontSize: 11, bold: true, color: '#3A3F63' },
    };

    const header = (currentPage: number, pageCount: number) => ({
      margin: [40, 15, 40, 0],
      columns: [
        { text: 'TestAI', style: 'h2' },
        { text: meta.title || 'Rapport d\'entretien', alignment: 'right', style: 'small' }
      ]
    });

    const footer = (currentPage: number, pageCount: number) => ({
      margin: [40, 0, 40, 15],
      columns: [
        { text: meta.company ? `Confidentiel • ${meta.company}` : 'Confidentiel • TestAI', style: 'small' },
        { text: `Page ${currentPage} / ${pageCount}`, alignment: 'right', style: 'small' }
      ]
    });

    const content: any[] = [];

    // Cover block / meta summary
    const dateStr = meta.date ? new Date(meta.date).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
    content.push(
      { text: meta.company || 'TestAI', style: 'h1' },
      { text: meta.role ? `Poste: ${meta.role}` : '', style: 'p' },
      { text: meta.candidate ? `Candidat: ${meta.candidate}` : '', style: 'p' },
      { text: `Date: ${dateStr}`, style: 'p' },
      { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#E7EAF3' }], margin: [0, 8, 0, 12] }
    );

    // Parse Markdown (basic): headings, bullets, paragraphs
    const lines = md.split(/\r?\n/);
    let ulBuffer: string[] = [];

    const flushUl = () => {
      if (ulBuffer.length) {
        content.push({ ul: ulBuffer.map(t => ({ text: t, style: 'p' })), margin: [0, 2, 0, 6] });
        ulBuffer = [];
      }
    };

    for (const raw of lines) {
      const line = raw.trimEnd();
      if (!line.trim()) { flushUl(); content.push({ text: ' ', style: 'p' }); continue; }
      if (line.startsWith('### ')) { flushUl(); content.push({ text: line.slice(4), style: 'h3' }); continue; }
      if (line.startsWith('## ')) { flushUl(); content.push({ text: line.slice(3), style: 'h2' }); continue; }
      if (line.startsWith('# ')) { flushUl(); content.push({ text: line.slice(2), style: 'h1' }); continue; }
      if (line.startsWith('- ') || line.match(/^\d+\.\s/)) { ulBuffer.push(line.replace(/^(-|\d+\.)\s/, '')); continue; }
      // Key insight box heuristics
      if (line.toLowerCase().includes('recommandation') || line.toLowerCase().includes('conclusion')) {
        flushUl();
        content.push({
          table: {
            widths: ['*'],
            body: [[{ text: line, style: 'dividerTitle' }]]
          },
          layout: { hLineColor: '#E7EAF3', vLineColor: '#E7EAF3' },
          margin: [0, 8, 0, 4]
        });
        continue;
      }
      // default paragraph
      flushUl();
      content.push({ text: line, style: 'p' });
    }
    flushUl();

    const docDefinition = {
      info: { title: meta.title || 'Rapport TestAI' },
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 40],
      header,
      footer,
      content,
      styles
    };

    return docDefinition;
  }
}

