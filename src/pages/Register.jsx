import { useState } from "react";
import RegisterForm from "../components/RegisterForm";
import "../styles/Register.css";

function Register({ onSwitchToLogin }) {
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [newUser, setNewUser] = useState(null);

  const handleRegistrationSuccess = (user) => {
    setNewUser(user);
    setRegistrationSuccess(true);

    // Optional: Redirect after a few seconds
    setTimeout(() => {
      // window.location.href = '/dashboard'; // Uncomment when you have routing set up
      console.log("Redirecting to dashboard with user:", user);
    }, 2000);
  };

  return (
    <div className="register-page">
      <div className="register-container">
        {registrationSuccess ? (
          <div className="success-message">
            <div className="success-icon">✓</div>
            <h2>Welcome to EntreHub, {newUser?.displayName}!</h2>
            <p>Your account has been created successfully.</p>
            <p className="account-type">
              Account Type: <strong>{newUser?.role}</strong>
            </p>
            <p className="redirect-message">Redirecting to your dashboard...</p>
          </div>
        ) : (
          <div className="register-content">
            <div className="register-header">
              <h1>Join EntreHub</h1>
              <p>Create your account to get started</p>
            </div>
            <RegisterForm
              onSuccess={handleRegistrationSuccess}
              onSwitchToLogin={onSwitchToLogin}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Register;
