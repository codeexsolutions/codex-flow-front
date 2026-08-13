import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CircleAlert, Clock, MessageCircle, RefreshCw, X } from "lucide-react";

import AcompanhamentoService, { type ProducaoPublica } from "@/features/acompanhamento/services/acompanhamento.service";
import { paleta, rgba } from "@/features/acompanhamento/marca";

/**
 * A tela que o cliente da gráfica abre — sem login, sem menu, sem app.
 *
 * O que ela NÃO faz é a parte importante:
 *
 * - Não monta o layout do sistema. Quem abre não é usuário do Flow; carregar
 *   sidebar, store de plano e sessão para mostrar quatro linhas seria peso
 *   inútil num link que quase sempre abre no 4G do celular.
 * - Não pede nada além do token. Cliente, colunas e período vêm decididos do
 *   servidor. Se esta tela pudesse escolher, o filtro estaria do lado errado.
 * - Não oferece edição. É acompanhamento; o pedido continua sendo alterado
 *   por quem produz.
 *
 * ---------------------------------------------------------------------
 * Por que não é uma tabela
 * ---------------------------------------------------------------------
 * A planilha de fardamento tem onze etapas. Numa tabela isso vira treze
 * colunas: rolagem horizontal no celular, que é onde o link é aberto, e o
 * cliente teria de arrastar para descobrir o que já ficou pronto.
 *
 * Aqui cada pedido é um cartão com a esteira das etapas. A pergunta que o
 * cliente tem é uma só — "onde está o meu?" — e ela se responde vendo onde a
 * trilha para de estar preenchida.
 *
 * ---------------------------------------------------------------------
 * Por que as cores não vêm dos tokens do Flow
 * ---------------------------------------------------------------------
 * O resto do sistema pinta com `bg-canvas`, `text-fg` e afins, que saem do tema
 * guardado no `localStorage` de cada usuário. Aqui isso daria uma página que
 * muda de cara conforme quem abre: o dono da gráfica, com tema escuro, veria
 * uma tela diferente da que o cliente dele vê — e a conferência do link
 * deixaria de valer. Pior, a paleta seria a do Flow, não a da empresa.
 *
 * A paleta sai de `marca.ts`, a mesma que alimenta a prévia na configuração.
 */

const dataBr = (valor: string) => {
    /* `new Date("2026-08-20")` é meia-noite UTC e volta um dia no fuso do
       Brasil — o prazo apareceria sempre um dia antes. Partir a string evita o
       problema sem depender de biblioteca. */
    const [ano, mes, dia] = valor.split("-");

    return ano && mes && dia ? `${dia}/${mes}/${ano}` : valor;
};

