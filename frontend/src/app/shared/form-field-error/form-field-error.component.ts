import { Component, Input } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { getFieldErrorMessage } from '../../core/utils/form-validation.util';

@Component({
  selector: 'app-form-field-error',
  standalone: true,
  template: `@if (message) {
    <p class="field-error" role="alert">{{ message }}</p>
  }`,
  styles: [
    `
      :host {
        display: block;
      }
      .field-error {
        color: #e74c3c;
        font-size: 0.8rem;
        line-height: 1.35;
        margin: 0;
        text-align: left;
      }
    `,
  ],
})
export class FormFieldErrorComponent {
  @Input() control: AbstractControl | null = null;
  @Input() label = '';

  get message(): string | null {
    return getFieldErrorMessage(this.control, this.label);
  }
}
