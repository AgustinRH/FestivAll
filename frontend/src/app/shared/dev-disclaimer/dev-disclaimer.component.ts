import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';

const STORAGE_KEY = 'festivall_dev_disclaimer_accepted';

@Component({
  selector: 'app-dev-disclaimer',
  standalone: true,
  templateUrl: './dev-disclaimer.component.html',
  styleUrl: './dev-disclaimer.component.scss',
})
export class DevDisclaimerComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);

  visible = false;

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.visible = localStorage.getItem(STORAGE_KEY) !== 'true';
    if (this.visible) {
      document.body.style.overflow = 'hidden';
    }
  }

  aceptar() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, 'true');
      document.body.style.overflow = '';
    }
    this.visible = false;
  }
}
