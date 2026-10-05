# Mess Meal Management System

A progressive web application for managing daily meal planning, tracking, and communication for a 17-member boarding mess.

## GitHub Pages demo

This folder is the static, browser-local demo published at `https://razibit.github.io/meal-app/`. It does not connect to Supabase. Edits made in the demo stay in this browser's local storage and can be cleared by resetting this demo's site data.

The initial snapshot reflects the live app's visible July 2026 billing period: 719.5 total meals, ৳33,579 in deposits, and ৳33,566 in cash grocery expenses. The **Current Available Balance** is the boarding's shared balance, calculated from those totals (৳13); it is not an individual member's pocket balance. The October 2026 grocery-duty assignments are also included. The demo starts in the light theme and remembers a theme choice separately from the production app.

Build for Pages with `npm run build:pages`. The generated site is in `dist/` and is deployed by the repository's Pages workflow. Whiteboard image selection and meal editing work locally; OCR recognition itself requires the production service and is not available in this offline demo.

## Features

- Real-time meal registration and tracking
- Breakfast, lunch, and dinner meal management
- **Reliable time synchronization** with server to prevent manipulation
- Live chat with @mentions and notifications
- Monthly meal consumption reports
- PWA support with offline functionality
- Responsive mobile-first design
- Dark mode and eggplant theme

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **PWA**: Workbox + vite-plugin-pwa
- **Routing**: React Router

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

4. Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/     # React components
│   ├── layout/    # Layout components (Header, Nav, etc.)
│   ├── home/      # Home tab components
│   ├── chat/      # Chat tab components
│   └── preferences/ # Preferences tab components
├── hooks/         # Custom React hooks
├── stores/        # Zustand state stores
├── services/      # External services (Supabase, notifications, time sync)
├── utils/         # Utility functions
└── types/         # TypeScript type definitions
```

## Key Documentation

- [Time Synchronization Implementation](./TIME_SYNC_IMPLEMENTATION.md) - Detailed time sync architecture
- [Time Sync Deployment Guide](./TIME_SYNC_DEPLOYMENT.md) - Step-by-step deployment instructions
- [PWA Implementation](./docs/PWA_IMPLEMENTATION.md) - Progressive Web App setup
- [Push Notifications](./docs/PUSH_NOTIFICATIONS.md) - Push notification configuration

## Environment Variables

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `VITE_VAPID_PUBLIC_KEY` - VAPID public key for push notifications

## License

Private project for mess management.
