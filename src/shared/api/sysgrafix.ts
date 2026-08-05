import axios from "axios";

import { API_URL } from "@/shared/api/apiUrl";

const sysgrafix = axios.create({
  baseURL: API_URL,
  // O JWT vive num cookie httpOnly: o navegador o envia sozinho em toda
  // requisição. Sem `withCredentials` o cookie NÃO acompanha em chamadas
  // cross-origin (site na Vercel, API na Railway) — o login viria vazio.
  withCredentials: true,
});

sysgrafix.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("401 em:", error.config?.url);
    }

    return Promise.reject(error);
  },
);

export default sysgrafix;
