import { useEffect, useRef, useState } from "react";
import { Download, FileImage, FileText, Loader2, Check } from "lucide-react";

import { gerarBlobNota } from "@/shared/ui/DownloadButton";
import { baixarNotaPdf } from "@/shared/ui/downloadNota";

/**
 * Menu de download de um documento (nota/orçamento).
 *
 * Gera o PNG uma única vez e baixa como imagem ou cola no PDF. O nome da
 * empresa aparece no arquivo (ex.: `nota-loja-da-maria.pdf`).
 */
type Props = {
  /** Ref do nó a rasterizar (a nota em si). */
  refNota: React.RefObject<HTMLDivElement>;
  /** Nome da empresa, para o nome do arquivo. */
  nomeEmpresa?: string;
  /** Rótulo do documento (ex.: "nota", "orcamento"). */
  prefixo?: string;
  /** Título do arquivo (ex.: "nota"). */
  titulo?: string;
};

const MenuDownloadNota = ({ refNota, nomeEmpresa = "nota", prefixo = "nota", titulo = "Baixar documento" }: Props) => {
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState<null | "png" | "pdf">(null);
  const [sucesso, setSucesso] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /* Clique fora e Esc fecham o menu. */
  useEffect(() => {
    if (!aberto) return;

    const aoClicar = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setAberto(false);
    };
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };

    document.addEventListener("mousedown", aoClicar);
    document.addEventListener("keydown", aoTeclar);

    return () => {
      document.removeEventListener("mousedown", aoClicar);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  const baixar = async (formato: "png" | "pdf") => {
    if (ocupado) return;

    setOcupado(formato);
    setAberto(false);

    try {
      const blob = await gerarBlobNota(refNota);

      if (formato === "png") {
        await baixarArquivo(blob, `${prefixo}-${nomeEmpresa}.png`);
      } else {
        await baixarNotaPdf(blob, nomeEmpresa);
      }

      setSucesso(true);
      setTimeout(() => setSucesso(false), 2000);
    } catch (err) {
      console.error("Erro ao baixar", err);
    } finally {
      setOcupado(null);
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        title={titulo}
        aria-label={titulo}
        onClick={() => setAberto((v) => !v)}
        className="flex h-12 shrink-0 items-center gap-2 rounded-xl border border-fg/[0.1] px-3 text-mist transition-colors hover:border-accent/40 hover:text-accent-soft"
      >
        {ocupado ? <Loader2 size={17} className="animate-spin" /> : sucesso ? <Check size={17} className="text-success" /> : <Download size={17} />}
        <span className="hidden text-[13px] sm:inline">{ocupado ? "Gerando..." : "Baixar"}</span>
      </button>

      {aberto && (
        <div className="absolute bottom-full right-0 z-30 mb-2 w-44 overflow-hidden rounded-xl border border-fg/[0.1] bg-surface shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)]">
          <button
            type="button"
            onClick={() => void baixar("png")}
            className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left text-[13px] text-ink transition-colors hover:bg-fg/[0.06]"
          >
            <FileImage size={16} className="text-accent-soft" /> Imagem (PNG)
          </button>
          <button
            type="button"
            onClick={() => void baixar("pdf")}
            className="flex w-full items-center gap-2.5 border-t border-fg/[0.06] px-3.5 py-3 text-left text-[13px] text-ink transition-colors hover:bg-fg/[0.06]"
          >
            <FileText size={16} className="text-danger/80" /> PDF
          </button>
        </div>
      )}
    </div>
  );
};

/** Baixa um blob arbitrário (PNG aqui) com o nome dado. */
const baixarArquivo = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export default MenuDownloadNota;
