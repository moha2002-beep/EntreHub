/**
 * seedDatabase.js — Development utility to populate Firestore with test users.
 * Note: Do NOT run this in a production environment.
 */

import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../services/firebase"; // Adjust path if necessary

const SEED_USERS = [
  // --- ENTREPRENEURS ---
  {
    displayName: "Alice Chen",
    email: "alice@example.com",
    role: "entrepreneur",
    currentStage: "idea",
    goals:
      "Looking to validate my EdTech startup idea and find a technical co-founder to build the MVP.",
    interests: ["edtech", "software", "B2C"],
    availabilityPref: "flexible",
    createdAt: "2026-04-20T10:00:00Z",
  },
  {
    displayName: "Marcus Johnson",
    email: "marcus.j@example.com",
    role: "entrepreneur",
    currentStage: "mvp",
    goals:
      "Scaling our MVP to the first 100 paying customers in the FinTech space. Need advice on GTM strategy.",
    interests: ["fintech", "SaaS", "marketing"],
    availabilityPref: "weekends",
    createdAt: "2026-04-21T14:30:00Z",
  },
  // --- MENTORS ---
  {
    displayName: "Dr. Sarah Jenkins",
    email: "sarah.j@example.com",
    role: "mentor",
    headline: "Ex-VP of Engineering at FinTech Corp",
    bio: "I have scaled engineering teams from 5 to 500. Happy to help with architecture, hiring, and technical strategy.",
    availability: "flexible",
    expertiseTags: ["software", "fintech", "leadership", "scaling"],
    yearsOfExperience: 15,
    hourlyRate: 0,
    createdAt: "2026-04-18T09:15:00Z",
  },
  {
    displayName: "David Wu",
    email: "dwu@example.com",
    role: "mentor",
    headline: "Serial Founder & Angel Investor",
    bio: "Founded and exited 3 B2B SaaS companies. I mentor early-stage founders on product-market fit, B2B sales, and fundraising.",
    availability: "weekdays",
    expertiseTags: ["SaaS", "B2B", "fundraising", "marketing"],
    yearsOfExperience: 10,
    hourlyRate: 50,
    createdAt: "2026-04-19T11:45:00Z",
  },
  {
    displayName: "Elena Rodriguez",
    email: "elena.r@example.com",
    role: "mentor",
    headline: "Product Marketing Expert",
    bio: "Specializing in Go-To-Market strategies for EdTech and consumer apps. Let's get your first 1,000 users!",
    availability: "weekends",
    expertiseTags: ["marketing", "edtech", "B2C", "growth"],
    yearsOfExperience: 8,
    hourlyRate: 0,
    createdAt: "2026-04-22T08:20:00Z",
  },
];

export async function runDatabaseSeed() {
  console.log("🌱 Starting database seed...");
  let successCount = 0;

  for (const user of SEED_USERS) {
    try {
      // 1. Generate a predictable ID based on their email prefix (e.g., 'alice' for 'alice@example.com')
      // This prevents creating duplicate documents if you run the seeder twice!
      const customUid = `seed_${user.email.split("@")[0]}`;

      // 2. Convert the string date into a Firebase Timestamp
      const firestoreData = {
        ...user,
        createdAt: Timestamp.fromDate(new Date(user.createdAt)),
      };

      // 3. Write to the database
      await setDoc(doc(db, "users", customUid), firestoreData);
      console.log(`✅ Seeded: ${user.displayName} (${customUid})`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to seed ${user.displayName}:`, error);
    }
  }

  console.log(
    `🎉 Seeding complete! ${successCount}/${SEED_USERS.length} users added.`,
  );
}
