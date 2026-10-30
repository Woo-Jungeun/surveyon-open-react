/**
 * spss_name 표출 유틸
 * - 화면 표출(조회)용으로만 spss_name 을 사용한다. (예: q20 → SQ2.)
 * - 저장/수정/요청 payload 에는 절대 spss_name 을 쓰지 않고 기존처럼 id 를 사용한다.
 * - 응답 구조: top-level spss_name 또는 metadata.spss_name
 */

/** 변수 객체에서 spss_name 추출 (top-level → metadata.spss_name) */
export const getSpss = (v) => {
    if (!v || typeof v !== 'object') return '';
    const raw = v.spss_name ?? v.spssName ?? v.metadata?.spss_name ?? '';
    return typeof raw === 'string' ? raw.trim() : (raw ? String(raw) : '');
};

/** 변수 객체에서 표출용 이름을 반환 (spss_name 우선, 없으면 id / fallback) */
export const getDisplayId = (v, fallback = '') => {
    if (!v || typeof v !== 'object') return fallback || '';
    return getSpss(v) || v.id || fallback || '';
};

/**
 * 변수 컬렉션(배열 또는 { id: variable } 객체)들로 id → 표출명 맵 생성
 * @param  {...(Array|Object)} sources
 * @returns {Object<string,string>}
 */
export const buildDisplayNameMap = (...sources) => {
    const map = {};
    sources.forEach(src => {
        if (!src) return;
        const entries = Array.isArray(src)
            ? src.map(v => [v?.id, v])
            : Object.entries(src).map(([key, v]) => [v?.id || key, v]);
        entries.forEach(([id, v]) => {
            if (!id) return;
            const spss = getSpss(v);
            if (spss && spss !== id) map[id] = spss; // id 와 같은 값은 실제 표출명을 덮어쓰지 않음
            else if (!(id in map)) map[id] = id;
        });
    });
    return map;
};

/** id → 표출명 (맵에 없으면 id 그대로) */
export const resolveDisplayId = (map, id) => (id && map && map[id]) || id || '';

/** 저장 payload 용: 객체에서 top-level spss_name 키 제거 (표출 전용 필드가 저장되지 않도록) */
export const omitSpssName = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    if (!('spss_name' in obj)) return obj;
    // eslint-disable-next-line no-unused-vars
    const { spss_name, ...rest } = obj;
    return rest;
};
