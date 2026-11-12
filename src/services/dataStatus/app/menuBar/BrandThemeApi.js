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

    /** 4. 고객사 브랜드 프리셋 추가 (theme_preset INSERT) */
    const addBrandPreset = useMutation(
        async (data) => await api.post(data, "/theme/presets/add", "API_BASE_URL_THEME")
    );

    /** 5. 고객사 브랜드 프리셋 삭제 (theme_preset DELETE / use_yn='N') */
    const deleteBrandPreset = useMutation(
        async (data) => await api.post(data, "/theme/presets/delete", "API_BASE_URL_THEME")
    );

    /** 6. 프로젝트별 테마 변경 이력 조회 (theme_history) */
    const getBrandHistory = useMutation(
        async (data) => await api.post(data, "/theme/history", "API_BASE_URL_THEME")
    );

    return {
        getBrandTheme,
        saveBrandTheme,
        getBrandPresets,
        addBrandPreset,
        deleteBrandPreset,
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

/**
 * 브랜드 테마 저장 성공 시 DP의뢰서 > 표 디자인 설정(/dp-request/table/save)에도
 * 20개 영역별 테마 색상(tableThemeJson)을 즉시 병합·저장하는 함수
 */
export async function syncTableThemeToDpTableSave(pageId, userId, tableThemeJson) {
    const targetPageId = pageId || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("pageId") : "") || "";
    const targetUser = userId || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("userId") : "") || "";
    if (!targetPageId || !targetUser || !tableThemeJson || typeof tableThemeJson !== "object") {
        return false;
    }

    try {
        const [detailRes, contextRes] = await Promise.all([
            api.post({ pageid: targetPageId, user: targetUser }, "/dp-request/table/detail", "API_BASE_URL_DATASTATUS").catch(() => null),
            api.post({ pageid: targetPageId, user: targetUser }, "/dp-request/table/render-context", "API_BASE_URL_DATASTATUS").catch(() => null),
        ]);

        const detail = detailRes?.resultjson || detailRes || {};
        const ctx = contextRes?.resultjson || contextRes || {};

        const defaultUiSettings = {
            font_family: 'Arial, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
            font_size: 14,
            theme_grid_color: "#E2E8F0",
            theme_grid_style: "solid",
            theme_grid_width: "1px",
            theme_stub_divider_color: "#CBD5E1",
            theme_stub_divider_style: "solid",
            theme_stub_divider_width: "1px",
            theme_section_separator_color: "#94A3B8",
            theme_section_separator_style: "solid",
            theme_section_separator_width: "1px",
            theme_header_divider_color: "#172554",
            theme_header_divider_style: "solid",
            theme_header_divider_width: "1px",
            theme_table_outer_top_color: "#CBD5E1",
            theme_table_outer_top_style: "solid",
            theme_table_outer_top_width: "1px",
            theme_table_outer_bottom_color: "#CBD5E1",
            theme_table_outer_bottom_style: "solid",
            theme_table_outer_bottom_width: "1px",
            theme_table_outer_left_color: "#CBD5E1",
            theme_table_outer_left_style: "solid",
            theme_table_outer_left_width: "1px",
            theme_table_outer_right_color: "#CBD5E1",
            theme_table_outer_right_style: "solid",
            theme_table_outer_right_width: "1px",
            theme_header_font: "",
            theme_stub_font: "",
            theme_data_font: "",
            theme_stub_tier_divider_color: "#CBD5E1",
            theme_stub_tier_divider_style: "solid",
            theme_stub_tier_divider_width: "1px",
            theme_header_tier_divider_color: "#CBD5E1",
            theme_header_tier_divider_style: "solid",
            theme_header_tier_divider_width: "1px",
            theme_banner_divider_color: "#CBD5E1",
            theme_banner_divider_style: "solid",
            theme_banner_divider_width: "1px",
            theme_data_col_divider_color: "#CBD5E1",
            theme_data_col_divider_style: "none",
            theme_data_col_divider_width: "1px",
            theme_group_preset_divider_color: "#111827",
            theme_group_preset_divider_style: "none",
            theme_group_preset_divider_width: "1px",
            stub_group_layout: "merge",
            format_percent_as_column: false,
        };

        const upperTableTheme = {};
        Object.keys(tableThemeJson).forEach((k) => {
            const val = tableThemeJson[k];
            upperTableTheme[k] = typeof val === "string" ? val.toUpperCase() : val;
        });

        const mergedUiSettings = {
            ...defaultUiSettings,
            ...(ctx.effective_render_settings || {}),
            ...(detail.ui_settings || {}),
            ...upperTableTheme,
        };

        const mergedDisplayPolicy = {
            show_n: true,
            show_percent: true,
            is_transpose: false,
            percent_digits: 1,
            mean_digits: 2,
            std_digits: 2,
            median_digits: 2,
            min_digits: 0,
            max_digits: 0,
            var_digits: 2,
            hide_zero_base_columns: true,
            hide_zero_banners: true,
            hide_zero_stubs: true,
            show_base_parenthesis: true,
            base_prefix: "(",
            base_postfix: ")",
            percent_symbol: true,
            format_bracket_all_n: false,
            bracket_all_n: false,
            percent_as_column: Boolean(mergedUiSettings.format_percent_as_column),
            stub_group_layout: mergedUiSettings.stub_group_layout || "merge",
            ...(ctx.effective_display_policy || {}),
            ...(detail.display_policy || {}),
        };

        const savePayload = {
            user: targetUser,
            pageid: targetPageId,
            weight_variable: detail.weight_variable && detail.weight_variable !== "없음"
                ? detail.weight_variable
                : (ctx.weight_variable && ctx.weight_variable !== "없음" ? ctx.weight_variable : null),
            confidence_level: detail.confidence_level ?? ctx.confidence_level ?? 95,
            is_transpose: Boolean(detail.is_transpose ?? mergedDisplayPolicy.is_transpose ?? false),
            ui_settings: mergedUiSettings,
            display_policy: mergedDisplayPolicy,
            scale_presets: Array.isArray(detail.scale_presets) ? detail.scale_presets : [],
            rank_presets: Array.isArray(detail.rank_presets) ? detail.rank_presets : [],
            group_presets: Array.isArray(detail.group_presets) ? detail.group_presets : [],
            stat_presets: Array.isArray(detail.stat_presets) ? detail.stat_presets : [],
            data_filter_expression: detail.data_filter_expression ?? null,
            data_filter_badges: Array.isArray(detail.data_filter_badges) ? detail.data_filter_badges : [],
        };

        await api.post(savePayload, "/dp-request/table/save", "API_BASE_URL_DATASTATUS");
        return true;
    } catch (err) {
        console.warn("Failed to sync brand table theme to /dp-request/table/save:", err);
        return false;
    }
}

