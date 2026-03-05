import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getUserProfile,
  updateUserProfile,
  getRoleSpecificFields,
} from "../services/userService";
import "../styles/EditProfile.css";

function EditProfile() {
  // ==================== STATE MANAGEMENT ====================
  // These state variables track:
  // 1. The profile data being edited
  // 2. Loading/error states
  // 3. Form submission status

  const { user } = useAuth(); // Get current logged-in user
  const navigate = useNavigate(); // For redirection after save

  const [profile, setProfile] = useState(null); // The loaded profile data
  const [formData, setFormData] = useState({}); // What user is currently editing
  const [errors, setErrors] = useState({}); // Validation errors
  const [loading, setLoading] = useState(true); // Loading profile
  const [saving, setSaving] = useState(false); // Saving changes
  const [successMessage, setSuccessMessage] = useState(""); // Success feedback

  // ==================== LOADING PROFILE ====================
  // This runs once when component mounts
  // It fetches the user's existing profile from Firestore

  useEffect(() => {
    if (!user) return; // Don't load if no user

    const loadProfile = async () => {
      try {
        // Get the user's profile from Firestore
        const data = await getUserProfile(user.uid);

        if (data) {
          setProfile(data);
          setFormData(data); // Initialize form with existing data
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
        setErrors({ general: "Could not load your profile." });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  // ==================== VALIDATION LOGIC ====================
  // This checks that required fields are filled

  const validateForm = () => {
    const newErrors = {};
    const roleFields = getRoleSpecificFields(profile?.role);

    // Check each required field
    roleFields.fields.forEach((field) => {
      if (field.required && !formData[field.key]) {
        newErrors[field.key] = `${field.label} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ==================== HANDLE INPUT CHANGES ====================
  // This function runs every time user types in a field

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Update the form data
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // ==================== HANDLE FORM SUBMISSION ====================
  // This function runs when user clicks "Save Changes"

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Step 1: Validate the form
    if (!validateForm()) {
      console.log("Form has errors, not submitting");
      return;
    }

    // Step 2: Set loading state (disable button, show "Saving...")
    setSaving(true);
    setSuccessMessage("");

    try {
      // Step 3: Calculate what actually changed
      // We only send fields that are different from original
      const changes = {};

      Object.keys(formData).forEach((key) => {
        // Compare current value with original value
        if (formData[key] !== profile[key]) {
          changes[key] = formData[key];
        }
      });

      // Step 4: Send update to Firestore
      // updateUserProfile automatically adds updatedAt timestamp
      await updateUserProfile(user.uid, changes);

      // Step 5: Update local state with new data
      setProfile({
        ...profile,
        ...changes,
      });

      // Step 6: Show success message
      setSuccessMessage("Profile updated successfully!");

      // Step 7: Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (err) {
      console.error("Failed to update profile:", err);
      setErrors({
        general: "Failed to save changes. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  // ==================== RENDER LOADING STATE ====================

  if (loading) {
    return (
      <div className="edit-profile-page">
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="edit-profile-page">
        <p>No profile found.</p>
        <button onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  // ==================== GET ROLE-SPECIFIC FIELDS ====================
  // This returns an array of fields specific to the user's role

  const roleFields = getRoleSpecificFields(profile.role);

  // ==================== RENDER COMPONENT ====================

  return (
    <div className="edit-profile-page">
      <div className="edit-profile-container">
        <h1>Edit Your Profile</h1>

        {/* Global Error Message */}
        {errors.general && (
          <div className="alert alert-error">{errors.general}</div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="alert alert-success">{successMessage}</div>
        )}

        <form onSubmit={handleSubmit} className="edit-profile-form">
          {/* ========== COMMON FIELDS TAB ========== */}
          <fieldset className="profile-section">
            <legend>Basic Information</legend>

            <div className="form-group">
              <label htmlFor="displayName">Full Name *</label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={formData.displayName || ""}
                onChange={handleInputChange}
                placeholder="Your full name"
                disabled={saving}
              />
              {errors.displayName && (
                <span className="error-message">{errors.displayName}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email || ""}
                disabled // Email should not be editable
                className="disabled-input"
              />
              <small>
                Email cannot be changed here. Contact support if needed.
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio || ""}
                onChange={handleInputChange}
                placeholder="Tell us about yourself"
                disabled={saving}
                rows="4"
              />
            </div>

            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location || ""}
                onChange={handleInputChange}
                placeholder="City, Country"
                disabled={saving}
              />
            </div>
          </fieldset>

          {/* ========== ROLE-SPECIFIC FIELDS ========== */}
          {roleFields.fields.length > 0 && (
            <fieldset className="profile-section">
              <legend>{roleFields.section}</legend>

              {roleFields.fields.map((field) => (
                <div key={field.key} className="form-group">
                  <label htmlFor={field.key}>
                    {field.label}
                    {field.required && " *"}
                  </label>

                  {/* RENDER DIFFERENT INPUT TYPES */}
                  {field.type === "text" && (
                    <input
                      type="text"
                      id={field.key}
                      name={field.key}
                      value={formData[field.key] || ""}
                      onChange={handleInputChange}
                      disabled={saving}
                    />
                  )}

                  {field.type === "textarea" && (
                    <textarea
                      id={field.key}
                      name={field.key}
                      value={formData[field.key] || ""}
                      onChange={handleInputChange}
                      disabled={saving}
                      rows="3"
                    />
                  )}

                  {field.type === "select" && (
                    <select
                      id={field.key}
                      name={field.key}
                      value={formData[field.key] || ""}
                      onChange={handleInputChange}
                      disabled={saving}
                    >
                      <option value="">-- Select --</option>
                      {/* Dynamic options based on field */}
                      {field.key === "currentStage" && (
                        <>
                          <option value="idea">Idea Stage</option>
                          <option value="mvp">MVP</option>
                          <option value="growth">Growth</option>
                          <option value="scaling">Scaling</option>
                        </>
                      )}
                      {field.key === "availability" && (
                        <>
                          <option value="weekdays">Weekdays</option>
                          <option value="weekends">Weekends</option>
                          <option value="flexible">Flexible</option>
                        </>
                      )}
                    </select>
                  )}

                  {field.type === "number" && (
                    <input
                      type="number"
                      id={field.key}
                      name={field.key}
                      value={formData[field.key] || ""}
                      onChange={handleInputChange}
                      disabled={saving}
                    />
                  )}

                  {field.type === "date" && (
                    <input
                      type="date"
                      id={field.key}
                      name={field.key}
                      value={formData[field.key] || ""}
                      onChange={handleInputChange}
                      disabled={saving}
                    />
                  )}

                  {errors[field.key] && (
                    <span className="error-message">{errors[field.key]}</span>
                  )}
                </div>
              ))}
            </fieldset>
          )}

          {/* ========== BUTTONS ========== */}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate("/dashboard")}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProfile;
