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
        assetsInclude: ["**/*.PNG"],
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
                    // 로컬 surveyon-aiopen-api 연동 설정 (VITE_PROXY_URL_AIOPEN 설정 시 활성화, 기본 http://127.0.0.1:5130)
                    ...(env.VITE_PROXY_URL_AIOPEN
                        ? {
                            // 로그인(/APIs/o/Login/*, /APIs/o/login/*)은 테스트서버(stest.hrc.kr)로 보내서 TokenStore에 토큰 등록 유지
                            "^/APIs/o/[Ll]ogin(?:/|$)": {
                                target: (env.VITE_PROXY_URL_OTHER) ?? env.VITE_PROXY_URL,
                                changeOrigin: true,
                                secure: false,
                            },
                            // /APIs/o 요청을 로컬 백엔드(http://127.0.0.1:5130)로 전달
                            "^/APIs/o(?:/|$)": {
                                target: env.VITE_PROXY_URL_AIOPEN,
                                changeOrigin: true,
                                secure: false,
                                ws: true, // SignalR 웹소켓 허용
                                rewrite: (path) => path.replace(/^\/APIs\/o/, "") || "/",
                            },
                            // SignalR이 /hubs/worker 로 직접 호출될 경우를 대비한 웹소켓 프록시
                            "^/hubs(?:/|$)": {
                                target: env.VITE_PROXY_URL_AIOPEN,
                                changeOrigin: true,
                                ws: true,
                                secure: false,
                            },
                        }
                        : {}),
                    // 로컬 surveyon-theme-api 연동 설정 (VITE_PROXY_URL_THEME 설정 시 활성화, 기본 http://127.0.0.1:5000)
                    ...(env.VITE_PROXY_URL_THEME
                        ? {
                            "^/APIs/t(?:/|$)": {
                                target: env.VITE_PROXY_URL_THEME,
                                changeOrigin: true,
                                secure: false,
                            },
                        }
                        : {}),
                    // /APIs 로 시작하는 요청 프록시 (BoardApi 등)
                    "^/APIs(?:/|$)": {
                        target: (env.VITE_PROXY_URL_OTHER) ?? env.VITE_PROXY_URL,
                        // target: env.VITE_PROXY_URL,
                        changeOrigin: true,
                        secure: false,
                    },
                    // H-PRO API 프록시 
                    "/api": {
                        target: "https://hpropublic.hrcglobal.com",
                        changeOrigin: true,
                        secure: true,
                        headers: {
                            "apikey": "xDhxuxOyYA11l8GOKT1D7ixLMM5nriduk3Wx8j7YadswCPii8P35DMEQE9i7ALElIQaM/DT9OELQM3oYx+MatQLiRYU1hlFM+b0k9t/+hbc="
                        }
                    },
                    // RPS / QM 실사 데이터 초기화 API 프록시 (CORS 방지)
                    "/rps-silsa": {
                        target: "https://rpssurvey.hrcglobal.com",
                        changeOrigin: true,
                        secure: false,
                        rewrite: (path) => path.replace(/^\/rps-silsa/, "")
                    },
                    "/qm-silsa": {
                        target: "https://qm.hrcglobal.com",
                        changeOrigin: true,
                        secure: false,
                        rewrite: (path) => path.replace(/^\/qm-silsa/, "")
                    }
                }
                : {
                    // H-PRO API 프록시 미사용 환경에서도 API는 프록시 필요
                    "/api": {
                        target: "https://hpropublic.hrcglobal.com",
                        changeOrigin: true,
                        secure: true,
                        headers: {
                            "apikey": "xDhxuxOyYA11l8GOKT1D7ixLMM5nriduk3Wx8j7YadswCPii8P35DMEQE9i7ALElIQaM/DT9OELQM3oYx+MatQLiRYU1hlFM+b0k9t/+hbc="
                        }
                    },
                    "/rps-silsa": {
                        target: "https://rpssurvey.hrcglobal.com",
                        changeOrigin: true,
                        secure: false,
                        rewrite: (path) => path.replace(/^\/rps-silsa/, "")
                    },
                    "/qm-silsa": {
                        target: "https://qm.hrcglobal.com",
                        changeOrigin: true,
                        secure: false,
                        rewrite: (path) => path.replace(/^\/qm-silsa/, "")
                    }
                },
        },
    };
});
