/** Modo demo: sin pantalla de login; entrada por /demo o selector de rol. */
export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === 'true';
}

export function demoLoginPath(): '/demo' | '/login' {
  return isDemoMode() ? '/demo' : '/login';
}
