// src/main.jsx
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { Provider } from '@/components/ui/provider'
import { BrowserRouter } from 'react-router-dom'
import './index.css' // Move this AFTER the Provider import

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Provider>
      <App />
    </Provider>
  </BrowserRouter>
)
