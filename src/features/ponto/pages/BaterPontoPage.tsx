import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Camera, Check, Clock, Loader2, MapPin, AlertTriangle, RotateCw } from "lucide-react";

import PontoService, { type PontoBatido, type PontoLink } from "@/features/ponto/services/ponto.service";
import { maskCpfCnpj } from "@/shared/validation/masks";
import { cpfValido, soDigitos } from "@/shared/utils/documento";

/**
 * A tela em que o funcionário bate o ponto — sem login.
 *
 * ---------------------------------------------------------------------------
 * Quem abre isto não é usuário do sistema
 * ---------------------------------------------------------------------------
 * Não há sessão, não há menu, não há como navegar para outro lugar. A tela faz
 * uma coisa só, e a pessoa provavelmente está de pé na porta da loja, com uma
 * mão. Por isso os alvos são grandes, o passo é único e cada recusa diz o que
 * fazer em vez de "erro ao registrar".
 *
 * ---------------------------------------------------------------------------
 * A ordem: localização primeiro, foto depois
 * ---------------------------------------------------------------------------
 * A localização é pedida assim que a tela abre, porque é ela que pode recusar
 * a batida — e descobrir que está longe demais DEPOIS de tirar a foto é fazer
 * a pessoa trabalhar para nada. A câmera só é acionada quando já se sabe que o
 * lugar serve.
 */

const ROTULO: Record<PontoBatido["tipo"], string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  INTERVALO_INICIO: "Saída para o intervalo",
  INTERVALO_FIM: "Volta do intervalo",
};

/** Câmera traseira não serve: o ponto quer o rosto de quem está batendo. */
const CAMERA = { video: { facingMode: "user" as const }, audio: false };

