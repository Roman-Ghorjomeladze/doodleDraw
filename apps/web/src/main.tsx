import '@fontsource/noto-sans/400.css';
import '@fontsource/noto-sans/600.css';
import '@fontsource/noto-sans/700.css';
import '@fontsource/noto-sans-georgian/400.css';
import '@fontsource/noto-sans-georgian/700.css';
import '@fontsource/noto-serif/400.css';
import '@fontsource/noto-serif/700.css';
import '@fontsource/noto-serif-georgian/400.css';
import '@fontsource/noto-serif-georgian/700.css';
import '@fontsource/firago/400.css';
import '@fontsource/firago/700.css';

import './styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { installTraceBuffer } from './utils/traceBuffer';

// Install diagnostic interceptors before the app mounts so we capture
// console logs / network issues from the very first render.
installTraceBuffer();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
