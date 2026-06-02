import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { PASSWORD_REQUIREMENTS_HINT } from '../validators/password.validators';

/** Muestra error solo tras interacción o tras marcar el formulario al enviar. */
export function isFieldInvalid(control: AbstractControl | null | undefined): boolean {
  return !!(control && control.invalid && (control.dirty || control.touched));
}

export function markFormGroupTouched(form: FormGroup): void {
  form.markAllAsTouched();
  Object.values(form.controls).forEach((control) => {
    if (control instanceof FormGroup) {
      markFormGroupTouched(control);
    }
  });
}

export function getFieldErrorMessage(
  control: AbstractControl | null | undefined,
  fieldLabel?: string,
): string | null {
  if (!control?.errors || !(control.dirty || control.touched)) {
    return null;
  }

  const label = fieldLabel?.trim() || 'Este campo';
  const labelCap = label.charAt(0).toUpperCase() + label.slice(1);
  const e = control.errors;

  if (e['required']) return `${labelCap} es obligatorio.`;
  if (e['email']) return 'Introduce un correo electrónico válido.';
  if (e['strongPassword']) return PASSWORD_REQUIREMENTS_HINT;
  if (e['passwordsMismatch']) return 'Las contraseñas no coinciden.';
  if (e['requiredTrue']) return 'Debes aceptar los términos para continuar.';
  if (e['min']) return `El valor mínimo es ${e['min'].min}.`;
  if (e['max']) return `El valor máximo es ${e['max'].max}.`;
  if (e['minlength']) {
    return `Debe tener al menos ${e['minlength'].requiredLength} caracteres.`;
  }
  if (e['maxlength']) {
    return `No puede superar ${e['maxlength'].requiredLength} caracteres.`;
  }
  if (e['pattern']) return 'El formato no es válido.';

  return 'Valor no válido.';
}

/** Email válido solo si el campo tiene contenido. */
export function optionalEmailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) return null;
    return Validators.email(control);
  };
}
