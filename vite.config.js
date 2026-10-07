import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The address people see when this site is shared (WhatsApp, Facebook, Google) has to be a full
// address. It is the bare domain: set VITE_SITE_URL in the project's environment variables.
function shareAddress(site) {
  return {
    name: 'share-address',
    transformIndexHtml: (html) => html.replaceAll('__SITE__', site),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const site = (env.VITE_SITE_URL || 'https://scoreit.today').replace(/\/+$/, '');
  return { plugins: [react(), shareAddress(site)] };
});
