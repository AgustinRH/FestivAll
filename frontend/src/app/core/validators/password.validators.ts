import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const PASSWORD_REQUIREMENTS_HINT =
  'Mínimo 10 caracteres, con mayúscula, minúscula y número.';

export function isStrongPassword(value: string): boolean {
  if (!value || value.length < 10) return false;
  return /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value);
}

export function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    control.value && !isStrongPassword(control.value) ? { strongPassword: true } : null;
}

/** Comprueba que el valor coincida con otro control del mismo FormGroup. */
export function matchOtherFieldValidator(otherFieldName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const parent = control.parent;
    if (!parent) return null;
    const other = parent.get(otherFieldName);
    if (!other) return null;
    if (!control.value && !other.value) return null;
    return control.value === other.value ? null : { passwordsMismatch: true };
  };
}
