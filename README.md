# EntreHub — Networking & Marketplace Platform for Entrepreneurs

EntreHub connects entrepreneurs, mentors, and investors in one collaborative digital ecosystem, combining mentor matching, session booking, resource sharing, and a moderated community feed in a single platform.

---

## What the software does

EntreHub is a web application that helps early-stage entrepreneurs find and book sessions with mentors, share and discover business resources, and engage in a moderated community discussion space. Each user has a role-specific profile (Entrepreneur, Mentor, or Investor) and a personalised dashboard.

---

## Core features implemented

- **Authentication** — Register, login, logout with role selection (Entrepreneur / Mentor / Investor). Sessions persist on refresh.
- **Role-specific profiles** — Entrepreneurs record stage, goals, and interests. Mentors record headline, expertise tags, availability, and hourly rate.
- **Mentor matching** — Entrepreneurs see a percentage match score for each mentor based on five weighted components: tag overlap, stage alignment, goals text match, experience tier, and availability.
- **Mentor discovery** — Searchable, filterable mentor grid sorted by match score. Multi-select tag filter with active pill display.
- **Booking system** — 3-step calendar booking flow (date → time slot → confirm). Mentors can accept, decline, complete, or cancel. Auto-decline of conflicting slots on acceptance. In-booking messaging included.
- **Resource library** — Mentors submit links or resources by category. All users can browse, filter, and upvote resources.
- **Community feed** —  Real-time posts and nested reply threads with upvoting, category filtering, and sort by New or Top.
- **Content moderation** — Client-side keyword filtering before submission. Service-side second check catches frontend bypasses. Report system hides posts/replies at 3+ reports. Account standing system: warned → suspended (7 days) → banned.
- **Responsive UI** — Fixed navbar with desktop links and mobile hamburger menu. User dropdown with profile and logout.

---

## Setup instructions

### Prerequisites

- Node.js 18 or higher
- A Firebase project with Firestore, Authentication, and Storage enabled
- A terminal or command prompt

### 1. Clone the repository

```bash
git clone https://github.com/moha2002-beep/EntreHub.git
cd entrehub
```

### 2. Install dependencies

```bash
npm install
```
This installs all packages listed in package.json. No additional global installs are required.

### 3. Configure environment variables

Create a `.env.local` file in the project root and replace the placeholder values:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

All values are found in your Firebase project settings under **Project Settings → Your apps → SDK setup and configuration**.

> `.env.local` is listed in `.gitignore` and will never be committed to the repository.

### 4. Run locally

```bash
npm run dev
```
>  You may need to update .firebaserc update with firebase project id 


