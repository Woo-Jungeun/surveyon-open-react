import { apiAxios } from "@/config/axios/Axios.jsx";
import moment from "moment";

const VITE_DEFAULT_PATH = (typeof window !== 'undefined' && window.API_CONFIG?.DEFAULT_PATH) || "/o";
const join = (p) => (VITE_DEFAULT_PATH.replace(/\/+$/, '') + '/' + String(p).replace(/^\/+/, ''));
// URL이 '/api'로 시작하거나 'http'로 시작하면 그대로 사용, 아니면 DEFAULT_PATH 붙임
// const join = (p) => {
//     const path = String(p);
//     if (path.startsWith("/api") || path.startsWith("http")) return path;
//     return VITE_DEFAULT_PATH.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
// };
export default {

    async post(data, url) {
        const response = await apiAxios.post(join(url), data);
        return response.data || {};
    },

    async get(data, url) {
        const response = await apiAxios.get(join(url), data);
        // console.log("response", response)
        return response.data || {};
    },

    async form(data, url, config = {}) {
        const body = (data instanceof FormData)
            ? data
            : (() => {
                const f = new FormData();
                Object.entries(data || {}).forEach(([k, v]) => f.append(k, v ?? ""));
                return f;
            })();

        const response = await apiAxios.post(join(url), body, config);
        return response.data ?? response;
    },

    // 파일 다운로드(Blob)용
    async file(data, url) {
        const response = await apiAxios.post(
            join(url),
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
     * - 서버가 폼 인코딩을 기대하는 엔드포인트에 사용하세요.
     * - 값이 null/undefined면 빈 문자열로 치환해 누락을 방지합니다.
     *
     * @param {string} url   요청 경로 (예: "/option_analysis_api.aspx")
     * @param {Object} data  전송할 바디 데이터(키-값 쌍)
     */
    async urlencoded(url, data) {
        const u = new URLSearchParams();
        Object.entries(data || {}).forEach(([k, v]) => u.append(k, v == null ? "" : String(v)));
        const res = await apiAxios.post(join(url), u, {
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" }
        });
        return res.data || {};
    },

    /**
     * GET 요청에 쿼리 파라미터를 붙여 호출합니다. (예: status/clear 용)
     * - Axios의 `params` 옵션을 사용하면 자동으로 쿼리스트링을 생성합니다.
     *
     * @param {string} url      요청 경로 (예: "/option_analysis_api.aspx")
     * @param {Object} params   쿼리 파라미터 객체 (예: { action: "status", job })
     */
    async getWithParams(url, params) {
        const res = await apiAxios.get(join(url), { params: params || {} });
        return res.data || {};
    }
};
