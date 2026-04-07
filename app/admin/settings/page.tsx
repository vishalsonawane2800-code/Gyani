export default function AdminSettingsPage() {
  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl lg:text-3xl font-bold text-white">
          Settings
        </h1>
        <p className="text-slate-400 mt-1">
          Configure admin dashboard settings
        </p>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Admin Configuration</h2>
        <p className="text-slate-400">
          Settings page coming soon. This section will include:
        </p>
        <ul className="mt-4 space-y-2 text-slate-300">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
            Automatic GMP scraping configuration
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
            Subscription data update intervals
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
            Email notification settings
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
            API rate limiting configuration
          </li>
        </ul>
      </div>
    </div>
  )
}
