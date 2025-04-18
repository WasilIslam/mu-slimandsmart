export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-75 flex flex-col items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
          <h2 className="text-xl font-medium text-emerald-800">Loading...</h2>
        </div>
      </div>
    </div>
  );
} 