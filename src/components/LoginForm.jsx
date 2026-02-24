import { useState } from "react";
import { loginUser, getErrorMessage } from "../services/authService";
import "../styles/RegisterForm.css";

function LoginForm({ onSuccess, onSwitchToRegister }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
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
      const result = await loginUser(formData.email, formData.password);

      if (result.success) {
        setFormData({ email: "", password: "" });
        if (onSuccess) {
          onSuccess(result.user);
        }
      } else {
        setErrors({
          submit: getErrorMessage(result.code),
        });
      }
    } catch (error) {
      console.error(error);
      setErrors({
        submit: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="register-form" onSubmit={handleSubmit}>
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

      <div className="form-group">
        <label htmlFor="password">Password *</label>
        <div className="password-input-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Enter your password"
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
      </div>

      {errors.submit && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {errors.submit}
        </div>
      )}

      <button type="submit" className="btn btn-primary" disabled={isLoading}>
        {isLoading ? "Signing In..." : "Sign In"}
      </button>

      <p className="form-footer">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          className="link-button"
          onClick={onSwitchToRegister}
          disabled={isLoading}
        >
          Create one
        </button>
      </p>
    </form>
  );
}

export default LoginForm;
