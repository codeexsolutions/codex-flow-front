import { useEffect, useRef, useState } from "react";
import { Eraser, PenLine } from "lucide-react";

/**
 * Campo de assinatura — assina-se com o dedo, o mouse ou a caneta.
 *
 * ---------------------------------------------------------------------------
 * Por que fundo claro no meio de um tema escuro
 * ---------------------------------------------------------------------------
 * O que se desenha aqui vai para um documento em papel branco. Assinar com
 * tinta clara sobre fundo escuro e ver o traço sumir no PDF é a surpresa que
 * faz a pessoa assinar de novo, três vezes, achando que o campo está quebrado.
 * A área de assinatura mostra exatamente o que vai sair impresso.
 *
 * ---------------------------------------------------------------------------
 * Por que PNG transparente, e não uma foto do quadro
 * ---------------------------------------------------------------------------
 * A imagem devolvida tem só o traço; o branco que aparece aqui é do CSS, não
 * do canvas. Assim ela pousa sobre a linha do recibo sem cobrir nada em volta.
 *
 * `touch-action: none` não é detalhe: sem isso o primeiro movimento do dedo
 * rola a página em vez de desenhar, e no celular não se assina nada.
 */

type Props = {
  /** PNG em data URL, ou `null` quando ainda não assinou. */
  valor: string | null;
  onChange: (assinatura: string | null) => void;
  label?: string;
  hint?: string;
};

/* Resolução interna do canvas. O elemento estica por CSS; estes números são
   os do BITMAP, e é deles que sai a nitidez do traço no documento impresso. */
const LARGURA = 900;
const ALTURA = 260;

const AssinaturaPad = ({ valor, onChange, label = "Assinatura", hint }: Props) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const ultimo = useRef<{ x: number; y: number } | null>(null);

  const [temTraco, setTemTraco] = useState(Boolean(valor));

  /* ── O contexto, preparado uma vez ────────────────────────────────────── */

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
  }, []);

  /*
   * Assinatura apagada por fora (troca de competência, recibo novo): o canvas
   * precisa esvaziar junto. Sem isto o traço antigo continua na tela enquanto
   * o formulário já considera o campo vazio — e a pessoa assina por cima.
   */
  useEffect(() => {
    if (valor) return;

    limparCanvas();
    setTemTraco(false);
  }, [valor]);

  const limparCanvas = () => {
    const ctx = canvas.current?.getContext("2d");
    ctx?.clearRect(0, 0, LARGURA, ALTURA);
  };

  /* ── O traço ──────────────────────────────────────────────────────────── */

  /** Coordenada do ponteiro em pixels do BITMAP, não da tela. */
  const ponto = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const area = e.currentTarget.getBoundingClientRect();

    return {
      x: ((e.clientX - area.left) / area.width) * LARGURA,
      y: ((e.clientY - area.top) / area.height) * ALTURA,
    };
  };

  const comecar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    /* Captura o ponteiro: sem isso, sair da área com o dedo apoiado encerra o
       traço no meio e a assinatura fica cortada. */
    e.currentTarget.setPointerCapture(e.pointerId);

    desenhando.current = true;
    ultimo.current = ponto(e);
  };

  const mover = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!desenhando.current) return;

    const ctx = canvas.current?.getContext("2d");
    const de = ultimo.current;
    const para = ponto(e);

    if (!ctx || !de) return;

    ctx.beginPath();
    ctx.moveTo(de.x, de.y);
    ctx.lineTo(para.x, para.y);
    ctx.stroke();

    ultimo.current = para;
    setTemTraco(true);
  };

  const terminar = () => {
    if (!desenhando.current) return;

    desenhando.current = false;
    ultimo.current = null;

    /* O valor sobe no FIM do traço, não a cada pixel: um `setState` por
       `pointermove` re-renderiza o formulário inteiro dezenas de vezes por
       segundo e o traço sai serrilhado no celular. */
    onChange(canvas.current?.toDataURL("image/png") ?? null);
  };

  const limpar = () => {
    limparCanvas();
    setTemTraco(false);
    onChange(null);
  };

  return (
    <div className="flex flex-col">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-[0.08em] text-faint">{label}</span>

        {temTraco && (
          <button
            type="button"
            onClick={limpar}
            className="focus-ring inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] text-mist transition-colors hover:text-danger"
          >
            <Eraser size={12} /> Limpar
          </button>
        )}
      </div>

      <div className="relative overflow-hidden rounded-xl border border-fg/[0.1] bg-neutral-50">
        <canvas
          ref={canvas}
          width={LARGURA}
          height={ALTURA}
          onPointerDown={comecar}
          onPointerMove={mover}
          onPointerUp={terminar}
          onPointerCancel={terminar}
          className="block h-[130px] w-full cursor-crosshair touch-none"
        />

        {/* A linha e a legenda ficam ATRÁS do canvas transparente: servem de
            guia para assinar em cima, como a linha de um papel. */}
        <div className="pointer-events-none absolute inset-x-6 bottom-7 border-t border-neutral-300" />

        {!temTraco && (
          <span className="pointer-events-none absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5 text-[11.5px] text-neutral-400">
            <PenLine size={12} /> Assine aqui com o dedo, o mouse ou a caneta
          </span>
        )}
      </div>

      {hint && <span className="mt-1.5 text-[11px] leading-[15px] text-faint">{hint}</span>}
    </div>
  );
};

export default AssinaturaPad;
