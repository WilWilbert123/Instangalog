# Instangalog

Instangalog is a progressive multimedia social platform built with Next.js 16 (App Router), TypeScript, Tailwind CSS, and Supabase. It features an FYP vertical video feed, image and status posts, audio streaming, global real-time chat, public browsing with an auth guard modal, light and dark mode support, and an administrative moderation desk.

---

## Technical Stack

- Framework: Next.js 16 (App Router with Turbopack)
- Language: TypeScript
- Styling: Tailwind CSS (Monochrome Black and White theme)
- Backend & Database: Supabase (PostgreSQL, Auth, Storage, Realtime)
- State Management: Zustand (with localStorage persistence)
- Icons: Lucide React
- Progressive Web App: Custom Service Worker, Web Manifest, Offline Fallback

---

## Step-by-Step Setup Guide

Follow these steps to configure and run Instangalog on your local environment.

### Step 1: System Prerequisites

Ensure you have the following installed on your machine:
- Node.js 18.x or later
- npm 9.x or later
- A Supabase account (or local Supabase CLI setup)

---

### Step 2: Install Dependencies

Open your terminal in the project root directory and install all required Node modules:

```bash
npm install
```

---

### Step 3: Set Up Supabase Database & Security Policies

1. Log into your Supabase Dashboard and create a new project.
2. Navigate to the SQL Editor in your Supabase dashboard.
3. Open `supabase/migrations/001_initial_schema.sql` from this repository.
4. Paste the schema SQL into the Supabase SQL Editor and click Run. This creates:
   - User profiles table and triggers
   - Posts table with video, image, music, and text support
   - Comments, replies, likes, shares, and follow tables
   - Global chat messages table
   - Video moderation queue table
   - Row Level Security (RLS) policies
5. Optionally, open `supabase/seed.sql` and execute it in the SQL Editor to populate sample test data.

---

### Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

2. Open `.env.local` and replace the placeholder values with your Supabase and Cloudinary credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### Step 5: Start Development Server

Run the Next.js development server:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

---

### Step 6: Build for Production

To create an optimized production build, run:

```bash
npm run build
```

To start the production server after building:

```bash
npm run start
```

---

## Core Features and Application Routes

- `/fyp` - Vertical scroll-snap video feed with play/pause controls, likes, and comment drawers.
- `/explore` - Public discovery feed for music tracks, image posts, and status updates.
- `/following` - Feed restricted to content from creators you follow.
- `/upload` - Content publication desk for video, music, image, and text posts.
- `/chat` - Global real-time chat drawer and dedicated room.
- `/profile` - User profile overview, posts tab, liked media, and settings.
- `/admin` - Administrative desk for content moderation, user management, reports, and system settings.
- `/settings` - User account preferences and light/dark theme toggle.

---

## Project Structure Overview

```
instangalog/
├── app/                  # Next.js App Router routes and page components
│   ├── admin/            # Admin Desk routes (videos, users, reports, chat, settings)
│   ├── api/              # API Route handlers for feed, comments, and admin actions
│   ├── (auth)/           # Authentication pages (login, register, forgot-password)
│   ├── explore/          # Discovery feed page
│   ├── fyp/              # FYP vertical video feed page
│   ├── profile/          # User profile pages
│   ├── upload/           # Content creation desk
│   └── globals.css       # Global styles and monochrome theme tokens
├── components/           # Reusable UI components
│   ├── admin/            # Admin moderation cards and sidebar
│   ├── fyp/              # VideoCard and feed controls
│   ├── layout/           # Desktop sidebar, mobile bottom navigation, header
│   ├── media/            # Music player bar and music card components
│   ├── modals/           # Auth guard modal and comment drawers
│   └── pwa/              # Install banners and offline indicators
├── lib/                  # Services, Supabase client initialization, mock data
├── stores/               # Zustand state stores (theme, auth, player, PWA)
├── supabase/             # Database migrations and seed SQL scripts
├── types/                # TypeScript interfaces and Supabase schema definitions
├── .env.example          # Environment variables reference template
└── README.md             # Project documentation
```

---

## License

Private repository. All rights reserved.
# Instangalog
