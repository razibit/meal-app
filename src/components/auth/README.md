# Authentication System

This directory contains the authentication components for the Mess Meal Management application.

## Components

### AuthPage
The main authentication page that toggles between login and signup modes.

### LoginForm
- Email and password authentication
- Form validation with error messages
- Loading states during authentication
- Toggle to switch to signup mode

### SignUpForm
- User registration with name, email, phone (optional), and password
- Password confirmation validation
- Form validation with inline error messages
- Automatic member profile creation
- Toggle to switch to login mode

## Features

- **Form Validation**: Client-side validation for all input fields
- **Error Handling**: Clear error messages for authentication failures
- **Loading States**: Visual feedback during async operations
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Theme Support**: Works with both eggplant and dark themes

## Usage

The authentication system is automatically integrated into the main App component. Users will see the AuthPage when not authenticated and the main app when logged in.

## Store Integration

Authentication state is managed by the `authStore` (Zustand) which provides:
- `user`: Current authenticated member
- `session`: Supabase session
- `loading`: Loading state
- `error`: Error messages
- `signIn()`: Login method
- `signUp()`: Registration method
- `signOut()`: Logout method
- `initialize()`: Initialize auth state on app load
