import { ProfileSection } from '../components/preferences/ProfileSection';
import { ThemeToggle } from '../components/preferences/ThemeToggle';
import { NotificationSettings } from '../components/preferences/NotificationSettings';
import { ClearMeals } from '../components/preferences/ClearMeals';
import { EggInventory } from '../components/preferences/EggInventory';
import { MealMonthConfig } from '../components/preferences/MealMonthConfig';

function Preferences() {
  return (
    <div className="p-4 max-w-2xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold mb-6 text-text-primary">Preferences</h2>
      
      <div className="space-y-6">
        <ProfileSection />
        <ThemeToggle />
        <NotificationSettings />

        {/* Danger Zone - Grouped sensitive/destructive actions */}
        <div className="relative border-2 border-red-400 border-dashed rounded-xl p-4 pt-8 space-y-6">
          {/* Legend-style header that sits on the border */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-bg-primary px-3">
            <span className="text-red-400">--------</span>
            <span className="text-sm font-semibold text-red-500 tracking-wide uppercase whitespace-nowrap">
              ⚠️ Danger Zone
            </span>
            <span className="text-red-400">--------</span>
          </div>
          
          {/* Warning subtext below header */}
          <p className="text-xs text-red-400/60 text-center italic -mt-4">
            Do not touch
          </p>
          
          <MealMonthConfig />
          <ClearMeals />
          <EggInventory />
        </div>
      </div>
    </div>
  );
}

export default Preferences;
