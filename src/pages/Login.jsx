/**
 * Login.jsx — Sign-in page.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "../components/LoginForm";
import "../styles/Register.css";

function Login() {
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  /**
   * Stores user data for welcome message, then redirects.
   */
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setLoginSuccess(true);

    setTimeout(() => {
      navigate("/dashboard");
    }, 1200);
  };

  const handleSwitchToRegister = () => {
    navigate("/register");
  };

  return (
    <div className="register-page">
      <div className="register-container">
        {loginSuccess ? (
          <div className="success-message">
            <div className="success-icon">✓</div>
            <h2>Welcome back, {currentUser?.displayName || "User"}!</h2>
            <p>You have signed in successfully.</p>
            <p className="redirect-message">Redirecting to your dashboard...</p>
          </div>
        ) : (
          <div className="register-content">
            <div className="register-header">
              <div className="auth-logo">Entre<span className="auth-logo-accent">Hub</span></div>
              <h1>Welcome Back</h1>
              <p>Sign in to continue to EntreHub</p>
            </div>
            <LoginForm
              onSuccess={handleLoginSuccess}
              onSwitchToRegister={handleSwitchToRegister}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
