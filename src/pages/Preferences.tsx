import { ProfileSection } from '../components/preferences/ProfileSection';
import { ThemeToggle } from '../components/preferences/ThemeToggle';
import { NotificationSettings } from '../components/preferences/NotificationSettings';

function Preferences() {
  return (
    <div className="p-4 max-w-2xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold mb-6 text-text-primary">Preferences</h2>
      
      <div className="space-y-6">
        <ProfileSection />
        <ThemeToggle />
        <NotificationSettings />
      </div>
    </div>
  );
}

export default Preferences;
