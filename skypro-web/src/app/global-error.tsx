'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error boundary:', error)
  }, [error])

  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#060d1b', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '32rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            عذراً، حدث خطأ في النظام
          </h1>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem', lineHeight: 1.7 }}>
            تعذّر تحميل المنصة. يرجى إعادة تحميل الصفحة أو المحاولة بعد قليل.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(to right, #0A6CF1, #8B2CF5)',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      </body>
    </html>
  )
}
