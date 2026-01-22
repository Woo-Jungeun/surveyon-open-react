import { apiAxios } from "@/config/axios/Axios.jsx";
import moment from "moment";

const VITE_DEFAULT_PATH = (typeof window !== 'undefined' && window.API_CONFIG?.DEFAULT_PATH) || "/o";

// URL이 '/api'로 시작하거나 'http'로 시작하면 그대로 사용
// type이 지정되면 해당 config 값 사용
// 그 외에는 EX_API_BASE_URL (또는 기존 로직) 사용
const join = (p, type) => {
    const path = String(p);
    if (path.startsWith("http")) return path;

    // 1. 명시적 type 지정 시
    if (type && window.API_CONFIG?.[type]) {
        let base = window.API_CONFIG[type];
        // DEV 환경이고 base가 http로 시작하면, origin 제거하여 프록시 태움
        if (import.meta.env.DEV && base.startsWith("http")) {
            try {
                const urlObj = new URL(base);
                base = urlObj.pathname;
            } catch (e) {
                // invalid url, ignore
            }
        }
        return base.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
    }

    // 2. 기본 (EX_API_BASE_URL 또는 VITE_DEFAULT_PATH)
    let exBase = window.API_CONFIG?.EX_API_BASE_URL;
    if (exBase) {
        // DEV 환경 처리
        if (import.meta.env.DEV && exBase.startsWith("http")) {
            try {
                const urlObj = new URL(exBase);
                exBase = urlObj.pathname;
            } catch (e) {
                // invalid url, ignore
            }
        }
        return exBase.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
    }

    return VITE_DEFAULT_PATH.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
};

export default {

    async post(data, url, type) {
        const response = await apiAxios.post(join(url, type), data);
        return response.data || {};
    },

    async get(data, url, type) {
        const response = await apiAxios.get(join(url, type), data);
        return response.data || {};
    },

    async form(data, url, config = {}, type) {
        const body = (data instanceof FormData)
            ? data
            : (() => {
                const f = new FormData();
                Object.entries(data || {}).forEach(([k, v]) => f.append(k, v ?? ""));
                return f;
            })();

        const response = await apiAxios.post(join(url, type), body, config);
        return response.data ?? response;
    },

    // 파일 다운로드(Blob)용
    async file(data, url, type) {
        const response = await apiAxios.post(
            join(url, type),
            data,
            {
                headers: { "Content-Type": "application/json" },
                responseType: "blob",
            }
        );
        return response;
    },

    /*signalR 기능 시 사용*/
    /**
     * application/x-www-form-urlencoded 방식으로 POST 요청을 보냅니다.
     *
     * @param {string} url   요청 경로
     * @param {Object} data  전송할 바디 데이터
     * @param {string} type  API_CONFIG 키 (예: "API_BASE_URL_BOARD")
     */
    async urlencoded(url, data, type) {
        const u = new URLSearchParams();
        Object.entries(data || {}).forEach(([k, v]) => u.append(k, v == null ? "" : String(v)));
        const res = await apiAxios.post(join(url, type), u, {
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" }
        });
        return res.data || {};
    },

    /**
     * GET 요청에 쿼리 파라미터를 붙여 호출합니다.
     *
     * @param {string} url      요청 경로
     * @param {Object} params   쿼리 파라미터 객체
     * @param {string} type     API_CONFIG 키
     */
    async getWithParams(url, params, type) {
        const res = await apiAxios.get(join(url, type), { params: params || {} });
        return res.data || {};
    }
};
