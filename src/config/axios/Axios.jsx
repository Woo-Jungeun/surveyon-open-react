import axios from "axios";
import { persistor } from "@/common/redux/store/StorePersist.jsx";

/** 모드별 baseURL 계산 (dev: 프록시 타도록 "/o", prod: 절대 URL) */
function joinURL(base, path) {
    if (!base && !path) return "";
    if (!base) return path || "";
    if (!path) return base || "";
    return base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
}
const BASE_URL = import.meta.env.DEV
    ? ""                                  // 로컬은 프록시 타니까 baseURL 비움
    : (window.API_CONFIG?.API_BASE_URL || "https://son.hrc.kr"); // 운영 호스트만(뒤에 /o 넣지 말기!)

/** axios 인스턴스 (글로벌 defaults 대신 인스턴스에만 설정) */
export const apiAxios = axios.create({
    baseURL: BASE_URL,                 // dev: "/o", prod: "https://son.hrc.kr/o"
    withCredentials: true,             // 쿠키/세션 인증이면 true
    timeout: 1000000000,
    headers: { "Content-Type": "application/json;charset=utf-8" },
});

/** 요청 인터셉터 (쿠키의 TOKEN → Authorization 헤더) */
apiAxios.interceptors.request.use(
    (config) => {
        const token = getCookie("TOKEN"); // 아래에 이미 정의된 getCookie 사용
        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }
        // FormData면 JSON 헤더 제거 → 브라우저가 boundary 포함해서 자동 세팅
        if (config.data instanceof FormData) {
            const h = (config.headers ||= {});
            delete h["Content-Type"]; delete h["content-type"];
            if (h.common) delete h.common["Content-Type"];
            if (h.post) delete h.post["Content-Type"];
        }
        return config;
    },
    (error) => Promise.reject(error)
);

const isHTTPS = typeof window !== "undefined" && location.protocol === "https:";

function setCookie(name, value, {
    maxAge,          // 초 단위 (예: 60*60*24*7 = 7일)
    expires,         // Date 객체 (maxAge 대신 절대 만료시각 지정)
    path = "/",
    domain,
    sameSite = "Lax",
    secure = isHTTPS,
} = {}) {
    let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
    if (Number.isFinite(maxAge)) cookie += `; Max-Age=${Math.floor(maxAge)}`;
    if (expires instanceof Date) cookie += `; Expires=${expires.toUTCString()}`;
    if (path) cookie += `; Path=${path}`;
    if (domain) cookie += `; Domain=${domain}`;
    if (sameSite) cookie += `; SameSite=${sameSite}`;
    if (secure) cookie += `; Secure`;
    document.cookie = cookie;
}

/** 쿠키 읽기 */
function getCookie(name) {
    // 이름 특수문자 이스케이프
    const safe = name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1");
    const match = document.cookie.match(
        new RegExp(`(?:^|; )${safe}=([^;]*)`)
    );
    return match ? decodeURIComponent(match[1]) : null;
}

/** 쿠키 삭제 */
function deleteCookie(name, { path = "/", domain } = {}) {
    document.cookie =
        `${encodeURIComponent(name)}=` +
        `; Expires=Thu, 01 Jan 1970 00:00:00 GMT` +
        `; Path=${path}` +
        (domain ? `; Domain=${domain}` : "");
}

apiAxios.interceptors.response.use(function (response) {
    const { status, data, headers, config } = response;
    if (data?.success !== "777") {
        if (data?.success === "710") {
            deleteCookie("TOKEN")
            persistor.purge();
            // return { data: { status: data?.success, message: "로그인을 다시 해주세요." } };
        } else if (["401", "402", "701", "702", "703"].includes(String(data?.success))) {
            // return {data: {status: data?.succes, message: data?.message}};
            return { data: { status: "오류", message: data?.message } };
        }
    }
    if (data.success === "404") {
        // url Not Found 화면 이동(NS_ER_CT_01: url 찾을 수 없음)
        window.location.href = '/pageNotFound/PageNotFound'
    }
    return response;

}, function (error) {
    try {
        const { status, data, headers, config } = error.response;
        if (data?.success !== "777") {
            if (data?.success === "710") {
                deleteCookie("TOKEN")
                persistor.purge();
                //return { data: { status: data?.success, message: "로그인을 다시 해주세요." } };
            } else if (["401", "402", "701", "702", "703"].includes(String(data?.success))) {
                // return {data: {status: data?.succes, message: data?.message}};
                return { data: { status: "오류", message: data?.message } };
            }
        }
        if (data.success === "404") {
            // url Not Found 화면 이동(NS_ER_CT_01: url 찾을 수 없음)
            window.location.href = '/pageNotFound/PageNotFound'
        }
        return { data: { status: "NS_ER_SV_01", message: "요청한 서비스에 문제가 발생했습니다. 잠시 후에 다시 시도해 주세요." } };

    } catch (e) {
        deleteCookie("TOKEN")
        persistor.purge();
        return { data: { status: "NS_ER_SV_01", message: "요청한 서비스에 문제가 발생했습니다. 잠시 후에 다시 시도해 주세요." } };
    }
});
