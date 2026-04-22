# EntreHub — User Guide

EntreHub is a web-based networking and mentorship platform that connects entrepreneurs with experienced mentors, enabling them to discover each other, book one-on-one sessions, and engage in a community discussion forum.

---

## Table of Contents

1. [Core Features](#core-features)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Setup & Installation](#setup--installation)
5. [Running the App](#running-the-app)
6. [Test Credentials & Sample Data](#test-credentials--sample-data)
7. [Feature Walkthroughs](#feature-walkthroughs)
8. [Known Limitations](#known-limitations)

---

## Core Features

- **Role-Based Registration** — Sign up as an Entrepreneur, Mentor, or Investor (Investor role is UI-only; see limitations)
- **User Profiles** — Role-specific profiles with bio, expertise tags, startup stage, goals, hourly rates, and availability windows; supports profile photo upload
- **Profile Completeness Tracker** — Dashboard widget shows completion percentage and flags missing fields
- **Mentor Discovery** — Browse and search all mentors; filter by expertise tags; grid layout
- **AI-Style Match Scoring** — Entrepreneurs see a 0–100 compatibility score for each mentor based on tag overlap, startup stage alignment, stated goals, mentor experience tier, and availability preference
- **Booking System** — Entrepreneurs request sessions with mentors via an interactive calendar; mentors accept/decline; both sides can exchange messages on a booking; session history tracked
- **Double-Booking Prevention** — Already-accepted time slots are greyed out on the booking calendar
- **Community Feed** — Create, upvote, and reply to posts across five categories (Ask a Mentor, Share a Win, Resource Request, Idea Feedback, General)
- **Post Reporting & Moderation** — Community members can report posts and replies; content with 3+ reports is hidden automatically
- **Resource Library** — Submit and upvote links (articles, tools, templates, videos, podcasts, books); filter by category and sort by newest or most upvoted
- **Content Moderation** — All user-generated text is screened for blocked words and threatening language before being written to the database
- **Account Standing System** — Repeated violations escalate through warnings → 7-day suspension → permanent ban
- **Real-Time Updates** — All feeds (bookings, posts, replies, resources) use Firestore `onSnapshot` listeners for live data without page refresh

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7 |
| Build Tool | Vite 7 |
| Backend / Database | Firebase (Authentication, Firestore, Cloud Storage) |
| Styling | Custom CSS (no UI framework) |
| State Management | React Context API |
| Real-Time Data | Firestore onSnapshot listeners |

---

## Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** v18 or higher — [https://nodejs.org](https://nodejs.org)
- **npm** v9 or higher (bundled with Node.js)
- A modern web browser (Chrome, Firefox, Edge, Safari)

You do **not** need to install or configure Firebase yourself. The project connects to a pre-configured Firebase project (`entrehub-d4b98`) and the credentials are already included in `src/services/firebase.js`.

---

## Setup & Installation

### Step 1 — Clone or download the project

If you received the project as a zip file, extract it to a folder of your choice.

If cloning from a repository:

```bash
git clone <repository-url>
cd EntreHub
```

### Step 2 — Install dependencies

From the project root directory, run:

```bash
npm install
```

This will install all required packages listed in `package.json`, including React, React Router, and the Firebase SDK. Installation takes approximately 30–60 seconds.

### Step 3 — Verify the Firebase configuration

Open `src/services/firebase.js` and confirm the config block is present:

```js
const firebaseConfig = {
  apiKey: "AIzaSyD6vPmYDyV31fVJcFuunf4zQRLW-GMuqAw",
  authDomain: "entrehub-d4b98.firebaseapp.com",
  projectId: "entrehub-d4b98",
  storageBucket: "entrehub-d4b98.firebasestorage.app",
  messagingSenderId: "105985969589",
  appId: "1:105985969589:web:f0508b13a85980ac0a5dfc"
};
```

No changes are needed here. The app is pre-wired to the live Firebase project.

---

## Running the App

### Development server

```bash
npm run dev
```

Vite will start a local development server. Open your browser and navigate to:

```
http://localhost:5173
```

The server supports hot-module replacement (HMR), so changes to source files are reflected instantly without a full page reload.

### Production build

```bash
npm run build
```

Output is placed in the `dist/` folder. To preview the production build locally:

```bash
npm run preview
```

---

## Test Credentials & Sample Data

### Creating your own account

Navigate to `http://localhost:5173/register` and fill in:

| Field | Value |
|---|---|
| Display Name | Any name (e.g. `Jane Founder`) |
| Email | Any valid email format (e.g. `jane@test.com`) |
| Password | Min 8 characters, at least one uppercase letter, one number and one special character (!, £, $, %) |
| Role | **Entrepreneur** or **Mentor** recommended to access all features |

> The email does not need to be a real inbox — Firebase does not send a verification email in this build.

### Seeding the database with demo data

The app includes a built-in seed utility. After logging in:

1. Go to the **Dashboard**
2. Click the **"Seed Database"** button (visible at the bottom of the dashboard)
3. Wait for the confirmation alert

This populates Firestore with sample mentors, entrepreneurs, community posts, bookings, and resources so you can explore all features without creating content manually.

> **Note:** Running the seed multiple times may create duplicate entries. It is intended for first-time setup only.

### Suggested test flow

| Step | Action |
|---|---|
| 1 | Register as an **Entrepreneur** |
| 2 | Seed the database from the Dashboard |
| 3 | Complete your profile — add startup stage, goals, and interests |
| 4 | Go to **Mentors** and observe match scores on each card |
| 5 | Click a mentor card, view their detail page, and book a session using the calendar |
| 6 | Register a second account as a **Mentor** (use a different email) |
| 7 | On the Mentor account, go to **Bookings** and accept the pending request |
| 8 | Send a message inside the booking card |
| 9 | Post in the **Community** feed, reply to a post, and upvote content |
| 10 | Submit a resource link in the **Resources** library |

---

## Feature Walkthroughs

### Dashboard

The dashboard is the main hub after login. It shows:

- A welcome card with your avatar or initials
- A **Profile Completeness** card listing up to three missing fields with a "Complete Profile" link
- A **Your Role** card summarising what EntreHub offers for your role
- Navigation tiles for Mentors, Bookings, and Community — the Bookings tile shows a live badge with the count of pending requests

### Profile (`/profile`)

- Click **"Edit Profile"** to enter edit mode
- Role-specific fields:
  - **Entrepreneurs**: current stage, goals, interests, founded date, availability preference, maximum hourly rate budget
  - **Mentors**: headline, expertise tags, availability days, availability hours (start/end), years of experience, hourly rate, preferred startup stages
- Upload a profile photo (max 2 MB; JPEG or PNG)
- Click **"Save Changes"** — only modified fields are sent to the database

### Mentor Discovery (`/mentors`)

- Use the **search bar** to filter mentors by name
- Use the **"Filter by Tag"** dropdown to narrow by expertise area
- If you are an Entrepreneur with interests or a startup stage set on your profile, each mentor card displays a **match score** (0–100) calculated from:
  - Tag overlap between your interests and their expertise (30 pts)
  - Startup stage alignment (30 pts)
  - Goals text matching mentor tags (20 pts)
  - Mentor experience tier (15 pts)
  - Availability preference alignment (5 pts)

### Booking a Session (`/mentors/:id`)

1. Open a mentor's detail page
2. Select a **date** on the calendar (unavailable dates are greyed out)
3. Select an available **time slot** (already-booked slots are greyed out)
4. Optionally add a message
5. Click **"Confirm Booking"**

The mentor sees the request on their Bookings page and can accept or decline. Both parties can exchange messages directly inside the booking card.

### Community (`/community`)

- **Create a post** using the form at the top; select a category from the dropdown
- **Sort** the feed by "New" (latest first) or "Top" (most upvoted)
- **Filter** by category using the pill buttons
- Click a post title to open its detail page, read replies, and write a reply
- **Upvote** posts and replies using the arrow button
- **Report** inappropriate content using the flag icon — posts/replies with 3 or more reports are hidden from the feed

### Resources (`/resources`)

- **Submit a resource** using the form: title, URL, description, and category
- **Sort** by newest or most upvoted using the toggle buttons
- **Filter** by category (Article, Tool, Template, Video, Podcast, Book)
- **Upvote** resources you find useful (click again to remove your vote)

---

## Known Limitations

This is a Minimum Viable Product (MVP) that satisfies the core project requirements. The following features are **not yet implemented** or are only **partially implemented**:

### Investor Account
The Investor role can be selected during registration and a basic profile can be saved, but there is no investor-specific functionality. There is no deal flow, portfolio management, or investor-entrepreneur matching. Investors are currently limited to the community and resource features available to all users.

### Payment System
The booking system records mentor hourly rates and surfaces them during booking, but **no payments are processed**. There is no Stripe or payment gateway integration. Rates are displayed for informational purposes only.

### Resources — Partial Implementation
The Resource Library is functional (submit, upvote, filter, sort) but is a stretch feature and is not fully built out. There is no admin curation workflow, no broken-link detection, and no keyword search beyond category filtering.

### Admin Dashboard
There is no dedicated admin interface. Content moderation relies on the automated word filter and community reporting system. Reviewing flagged content manually requires direct access to the Firebase Firestore console.

### Email Verification
Firebase Authentication accepts any email format at registration without verifying inbox ownership. A verification email is not sent.

### Password Reset
There is no "Forgot Password" flow in the UI. Password resets must be triggered manually via the Firebase Authentication console.

### Mobile Responsiveness
The UI is designed primarily for desktop viewports. Some pages (the booking calendar and mentor grid in particular) may not render optimally on small mobile screens.

### Nested Replies
The community reply thread supports one level of replies only. There is no ability to reply to a specific reply.

### Notifications
There is no push notification or email notification system. Users must manually check the Bookings page for new requests or status updates. The Dashboard tile badge provides a basic pending-count indicator only.
