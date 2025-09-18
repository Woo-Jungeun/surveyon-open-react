import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const useProxy = !!env.VITE_PROXY_URL; // prod에선 비어있으므로 프록시 미사용

    return {
        // Vite
        base: "/",
        plugins: [react()],
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src")
            }
        },

        server: {
            host: true,
            // proxy: {
            //     "/o/": {
            //         target: env.VITE_PROXY_URL,
            //         changeOrigin: true,
            //         secure: false,
            //         ws: true,                    // WebSocket 프록시 활성화 (SignalR에 중요)
            //     },
            // }
            proxy: useProxy
                ? {
                    // /o 로 시작하는 모든 요청을 백엔드로 프록시
                   "^/o(?:/|$)": {
                        target: env.VITE_PROXY_URL,  // dev-local: https://localhost , dev: https://son.hrc.kr
                        changeOrigin: true,
                        secure: false,               // 자체서명/개발용 인증서면 false
                        ws: true,                    // SignalR WebSocket
                    },
                }
                : undefined,
        },
    };
});