Open [http://localhost:5173](http://localhost:5173) in your browser.

### Step 5 — (Optional) Seed sample data
 
To populate Firestore with sample mentor and entrepreneur profiles, temporarily add the following to `src/main.jsx`, run the app once, then remove it:
 
```javascript
import { runDatabaseSeed } from './utils/seedDatabase.js';
runDatabaseSeed();
```
 
This creates five test accounts (two entrepreneurs, three mentors) with realistic profile data.

### 6. Build and deploy

```bash
npm run build       # Creates the production bundle in /dist
firebase deploy     # Deploys to Firebase Hosting
```

## Test credentials (demo accounts)

| Role | Email | Password |
|---|---|---|
| Entrepreneur | alice@example.com | *(set during seed)* |
| Mentor | sarah.j@example.com | *(set during seed)* |

> Note: Seed accounts are created via `src/utils/seedDatabase.js`. Run this once in development to populate the database with test mentors and entrepreneurs.

---

## Firebase Firestore schema

### `users/{uid}`
 
```
displayName: string
email: string
role: "entrepreneur" | "mentor" | "investor"
createdAt: Timestamp
photoURL?: string
 
// Mentor-specific
headline?: string
expertiseTags?: string[]
availability?: "weekdays" | "weekends" | "flexible"
availabilityHoursStart?: string     // e.g. "09:00"
availabilityHoursEnd?: string       // e.g. "17:00"
yearsOfExperience?: number
hourlyRate?: number
preferredStages?: string[]
 
// Entrepreneur-specific
currentStage?: "idea" | "mvp" | "growth" | "scaling"
goals?: string
interests?: string[]
availabilityPref?: string
maxHourlyRate?: number
 
// Account standing
accountStatus?: "active" | "warned" | "suspended" | "banned"
violationCount?: number
suspendedUntil?: Timestamp
```
 
### `posts/{postId}`
 
```
title, body, category, authorId, authorName, authorRole: string
createdAt: Timestamp
upvotes: number
upvotedBy, reportedBy: string[]
replyCount, reportCount: number
flagged: boolean
```
 
### `posts/{postId}/replies/{replyId}`
 
```
body, authorId, authorName, authorRole: string
parentId: string | null
isMentorReply: boolean
createdAt: Timestamp
reportCount: number
reportedBy: string[]
```
 
### `bookings/{bookingId}`
 
```
mentorId, mentorName, entrepreneurId, entrepreneurName: string
date: string          // "YYYY-MM-DD"
timeSlot: string      // "HH:00"
hourlyRate: number
message: string
chat: { senderId, senderName, text, timestamp }[]
status: "pending" | "accepted" | "declined" | "completed" | "cancelled"
cancelledBy?: "mentor" | "entrepreneur"
createdAt, updatedAt: Timestamp
```
 
### `resources/{resourceId}`
 
```
title, url, description, category, authorId, authorName, authorRole: string
createdAt: Timestamp
upvotes: number
upvotedBy: string[]
```
 
---

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── BookingCalendar.jsx   # 3-step booking flow
│   ├── BookingCard.jsx       # Single booking display with messaging
│   ├── CreatePost.jsx        # Post composition with moderation gates
│   ├── LoginForm.jsx
│   ├── MentorCard.jsx        # Card with match score badge
│   ├── MentorList.jsx        # Filtered, scored mentor grid
│   ├── Navbar.jsx            # Fixed responsive navigation
│   ├── PostCard.jsx          # Community feed card
│   ├── RegisterForm.jsx
│   └── ReplyThread.jsx       # Nested reply tree with depth cap
├── context/
│   └── AuthContext.jsx       # Auth state provider
├── pages/                    # Route-level page components
│   ├── Bookings.jsx, Community.jsx, Dashboard.jsx
│   ├── Login.jsx, Register.jsx, Profile.jsx
│   ├── Mentors.jsx, MentorDetail.jsx
│   ├── PostDetail.jsx, Resources.jsx
├── services/                 # All Firebase data operations
│   ├── authService.js
│   ├── bookingService.js
│   ├── firebase.js
│   ├── postService.js
│   ├── resourceService.js
│   ├── storageService.js
│   └── userService.js
├── styles/                   # Component-scoped CSS
└── utils/
    ├── matchScore.js         # Weighted mentor scoring algorithm
    ├── moderation.js         # Keyword filter with leetspeak detection
    ├── profileCompletedness.js
    └── formatTime.js
```
 
**Stack:** React 19 · Vite · Firebase 12 (Auth, Firestore, Storage, Hosting) · React Router 7 · Inter font
 
---

## Known limitations

- **Payments are simulated** — hourly rates are displayed and included in booking confirmations, but no real payment processing occurs.
- **Recommendation system is rule-based** — mentor match scores use a weighted scoring algorithm, not machine learning.
- **No admin UI** — the account standing system (warn / suspend / ban) runs automatically on violations, but there is no admin dashboard. Account management requires direct Firestore console access.
- **No email verification** — users can register with any valid email format without verifying ownership.
- **Web only** — no native iOS or Android app; the interface is responsive but browser-based only.
- **Booking calendar is not real-time** — booked slots are fetched on demand when a date is selected, not via a live listener.

---