const formatarData = (iso: string | null) => {
    if (!iso) return null;

    const d = new Date(iso);

    return Number.isNaN(d.getTime()) ? null : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

/** Só dígitos — `wa.me` recusa parênteses e traços. */
const soDigitos = (t: string) => t.replace(/\D/g, "");

type Coluna = ProducaoPublica["colunas"][number];

/**
 * Quanto daquela etapa já andou, de 0 a 1.
 *
 * Sai da POSIÇÃO do valor na lista de alternativas, não de um dicionário de
 * palavras. A lista é escrita na ordem do trabalho por quem montou a planilha
 * ("NÃO INICIADO, ANDAMENTO, FINALIZADO"), então a posição já carrega o
 * progresso — e a mesma conta serve para "0%, 50%, 100%" sem saber que uma
 * fala de produção e a outra de dinheiro.
 *
 * Um dicionário quebraria na primeira empresa que escrevesse "concluído",
 * "pronto" ou "OK". A posição não depende da palavra.
 */
const progressoDa = (coluna: Coluna, valor: string | null): number | null => {
    if (valor == null || coluna.opcoes.length < 2) return null;

    const i = coluna.opcoes.findIndex((o) => o.valor === valor);

    return i < 0 ? null : i / (coluna.opcoes.length - 1);
};

const AcompanharProducaoPage = () => {
    const { token = "" } = useParams();

    const [dados, setDados] = useState<ProducaoPublica | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [ampliada, setAmpliada] = useState<string | null>(null);

    const carregar = useCallback(async () => {
        setCarregando(true);
        setDados(await AcompanhamentoService.producao(token));
        setCarregando(false);
    }, [token]);

    useEffect(() => {
        carregar();
    }, [carregar]);

    const p = useMemo(() => paleta(dados?.empresa.cor ?? null, dados?.empresa.tema ?? "claro"), [dados?.empresa.cor, dados?.empresa.tema]);

    /* A aba do navegador é parte da personalização: o cliente costuma deixar o
       link aberto entre uma conferida e outra, e "Codex Flow" ali diria o nome
       do sistema em vez do de quem ele contratou. */
    useEffect(() => {
        if (dados?.empresa.nome) document.title = `${dados.cliente} · ${dados.empresa.nome}`;

        return () => {
            document.title = "Codex Flow";
        };
    }, [dados?.empresa.nome, dados?.cliente]);

    useEffect(() => {
        if (!ampliada) return;

        const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAmpliada(null);

        document.addEventListener("keydown", tecla);

        return () => document.removeEventListener("keydown", tecla);
    }, [ampliada]);

    /* As colunas são separadas UMA vez, e não a cada cartão: com onze etapas e
       várias linhas, refazer a classificação por linha seria trabalho repetido
       para uma resposta que não muda. */
    const grupos = useMemo(() => {
        const cols = dados?.colunas ?? [];
        const indices = cols.map((_, i) => i);

        return {
            etapas: indices.filter((i) => cols[i].tipo === "SELECAO" && cols[i].opcoes.length >= 2),
            datas: indices.filter((i) => cols[i].tipo === "DATA"),
            imagens: indices.filter((i) => cols[i].tipo === "IMAGEM"),
            outros: indices.filter(
                (i) => !["DATA", "IMAGEM"].includes(cols[i].tipo) && !(cols[i].tipo === "SELECAO" && cols[i].opcoes.length >= 2),
            ),
        };
    }, [dados?.colunas]);

    /* Sem socket aqui: o cliente não tem token para autenticar o handshake, e o
       canal de tempo real é por empresa. Quem abre a página quer o estado de
       agora — e tem o botão para pedir de novo. */

    if (carregando) {
        return (
            <div className="grid min-h-[100dvh] place-items-center px-6" style={{ backgroundColor: p.fundo }}>
                <motion.div
                    animate={{ opacity: [0.35, 1, 0.35] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                    className="h-9 w-9 rounded-xl"
                    style={{ backgroundColor: rgba(p.destaque, 0.35) }}
                />
            </div>
        );
    }

    if (!dados) {
        return (
            <div className="grid min-h-[100dvh] place-items-center px-6" style={{ backgroundColor: p.fundo }}>
                <div
                    className="w-full max-w-sm rounded-2xl p-8 text-center"
                    style={{ backgroundColor: p.cartao, border: `1px solid ${p.linha}` }}
                >
                    <CircleAlert className="mx-auto mb-3" size={28} style={{ color: p.fraco }} />
                    <h1 className="text-base font-semibold" style={{ color: p.tinta }}>
                        Link indisponível
                    </h1>
                    <p className="mt-2 text-sm" style={{ color: p.apagado }}>
                        Este link de acompanhamento não está mais válido. Peça um novo a quem enviou.
                    </p>
                </div>
            </div>
        );
    }

    const { empresa, colunas } = dados;
    const atualizado = formatarData(dados.atualizadoEm);
    const whats = empresa.whatsapp ? soDigitos(empresa.whatsapp) : "";

    return (
        <div className="min-h-[100dvh]" style={{ backgroundColor: p.fundo }}>
            {/* Cabeçalho da marca: é o que faz o cliente reconhecer de quem é a
                página antes de ler qualquer palavra. */}
            <header className="relative overflow-hidden" style={{ background: p.capa, color: p.sobreCapa }}>
                {empresa.capa && (
                    /* A capa entra por baixo, com opacidade: em cima dela o
                       cabeçalho continua legível qualquer que seja a foto — e
                       foto de cliente nunca é escolhida pensando em contraste. */
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url("${empresa.capa}")`, opacity: 0.28 }}
                    />
                )}

                <div className="relative mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-6 sm:px-6">
                    {empresa.logo && (
                        <img
                            src={empresa.logo}
                            alt={empresa.nome}
                            className="h-11 w-11 shrink-0 rounded-xl bg-white/90 object-contain p-1 shadow-sm"
                            onError={(e) => {
                                e.currentTarget.style.display = "none";
                            }}
                        />
                    )}

                    <div className="min-w-0">
                        <p className="truncate text-base font-semibold leading-tight sm:text-lg">{empresa.nome || "Acompanhamento"}</p>
                        <p className="truncate text-xs opacity-75">{dados.planilha}</p>
                    </div>

                    {whats && (
                        <a
                            href={`https://wa.me/${whats.length <= 11 ? `55${whats}` : whats}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium backdrop-blur transition hover:opacity-90"
                            style={{ backgroundColor: rgba(p.sobreCapa === "#ffffff" ? "#ffffff" : "#000000", 0.16) }}
                        >
                            <MessageCircle size={14} />
                            <span className="hidden sm:inline">Falar</span>
                        </a>
                    )}
                </div>
            </header>

            <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="mb-5"
                >
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl" style={{ color: p.tinta }}>
                        {dados.cliente}
                    </h1>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm" style={{ color: p.apagado }}>
                        {dados.linhas.length === 0
                            ? "Acompanhamento de produção"
                            : `${dados.linhas.length} ${dados.linhas.length === 1 ? "pedido" : "pedidos"}`}
                        {atualizado && (
                            <>
                                <span style={{ color: p.fraco }}>·</span>
                                <Clock size={12} />
                                {atualizado}
                            </>
                        )}
                    </p>
                </motion.div>

                {dados.linhas.length === 0 ? (
                    <div
                        className="rounded-2xl p-8 text-center"
                        style={{ backgroundColor: p.cartao, border: `1px solid ${p.linha}` }}
                    >
                        <p className="text-sm" style={{ color: p.apagado }}>
                            Ainda não há nada em produção no seu nome.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {dados.linhas.map((linha, n) => {
                            const feitas = grupos.etapas
                                .map((i) => progressoDa(colunas[i], linha.valores[i]))
                                .filter((x): x is number => x != null);

                            const pct = feitas.length ? Math.round((feitas.reduce((a, b) => a + b, 0) / feitas.length) * 100) : 0;
                            const concluido = pct === 100;

                            return (
                                <motion.article
                                    key={n}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: Math.min(n * 0.06, 0.3), ease: [0.22, 1, 0.36, 1] }}
                                    className="overflow-hidden rounded-2xl"
                                    style={{ backgroundColor: p.cartao, border: `1px solid ${p.linha}` }}
                                >
                                    {feitas.length > 0 && (
                                        <div className="px-4 pt-4 sm:px-5">
                                            <div className="mb-2 flex items-center justify-between">
                                                <span className="text-xs font-medium" style={{ color: p.apagado }}>
                                                    {dados.linhas.length > 1 ? `Pedido ${n + 1}` : "Andamento"}
                                                </span>

                                                <span
                                                    className="flex items-center gap-1 text-sm font-bold tabular-nums"
                                                    style={{ color: concluido ? "#22c55e" : p.destaque }}
                                                >
                                                    {concluido && <Check size={14} />}
                                                    {pct}%
                                                </span>
                                            </div>

                                            <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: rgba(p.destaque, 0.14) }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${pct}%` }}
                                                    transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                                                    className="h-full rounded-full"
                                                    style={{ backgroundColor: concluido ? "#22c55e" : p.destaque }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* A esteira. Cada etapa com a cor definida na
                                        planilha; sem valor, fica apagada — é o
                                        "ainda não chegou aqui". */}
                                    {grupos.etapas.length > 0 && (
                                        <div className="grid grid-cols-2 gap-1.5 p-4 sm:grid-cols-3 sm:px-5">
                                            {grupos.etapas.map((i) => {
                                                const coluna = colunas[i];
                                                const valor = linha.valores[i];
                                                const cor = coluna.opcoes.find((o) => o.valor === valor)?.cor ?? p.destaque;
                                                const vazio = valor == null;

                                                return (
                                                    <div
                                                        key={coluna.nome}
                                                        className="min-w-0 rounded-xl px-2.5 py-2"
                                                        style={{
                                                            backgroundColor: vazio ? rgba(p.escuro ? "#ffffff" : "#000000", 0.03) : rgba(cor, 0.12),
                                                            border: `1px solid ${vazio ? "transparent" : rgba(cor, 0.22)}`,
                                                        }}
                                                    >
                                                        <p
                                                            className="truncate text-[9px] font-bold uppercase tracking-wider"
                                                            style={{ color: vazio ? p.fraco : rgba(cor, 0.9) }}
                                                        >
                                                            {coluna.nome}
                                                        </p>
                                                        <p
                                                            className="truncate text-[11.5px] font-semibold"
                                                            style={{ color: vazio ? p.fraco : cor }}
                                                        >
                                                            {valor ?? "—"}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Datas e textos: o que ele procura depois de
                                        já ter visto onde a peça está. */}
                                    {[...grupos.datas, ...grupos.outros].some((i) => linha.valores[i]) && (
                                        <div
                                            className="flex flex-wrap gap-x-6 gap-y-2 px-4 py-3 sm:px-5"
                                            style={{ borderTop: `1px solid ${p.linha}` }}
                                        >
                                            {[...grupos.datas, ...grupos.outros].map((i) => {
                                                const coluna = colunas[i];
                                                const valor = linha.valores[i];

                                                if (valor == null) return null;

                                                return (
                                                    <div key={coluna.nome} className="min-w-0">
                                                        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: p.fraco }}>
                                                            {coluna.nome}
                                                        </p>
                                                        <p className="truncate text-[13px] font-medium tabular-nums" style={{ color: p.tinta }}>
                                                            {coluna.tipo === "DATA" ? dataBr(valor) : valor}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Imagens por último e como miniatura: a guia
                                        de impressão é grande, e carregá-la em
                                        tamanho real derrubaria a página no 4G. */}
                                    {grupos.imagens.some((i) => linha.valores[i]) && (
                                        <div className="flex flex-wrap gap-3 px-4 py-3 sm:px-5" style={{ borderTop: `1px solid ${p.linha}` }}>
                                            {grupos.imagens.map((i) => {
                                                const url = linha.valores[i];

                                                if (!url) return null;

                                                return (
                                                    <button key={colunas[i].nome} onClick={() => setAmpliada(url)} className="group text-left">
                                                        <p className="mb-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: p.fraco }}>
                                                            {colunas[i].nome}
                                                        </p>
                                                        <img
                                                            src={url}
                                                            alt={colunas[i].nome}
                                                            loading="lazy"
                                                            className="h-16 w-16 rounded-lg object-cover transition group-hover:opacity-80"
                                                            style={{ border: `1px solid ${p.linha}` }}
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = "none";
                                                            }}
                                                        />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.article>
                            );
                        })}
                    </div>
                )}

                <button
                    onClick={carregar}
                    className="mx-auto mt-6 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition hover:opacity-70"
                    style={{ color: p.destaque }}
                >
                    <RefreshCw size={14} />
                    Atualizar
                </button>

                <p className="mt-8 text-center text-[11px]" style={{ color: p.fraco }}>
                    {empresa.nome && `${empresa.nome} · `}acompanhamento de produção
                </p>
            </main>

            <AnimatePresence>
                {ampliada && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setAmpliada(null)}
                        className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4 backdrop-blur-sm"
                        role="dialog"
                        aria-modal="true"
                    >
                        <button
                            onClick={() => setAmpliada(null)}
                            aria-label="Fechar"
                            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white"
                        >
                            <X size={18} />
                        </button>
                        <motion.img
                            initial={{ scale: 0.94 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.94 }}
                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            src={ampliada}
                            alt=""
                            className="max-h-full max-w-full rounded-xl object-contain"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AcompanharProducaoPage;
