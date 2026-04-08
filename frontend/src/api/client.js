import axios from "axios";

function resolveApiBaseUrl() {
    const configured = (import.meta.env.VITE_API_BASE_URL || "").trim();

    if (typeof window === "undefined") {
        return configured || "/api";
    }

    const currentHost = window.location.hostname;
    const isLocalHost = currentHost === "localhost" || currentHost === "127.0.0.1";
    const configuredPointsToLocal = configured.includes("localhost") || configured.includes("127.0.0.1");

    // If frontend is running on a real domain/IP but the build still has localhost API,
    // fall back to same-origin /api (works behind nginx reverse proxy in production).
    if (!isLocalHost && configuredPointsToLocal) {
        return `${window.location.origin}/api`;
    }

    return configured || `${window.location.origin}/api`;
}

const api = axios.create({
    baseURL: resolveApiBaseUrl(),
    timeout: 10000,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
        if (!config.headers) {
            config.headers = {};
        }
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
