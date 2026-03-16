import { environment } from 'src/environments/environment';

const BACKEND_PROBE_PATH = '/api/reports/best-sellers';
const BACKEND_PROBE_TIMEOUT_MS = 1500;

export function initializeRuntimeDataMode(): () => Promise<void> {
  return async () => {
    // When mock mode is disabled in config, always keep API mode.
    if (!environment.useMockData) {
      return;
    }

    // Skip probing in non-browser contexts.
    if (typeof window === 'undefined') {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), BACKEND_PROBE_TIMEOUT_MS);

    try {
      const response = await fetch(`${environment.apiUrl}${BACKEND_PROBE_PATH}`, {
        method: 'GET',
        signal: controller.signal,
      });

      // Any HTTP response means backend is reachable, even 401/403/404.
      if (response.status >= 100) {
        environment.useMockData = false;
      }
    } catch {
      // Keep mock mode when backend is unreachable.
      environment.useMockData = true;
    } finally {
      clearTimeout(timer);
    }
  };
}
