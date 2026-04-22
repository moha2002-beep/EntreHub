/**
 * RegisterForm.jsx — Sign-up form with password validation.
 */

import { useState } from "react";
import { registerUser, getErrorMessage } from "../services/authService";
import "../styles/RegisterForm.css";

function RegisterForm({ onSuccess, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "entrepreneur",
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /**
   * Client-side validation for account security.
   */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (formData.fullName.trim().length < 3) {
      newErrors.fullName = "Full name must be at least 3 characters";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      newErrors.password =
        "Password must contain at least one lowercase letter";
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      newErrors.password =
        "Password must contain at least one uppercase letter";
    } else if (!/(?=.*\d)/.test(formData.password)) {
      newErrors.password = "Password must contain at least one number";
    } else if (!/(?=.*[@$!%*?&])/.test(formData.password)) {
      newErrors.password =
        "Password must contain at least one special character (@$!%*?&)";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await registerUser(
        formData.email,
        formData.password,
        formData.fullName,
        formData.role,
      );

      if (result.success) {
        setFormData({
          fullName: "",
          email: "",
          password: "",
          confirmPassword: "",
          role: "entrepreneur",
        });

        if (onSuccess) {
          onSuccess(result.user);
        }
      } else {
        setErrors({
          submit: getErrorMessage(result.code),
        });
      }
    } catch {
      setErrors({
        submit: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="register-form" onSubmit={handleSubmit}>
      {/* Full Name */}
      <div className="form-group">
        <label htmlFor="fullName">Full Name *</label>
        <input
          type="text"
          id="fullName"
          name="fullName"
          value={formData.fullName}
          onChange={handleInputChange}
          placeholder="John Doe"
          disabled={isLoading}
          className={errors.fullName ? "input-error" : ""}
        />
        {errors.fullName && (
          <span className="error-message">{errors.fullName}</span>
        )}
      </div>

      {/* Email */}
      <div className="form-group">
        <label htmlFor="email">Email Address *</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="you@example.com"
          disabled={isLoading}
          className={errors.email ? "input-error" : ""}
        />
        {errors.email && <span className="error-message">{errors.email}</span>}
      </div>

      {/* Role Selection — interactive cards for better visual feedback */}
      <div className="form-group">
        <label>I am a... *</label>
        <div className="role-card-row">
          {[
            { value: "entrepreneur", label: "Entrepreneur", desc: "I'm building a venture" },
            { value: "mentor",       label: "Mentor",       desc: "I guide founders" },
            { value: "investor",     label: "Investor",     desc: "I fund startups" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={isLoading}
              className={`role-card${formData.role === opt.value ? " role-card-active" : ""}`}
              onClick={() => handleInputChange({ target: { name: "role", value: opt.value } })}
            >
              <span className="role-card-label">{opt.label}</span>
              <span className="role-card-desc">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Password with real-time requirement indicator */}
      <div className="form-group">
        <label htmlFor="password">Password *</label>
        <div className="password-input-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Create a strong password"
            disabled={isLoading}
            className={errors.password ? "input-error" : ""}
          />
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {errors.password && (
          <span className="error-message">{errors.password}</span>
        )}
        <div className="password-requirements">
          <p className="requirements-label">Password must contain:</p>
          <ul className="requirements-list">
            <li className={formData.password.length >= 8 ? "met" : ""}>
              At least 8 characters
            </li>
            <li className={/(?=.*[a-z])/.test(formData.password) ? "met" : ""}>
              One lowercase letter (a-z)
            </li>
            <li className={/(?=.*[A-Z])/.test(formData.password) ? "met" : ""}>
              One uppercase letter (A-Z)
            </li>
            <li className={/(?=.*\d)/.test(formData.password) ? "met" : ""}>
              One number (0-9)
            </li>
            <li
              className={/(?=.*[@$!%*?&])/.test(formData.password) ? "met" : ""}
            >
              One special character (@$!%*?&)
            </li>
          </ul>
        </div>
      </div>

      {/* Confirm Password */}
      <div className="form-group">
        <label htmlFor="confirmPassword">Confirm Password *</label>
        <div className="password-input-wrapper">
          <input
            type={showConfirmPassword ? "text" : "password"}
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            placeholder="Confirm your password"
            disabled={isLoading}
            className={errors.confirmPassword ? "input-error" : ""}
          />
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            disabled={isLoading}
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? "Hide" : "Show"}
          </button>
        </div>
        {errors.confirmPassword && (
          <span className="error-message">{errors.confirmPassword}</span>
        )}
      </div>

      {errors.submit && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {errors.submit}
        </div>
      )}

      <button type="submit" className="btn btn-primary" disabled={isLoading}>
        {isLoading ? "Creating Account..." : "Create Account"}
      </button>

      <p className="form-footer">
        Already have an account?{" "}
        <button
          type="button"
          className="link-button"
          onClick={onSwitchToLogin}
          disabled={isLoading}
        >
          Sign in here
        </button>
      </p>
    </form>
  );
}

export default RegisterForm;
