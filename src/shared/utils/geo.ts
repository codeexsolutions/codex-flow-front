/**
 * Achar uma coordenada — pelo GPS ou pelo endereço.
 *
 * ---------------------------------------------------------------------------
 * Por que existem DOIS caminhos
 * ---------------------------------------------------------------------------
 * O GPS do navegador é o caminho bom: um clique, coordenada exata, nada para
 * digitar. Só que ele falha por motivos que não estão nas mãos de quem está
 * usando — e falha calado. Os três casos reais:
 *
 *   • **A página não é segura.** `navigator.geolocation` só funciona em
 *     `https://` ou em `localhost`. Quem abre o sistema pelo IP da rede
 *     (`http://192.168.0.10:5173`) não recebe erro nenhum: o navegador
 *     simplesmente nunca chama de volta. É a causa mais comum, e a mais
 *     difícil de adivinhar sem alguém dizer.
 *   • **A permissão foi negada** — inclusive negada uma vez no passado, e o
 *     navegador não volta a perguntar.
 *   • **O aparelho não tem sinal** (desktop sem Wi-Fi conhecido, por exemplo).
 *
 * Por isso o endereço existe como segunda via. Não é redundância: é o que faz
 * a configuração terminar mesmo quando o GPS não vai responder.
 */

export type Coordenada = { lat: number; lng: number };

/**
 * O GPS está disponível nesta página?
 *
 * A checagem de contexto seguro vem PRIMEIRO porque é a única falha que não
 * gera erro: sem ela, a tela ficaria girando para sempre esperando um retorno
 * de chamada que o navegador nunca vai fazer.
 */
export const gpsDisponivel = (): { ok: boolean; motivo?: string } => {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return { ok: false, motivo: "Este navegador não informa a localização." };
  }

  if (!window.isSecureContext) {
    return {
      ok: false,
      motivo: "O navegador só libera a localização em páginas seguras (https). Você está acessando por um endereço http — use o endereço abaixo para marcar a loja.",
    };
  }

  return { ok: true };
};

/** A frase certa para cada recusa do navegador. */
export const motivoDoErroGps = (erro: GeolocationPositionError): string => {
  if (erro.code === erro.PERMISSION_DENIED) {
    return "Permissão negada. Clique no cadeado ao lado do endereço do site, libere a localização e tente de novo.";
  }

  if (erro.code === erro.POSITION_UNAVAILABLE) {
    return "O aparelho não conseguiu obter a posição. Em computador isso é comum — use o endereço abaixo.";
  }

  return "A busca demorou demais. Tente de novo ou use o endereço abaixo.";
};

/**
 * Pede a posição ao navegador, com um teto de espera próprio.
 *
 * O `timeout` da API não cobre o caso do contexto inseguro (lá ela nem é
 * chamada), então a checagem de `gpsDisponivel` acontece antes. Aqui o teto
 * serve ao caso do aparelho que aceita e não responde.
 */
export const pedirPosicao = (): Promise<Coordenada> =>
  new Promise((resolve, reject) => {
    const estado = gpsDisponivel();

    if (!estado.ok) {
      reject(new Error(estado.motivo));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (erro) => reject(new Error(motivoDoErroGps(erro))),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });

/**
 * Endereço escrito → coordenada, pelo Nominatim (OpenStreetMap).
 *
 * Escolhido por não precisar de chave nem de conta: a alternativa (Google
 * Geocoding) exigiria cadastrar um projeto, um cartão e uma chave que teria de
 * viver no front — onde qualquer pessoa a lê. Para uma consulta que a loja faz
 * uma vez na vida, o custo de operação importa mais do que o último metro de
 * precisão.
 *
 * A política de uso do Nominatim pede no máximo uma consulta por segundo e um
 * identificador de aplicação. O navegador manda o `User-Agent` sozinho e o uso
 * aqui é de uma busca por configuração — bem dentro do combinado.
 */
export const coordenadaDoEndereco = async (endereco: string): Promise<{ coord: Coordenada; rotulo: string } | null> => {
  const busca = endereco.trim();

  if (busca.length < 6) return null;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    /* `countrycodes` evita o caso clássico de "Rua São João" cair numa cidade
       de Portugal com o mesmo nome. */
    url.searchParams.set("countrycodes", "br");
    url.searchParams.set("q", busca);

    const res = await fetch(url, { headers: { Accept: "application/json" } });

    if (!res.ok) return null;

    const dados = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    const achado = dados?.[0];

    if (!achado) return null;

    const lat = Number(achado.lat);
    const lng = Number(achado.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { coord: { lat, lng }, rotulo: achado.display_name ?? busca };
  } catch {
    return null;
  }
};
