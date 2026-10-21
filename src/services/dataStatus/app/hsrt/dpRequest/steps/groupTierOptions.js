// 그룹 묶기 단계 (그룹 대/중) — 그룹 표 · AI 자동 그룹 팝업 공용
export const TIER_OPTIONS = [
    { value: 1, text: '대분류' },
    { value: 2, text: '중분류' },
];

const tierOf = (g) => (Number(g?.tier) === 2 ? 2 : 1);

/** 대분류 idx 의 하위 묶음 마지막 index (하위 없으면 idx) */
export const groupBlockEnd = (rows, idx) => {
    let end = idx;
    while (end + 1 < rows.length && tierOf(rows[end + 1]) === 2) end++;
    return end;
};

/** [+] 같은 단계로 추가 — 대분류는 하위 묶음 다음, 중분류은 바로 아래 */
export const insertSiblingRow = (rows, idx, newRow) => {
    const next = [...rows];
    if (idx == null || idx < 0 || idx >= rows.length) {
        next.push({ ...newRow, tier: 1 });
        return next;
    }
    const tier = tierOf(rows[idx]);
    const at = tier === 1 ? groupBlockEnd(rows, idx) + 1 : idx + 1;
    next.splice(at, 0, { ...newRow, tier });
    return next;
};

/** [+ 하위] 대분류의 맨 끝 중분류으로 추가 */
export const insertChildRow = (rows, idx, newRow) => {
    const next = [...rows];
    next.splice(groupBlockEnd(rows, idx) + 1, 0, { ...newRow, tier: 2 });
    return next;
};

/** → 들여쓰기 (첫 행은 불가) / ← 내어쓰기 */
export const setRowTier = (rows, idx, tier) => {
    if (tier === 2 && idx === 0) return rows;
    return rows.map((r, i) => (i === idx ? { ...r, tier } : r));
};
