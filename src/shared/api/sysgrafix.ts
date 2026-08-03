import axios from "axios";

import { API_URL } from "@/shared/api/apiUrl";

const sysgrafix = axios.create({
  baseURL: API_URL,
});

sysgrafix.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token && token !== "undefined") {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

sysgrafix.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("401 em:", error.config?.url, "→ token presente?", !!localStorage.getItem("token"));
    }

    return Promise.reject(error);
  },
);

export default sysgrafix;
