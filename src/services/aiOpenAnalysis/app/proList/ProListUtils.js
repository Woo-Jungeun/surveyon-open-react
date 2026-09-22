export const PERM = { READ: 0, WRITE: 1, MANAGE: 2 };

export function roleToPerm(usergroup) {
    if (!usergroup) return PERM.READ;
    const ug = String(usergroup).trim();
    if (ug.includes("관리자") || ug.includes("제작자") || ug.includes("오픈팀")) {
        return PERM.MANAGE;
    }
    if (ug.includes("연구원")) {
        return PERM.WRITE;
    }
    if (ug.includes("일반") || ug.includes("고객")) {
        return PERM.READ;
    }
    return PERM.READ;
}

export const hasPerm = (userPerm, need) => userPerm >= need;

export const GROUP_MIN_PERM = {
    VIEW: PERM.READ,
    ADMIN: PERM.WRITE,
    EDIT: PERM.WRITE,
    관리: PERM.READ,
    설정: PERM.WRITE,
};

export const FIELD_MIN_PERM = {
    chk: PERM.WRITE,
    tokens_text: PERM.READ,
    filterSetting: PERM.WRITE,
    useYN: PERM.WRITE,
    exclude: PERM.READ,
    project_lock: PERM.WRITE,
    qnum_text: PERM.READ,
    merge_qnum: PERM.WRITE,
};

// 정렬 
export const natKey = (v) => {
    if (v == null) return Number.NEGATIVE_INFINITY;
    const s = String(v).trim();
    return /^\d+$/.test(s) ? Number(s) : s.toLowerCase();
};

// 정렬용 프록시를 붙일 대상 필드
export const NAT_FIELDS = ["status_cnt", "status_cnt_total", "status_cnt_target_fin", "status_cnt_duplicated", "status_cnt_fin", "tokens_text"];

// API resultjson 파싱 헬퍼 (JSON 문자열/객체/배열 안전 변환)
export const parseRows = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {
            return [];
        }
    }
    if (typeof raw === 'object') {
        if (Array.isArray(raw.resultjson)) return raw.resultjson;
        if (typeof raw.resultjson === 'string') return parseRows(raw.resultjson);
        if (Array.isArray(raw.data)) return raw.data;
        if (Array.isArray(raw.list)) return raw.list;
    }
    return [];
};

// rows에 __sort__* 필드를 덧붙이고, 원필드→프록시 맵을 리턴
export const addSortProxies = (rows = []) => {
    const proxyField = {};
    const list = parseRows(rows);
    const dataWithProxies = list.map((r) => {
        const o = { ...r };
        for (const f of NAT_FIELDS) {
            const pf = `__sort__${f}`;
            o[pf] = natKey(r?.[f]);
            proxyField[f] = pf;
        }
        return o;
    });
    return { dataWithProxies, proxyField };
};
