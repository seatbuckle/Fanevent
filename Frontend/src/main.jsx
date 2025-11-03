// src/main.jsx
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Provider } from '@/components/ui/provider'
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')).render(
  <Provider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Provider>
)
