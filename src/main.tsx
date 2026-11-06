import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { startSheetSync } from './sheetSync';
import { applySheetInventory } from './inventory';
import { registerSW } from 'virtual:pwa-register';
import { initPersistentStorage } from './persistentStorage';

void initPersistentStorage();
startSheetSync(applySheetInventory);
registerSW({ immediate: true });

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);