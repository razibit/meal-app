import { useState, FormEvent } from 'react';
import { useAuthStore } from '../../stores/authStore';

interface SignUpFormProps {
  onToggleMode: () => void;
}

export default function SignUpForm({ onToggleMode }: SignUpFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const { signUp, loading, error, clearError } = useAuthStore();

  const validateForm = (): boolean => {
    const errors: {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    // Name validation
    if (!name) {
      errors.name = 'Name is required';
    } else if (name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Phone validation (optional but must be valid if provided)
    if (phone && !/^\+?[\d\s-()]+$/.test(phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    // Password validation
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
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
      await signUp(email, password, name, phone || undefined);
    } catch (err) {
      // Error is handled by the store
      console.error('Sign up failed:', err);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-bg-secondary rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-primary mb-6 text-center">
        Create Account
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-1">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (validationErrors.name) {
                setValidationErrors({ ...validationErrors, name: undefined });
              }
            }}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-text-primary bg-bg-primary placeholder:text-text-tertiary ${
              validationErrors.name
                ? 'border-error'
                : 'border-border'
            }`}
            placeholder="John Doe"
            disabled={loading}
          />
          {validationErrors.name && (
            <p className="mt-1 text-sm text-error">{validationErrors.name}</p>
          )}
        </div>

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

        {/* Phone Field (Optional) */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-text-primary mb-1">
            Phone Number <span className="text-text-tertiary">(optional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (validationErrors.phone) {
                setValidationErrors({ ...validationErrors, phone: undefined });
              }
            }}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-text-primary bg-bg-primary placeholder:text-text-tertiary ${
              validationErrors.phone
                ? 'border-error'
                : 'border-border'
            }`}
            placeholder="+1234567890"
            disabled={loading}
          />
          {validationErrors.phone && (
            <p className="mt-1 text-sm text-error">{validationErrors.phone}</p>
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

        {/* Confirm Password Field */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-primary mb-1">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (validationErrors.confirmPassword) {
                setValidationErrors({ ...validationErrors, confirmPassword: undefined });
              }
            }}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-text-primary bg-bg-primary placeholder:text-text-tertiary ${
              validationErrors.confirmPassword
                ? 'border-error'
                : 'border-border'
            }`}
            placeholder="••••••••"
            disabled={loading}
          />
          {validationErrors.confirmPassword && (
            <p className="mt-1 text-sm text-error">{validationErrors.confirmPassword}</p>
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
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>

      {/* Toggle to Sign In */}
      <div className="mt-4 text-center">
        <p className="text-sm text-text-secondary">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onToggleMode}
            className="text-primary hover:text-primary-dark font-medium"
            disabled={loading}
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
}
