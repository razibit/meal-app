# Authentication System

This directory contains the authentication components for the Mess Meal Management application.

## Components

### AuthPage
The admin-only authentication page.

### LoginForm
- Email and password authentication
- Form validation with error messages
- Loading states during authentication

## Features

- **Form Validation**: Client-side validation for all input fields
- **Error Handling**: Clear error messages for authentication failures
- **Loading States**: Visual feedback during async operations
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Theme Support**: Works with both eggplant and dark themes

## Usage

The authentication system is automatically integrated into the main App component. Admins see the AuthPage when not authenticated and the main app when logged in. Regular members do not create accounts.

## Store Integration

Authentication state is managed by the `authStore` (Zustand) which provides:
- `user`: Current authenticated member
- `session`: Supabase session
- `loading`: Loading state
- `error`: Error messages
- `signIn()`: Login method
- `signOut()`: Logout method
- `initialize()`: Initialize auth state on app load
