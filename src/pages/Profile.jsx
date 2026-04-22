/**
 * Profile.jsx — Multi-mode user profile management.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getUserProfile,
  getRoleSpecificFields,
  updateUserProfile,
} from "../services/userService";
import { uploadProfileImage } from "../services/storageService";
import { moderateContent } from "../utils/moderation";
import Navbar from "../components/Navbar";
import "../styles/Profile.css";

const LIST_FIELDS = new Set([
  "interests",
  "expertiseTags",
  "investmentFocus",
  "portfolio",
  "preferredStages",
]);

const NUMBER_FIELDS = new Set(["yearsOfExperience", "hourlyRate", "maxHourlyRate"]);

const roleLabelMap = {
  entrepreneur: "Entrepreneur",
  investor: "Investor",
  mentor: "Mentor",
};

// Maps raw Firestore field values to human-readable labels shown in view mode
const valueLabelMap = {
  currentStage: {
    idea: "Idea Stage",
    mvp: "MVP",
    growth: "Growth",
    scaling: "Scaling",
  },
  availability: {
    weekdays: "Weekdays",
    weekends: "Weekends",
    flexible: "Flexible",
  },
  preferredStages: {
    idea: "Idea Stage",
    mvp: "MVP",
    growth: "Growth",
    scaling: "Scaling",
  },
  availabilityPref: {
    weekdays: "Weekdays",
    weekends: "Weekends",
    flexible: "Flexible",
  },
};

function parseCommaList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(String).map((s) => s.trim()).filter(Boolean);
  }
  return String(value).split(",").map((s) => s.trim()).filter(Boolean);
}

function arraysEqual(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Converts Firestore data types into input-ready strings.
 */
function toInputValue(key, value) {
  if (value === undefined || value === null) return "";
  if (LIST_FIELDS.has(key)) return parseCommaList(value).join(", ");
  if (typeof value === "object" && typeof value.toDate === "function") {
    try {
      return value.toDate().toISOString().split("T")[0];
    } catch {
      return "";
    }
  }
  return String(value);
}

function formatValue(key, value) {
  if (value === undefined || value === null || value === "") return "Not provided";

  if (typeof value === "object" && typeof value.toDate === "function") {
    try {
      return value.toDate().toLocaleDateString();
    } catch {
      // ignore
    }
  }

  const labelMap = valueLabelMap[key];
  if (labelMap && typeof value === "string") {
    return labelMap[value] || value;
  }

  return String(value);
}

function buildFormData(profile, fallbackEmail) {
  const roleFields = getRoleSpecificFields(profile?.role);
  const next = {
    displayName: profile?.displayName ?? "",
    email: profile?.email ?? fallbackEmail ?? "",
    bio: profile?.bio ?? "",
    location: profile?.location ?? "",
  };
  for (const field of roleFields.fields) {
    next[field.key] = toInputValue(field.key, profile?.[field.key]);
  }
  return next;
}

function TagPills({ fieldKey, value }) {
  const items = parseCommaList(value);
  if (!items.length) return <span className="profile-field-empty">Not provided</span>;
  const labelMap = valueLabelMap[fieldKey];
  return (
    <div className="profile-tag-pill-list">
      {items.map((v) => {
        const label = labelMap ? (labelMap[v] || v) : v;
        return (
          <span key={v} className="profile-tag-pill">
            {label}
          </span>
        );
      })}
    </div>
  );
}

