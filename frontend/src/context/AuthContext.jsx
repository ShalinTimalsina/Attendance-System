import { createContext, useContext, useEffect, useMemo, useState } from "react";

import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshProfile = async () => {
        const { data } = await api.get("/auth/me");
        setUser(data);
        return data;
    };

    const login = async (payload) => {
        const { data } = await api.post("/auth/login", payload);
        localStorage.setItem("access_token", data.access_token);
        await refreshProfile();
        return data;
    };

    const register = async (payload) => {
        await api.post("/auth/register", payload);
    };

    const logout = () => {
        localStorage.removeItem("access_token");
        setUser(null);
    };

    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem("access_token");
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                await refreshProfile();
            } catch {
                logout();
            } finally {
                setLoading(false);
            }
        };

        init();
    }, []);

    const value = useMemo(
        () => ({ user, loading, login, register, logout }),
        [user, loading]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used inside AuthProvider");
    }
    return ctx;
}
