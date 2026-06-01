/** Abrir Google Maps con el pin en las coordenadas. */
export function googleMapsPlaceUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** Abrir Google Maps con ruta hacia el destino (ir al sitio). */
export function googleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function googleMapsSearchAddressUrl(parts: {
  direccion?: string;
  localidad?: string;
  provincia?: string;
}): string {
  const q = [parts.direccion, parts.localidad, parts.provincia, 'España']
    .filter(Boolean)
    .join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
