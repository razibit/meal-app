import GlobalMonthlyReport from '../components/home/GlobalMonthlyReport';

export default function PublicMealReport() {
  return (
    <main className="min-h-screen bg-bg-primary p-4">
      <div className="max-w-7xl mx-auto">
        <GlobalMonthlyReport user={null} publicView />
      </div>
    </main>
  );
}
