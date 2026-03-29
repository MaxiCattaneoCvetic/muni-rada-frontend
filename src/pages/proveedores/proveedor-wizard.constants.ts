/** Provincias para domicilio fiscal (Argentina). */
export const PROVINCIAS_AR = [
  'Buenos Aires',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Ciudad Autónoma de Buenos Aires',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán',
] as const;

export const CONDICIONES_IVA = [
  'Responsable inscripto',
  'Monotributo',
  'Responsable monotributo',
  'Exento',
  'No responsable / No alcanzado',
  'Sujeto no categorizado',
  'IVA no alcanzado',
  'Consumidor final',
] as const;

const CUIT_DIGITS = /^\d{11}$/;

/** Normaliza a solo dígitos y formatea XX-XXXXXXXX-X si hay 11 dígitos. */
export function formatCuitInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 10) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
}

export function cuitDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function isValidCuitFormat(raw: string): boolean {
  return CUIT_DIGITS.test(cuitDigits(raw));
}
