export const PERM = { READ: 0, WRITE: 1, MANAGE: 2 };

export function roleToPerm(usergroup) {
    switch (usergroup) {
        case "관리자(관리,읽기,쓰기)":
        case "제작자(관리,읽기,쓰기)":
        case "오픈팀(관리,읽기,쓰기)":
            return PERM.MANAGE;
        case "연구원(읽기,쓰기)":
            return PERM.WRITE;
        case "일반(읽기)":
        case "고객(읽기)":
            return PERM.READ;
        default:
            return PERM.READ;
    }
}

export const hasPerm = (userPerm, need) => userPerm >= need;

export const GROUP_MIN_PERM = {
    VIEW: PERM.READ,
    ADMIN: PERM.WRITE,
    EDIT: PERM.MANAGE,
};

export const FIELD_MIN_PERM = {
    tokens_text: PERM.READ,
    filterSetting: PERM.WRITE,
    project_lock: PERM.MANAGE,
    qnum_text: PERM.WRITE,
    merge_qnum: PERM.WRITE,
};

// 정렬 
export const natKey = (v) => {
    if (v == null) return Number.NEGATIVE_INFINITY;
    const s = String(v).trim();
    return /^\d+$/.test(s) ? Number(s) : s.toLowerCase();
};

// 정렬용 프록시를 붙일 대상 필드
export const NAT_FIELDS = ["status_cnt", "status_cnt_duplicated", "status_cnt_fin", "tokens_text"];

// rows에 __sort__* 필드를 덧붙이고, 원필드→프록시 맵을 리턴
export const addSortProxies = (rows = []) => {
    const proxyField = {};
    const dataWithProxies = rows.map((r) => {
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
