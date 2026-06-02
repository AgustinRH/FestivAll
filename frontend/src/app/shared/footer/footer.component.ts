import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  INSTAGRAM_HANDLE,
  INSTAGRAM_LINK_REL,
  INSTAGRAM_URL,
} from '../../core/constants/social-links';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  readonly instagramUrl = INSTAGRAM_URL;
  readonly instagramHandle = INSTAGRAM_HANDLE;
  readonly instagramLinkRel = INSTAGRAM_LINK_REL;
}
