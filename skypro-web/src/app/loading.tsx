export default function Loading() {
  return (
    <div className="min-h-screen bg-[#060d1b] flex items-center justify-center" dir="rtl">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full border-4 border-sky-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-sky-500 border-r-violet-500 animate-spin" />
        </div>
        <p className="text-slate-400 text-sm font-medium">جارٍ التحميل...</p>
      </div>
    </div>
  )
}
