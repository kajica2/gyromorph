import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import MobileGuard from './components/MobileGuard';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <MobileGuard>
      <App />
    </MobileGuard>
  </React.StrictMode>
);