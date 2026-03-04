export function Overview() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold text-gray-100">Overview</h2>
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-md">
        <p className="text-gray-400">
          Welcome to your dashboard. This area will display key metrics and summaries.
        </p>
      </div>

      {/* Placeholders for future widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <div className="bg-gray-800 h-32 rounded-lg border border-gray-700 shadow flex items-center justify-center text-gray-500">
            Widget Placeholder
         </div>
         <div className="bg-gray-800 h-32 rounded-lg border border-gray-700 shadow flex items-center justify-center text-gray-500">
            Widget Placeholder
         </div>
         <div className="bg-gray-800 h-32 rounded-lg border border-gray-700 shadow flex items-center justify-center text-gray-500">
            Widget Placeholder
         </div>
      </div>
    </div>
  )
}
