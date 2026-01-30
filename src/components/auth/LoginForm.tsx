import { useState, FormEvent } from 'react';
import { useAuthStore } from '../../stores/authStore';

interface LoginFormProps {
  onToggleMode: () => void;
}

export default function LoginForm({ onToggleMode }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const { signIn, loading, error, clearError } = useAuthStore();

  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    // Email validation
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    clearError();

    try {
      await signIn(email, password);
    } catch (err) {
      // Error is handled by the store
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-bg-secondary rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-primary mb-6 text-center">
        Sign In
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (validationErrors.email) {
                setValidationErrors({ ...validationErrors, email: undefined });
              }
            }}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-text-primary bg-bg-primary placeholder:text-text-tertiary ${
              validationErrors.email
                ? 'border-error'
                : 'border-border'
            }`}
            placeholder="your.email@example.com"
            disabled={loading}
          />
          {validationErrors.email && (
            <p className="mt-1 text-sm text-error">{validationErrors.email}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (validationErrors.password) {
                setValidationErrors({ ...validationErrors, password: undefined });
              }
            }}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-text-primary bg-bg-primary placeholder:text-text-tertiary ${
              validationErrors.password
                ? 'border-error'
                : 'border-border'
            }`}
            placeholder="••••••••"
            disabled={loading}
          />
          {validationErrors.password && (
            <p className="mt-1 text-sm text-error">{validationErrors.password}</p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-error bg-opacity-10 border border-error rounded-md">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-primary text-white font-medium rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {/* Toggle to Sign Up */}
      <div className="mt-4 text-center">
        <p className="text-sm text-text-secondary">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onToggleMode}
            className="text-primary hover:text-primary-dark font-medium"
            disabled={loading}
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
}
