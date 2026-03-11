import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ProductProvider } from './ProductContext.jsx'
import { AuthProvider } from './AuthContext.jsx'
import { OrderProvider } from './OrderContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ProductProvider>
        <OrderProvider>
          <App />
        </OrderProvider>
      </ProductProvider>
    </AuthProvider>
  </StrictMode>,
)
