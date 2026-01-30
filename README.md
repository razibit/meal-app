# Mess Meal Management System

A progressive web application for managing daily meal planning, tracking, and communication for a 16-member boarding mess.

## Features

- Real-time meal registration and tracking
- Morning and night meal periods with cutoff times
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
