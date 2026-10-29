import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { startSheetSync } from './sheetSync';

startSheetSync();

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);