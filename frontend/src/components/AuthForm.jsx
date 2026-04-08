import { useState } from "react";

import { useAuth } from "../context/AuthContext";

const defaultRegisterForm = {
    username: "",
    email: "",
    full_name: "",
    password: "",
    role: "student",
};

const defaultLoginForm = {
    username: "",
    password: "",
};

function AuthForm() {
    const { login, register } = useAuth();
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [loginForm, setLoginForm] = useState(defaultLoginForm);
    const [registerForm, setRegisterForm] = useState(defaultRegisterForm);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleLoginSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setMessage("");
        setBusy(true);
        try {
            await login(loginForm);
            setMessage("Welcome back! Ready to mark some attendance.");
        } catch (err) {
            setError(err?.response?.data?.detail || "Login failed");
        } finally {
            setBusy(false);
        }
    };

    const handleRegisterSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setMessage("");
        setBusy(true);
        try {
            await register(registerForm);
            setMessage("Registration successful. You can now log in.");
            setIsRegisterMode(false);
        } catch (err) {
            setError(err?.response?.data?.detail || "Registration failed");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="centered-page">
            <div className="card auth-card">
                <h1>Attendance System</h1>
                <p>{isRegisterMode ? "Create your account" : "Sign in to continue"}</p>

                {!isRegisterMode ? (
                    <form onSubmit={handleLoginSubmit} className="stack-form">
                        <label>
                            Username
                            <input
                                value={loginForm.username}
                                onChange={(e) =>
                                    setLoginForm((prev) => ({ ...prev, username: e.target.value }))
                                }
                                required
                            />
                        </label>
                        <label>
                            Password
                            <input
                                type="password"
                                value={loginForm.password}
                                onChange={(e) =>
                                    setLoginForm((prev) => ({ ...prev, password: e.target.value }))
                                }
                                required
                            />
                        </label>
                        <button type="submit" disabled={busy}>
                            {busy ? "Logging in..." : "Login"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleRegisterSubmit} className="stack-form">
                        <label>
                            Username
                            <input
                                value={registerForm.username}
                                onChange={(e) =>
                                    setRegisterForm((prev) => ({ ...prev, username: e.target.value }))
                                }
                                required
                            />
                        </label>
                        <label>
                            Email
                            <input
                                type="email"
                                value={registerForm.email}
                                onChange={(e) =>
                                    setRegisterForm((prev) => ({ ...prev, email: e.target.value }))
                                }
                                required
                            />
                        </label>
                        <label>
                            Full Name
                            <input
                                value={registerForm.full_name}
                                onChange={(e) =>
                                    setRegisterForm((prev) => ({ ...prev, full_name: e.target.value }))
                                }
                                required
                            />
                        </label>
                        <label>
                            Password
                            <input
                                type="password"
                                value={registerForm.password}
                                onChange={(e) =>
                                    setRegisterForm((prev) => ({ ...prev, password: e.target.value }))
                                }
                                required
                                minLength={8}
                            />
                        </label>
                        <label>
                            Role
                            <select
                                value={registerForm.role}
                                onChange={(e) =>
                                    setRegisterForm((prev) => ({ ...prev, role: e.target.value }))
                                }
                            >
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                            </select>
                        </label>
                        <button type="submit" disabled={busy}>
                            {busy ? "Creating account..." : "Register"}
                        </button>
                    </form>
                )}

                {error ? <p className="error-text">{error}</p> : null}
                {message ? <p className="success-text">{message}</p> : null}

                <button
                    type="button"
                    className="secondary-btn full-width"
                    onClick={() => {
                        setIsRegisterMode((prev) => !prev);
                        setError("");
                        setMessage("");
                    }}
                >
                    {isRegisterMode ? "Have an account? Login" : "Need an account? Register"}
                </button>
            </div>
        </div>
    );
}

export default AuthForm;
