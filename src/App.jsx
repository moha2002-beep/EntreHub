import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import MentorDetail from "./pages/MentorDetail";
import Bookings from "./pages/Bookings";
import Community from "./pages/Community";
import PostDetail from "./pages/PostDetail";
import "./App.css";

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
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/dashboard" replace /> : <Register />}
      />
      <Route
        path="/dashboard"
        element={user ? <Dashboard /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/profile"
        element={user ? <Profile /> : <Navigate to="/login" replace />}
      />

      {/* /edit-profile redirects to the profile page's built-in edit mode */}
      <Route
        path="/edit-profile"
        element={
          user
            ? <Navigate to="/profile?mode=edit" replace />
            : <Navigate to="/login" replace />
        }
      />

      <Route
        path="/mentor/:uid"
        element={user ? <MentorDetail /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/bookings"
        element={user ? <Bookings /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/community"
        element={user ? <Community /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/community/:postId"
        element={user ? <PostDetail /> : <Navigate to="/login" replace />}
      />

      <Route
        path="*"
        element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
      />
    </Routes>
  );
}

export default App;
