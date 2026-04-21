import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";
import { exec } from "child_process";

function localRenderPlugin() {
  return {
    name: 'local-render',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url === '/api/render' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              // Write tokens directly to project directory
              fs.writeFileSync(path.join(__dirname, 'batch_tokens.json'), body);
              
              // Start rendering in a new CMD window
              exec('start cmd /k "node scripts/batch-render.js"', { cwd: __dirname });
              
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, message: 'Render started' }));
            } catch (error: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: error.message }));
            }
          });
          return;
        }
        next();
      });
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger(), localRenderPlugin()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
