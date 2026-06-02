import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-image-carousel',
  standalone: true,
  templateUrl: './image-carousel.component.html',
  styleUrl: './image-carousel.component.scss',
})
export class ImageCarouselComponent implements OnChanges {
  @Input({ required: true }) images: string[] = [];
  @Input() altPrefix = 'Galería';
  @Input() ariaLabel = 'Galería de imágenes';

  activeIndex = 0;
  private touchStartX = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['images']) {
      const max = Math.max(0, this.totalSlides - 1);
      this.activeIndex = Math.min(this.activeIndex, max);
      if (changes['images'].firstChange || this.activeIndex > max) {
        this.activeIndex = 0;
      }
    }
  }

  /** URLs válidas sin duplicados (el total real del carrusel). */
  get slides(): string[] {
    const seen = new Set<string>();
    return this.images.filter((url) => {
      const u = url?.trim();
      if (!u || seen.has(u)) return false;
      seen.add(u);
      return true;
    });
  }

  get totalSlides(): number {
    return this.slides.length;
  }

  get hasMultiple(): boolean {
    return this.totalSlides > 1;
  }

  get slideLabel(): string {
    return `${this.activeIndex + 1} / ${this.totalSlides}`;
  }

  prev(): void {
    if (!this.hasMultiple) return;
    this.activeIndex =
      (this.activeIndex - 1 + this.totalSlides) % this.totalSlides;
  }

  next(): void {
    if (!this.hasMultiple) return;
    this.activeIndex = (this.activeIndex + 1) % this.totalSlides;
  }

  goTo(index: number): void {
    if (index >= 0 && index < this.totalSlides) {
      this.activeIndex = index;
    }
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0]?.clientX ?? 0;
  }

  onTouchEnd(event: TouchEvent): void {
    if (!this.hasMultiple) return;
    const endX = event.changedTouches[0]?.clientX ?? 0;
    const delta = endX - this.touchStartX;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) this.next();
    else this.prev();
  }
}
