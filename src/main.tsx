import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { StoreProvider } from './lib/store.tsx'
import { AuthGate } from './lib/auth.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>
      <StoreProvider>
        <App />
      </StoreProvider>
    </AuthGate>
  </StrictMode>,
)
