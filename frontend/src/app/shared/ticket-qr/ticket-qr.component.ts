import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import QRCode from 'qrcode';

@Component({
  selector: 'app-ticket-qr',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (dataUrl) {
      <img
        class="ticket-qr-img"
        [src]="dataUrl"
        [width]="size"
        [height]="size"
        [alt]="'Código QR: ' + value"
      />
    } @else if (error) {
      <span class="ticket-qr-fallback" role="status">{{ value }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-block;
      line-height: 0;
    }
    .ticket-qr-img {
      display: block;
      border-radius: 8px;
      background: #fff;
      padding: 4px;
    }
    .ticket-qr-fallback {
      font-size: 0.75rem;
      color: var(--text-muted, #a8a8b8);
    }
  `,
})
export class TicketQrComponent implements OnChanges {
  @Input({ required: true }) value!: string;
  @Input() size = 112;

  dataUrl = '';
  error = false;

  ngOnChanges() {
    this.render();
  }

  private async render() {
    this.dataUrl = '';
    this.error = false;
    const text = this.value?.trim();
    if (!text) return;
    try {
      this.dataUrl = await QRCode.toDataURL(text, {
        width: this.size,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#0a0a12', light: '#ffffff' },
      });
    } catch {
      this.error = true;
    }
  }
}
