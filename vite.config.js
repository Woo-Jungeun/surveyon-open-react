import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    (env);
    return {
        // Vite
        plugins: [react()],
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src")
            }
        },

        server: {
            host: true,
            proxy: {
                "/survey-on-open": {
                    // target: 'http://211.41.186.152:13333',
                    target: env.VITE_PROXY_URL,
                    changeOrigin: true,
                    secure: false,
                    rewrite: (p) => p.replace(/^\/survey-on-open/, "")
                },
            }
        }

    };
});