function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isEditing = searchParams.get("mode") === "edit";

  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  const fileInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState("");

  const roleFields = useMemo(() => {
    if (!profile?.role) return { section: "", fields: [] };
    return getRoleSpecificFields(profile.role);
  }, [profile?.role]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setErrors({});
      try {
        const data = await getUserProfile(user.uid);
        if (cancelled) return;
        setProfile(data);
        if (data) setFormData(buildFormData(data, user.email));
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setErrors({ general: "Could not load your profile." });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user]);

  const enterEditMode = () => {
    setSuccessMessage("");
    setErrors({});
    setSearchParams({ mode: "edit" }, { replace: true });
  };

  const exitEditMode = () => {
    setSearchParams({}, { replace: true });
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Please select an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setImageError("Image must be under 2 MB.");
      return;
    }
    setImageError("");
    setUploadingImage(true);
    try {
      const url = await uploadProfileImage(user.uid, file);
      await updateUserProfile(user.uid, { photoURL: url });
      setProfile((prev) => ({ ...prev, photoURL: url }));
    } catch (err) {
      console.error(err);
      setImageError("Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleCancel = () => {
    if (profile) setFormData(buildFormData(profile, user?.email));
    setErrors({});
    setSuccessMessage("");
    exitEditMode();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  /**
   * Validates profile fields and runs safety content moderation.
   */
  const validate = () => {
    const nextErrors = {};
    
    if (!String(formData.displayName || "").trim()) {
      nextErrors.displayName = "Full name is required";
    }

    const textToModerate = [
      { key: "displayName", label: "Full Name", value: formData.displayName },
      { key: "bio", label: "Bio", value: formData.bio },
    ];

    for (const field of roleFields.fields) {
      if (field.type === "text" || field.type === "textarea") {
        textToModerate.push({ key: field.key, label: field.label, value: formData[field.key] });
      }
      
      if (!field.required) continue;
      const raw = formData[field.key];
      if (LIST_FIELDS.has(field.key)) {
        if (parseCommaList(raw).length === 0)
          nextErrors[field.key] = `${field.label} is required`;
      } else if (!String(raw || "").trim()) {
        nextErrors[field.key] = `${field.label} is required`;
      }
    }

    textToModerate.forEach((item) => {
      if (!item.value) return;
      const check = moderateContent(item.value);
      if (!check.safe) {
        nextErrors[item.key] = `Restricted content found: "${check.flaggedWords.join('", "')}"`;
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  /**
   * Logic: Calculates 'delta' change to minimize Firestore bandwidth.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !profile) return;
    setSuccessMessage("");
    if (!validate()) return;
    setSaving(true);
    try {
      const editableKeys = [
        "displayName", "bio", "location",
        ...roleFields.fields.map((f) => f.key),
      ];
      const nextValues = {};
      for (const key of editableKeys) {
        const raw = formData[key];
        if (LIST_FIELDS.has(key)) {
          nextValues[key] = parseCommaList(raw);
        } else if (NUMBER_FIELDS.has(key)) {
          const trimmed = String(raw ?? "").trim();
          nextValues[key] = trimmed ? Number(trimmed) : null;
        } else {
          nextValues[key] = raw ?? "";
        }
      }
      
      const changes = {};
      for (const key of editableKeys) {
        const current = profile[key];
        const next = nextValues[key];
        if (LIST_FIELDS.has(key)) {
          if (!arraysEqual(parseCommaList(current), next)) changes[key] = next;
          continue;
        }
        if (NUMBER_FIELDS.has(key)) {
          const currentNum = (current === undefined || current === null || current === "") ? null : Number(current);
          const nextNum = next === null ? null : Number(next);
          if (currentNum !== nextNum) changes[key] = nextNum;
          continue;
        }
        const currentText = current ?? "";
        if (currentText !== next) changes[key] = next;
      }

      if (Object.keys(changes).length === 0) {
        setSuccessMessage("No changes to save.");
        exitEditMode();
        return;
      }
      await updateUserProfile(user.uid, changes);
      const updated = { ...profile, ...changes };
      setProfile(updated);
      setFormData(buildFormData(updated, user.email));
      setSuccessMessage("Profile updated.");
      exitEditMode();
    } catch (err) {
      console.error(err);
      setErrors({ general: "Failed to save changes. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="page-shell">
        <Navbar />
        <div className="page-body">
          <div className="loading-state">
            <div className="spinner spinner-light" />
            <p className="loading-state-text">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-shell">
        <Navbar />
        <div className="page-body">
          <div className="page-inner-narrow">
            <div className="empty-state">
              <div className="empty-state-icon">👤</div>
              <h2 className="empty-state-heading">No profile found</h2>
              <p className="empty-state-text">We couldn't find a profile for this account.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const roleLabel = roleLabelMap[profile.role] || profile.role || "Member";
  const avatarInitial = (profile.displayName || user.email || "?")[0].toUpperCase();

  const heroCard = (
    <div className="profile-hero">
      <div className="profile-hero-avatar-wrap">
        {profile.photoURL ? (
          <img
            className="profile-hero-avatar-img"
            src={profile.photoURL}
            alt={`${profile.displayName || "User"}'s avatar`}
          />
        ) : (
          <div className="profile-hero-avatar-placeholder">{avatarInitial}</div>
        )}
        {isEditing && (
          <button
            type="button"
            className="profile-avatar-overlay"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            title="Change photo"
          >
            {uploadingImage ? "..." : "Edit"}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleImageChange}
      />

      <div className="profile-hero-info">
        <h1 className="profile-hero-name">
          {profile.displayName || user.email}
        </h1>
        <div className="profile-hero-meta">
          <span className="profile-pill">{roleLabel}</span>
          {profile.location && (
            <span className="profile-hero-location">{profile.location}</span>
          )}
        </div>
        {!isEditing && profile.bio && (
          <p className="profile-hero-bio">{profile.bio}</p>
        )}
        {isEditing && (
          <p className="profile-hero-edit-hint">
            Update your information using the form below.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="page-shell">
      <Navbar />

      <div className="page-body page-entry">
        <div className="profile-container">
          <div className="profile-action-bar">
            {!isEditing && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={enterEditMode}
              >
                Edit Profile
              </button>
            )}
            {isEditing && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel Editing
              </button>
            )}
          </div>

          {errors.general && (
            <div className="alert alert-error">{errors.general}</div>
          )}
          {successMessage && (
            <div className="alert alert-success">{successMessage}</div>
          )}
          {imageError && (
            <p className="profile-image-error">{imageError}</p>
          )}

          {heroCard}

          {!isEditing ? (
          <>
            <section className="profile-section">
              <h2 className="profile-section-title">Basic Information</h2>

              <div className="profile-field">
                <div className="profile-field-label">Email</div>
                <div className="profile-field-value">
                  {profile.email || user.email || "Not provided"}
                </div>
              </div>

              <div className="profile-field">
                <div className="profile-field-label">Location</div>
                <div className="profile-field-value">
                  {formatValue("location", profile.location)}
                </div>
              </div>

              <div className="profile-field">
                <div className="profile-field-label">Bio</div>
                <div className="profile-field-value">
                  {formatValue("bio", profile.bio)}
                </div>
              </div>
            </section>

            {roleFields.fields.length > 0 && (
              <section className="profile-section">
                <h2 className="profile-section-title">{roleFields.section}</h2>

                {roleFields.fields.map((field) => (
                  <div key={field.key} className="profile-field">
                    <div className="profile-field-label">{field.label}</div>
                    <div className="profile-field-value">
                      {LIST_FIELDS.has(field.key) ? (
                        <TagPills
                          fieldKey={field.key}
                          value={profile[field.key]}
                        />
                      ) : (
                        formatValue(field.key, profile[field.key])
                      )}
                    </div>
                  </div>
                ))}
              </section>
            )}
          </>
        ) : (
          <form onSubmit={handleSubmit}>
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
                  disabled={saving}
                />
                {errors.displayName && (
                  <span className="error-message">{errors.displayName}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email || ""}
                  disabled
                  className="disabled-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio || ""}
                  onChange={handleInputChange}
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
                  disabled={saving}
                />
              </div>
            </fieldset>

            {roleFields.fields.length > 0 && (
              <fieldset className="profile-section">
                <legend>{roleFields.section}</legend>

                {roleFields.fields.map((field) => (
                  <div key={field.key} className="form-group">
                    <label htmlFor={field.key}>
                      {field.label}
                      {field.required && " *"}
                    </label>

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
                        {field.options
                          ? field.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))
                          : null}
                        {!field.options && field.key === "currentStage" && (
                          <>
                            <option value="idea">Idea Stage</option>
                            <option value="mvp">MVP</option>
                            <option value="growth">Growth</option>
                            <option value="scaling">Scaling</option>
                          </>
                        )}
                        {!field.options && field.key === "availability" && (
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

                    {field.type === "checkboxgroup" && (
                      <div className="profile-checkbox-group">
                        {(field.options || []).map((opt) => {
                          const currentArr = parseCommaList(formData[field.key] || "");
                          const isChecked = currentArr.includes(opt.value);
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              disabled={saving}
                              aria-pressed={isChecked}
                              className={`profile-checkbox-option${isChecked ? " profile-checkbox-option-checked" : ""}`}
                              onClick={() => {
                                const next = isChecked
                                  ? currentArr.filter((v) => v !== opt.value)
                                  : [...currentArr, opt.value];
                                handleInputChange({
                                  target: { name: field.key, value: next.join(", ") },
                                });
                              }}
                            >
                              <span
                                className={`profile-checkbox-box${isChecked ? " profile-checkbox-box-checked" : ""}`}
                                aria-hidden="true"
                              />
                              <span>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
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

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
