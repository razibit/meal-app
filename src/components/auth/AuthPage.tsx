import LoginForm from './LoginForm';

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* App Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Mess Meal Management
          </h1>
          <p className="text-text-secondary">
            Admin-controlled meal tracking and billing
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
