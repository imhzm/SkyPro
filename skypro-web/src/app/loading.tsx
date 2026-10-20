export default function Loading() {
  return (
    <div className="min-h-screen bg-page flex items-center justify-center" dir="rtl" role="status" aria-label="جارٍ تحميل الصفحة">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full border-4 border-sky-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-sky-500 border-r-violet-500 animate-spin" />
        </div>
        <p className="text-muted text-sm font-medium">جارٍ التحميل...</p>
      </div>
    </div>
  )
}
