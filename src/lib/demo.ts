/** Modo demo: sin pantalla de login; entrada por /demo o selector de rol. */
export function isDemoMode(): boolean {
  const v = import.meta.env.VITE_DEMO_MODE;
  return typeof v === 'string' && ['true', '1', 'yes'].includes(v.trim().toLowerCase());
}

export function demoLoginPath(): '/demo' | '/login' {
  return isDemoMode() ? '/demo' : '/login';
}
