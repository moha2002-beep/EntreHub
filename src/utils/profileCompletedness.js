export function getCompleteness(profile) {
  if (!profile) return { percent: 0, missing: ["Profile not created"] };

  const role = profile.role;
  const missing = [];

  const common = ["displayName", "role"];
  common.forEach((f) => {
    if (!profile[f]) missing.push(`Add ${f}`);
  });

  if (role === "mentor") {
    if (!profile.headline) missing.push("Add headline");
    if (!profile.bio) missing.push("Add bio");
    if (!profile.availability) missing.push("Add availability");
    if (!profile.expertiseTags || profile.expertiseTags.length === 0)
      missing.push("Add expertise tags");
  }

  if (role === "entrepreneur") {
    if (!profile.currentStage) missing.push("Add current stage");
    if (!profile.goals) missing.push("Add goals");
    if (!profile.interests || profile.interests.length === 0)
      missing.push("Add interests");
  }

  const total = role === "mentor" ? 6 : role === "entrepreneur" ? 5 : 2;
  const completed = Math.max(total - missing.length, 0);
  const percent = Math.round((completed / total) * 100);

  return { percent, missing: missing.slice(0, 3) };
}