const BaterPontoPage = () => {
  const { token = "" } = useParams();

  const [link, setLink] = useState<PontoLink | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroLink, setErroLink] = useState("");

  const [cpf, setCpf] = useState("");
  const [local, setLocal] = useState<{ lat: number; lng: number } | null>(null);
  const [erroLocal, setErroLocal] = useState("");

  const [foto, setFoto] = useState<string | null>(null);
  const [camAberta, setCamAberta] = useState(false);
  const [erroCam, setErroCam] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [batido, setBatido] = useState<PontoBatido | null>(null);

  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  /* ── O link ───────────────────────────────────────────────────────────── */

  useEffect(() => {
    PontoService.abrir(token)
      .then(setLink)
      .catch((e) => setErroLink((e as Error).message))
      .finally(() => setCarregando(false));
  }, [token]);

  /* ── A localização, pedida de saída ───────────────────────────────────── */

  const pedirLocal = () => {
    setErroLocal("");

    if (!navigator.geolocation) {
      setErroLocal("Este aparelho não informa a localização. Use outro para bater o ponto.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => setLocal({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      /* A mensagem separa os dois casos porque as saídas são diferentes:
         negado se resolve na permissão do navegador; indisponível, andando
         alguns passos para fora. */
      (e) => setErroLocal(
        e.code === e.PERMISSION_DENIED
          ? "Você precisa permitir o acesso à localização para bater o ponto."
          : "Não foi possível obter sua localização. Saia de baixo de cobertura e tente de novo.",
      ),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  };

  useEffect(pedirLocal, []);

  /* ── A câmera ─────────────────────────────────────────────────────────── */

  const fecharCamera = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setCamAberta(false);
  };

  /* A câmera é desligada ao sair da tela: deixá-la ligada mantém a luz do
     aparelho acesa e o navegador marcando "em uso" depois do ponto batido. */
  useEffect(() => fecharCamera, []);

  const abrirCamera = async () => {
    setErroCam("");

    try {
      const s = await navigator.mediaDevices.getUserMedia(CAMERA);

      stream.current = s;
      setCamAberta(true);

      /* O `srcObject` é atribuído depois do render que monta o `<video>`. */
      requestAnimationFrame(() => {
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
      });
    } catch {
      setErroCam("Não foi possível abrir a câmera. Autorize o acesso e tente de novo.");
    }
  };

  const capturar = () => {
    const v = video.current;
    if (!v) return;

    const canvas = document.createElement("canvas");

    /* 640px de largura: o suficiente para reconhecer quem bateu, e pequeno o
       bastante para subir numa rede de loja. */
    const escala = 640 / (v.videoWidth || 640);
    canvas.width = 640;
    canvas.height = Math.round((v.videoHeight || 480) * escala);

    canvas.getContext("2d")?.drawImage(v, 0, 0, canvas.width, canvas.height);

    setFoto(canvas.toDataURL("image/jpeg", 0.8));
    fecharCamera();
  };

  /* ── Registrar ────────────────────────────────────────────────────────── */

  const podeBater = Boolean(local) && cpfValido(cpf) && (!link?.exigeFoto || Boolean(foto));

  const bater = async () => {
    if (!local || enviando) return;

    setEnviando(true);
    setErro("");

    try {
      setBatido(await PontoService.bater(token, {
        cpf: soDigitos(cpf),
        latitude: local.lat,
        longitude: local.lng,
        foto,
      }));
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  /* ── Render ───────────────────────────────────────────────────────────── */

  const caixa = "w-full rounded-2xl border border-fg/[0.08] bg-fg/[0.03] px-4 py-3.5 text-[17px] text-ink outline-none transition-colors focus:border-accent/60";

  if (carregando) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-canvas text-mist">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (erroLink || !link) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-canvas px-6 text-center">
        <AlertTriangle className="h-8 w-8 text-warning" />
        <p className="max-w-xs text-[14px] text-mist">{erroLink || "Este link não está mais disponível."}</p>
      </div>
    );
  }

  /* Confirmação: a tela troca de assunto por inteiro. Quem bateu o ponto não
     tem mais nada a fazer aqui, e deixar o formulário à vista convida a bater
     de novo. */
  if (batido) {
    const quando = new Date(batido.momento);

    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-success/15 text-success ring-1 ring-success/30">
          <Check size={38} />
        </span>

        <div>
          <p className="text-[22px] leading-tight text-ink">{ROTULO[batido.tipo]} registrada</p>
          <p className="mt-1 text-[15px] text-mist">{batido.funcionarioNome}</p>
        </div>

        <p className="nums text-[34px] leading-none tracking-tight text-ink">
          {quando.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </p>

        <p className="text-[12.5px] text-faint">
          {quando.toLocaleDateString("pt-BR")} · batida {batido.indice} de {batido.total}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center bg-canvas px-5 py-8">
      <div className="flex w-full max-w-sm flex-col gap-5">

        {/* Identidade da empresa — e nada além dela. Ver a nota do serviço. */}
        <div className="flex flex-col items-center gap-2 text-center">
          {link.logoUrl
            ? <img src={link.logoUrl} alt="" className="h-14 w-14 rounded-2xl object-cover" />
            : <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/[0.14] text-accent-soft"><Clock size={24} /></span>}

          <p className="text-[18px] leading-tight text-ink">{link.empresaNome || "Registro de ponto"}</p>
          <p className="text-[12.5px] text-faint">Informe seu CPF para registrar</p>
        </div>

        {!link.abertaAgora && (
          <p className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/[0.08] px-3.5 py-3 text-[12.5px] leading-[17px] text-warning">
            <AlertTriangle size={15} className="mt-px shrink-0" />
            A loja está fora do horário de funcionamento. O ponto não será aceito agora.
          </p>
        )}

        {!link.cercaConfigurada && (
          <p className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/[0.08] px-3.5 py-3 text-[12.5px] leading-[17px] text-warning">
            <AlertTriangle size={15} className="mt-px shrink-0" />
            A empresa ainda não marcou a localização da loja. Avise o responsável — o ponto não será aceito até lá.
          </p>
        )}

        {/* ---------- CPF ---------- */}
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.08em] text-faint">Seu CPF</span>
          <input
            value={cpf}
            onChange={(e) => setCpf(maskCpfCnpj(e.target.value))}
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            /* 17px: abaixo de 16 o iOS dá zoom sozinho ao focar, e a tela
               inteira salta na cara de quem está batendo o ponto. */
            className={`${caixa} nums tracking-wide`}
          />
        </label>

        {/* ---------- Localização ---------- */}
        <div className="flex items-center gap-2.5 rounded-xl border border-fg/[0.07] bg-fg/[0.02] px-3.5 py-3">
          <MapPin size={16} className={local ? "shrink-0 text-success" : "shrink-0 text-faint"} />

          <span className="min-w-0 flex-1 text-[12.5px] leading-[17px]">
            {local
              ? <span className="text-mist">Localização confirmada</span>
              : <span className="text-faint">{erroLocal || "Obtendo sua localização…"}</span>}
          </span>

          {!local && (
            <button type="button" onClick={pedirLocal} className="focus-ring shrink-0 rounded-lg border border-fg/[0.1] px-2.5 py-1.5 text-[12px] text-mist">
              <RotateCw size={13} />
            </button>
          )}
        </div>

        {/* ---------- Foto ---------- */}
        {link.exigeFoto && (
          <div className="flex flex-col gap-2">
            {camAberta ? (
              <>
                {/* `-scale-x-100`: sem o espelho a pessoa se vê invertida e
                    move a cabeça para o lado errado ao se enquadrar. */}
                <video ref={video} playsInline muted className="aspect-[3/4] w-full -scale-x-100 rounded-2xl bg-fg/[0.06] object-cover" />

                <div className="flex gap-2">
                  <button type="button" onClick={fecharCamera} className="focus-ring flex-1 rounded-xl border border-fg/[0.1] py-3 text-[13px] text-mist">
                    Cancelar
                  </button>
                  <button type="button" onClick={capturar} className="focus-ring flex-[2] rounded-xl bg-accent py-3 text-[13px] text-white">
                    Tirar foto
                  </button>
                </div>
              </>
            ) : foto ? (
              <>
                <img src={foto} alt="Foto do ponto" className="aspect-[3/4] w-full rounded-2xl object-cover" />
                <button type="button" onClick={() => { setFoto(null); void abrirCamera(); }} className="focus-ring rounded-xl border border-fg/[0.1] py-2.5 text-[12.5px] text-mist">
                  Tirar outra
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void abrirCamera()}
                  className="focus-ring flex min-h-[64px] w-full items-center justify-center gap-2.5 rounded-2xl border border-dashed border-fg/[0.14] text-[14px] text-mist transition-colors hover:border-accent/40 hover:text-ink"
                >
                  <Camera size={19} /> Tirar a foto
                </button>
                {erroCam && <p className="text-[12px] text-danger">{erroCam}</p>}
              </>
            )}
          </div>
        )}

        {erro && (
          <p className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/[0.08] px-3.5 py-3 text-[12.5px] leading-[17px] text-danger">
            <AlertTriangle size={15} className="mt-px shrink-0" />
            {erro}
          </p>
        )}

        <button
          type="button"
          onClick={() => void bater()}
          disabled={!podeBater || enviando}
          /* Alvo de 56px: a tela é usada de pé, com uma mão, muitas vezes com
             o aparelho na altura do peito. */
          className="focus-ring flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-accent-soft to-accent text-[16px] text-white shadow-glow transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {enviando ? <Loader2 size={19} className="animate-spin" /> : <Clock size={19} />}
          {enviando ? "Registrando…" : "Bater ponto"}
        </button>

        <p className="text-center text-[11px] leading-[16px] text-faint">
          O horário registrado é o do servidor, não o do seu aparelho.
        </p>
      </div>
    </div>
  );
};

export default BaterPontoPage;
