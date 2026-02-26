import { useState } from "react";
import { useNavigate } from "react-router-dom";
import RegisterForm from "../components/RegisterForm";
import "../styles/Register.css";

function Register() {
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  const handleRegisterSuccess = (user) => {
    setCurrentUser(user);
    setRegisterSuccess(true);

    setTimeout(() => {
      console.log("Redirecting to dashboard with user:", user);
      navigate("/dashboard");
    }, 1200);
  };

  const handleSwitchToLogin = () => {
    navigate("/login");
  };

  return (
    <div className="register-page">
      <div className="register-container">
        {registerSuccess ? (
          <div className="success-message">
            <div className="success-icon">✓</div>
            <h2>Welcome to EntreHub, {currentUser?.displayName || "User"}!</h2>
            <p>Your account has been created successfully.</p>
            <p className="redirect-message">Redirecting to your dashboard...</p>
          </div>
        ) : (
          <div className="register-content">
            <div className="register-header">
              <h1>Create your account</h1>
              <p>Join EntreHub and start your journey.</p>
            </div>
            <RegisterForm
              onSuccess={handleRegisterSuccess}
              onSwitchToLogin={handleSwitchToLogin} // "Sign in here" uses this
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Register;
