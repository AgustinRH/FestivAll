import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync, rmSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import {
  EventImageTipo,
  MAX_GALERIA_IMAGES,
  EVENT_IMAGE_TIPOS,
} from './event-image.types';

const MAX_UPLOAD_BYTES =
  (Number(process.env.EVENT_IMAGE_MAX_UPLOAD_MB) || 30) * 1024 * 1024;
const MAX_STORED_EDGE = Number(process.env.EVENT_IMAGE_MAX_EDGE) || 2560;
const WEBP_QUALITY = Number(process.env.EVENT_IMAGE_WEBP_QUALITY) || 80;

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

@Injectable()
export class EventImageService {
  private readonly logger = new Logger(EventImageService.name);
  private readonly eventosDir: string;
  private readonly publicPrefix = '/uploads/eventos';

  constructor() {
    const root = process.env.UPLOAD_ROOT || join(process.cwd(), 'uploads');
    this.eventosDir = join(root, 'eventos');
    mkdirSync(this.eventosDir, { recursive: true });
  }

  assertTipo(tipo: string): asserts tipo is EventImageTipo {
    if (!EVENT_IMAGE_TIPOS.includes(tipo as EventImageTipo)) {
      throw new BadRequestException('Tipo de imagen no válido');
    }
  }

  assertGaleriaSlot(slot: number): void {
    if (!Number.isInteger(slot) || slot < 0 || slot >= MAX_GALERIA_IMAGES) {
      throw new BadRequestException(
        `La galería admite posiciones del 0 al ${MAX_GALERIA_IMAGES - 1}`,
      );
    }
  }

  isManagedUrl(url: string | null | undefined): boolean {
    return !!url?.startsWith(`${this.publicPrefix}/`);
  }

  eventoDir(eventoId: number): string {
    return join(this.eventosDir, String(eventoId));
  }

  filePath(eventoId: number, tipo: EventImageTipo, slot?: number): string {
    if (tipo === 'galeria') {
      this.assertGaleriaSlot(slot ?? 0);
      return join(this.eventoDir(eventoId), `galeria-${slot}.webp`);
    }
    return join(this.eventoDir(eventoId), `${tipo}.webp`);
  }

  publicUrl(eventoId: number, tipo: EventImageTipo, slot?: number): string {
    if (tipo === 'galeria') {
      return `${this.publicPrefix}/${eventoId}/galeria-${slot}.webp`;
    }
    return `${this.publicPrefix}/${eventoId}/${tipo}.webp`;
  }

  assertValidUpload(file: Express.Multer.File | undefined): void {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Debes enviar un archivo de imagen');
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      const mb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
      throw new BadRequestException(
        `La imagen no puede superar ${mb} MB en la subida`,
      );
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        'Formato no válido. Usa JPG, PNG, WebP o GIF.',
      );
    }
  }

  async save(
    eventoId: number,
    tipo: EventImageTipo,
    file: Express.Multer.File,
    slot?: number,
  ): Promise<string> {
    this.assertValidUpload(file);
    mkdirSync(this.eventoDir(eventoId), { recursive: true });
    const outputPath = this.filePath(eventoId, tipo, slot);

    const meta = await sharp(file.buffer).metadata();
    const originalLabel =
      meta.width && meta.height ? `${meta.width}×${meta.height}` : '?';

    await sharp(file.buffer)
      .rotate()
      .resize(MAX_STORED_EDGE, MAX_STORED_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY, effort: 4, smartSubsample: true })
      .toFile(outputPath);

    const storedBytes = statSync(outputPath).size;
    const url = this.publicUrl(eventoId, tipo, slot);
    this.logger.log(
      `Imagen ${tipo}${tipo === 'galeria' ? `[${slot}]` : ''} evento ${eventoId}: ${originalLabel}, ${this.formatBytes(file.size)} → ${this.formatBytes(storedBytes)} WebP`,
    );
    return url;
  }

  deleteFile(eventoId: number, tipo: EventImageTipo, slot?: number): void {
    const path = this.filePath(eventoId, tipo, slot);
    if (!existsSync(path)) return;
    try {
      unlinkSync(path);
    } catch (err) {
      this.logger.warn(`No se pudo borrar ${path}: ${err}`);
    }
  }

  deleteByUrl(url: string | null | undefined): void {
    if (!url || !this.isManagedUrl(url)) return;
    const nested = url.match(
      /^\/uploads\/eventos\/(\d+)\/(principal|cartelera|galeria-\d+)\.webp$/,
    );
    if (nested) {
      const [, id, name] = nested;
      if (name.startsWith('galeria-')) {
        const slot = +name.replace('galeria-', '');
        this.deleteFile(+id, 'galeria', slot);
      } else {
        this.deleteFile(+id, name as EventImageTipo);
      }
      return;
    }
    const legacy = url.match(/^\/uploads\/eventos\/(\d+)\.webp$/);
    if (legacy) {
      try {
        unlinkSync(join(this.eventosDir, `${legacy[1]}.webp`));
      } catch {
        /* ignore */
      }
    }
  }

  deleteEventoFolder(eventoId: number): void {
    const dir = this.eventoDir(eventoId);
    if (!existsSync(dir)) {
      const legacy = join(this.eventosDir, `${eventoId}.webp`);
      if (existsSync(legacy)) unlinkSync(legacy);
      return;
    }
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch (err) {
      this.logger.warn(`No se pudo borrar carpeta ${dir}: ${err}`);
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
