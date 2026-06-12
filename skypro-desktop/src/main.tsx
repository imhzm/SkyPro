import './lib/electronPolyfill'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Cairo — Arabic-first UI typeface (bundled locally, works offline)
import '@fontsource/cairo/400.css'
import '@fontsource/cairo/500.css'
import '@fontsource/cairo/600.css'
import '@fontsource/cairo/700.css'
import '@fontsource/cairo/800.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
