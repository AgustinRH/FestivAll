import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { EntradaPerfil } from '../utils/entradas.util';

@Injectable({ providedIn: 'root' })
export class EntradaPdfService {
  async download(entrada: EntradaPerfil, titular?: string): Promise<void> {
    const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;

    const qrDataUrl = await QRCode.toDataURL(entrada.codigoAcceso, {
      width: 280,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0a0a12', light: '#ffffff' },
    });

    const logo = await this.loadImage('/logo-festivall.png');

    // Cabecera
    doc.setFillColor(10, 10, 18);
    doc.rect(0, 0, pageW, 36, 'F');
    doc.setFillColor(232, 93, 59);
    doc.rect(0, 36, pageW, 2, 'F');

    if (logo) {
      doc.addImage(logo, 'PNG', margin, 8, 28, 20);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('FestivAll', logo ? margin + 32 : margin, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Tu entrada digital', logo ? margin + 32 : margin, 25);

    let y = 48;
    doc.setTextColor(20, 20, 28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    const titleLines = doc.splitTextToSize(entrada.eventoTitulo, pageW - margin * 2);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 7 + 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 95);

    const meta: string[] = [];
    if (entrada.categoria) meta.push(entrada.categoria);
    if (entrada.localidad) meta.push(entrada.localidad);
    if (meta.length) {
      doc.text(meta.join(' · '), margin, y);
      y += 6;
    }

    const fecha = this.formatFecha(entrada.fechaCompra);
    doc.text(`Compra: ${fecha}`, margin, y);
    y += 6;

    doc.text(`Precio: ${this.formatPrecio(entrada.precio)}`, margin, y);
    y += 8;

    if (titular?.trim()) {
      doc.setTextColor(20, 20, 28);
      doc.setFont('helvetica', 'bold');
      doc.text('Titular', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(titular.trim(), margin, y);
      y += 10;
    }

    // QR
    const qrSize = 52;
    const qrX = (pageW - qrSize) / 2;
    doc.addImage(qrDataUrl, 'PNG', qrX, y, qrSize, qrSize);
    y += qrSize + 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(232, 93, 59);
    doc.text('Código de acceso', pageW / 2, y, { align: 'center' });
    y += 6;

    doc.setFont('courier', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 28);
    doc.text(entrada.codigoAcceso, pageW / 2, y, { align: 'center' });
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 115);
    const footer =
      'Presenta este PDF o el código QR en el acceso al evento. ' +
      'Cada código es válido para una sola persona.';
    const footerLines = doc.splitTextToSize(footer, pageW - margin * 2);
    doc.text(footerLines, pageW / 2, y, { align: 'center' });

    const fileName = `entrada-${this.sanitizeFileName(entrada.codigoAcceso)}.pdf`;
    doc.save(fileName);
  }

  private formatFecha(iso: string): string {
    try {
      return new Date(iso).toLocaleString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  private formatPrecio(value: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  }

  private sanitizeFileName(code: string): string {
    return code.replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 48);
  }

  private loadImage(url: string): Promise<string | null> {
    return fetch(url)
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (!blob) return null;
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      })
      .catch(() => null);
  }
}
