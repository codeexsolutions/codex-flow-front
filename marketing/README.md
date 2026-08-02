# CodeEx Flow — Story de lançamento

Peça vertical **1080×1920 (9:16), ~32,5s**, em HTML/CSS animado.
Serve como Story, Reels, TikTok e Shorts.

Arquivos:
- `launch-story.html` — a peça animada + gravador embutido
- `logo.png` — cópia do logo oficial (precisa ficar na mesma pasta)

---

## 1. Abrir

Duplo clique em `launch-story.html` (Chrome).
Se o logo não carregar, sirva por HTTP:

```bash
cd marketing
python -m http.server 8099
# http://127.0.0.1:8099/launch-story.html
```

| Botão | O que faz |
|---|---|
| **● Gravar .mp4** | Grava a peça inteira e baixa o vídeo pronto |
| **⏸ Pausar / ▶ Tocar** | Congela pra conferir um frame |
| **↺ Reiniciar** | Roda do começo |
| barra | Vai pra qualquer segundo |
| **Guias** | Mostra onde o Instagram cobre com UI |
| **Tela cheia** | Esconde os controles |

## 2. Gerar o vídeo

1. Clique em **● Gravar .mp4**
2. Na janela do Chrome escolha **"Guia do Chrome" → esta aba** → Compartilhar
3. Espere ~33s sem trocar de aba. **`codexflow-lancamento.mp4` baixa sozinho.**

Sai `1080x1920`, H.264, 30fps — pronto pra subir no Instagram. **Não precisa de
ffmpeg nem de nenhum programa extra**: a codificação é feita pelo próprio Chrome.

### Por que a tela deita durante a gravação

É de propósito, e é o que garante a qualidade. Seu monitor tem 1080 pixels de
altura, e o story precisa de 1920 — gravando em pé, a imagem seria esticada e
sairia borrada. Então o palco é rotacionado em 90°: os 1920px de altura do story
passam a cair sobre os 1920px de **largura** do monitor, capturando 1 pixel pra
1 pixel. O canvas desvira cada frame antes de gravar, então o arquivo final sai
em pé e nítido. Você vê deitado só enquanto grava.

Para o resultado mais nítido, deixe a janela em tela cheia (o gravador já pede
isso sozinho) e não minimize durante os 33s.

> Se algum dia o Chrome não suportar MP4, o botão passa a escrever `.webm`
> automaticamente — o vídeo continua saindo, só muda o formato.

---

## Roteiro

| Tempo | Cena |
|---|---|
| 0,0–3,9s | **CodeEx Solutions** — monograma monta, letras de "CodeEx" sobem, SOLUTIONS abre o entreletras, "apresenta…" |
| 4,0–6,0s | **Flow** — logo estoura com anéis e brilho, "CodeEx Flow", selo **LANÇAMENTO** |
| 5,7–6,8s | Janela do sistema entra em 3D |
| 6,8–9,9s | **Dashboard** — KPIs contando, gráfico saindo do skeleton e barras crescendo |
| 10,1–12,8s | **PDV** — grade de produtos, itens entrando no carrinho, total subindo, botão finalizando |
| 13,0–15,3s | **Estoque** — tabela com saldo e alerta de repor |
| 15,5–17,6s | **Clientes** — histórico e situação |
| 17,8–20,1s | **Relatórios** — filtros e prévia em A4 |
| 20,3–22,4s | **Financeiro** — a receber, recebido, em atraso, parcelas |
| 22,6–26,1s | **Aparência** — 6 cores de destaque trocando no sistema inteiro + virada pro tema claro |
| 26,3–28,4s | **No forno** — Correios, Nota Fiscal e Funcionários com selo EM BREVE |
| 28,7–32,5s | **Assinatura** — logo, tagline, CTA e "CodeEx Solutions" |

A câmera faz um push-in lento e contínuo na janela durante o tour; as telas
trocam com deslize + fade. O tema muda de verdade: sidebar, botões, tags e
fundo acompanham a cor ativa, e o clarão marca a virada escuro → claro.

## Editar

No fim do arquivo, o objeto `CONFIG` controla o final:

```js
const CONFIG = {
  tagline : "Já disponível. Sua loja inteira, em uma tela só.",
  cta     : "Comece hoje →",
  handle  : "codexflow.com.br",
};
```

Os dados dentro do sistema (produtos, valores, clientes, parcelas) são **demo
fictícia de propósito** — nunca troque por print de dado real de cliente.

### Duas notas de performance (se for mexer no código)

Foram dois travamentos reais durante o desenvolvimento, deixados documentados
no arquivo pra não voltarem:

- **Não leia `document.getAnimations()` a cada frame.** São 120+ animações num
  DOM de 500 elementos; isso trava a thread principal. O relógio é uma animação
  só, num elemento vazio (`tickHost`).
- **Não anime propriedade visual de elemento grande** (nem custom property que
  o `#app` inteiro herde). O Chrome repinta tudo a cada frame. A troca de temas
  é aplicada por JS, de uma vez, em `applyTheme()`.
- Elementos `<i>` usados como caixa (miniaturas, barras, prévias) precisam de
  `display:block` quando o pai não é flex — senão a altura é ignorada.

---

## Legenda pronta

**Story:**
> Chegou. Arrasta pra cima 👆

**Feed / Reels:**
> A CodeEx Solutions apresenta: **CodeEx Flow**.
>
> PDV, estoque, clientes, financeiro e relatórios em A4 — tudo em um sistema só,
> no computador e no celular. Escolhe a cor, escolhe tema claro ou escuro, e
> trabalha do seu jeito.
>
> E já vem por aí: Correios, Nota Fiscal e Funcionários.
>
> Link na bio.
>
> #lancamento #gestao #pdv #sistemaparaloja #controledeestoque #notafiscal
