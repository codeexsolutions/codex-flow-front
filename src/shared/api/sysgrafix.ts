import axios from "axios";

const baseURL =
  import.meta.env.PROD ? import.meta.env.VITE_API_PRODUCTION : import.meta.env.VITE_API_LOCAL;

const sysgrafix = axios.create({
  baseURL,
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
