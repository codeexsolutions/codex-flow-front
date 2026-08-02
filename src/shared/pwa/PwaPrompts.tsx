import { useEffect, useState } from "react";
import { Download, RefreshCw, WifiOff, X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Avisos do app instalável, todos discretos e no rodapé.
 *
 * São três coisas que o PWA precisava e não tinha:
 *
 * 1. **Nova versão** — com `skipWaiting` ligado, a troca acontecia sozinha no
 *    meio do uso. Agora o service worker fica esperando e quem decide é o
 *    usuário, pelo botão "Atualizar".
 * 2. **Convite de instalação** — ninguém descobria que dava para instalar.
 * 3. **Aviso de offline** — sem rede o app continua abrindo (o service worker
 *    serve do cache), mas a pessoa precisa saber que os dados podem estar
 *    desatualizados.
 */

/** Evento do Chrome que permite disparar a instalação na hora que quisermos. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISPENSOU_INSTALACAO = "codex-flow-instalacao-dispensada";

const Faixa = ({ icon, texto, acao, onFechar, tom = "accent" }: { icon: React.ReactNode; texto: React.ReactNode; acao?: React.ReactNode; onFechar?: () => void; tom?: "accent" | "warning" }) => (
  <div
    className={`glass-strong elev-3 pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3 ${
      tom === "warning" ? "border-warning/30" : "border-accent/30"
    }`}
  >
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tom === "warning" ? "bg-warning/15 text-warning" : "bg-accent/15 text-accent-soft"}`}>{icon}</span>

    <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-ink">{texto}</p>

    {acao}

    {onFechar && (
      <button type="button" onClick={onFechar} aria-label="Dispensar" className="focus-ring shrink-0 rounded-lg p-1 text-faint transition hover:text-ink">
        <X size={15} />
      </button>
    )}
  </div>
);

const PwaPrompts = () => {
  const {
    needRefresh: [precisaAtualizar, setPrecisaAtualizar],
    updateServiceWorker,
  } = useRegisterSW({
    /*
     * O navegador só procura versão nova quando a página é aberta de novo — e
     * um PWA instalado pode ficar dias sem ser fechado. Sem esta checagem, um
     * deploy seu só chegaria ao cliente quando ele lembrasse de matar o app.
     *
     * Aqui a busca acontece de hora em hora e sempre que a pessoa volta para o
     * app. `cache: "no-store"` porque o próprio sw.js pode estar em cache HTTP,
     * e aí a checagem olharia para a versão antiga.
     */
    onRegisteredSW(url, registro) {
      if (!registro) return;

      const procurar = async () => {
        if (registro.installing || !navigator.onLine) return;

        try {
          const resposta = await fetch(url, { cache: "no-store", headers: { "cache-control": "no-cache" } });
          if (resposta?.status === 200) await registro.update();
        } catch {
          /* Offline ou servidor fora: tenta de novo no próximo ciclo. */
        }
      };

      setInterval(procurar, 60 * 60 * 1000);

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") procurar();
      });
    },
  });

  const [instalavel, setInstalavel] = useState<BeforeInstallPromptEvent | null>(null);
  const [offline, setOffline] = useState(() => !navigator.onLine);

  /* ---------------- Convite de instalação ---------------- */
  useEffect(() => {
    if (localStorage.getItem(DISPENSOU_INSTALACAO)) return;

    const aoPoderInstalar = (e: Event) => {
      // Sem o preventDefault o Chrome mostra o banner dele, na hora dele.
      e.preventDefault();
      setInstalavel(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", aoPoderInstalar);
    window.addEventListener("appinstalled", () => setInstalavel(null));

    return () => window.removeEventListener("beforeinstallprompt", aoPoderInstalar);
  }, []);

  /* ---------------- Estado da conexão ---------------- */
  useEffect(() => {
    const online = () => setOffline(false);
    const caiu = () => setOffline(true);

    window.addEventListener("online", online);
    window.addEventListener("offline", caiu);

    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", caiu);
    };
  }, []);

  const instalar = async () => {
    if (!instalavel) return;
    await instalavel.prompt();
    await instalavel.userChoice;
    setInstalavel(null);
  };

  const dispensarInstalacao = () => {
    localStorage.setItem(DISPENSOU_INSTALACAO, "1");
    setInstalavel(null);
  };

  if (!precisaAtualizar && !instalavel && !offline) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[300] flex flex-col gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:left-auto sm:right-4 sm:w-[380px]">
      {offline && <Faixa tom="warning" icon={<WifiOff size={16} />} texto="Você está sem conexão. O app continua funcionando, mas os dados podem estar desatualizados." />}

      {precisaAtualizar && (
        <Faixa
          icon={<RefreshCw size={16} />}
          texto="Uma nova versão do CodeEx Flow está pronta."
          onFechar={() => setPrecisaAtualizar(false)}
          acao={
            <button type="button" onClick={() => updateServiceWorker(true)} className="focus-ring shrink-0 rounded-xl bg-accent px-3 py-1.5 text-[12px] text-white transition hover:brightness-110">
              Atualizar
            </button>
          }
        />
      )}

      {instalavel && (
        <Faixa
          icon={<Download size={16} />}
          texto="Instale o CodeEx Flow e abra direto da tela de início."
          onFechar={dispensarInstalacao}
          acao={
            <button type="button" onClick={instalar} className="focus-ring shrink-0 rounded-xl bg-accent px-3 py-1.5 text-[12px] text-white transition hover:brightness-110">
              Instalar
            </button>
          }
        />
      )}
    </div>
  );
};

export default PwaPrompts;
