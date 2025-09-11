import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    return {
        // Vite
        base:  "/", 
        plugins: [react()],
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src")
            }
        },

        server: {
            host: true, 
            proxy: {
                "/o/": {
                    // target: 'http://211.41.186.152:13333',
                    target: env.VITE_PROXY_URL,
                    changeOrigin: true,
                    secure: false,
                    ws: true,                    // WebSocket 프록시 활성화 (SignalR에 중요)
                },
            }
        }

    };
});
