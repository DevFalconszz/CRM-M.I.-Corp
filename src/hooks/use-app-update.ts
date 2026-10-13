import { useEffect } from 'react';

const CHECK_INTERVAL_MS = 60_000;

/**
 * Recarrega a aplicação por completo (equivalente a um Ctrl+Shift+R):
 * limpa o Cache Storage e service workers e força uma navegação sem cache,
 * adicionando um parâmetro volátil para furar qualquer cache intermediário.
 */
async function hardReload() {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
  } catch {
    // Se a limpeza falhar, ainda assim seguimos com o reload abaixo.
  }

  const { origin, pathname, search, hash } = window.location;
  const separator = search ? '&' : '?';
  window.location.replace(`${origin}${pathname}${search}${separator}_v=${Date.now()}${hash}`);
}

/**
 * Verifica periodicamente se há uma nova versão publicada (version.json) e,
 * ao detectar mudança, recarrega a aplicação inteira. Roda apenas em produção.
 */
export function useAppUpdate() {
  useEffect(() => {
    if (!import.meta.env.PROD) return;

    let stopped = false;

    const check = async () => {
      if (stopped) return;
      try {
        const res = await fetch(`/version.json?_=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string };
        // Só recarrega quando a versão publicada é mais nova que a atual. Isso
        // evita loop caso algum cache intermediário ainda sirva um version.json antigo.
        if (data.version && Number(data.version) > Number(__APP_VERSION__)) {
          stopped = true;
          await hardReload();
        }
      } catch {
        // Rede indisponível: tenta novamente no próximo ciclo.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void check();
    };

    void check();
    const intervalId = window.setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
    };
  }, []);
}
