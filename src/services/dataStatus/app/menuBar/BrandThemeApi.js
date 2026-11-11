import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";

/**
 * H-SRT 고객사 브랜드 테마 설정 API (surveyon-theme-api 연동)
 * - Base URL 키: API_BASE_URL_THEME (/APIs/t -> 로컬 http://127.0.0.1:5000)
 */
export function BrandThemeApi() {
    /** 1. 프로젝트별 브랜드 테마 조회 (theme_brand) */
    const getBrandTheme = useMutation(
        async (data) => await api.post(data, "/theme/get", "API_BASE_URL_THEME")
    );

    /** 2. 프로젝트별 브랜드 테마 저장/초기화 (theme_brand + theme_history) */
    const saveBrandTheme = useMutation(
        async (data) => await api.post(data, "/theme/save", "API_BASE_URL_THEME")
    );

    /** 3. 고객사 브랜드 프리셋 목록 조회 (theme_preset) */
    const getBrandPresets = useMutation(
        async (data) => await api.post(data, "/theme/presets", "API_BASE_URL_THEME")
    );

    /** 4. 프로젝트별 테마 변경 이력 조회 (theme_history) */
    const getBrandHistory = useMutation(
        async (data) => await api.post(data, "/theme/history", "API_BASE_URL_THEME")
    );

    return {
        getBrandTheme,
        saveBrandTheme,
        getBrandPresets,
        getBrandHistory,
    };
}

/** 컴포넌트 외부(초기 로드 시)에서 호출할 수 있는 단발성 테마 조회 함수 */
export async function fetchProjectBrandThemeFromApi(projectnum, userId = "") {
    if (!projectnum) return null;
    try {
        const res = await api.post(
            { user: userId || sessionStorage.getItem("userId") || "", projectnum },
            "/theme/get",
            "API_BASE_URL_THEME"
        );
        if (String(res?.success) === "777") {
            return res?.data || res?.resultjson || null;
        }
        return null;
    } catch (e) {
        return null;
    }
}

