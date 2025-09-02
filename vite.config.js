import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const isDev = mode === "development";
    return {
        // Vite
        base: isDev ? "/" : "/o2/",   // dev에서는 /, prod에서는 /o2/
        plugins: [react()],
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src")
            }
        },

        server: {
            host: true, 
            open: "/o2/",
            proxy: {
                "/o/": {
                    // target: 'http://211.41.186.152:13333',
                    target: env.VITE_PROXY_URL,
                    changeOrigin: true,
                    secure: false,
               
                },
            }
        }

    };
});
