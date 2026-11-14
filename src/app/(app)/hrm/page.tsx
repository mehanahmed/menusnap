import { Users, Clock } from 'lucide-react';

export const metadata = {
  title: 'HRM | MenuSnap',
  robots: 'noindex',
};

export default function HRMPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      {/* Icon */}
      <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-blue-50 border border-blue-100 text-blue-500 mb-6">
        <Users className="w-8 h-8 sm:w-10 sm:h-10" />
      </div>

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
        HRM
      </h1>
      <p className="text-sm sm:text-base text-slate-500 font-medium mb-8">
        Human Resource Management
      </p>

      {/* Coming Soon card */}
      <div className="flex flex-col items-center gap-3 w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-7">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-500">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800 mb-1">Attendance Tracker</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            We&apos;re building the attendance module. Clock-in / clock-out tracking, daily summaries, and more — coming soon.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200 mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Coming Soon
        </span>
      </div>

      <p className="mt-8 text-xs text-slate-400">
        Part of MenuSnap Pro &amp; Agency plans
      </p>
    </div>
  );
}
