import { useAuth } from "./context/AuthContext";
import AuthForm from "./components/AuthForm";
import TeacherDashboard from "./components/TeacherDashboard";
import StudentDashboard from "./components/StudentDashboard";

function App() {
    const { user, loading, logout } = useAuth();

    if (loading) {
        return (
            <div className="centered-page">
                <div className="card">Loading your attendance universe...</div>
            </div>
        );
    }

    if (!user) {
        return <AuthForm />;
    }

    return (
        <div className="layout">
            <header className="topbar">
                <div>
                    <h1>Attendance System</h1>
                    <p>
                        Signed in as <strong>{user.full_name}</strong> ({user.role})
                    </p>
                </div>
                <button className="secondary-btn" onClick={logout}>
                    Logout
                </button>
            </header>

            {user.role === "teacher" ? <TeacherDashboard /> : <StudentDashboard />}
        </div>
    );
}

export default App;
