import axios from "axios";
import { persistor } from "@/common/redux/store/StorePersist.jsx";
import store from "@/common/redux/store/Store";
import { AES256 } from "@/common/utils/AES256";

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

// --- Version Check Logic ---
let currentScriptUrl = null;
let lastVersionCheck = 0;

if (typeof window !== "undefined") {
    // 초기 로딩 시 현재 실행 중인 index-XXXX.js 스크립트 경로 저장
    document.querySelectorAll('script').forEach(s => {
        if (s.src && s.src.includes('/assets/index-')) {
            currentScriptUrl = s.src;
        }
    });
}

async function checkFrontendVersion() {
    if (!currentScriptUrl || typeof window === "undefined") return;
    
    const now = Date.now();
    // 10초에 한 번씩만 서버에 확인 (과부하 방지)
    if (now - lastVersionCheck < 10000) return;
    lastVersionCheck = now;

    try {
        const res = await fetch('/index.html?_t=' + now, { 
            method: 'GET', 
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } 
        });
        if (!res.ok) return;
        const text = await res.text();
        const match = text.match(/<script[^>]+src="([^"]+index-[^"]+\.js)"/);
        
        if (match) {
            const newScriptUrl = match[1];
            const currentFilename = currentScriptUrl.split('/').pop();
            const newFilename = newScriptUrl.split('/').pop();
            
            if (currentFilename !== newFilename) {
                console.log('New version detected! Showing toast...', currentFilename, '->', newFilename);
                showUpdateToast();
            }
        }
    } catch (e) {
        // 네트워크 에러 등 무시
    }
}

