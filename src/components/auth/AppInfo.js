export default function AppInfo() {
  return (
    <div className="hidden md:flex flex-col justify-center p-12 bg-emerald-600">
      <div className="max-w-md mx-auto text-white">
        <h1 className="text-4xl font-[family-name:var(--font-amiri)] mb-6">
          بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
        </h1>
        <h2 className="text-3xl font-semibold mb-6">
          Welcome to Namaz Guide
        </h2>
        <div className="space-y-4">
          <p>Your complete companion for daily prayers, featuring:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Accurate prayer times based on your location</li>
            <li>Step-by-step prayer guides with audio</li>
            <li>Qibla direction finder</li>
            <li>Daily duas and dhikr tracking</li>
            <li>Prayer reminders and notifications</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 