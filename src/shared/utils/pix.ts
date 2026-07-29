export type PixKeyType = "phone" | "email" | "cpf" | "cnpj" | "random";

export type PixPayload = {
  pixKey: string;
  pixKeyType: PixKeyType;
  merchantName: string;
  merchantCity: string;
  amount?: number;
  transactionId?: string;
  description?: string;
};

export type PixSettings = {
  key: string;
  keyType: PixKeyType;
  ownerName: string;
  city: string;
};

const PIX_STORAGE_KEY = "codex_pix_settings";

/* ─── Persistência localStorage ─── */

export function getPixSettings(): PixSettings | null {
  try {
    const raw = localStorage.getItem(PIX_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PixSettings) : null;
  } catch {
    return null;
  }
}

export function savePixSettings(settings: PixSettings): void {
  localStorage.setItem(PIX_STORAGE_KEY, JSON.stringify(settings));
}

export function isPixConfigured(): boolean {
  const s = getPixSettings();
  return !!(s?.key && s?.keyType && s?.ownerName && s?.city);
}

export function clearPixSettings(): void {
  localStorage.removeItem(PIX_STORAGE_KEY);
}

/* ─── CRC16-CCITT ─── */

function computeCRC16(payload: string): string {
  const polynomial = 0x1021;
  let result = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    result ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((result & 0x8000) !== 0) {
        result = (result << 1) ^ polynomial;
      } else {
        result <<= 1;
      }
    }
  }
  return (result & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

/* ─── EMV field ─── */

function formatEMV(id: string, value: string): string {
  const length = value.length.toString().padStart(2, "0");
  return `${id}${length}${value}`;
}

/* ─── Normalização ─── */

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .substring(0, 25);
}

/* ─── Formata chave PIX conforme tipo ─── */

function formatPixKey(key: string, type: PixKeyType): string {
  if (type === "phone") {
    const clean = key.replace(/\D/g, "");
    return clean.startsWith("55") ? `+${clean}` : `+55${clean}`;
  }
  if (type === "cpf") {
    return key.replace(/\D/g, "");
  }
  if (type === "cnpj") {
    return key.replace(/\D/g, "");
  }
  return key;
}

/* ─── Gera payload BR Code ─── */

export function generatePixPayload(data: PixPayload): string {
  const formattedKey = formatPixKey(data.pixKey, data.pixKeyType);
  const merchantName = normalizeText(data.merchantName);
  const merchantCity = normalizeText(data.merchantCity);

  // Merchant Account Information (ID 26)
  let merchantAccountInfo = formatEMV("00", "br.gov.bcb.pix");
  merchantAccountInfo += formatEMV("01", formattedKey);

  if (data.description) {
    const desc = normalizeText(data.description).substring(0, 72);
    merchantAccountInfo += formatEMV("02", desc);
  }

  let payload = "";

  // Payload Format Indicator (ID 00)
  payload += formatEMV("00", "01");

  // Point of Initiation Method (ID 01)
  payload += formatEMV("01", data.amount ? "12" : "11");

  // Merchant Account Information (ID 26)
  payload += formatEMV("26", merchantAccountInfo);

  // Merchant Category Code (ID 52)
  payload += formatEMV("52", "0000");

  // Transaction Currency (ID 53) — 986 = BRL
  payload += formatEMV("53", "986");

  // Transaction Amount (ID 54) — optional
  if (data.amount && data.amount > 0) {
    payload += formatEMV("54", data.amount.toFixed(2));
  }

  // Country Code (ID 58)
  payload += formatEMV("58", "BR");

  // Merchant Name (ID 59)
  payload += formatEMV("59", merchantName);

  // Merchant City (ID 60)
  payload += formatEMV("60", merchantCity);

  // Additional Data Field Template (ID 62)
  if (data.transactionId) {
    const txId = data.transactionId.replace(/[^a-zA-Z0-9]/g, "").substring(0, 25);
    payload += formatEMV("62", formatEMV("05", txId));
  } else {
    payload += formatEMV("62", formatEMV("05", "*"));
  }

  // CRC16 placeholder + calculation
  payload += "6304";
  const crc = computeCRC16(payload);
  payload = payload.slice(0, -4) + formatEMV("63", crc);

  return payload;
}

/* ─── Gera URL do QR Code via API ─── */

export function getQrCodeUrl(pixPayload: string, color = "000000", bgcolor = "FFFFFF"): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=800x800&color=${color}&bgcolor=${bgcolor}&data=${encodeURIComponent(pixPayload)}`;
}
