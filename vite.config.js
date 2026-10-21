import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readBook, CONTENT } from './scripts/book.mjs';

// virtual:book = table of contents + link map, rebuilt whenever a file in content/ changes
function book() {
  const id = 'virtual:book';
  return {
    name: 'jozve-book',
    resolveId: (s) => (s === id ? '\0' + id : null),
    load(s) {
      if (s !== '\0' + id) return null;
      const b = readBook();
      if (b.dangling.length) this.warn(`links to ids that do not exist: ${b.dangling.slice(0, 10).join(', ')}`);
      return `export default ${JSON.stringify(b)};`;
    },
    configureServer(server) {
      server.watcher.add(CONTENT);
      const reload = (file) => {
        if (!file.startsWith(CONTENT)) return;
        const mod = server.moduleGraph.getModuleById('\0' + id);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('change', reload).on('add', reload).on('unlink', reload);
    },
  };
}

export default defineConfig({
  base: process.env.BASE || '/',
  plugins: [react(), book()],
  build: { chunkSizeWarningLimit: 1500 },
});
