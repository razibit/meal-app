import { useCallback, useEffect, useState } from 'react';
import GlobalMonthlyReport from '../components/home/GlobalMonthlyReport';
import SettlementReport from '../components/home/SettlementReport';
import DepositReport from '../components/home/DepositReport';
import GroceryExpenseReport from '../components/home/GroceryExpenseReport';
import { supabase } from '../services/supabase';
import { isPublicReportCarryOverWindowOpen } from '../utils/mealMonthHelpers';

export default function PublicMealReport() {
  const [publicReportSettings, setPublicReportSettings] = useState({
    showSettlementReport: false,
    showDepositReport: false,
    showGroceryExpenseReport: false,
  });

  const loadPublicReportSettings = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_public_report_carry_over_visibility');
    if (error) {
      console.error('Failed to load public report settings:', error);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    setPublicReportSettings({
      showSettlementReport: Boolean(row?.show_settlement_report),
      showDepositReport: Boolean(row?.show_deposit_report),
      showGroceryExpenseReport: Boolean(row?.show_grocery_expense_report),
    });
  }, []);

  useEffect(() => {
    void loadPublicReportSettings();
  }, [loadPublicReportSettings]);

  const publicWindowOpen = isPublicReportCarryOverWindowOpen();

  return (
    <main className="min-h-screen bg-bg-primary p-4">
      <div className="max-w-7xl mx-auto">
        <GlobalMonthlyReport user={null} publicView />
        {publicWindowOpen && publicReportSettings.showSettlementReport && (
          <div className="mt-8">
            <SettlementReport user={null} publicView />
          </div>
        )}
        {publicWindowOpen && publicReportSettings.showDepositReport && (
          <div className="mt-8">
            <DepositReport user={null} publicView />
          </div>
        )}
        {publicWindowOpen && publicReportSettings.showGroceryExpenseReport && (
          <div className="mt-8">
            <GroceryExpenseReport user={null} publicView />
          </div>
        )}
      </div>
    </main>
  );
}