function showUpdateToast() {
    if (document.getElementById('version-update-toast')) return;
    
    const toast = document.createElement('div');
    toast.id = 'version-update-toast';
    
    const sidebarFooter = document.querySelector('.sidebar-footer');
    
    // 고급스러운 보라색 그라데이션 및 부드러운 그림자 효과
    const commonStyle = "background: linear-gradient(135deg, #6c5ef7 0%, #5A4BFF 100%); color: white; padding: 16px; border-radius: 14px; box-shadow: 0 10px 25px rgba(90, 75, 255, 0.3), 0 4px 10px rgba(0,0,0,0.1); z-index: 999999; display: flex; flex-direction: column; gap: 14px; font-family: 'Spoqa Han Sans Neo', sans-serif; border: 1px solid rgba(255,255,255,0.1); width: 230px;";

    if (sidebarFooter) {
        // 메뉴바가 닫혀도 찌그러지지 않도록 right: 16px 대신 고정 너비를 주고 left를 잡습니다.
        toast.style.cssText = `position: absolute; bottom: calc(100% + 12px); left: 16px; ${commonStyle}`;
        sidebarFooter.appendChild(toast);
    } else {
        toast.style.cssText = `position: fixed; bottom: 30px; left: 30px; ${commonStyle}`;
        document.body.appendChild(toast);
    }
    
    toast.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 10px;">
            <div style="background: rgba(255,255,255,0.2); width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            </div>
            <div style="padding-top: 1px;">
                <div style="font-weight: 700; margin-bottom: 4px; font-size: 13.5px; letter-spacing: -0.5px; white-space: nowrap;">새로운 업데이트 안내!</div>
                <div style="font-size: 12px; color: rgba(255,255,255,0.9); line-height: 1.4; letter-spacing: -0.3px;">원활한 사용을 위해 화면을<br/>새로고침해 주세요.</div>
            </div>
        </div>
        <button 
            onclick="window.location.reload()" 
            onmouseover="this.style.background='#ffffff'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';" 
            onmouseout="this.style.background='rgba(255,255,255,0.95)'; this.style.transform='none'; this.style.boxShadow='0 2px 6px rgba(0,0,0,0.1)';" 
            style="background: rgba(255,255,255,0.95); color: #5A4BFF; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 13px; transition: all 0.2s ease; width: 100%; box-shadow: 0 2px 6px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            지금 새로고침
        </button>
    `;
}

// 사용자가 화면의 아무 곳이나 클릭할 때도 1분(60초)에 한 번씩만 버전을 몰래 확인합니다.
if (typeof window !== "undefined") {
    // 캡처링 단계(true)에서 이벤트를 가로채서, 그리드(Grid) 내부 클릭 등 stopPropagation()이 걸린 이벤트도 무조건 감지합니다.
    window.addEventListener('click', () => checkFrontendVersion(), true);
    
    // 브라우저 탭을 이동했다가 다시 이 화면으로 돌아왔을 때(포커스 온)도 확인합니다.
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkFrontendVersion();
        }
    });
}
// ---------------------------

/** 요청 인터셉터 (쿠키의 TOKEN → Authorization 헤더) */
apiAxios.interceptors.request.use(
    (config) => {
        // API 요청 시마다 백그라운드에서 버전 확인 (새 버전이면 새로고침됨)
        checkFrontendVersion();

        const token = getCookie("TOKEN"); // 아래에 이미 정의된 getCookie 사용
        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }

        // X-Auth-Token 헤더 추가
        const xAuthToken = getCookie("X-Auth-Token");
        if (xAuthToken) {
            config.headers["X-Auth-Token"] = xAuthToken;
        }

        // X-User-Id 헤더 추가
        const state = store.getState();
        const userId = state?.auth?.user?.userId || sessionStorage.getItem("userId");
        if (userId) {
            config.headers["X-User-Id"] = userId;
        }

        // hrc 헤더 추가 (userId 암호화)
        if (userId) {
            config.headers["hrc"] = AES256.Crypto.encryptAES256(String(userId));
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
    if (data.errorCode === "704") {
        // 세션 만료 또는 유효하지 않음 -> 로그아웃 처리
        persistor.purge();
        deleteCookie("TOKEN", { path: "/" });
        deleteCookie("X-Auth-Token", { path: "/" });
        sessionStorage.clear();
        localStorage.removeItem("hsrtCustomerState");
        window.location.href = "/login";
    }
    if (data.errorCode === "404") {
        // url Not Found 화면 이동(NS_ER_CT_01: url 찾을 수 없음)
        window.location.href = '/pageNotFound/PageNotFound'
    }
    return response;

}, async function (error) {
    try {
        const { status, data, headers, config } = error.response || {};

        if (status === 401) {
            // 세션 만료 또는 유효하지 않음 -> 로그아웃 처리
            await persistor.purge();
            deleteCookie("TOKEN", { path: "/" });
            deleteCookie("X-Auth-Token", { path: "/" });
            sessionStorage.clear();
            localStorage.removeItem("hsrtCustomerState");
            window.location.href = "/login";
            return Promise.reject(error);
        }

        // if (status === 404) {
        //     window.location.href = '/pageNotFound/PageNotFound';
        //     return Promise.reject(error);
        // }

        if (status) {
            // const { status, data, headers, config } = error.response; // Removed redundancy
        } else {
            throw new Error("No response");
        }
        if (data?.success !== "777") {
            if (data?.success === "710") {
                deleteCookie("TOKEN")
                persistor.purge();
                //return { data: { status: data?.su ccess, message: "로그인을 다시 해주세요." } };
            } else if (["401", "402", "701", "702", "703"].includes(String(data?.success))) {
                // return {data: {status: data?.succes, message: data?.message}};
                return { data: { status: "오류", message: data?.message } };
            }
        }
        // if (data.success === "404") {
        //     // url Not Found 화면 이동(NS_ER_CT_01: url 찾을 수 없음)
        //     window.location.href = '/pageNotFound/PageNotFound'
        // }
        return { data: { status: "NS_ER_SV_01", message: "요청한 서비스에 문제가 발생했습니다. 잠시 후에 다시 시도해 주세요." } };

    } catch (e) {
        deleteCookie("TOKEN")
        persistor.purge();
        return { data: { status: "NS_ER_SV_01", message: "요청한 서비스에 문제가 발생했습니다. 잠시 후에 다시 시도해 주세요." } };
    }
});
