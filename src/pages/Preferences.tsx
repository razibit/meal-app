import { ProfileSection } from '../components/preferences/ProfileSection';
import { ClearMeals } from '../components/preferences/ClearMeals';
import { EggInventory } from '../components/preferences/EggInventory';
import { MealMonthConfig } from '../components/preferences/MealMonthConfig';
import { DepositSection } from '../components/preferences/DepositSection';

function Preferences() {
  return (
    <div className="p-4 max-w-2xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold mb-6 text-text-primary">Preferences</h2>
      
      <div className="space-y-6">
        <ProfileSection />

        {/* Danger Zone - Grouped sensitive/destructive actions */}
        <div className="relative border-2 border-red-400 border-dashed rounded-xl p-4 pt-6 space-y-6">
          {/* Legend-style header that sits on the border */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center bg-bg-primary px-3">
            <span className="text-sm font-semibold text-red-500 tracking-wide uppercase whitespace-nowrap">
              ⚠️ Danger Zone
            </span>
            <span className="text-xs text-red-400/60 italic">
              Do not touch
            </span>
          </div>
          
          <MealMonthConfig />
          <ClearMeals />
          <EggInventory />
          <DepositSection />
        </div>
      </div>
    </div>
  );
}

export default Preferences;
