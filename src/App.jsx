import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { useAuth } from "./Context/AuthContext";
import "./App.css";

// Small wrappers so existing Login/Register props still work
function LoginRoute() {
  const navigate = useNavigate();
  return <Login onSwitchToRegister={() => navigate("/register")} />;
}

function RegisterRoute() {
  const navigate = useNavigate();
  return <Register onSwitchToLogin={() => navigate("/login")} />;
}

// Simple dashboard placeholder
function Dashboard({ user }) {
  return (
    <div>
      <h1>Welcome to EntreHub, {user.displayName}!</h1>
      <p>Dashboard coming soon...</p>
      <p>Role: {user.role || "User"}</p>
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <LoginRoute />}
      />
      <Route
        path="/register"
        element={
          user ? <Navigate to="/dashboard" replace /> : <RegisterRoute />
        }
      />
      <Route
        path="/dashboard"
        element={
          user ? <Dashboard user={user} /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="*"
        element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
      />
    </Routes>
  );
}

export default App;
