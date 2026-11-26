/**
 * AI오픈 분석 화면 공통 유틸리티 및 무결성 검증 · 코드 전파 헬퍼
 */

export const cleanStr = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v).trim();
    if (/^(nan|null|undefined|none)$/i.test(s)) return "";
    return s;
};

export const ensureRowUids = (items) =>
    (items || []).map((r, i) => {
        const uid = r?._uid || `${r?.fixed_key || "row"}_c${r?.cid ?? 1}_${i}`;
        return {
            ...r,
            _uid: uid,
            __rowKey: uid,
        };
    });

export const extractList = (res, depth = 0) => {
    if (!res || depth > 5) return [];
    if (Array.isArray(res)) return res;
    if (typeof res === "string") {
        try {
            const parsed = JSON.parse(res);
            return extractList(parsed, depth + 1);
        } catch {
            return [];
        }
    }
    if (typeof res === "object") {
        const candidates = [
            res.resultjson,
            res.data,
            res.list,
            res.output,
            res.codes,
            res.rows,
            res.items,
        ];
        for (const item of candidates) {
            if (item === undefined || item === null) continue;
            if (Array.isArray(item)) return item;
            if (typeof item === "string" || typeof item === "object") {
                const nested = extractList(item, depth + 1);
                if (Array.isArray(nested) && nested.length > 0) return nested;
            }
        }
    }
    return [];
};

export const isCodeLocked = (row) => {
    if (!row) return false;
    if (row.is_lock === true || row.lock === true) return true;
    if (row.is_lock === false || row.lock === false) return false;
    const editable = String(row.is_editable ?? "").trim();
    if (editable === "불가") return true;
    if (editable === "가능") return false;
    const gubun = String(row.ex_gubun ?? "");
    if (gubun.includes("수정불가")) return true;
    if (gubun.includes("수정가능")) return false;
    const n = Number(cleanStr(row.lv123code || row.code_num));
    if (n >= 9997 && n <= 9999 && !row.__unlockedManual) return true;
    return false;
};

export const getGubunCategory = (row) => {
    const raw = String(row?.gubun_type || row?.ex_gubun || "").trim();
    if (raw.includes("트래킹")) return "트래킹";
    if (raw.includes("설문")) return "설문지";
    return "자동분석";
};

export const buildGubunAndLockPatch = (category, explicitLock = null) => {
    const cat = category || "자동분석";
    const defaultLocked = cat === "설문지" || cat === "트래킹";
    const locked = explicitLock !== null ? Boolean(explicitLock) : defaultLocked;

    let ex_gubun = "분석(수정가능)";
    if (cat === "설문지") {
        ex_gubun = locked ? "설문(수정불가)" : "설문(수정가능)";
    } else if (cat === "트래킹") {
        ex_gubun = locked ? "트래킹(수정불가)" : "트래킹(수정가능)";
    } else {
        ex_gubun = locked ? "분석(수정불가)" : "분석(수정가능)";
    }

    return {
        gubun_type: cat,
        ex_gubun,
        is_lock: locked,
        lock: locked,
        is_editable: locked ? "불가" : "가능",
        __unlockedManual: !locked,
    };
};

const CODE_GUBUN_META_PREFIX = "osa_code_gubun_meta_";

const getCodeGubunStorageKey = (projectnum, qnum) => {
    const pn = cleanStr(projectnum) || (typeof sessionStorage !== "undefined" ? cleanStr(sessionStorage.getItem("projectnum")) : "");
    const qn = cleanStr(qnum) || (typeof sessionStorage !== "undefined" ? cleanStr(sessionStorage.getItem("qnum")) : "");
    return pn && qn ? `${CODE_GUBUN_META_PREFIX}${pn}__${qn}` : "";
};

export const readCodeGubunMeta = (projectnum, qnum) => {
    if (typeof localStorage === "undefined") return {};
    const storageKey = getCodeGubunStorageKey(projectnum, qnum);
    if (!storageKey) return {};
    try {
        const raw = localStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
};

export const saveCodeGubunMeta = (projectnum, qnum, items = []) => {
    if (typeof localStorage === "undefined") return;
    const storageKey = getCodeGubunStorageKey(projectnum, qnum);
    if (!storageKey) return;
    try {
        const nextMap = {};
        (items || []).forEach((r) => {
            if (!r || r.__pendingDelete) return;
            const code = cleanStr(r.lv123code ?? r.code_num);
            if (!code) return;
            const cat = getGubunCategory(r);
            const locked = isCodeLocked(r);
            nextMap[code] = {
                gubun_type: cat,
                lv3: cleanStr(r.lv3),
                is_lock: locked,
            };
        });
        localStorage.setItem(storageKey, JSON.stringify(nextMap));
    } catch {
        // ignore storage quota errors
    }
};

/**
 * 보기 정렬 비교 함수: 소코드(lv123code / code_num) 숫자 오름차순 (없거나 비숫자는 맨 뒤)
 */
export const compareLegacyCodeOrder = (a, b) => {
    const parseCodeInt = (val) => {
        const s = cleanStr(val);
        if (!s || !/^-?\d+$/.test(s)) return Number.MAX_SAFE_INTEGER;
        const n = Number(s);
        return Number.isSafeInteger(n) ? n : Number.MAX_SAFE_INTEGER;
    };

    const rawA = cleanStr(a?.lv123code ?? a?.code_num);
    const rawB = cleanStr(b?.lv123code ?? b?.code_num);
    const numA = parseCodeInt(rawA);
    const numB = parseCodeInt(rawB);
    if (numA !== numB) return numA - numB;

    return rawA.localeCompare(rawB, "ko", { numeric: true });
};

export const normalizeCodeRows = (items = [], defaultQnum = "", projectnum = "") => {
    const resolvedQnum = cleanStr(defaultQnum) || cleanStr(items?.[0]?.qnum);
    const metaMap = readCodeGubunMeta(projectnum, resolvedQnum);

    const prepared = (items || []).map((r) => {
        const code = cleanStr(r?.lv123code ?? r?.code_num);
        const lv3 = cleanStr(r?.lv3);
        const locked = isCodeLocked(r);
        const rawGubunType = cleanStr(r?.gubun_type);
        const rawEx = cleanStr(r?.ex_gubun);

        let cat = getGubunCategory(r);
        const isAmbiguousLegacyEx =
            !rawGubunType &&
            (rawEx === "" ||
                rawEx === "survey" ||
                rawEx === "analysis" ||
                rawEx === "설문(수정불가)" ||
                rawEx === "분석(수정가능)");

        if (isAmbiguousLegacyEx && code && metaMap[code]?.gubun_type) {
            const saved = metaMap[code];
            // 동일 소분류명이거나 잠금(수정불가) 상태로 유지된 코드면 사용자가 지정한 보기구분(자동분석/설문지/트래킹) 복원
            if (saved.lv3 === lv3 || (locked && saved.is_lock)) {
                cat = saved.gubun_type;
            }
        }

        const patch = buildGubunAndLockPatch(cat, locked);
        return {
            ...r,
            qnum: r?.qnum || defaultQnum,
            lv1: cleanStr(r?.lv1),
            lv1code: cleanStr(r?.lv1code),
            lv2: cleanStr(r?.lv2),
            lv2code: cleanStr(r?.lv2code),
            lv3,
            lv123code: code,
            code_num: code,
            ex_gubun: patch.ex_gubun,
            gubun_type: patch.gubun_type,
            is_lock: patch.is_lock,
            lock: patch.lock,
            is_editable: patch.is_editable,
        };
    });

    return prepared.sort(compareLegacyCodeOrder).map((r, idx) => {
        const rowKey =
            r?.__rowKey ||
            r?._uid ||
            `code_${encodeURIComponent(r.lv123code)}_${encodeURIComponent(r.lv3)}_${idx}`;
        return {
            ...r,
            no: idx + 1,
            __rowKey: rowKey,
        };
    });
};

export const codesToLv3Options = (codes = []) =>
    (codes || [])
        .filter((r) => !r?.__pendingDelete && cleanStr(r?.lv3) !== "")
        .map((r) => {
            const code = cleanStr(r?.lv123code ?? r?.code_num);
            return {
                codeId: code,
                codeName: cleanStr(r?.lv3),
                lv1: cleanStr(r?.lv1),
                lv2: cleanStr(r?.lv2),
                lv1code: cleanStr(r?.lv1code),
                lv2code: cleanStr(r?.lv2code),
                lv123code: code,
                ex_gubun: r?.ex_gubun ?? "",
                is_lock: isCodeLocked(r),
                __rowKey: r?.__rowKey,
            };
        });

export const getNextAutoSubCode = (codes = []) => {
    const active = (codes || []).filter((c) => !c?.__pendingDelete);
    const usedSet = new Set(active.map((c) => cleanStr(c.lv123code ?? c.code_num)).filter(Boolean));
    let maxBelow99 = 0;
    active.forEach((c) => {
        const n = Number(cleanStr(c.lv123code ?? c.code_num));
        if (Number.isInteger(n) && n > 0 && n < 99 && n > maxBelow99) {
            maxBelow99 = n;
        }
    });
    let candidate = maxBelow99 + 1;
    while (usedSet.has(String(candidate)) || (candidate >= 97 && candidate <= 99)) {
        candidate += 1;
    }
    return String(candidate);
};

export const validateCodeLabelConsistency = (targetCodes = []) => {
    const activeCodes = (targetCodes || []).filter((c) => !c?.__pendingDelete);
    const codeToLabelMap = new Map();
    const l1CodeToNameMap = new Map();
    const l2CodeToNameMap = new Map();

    for (let i = 0; i < activeCodes.length; i++) {
        const item = activeCodes[i];
        const code = cleanStr(item.lv123code || item.code_num);
        const label = cleanStr(item.lv3);

        if (code && label) {
            if (codeToLabelMap.has(code) && codeToLabelMap.get(code) !== label) {
                return {
                    valid: false,
                    message: `[소코드 중복 오류] 소코드 '${code}'에 서로 다른 레이블('[${codeToLabelMap.get(
                        code
                    )}]' vs '[${label}]')이 정의되어 있습니다.`,
                };
            }
            codeToLabelMap.set(code, label);
        }

        const l1Code = cleanStr(item.lv1code);
        const l1Name = cleanStr(item.lv1);
        if (l1Code && l1Name) {
            if (l1CodeToNameMap.has(l1Code) && l1CodeToNameMap.get(l1Code) !== l1Name) {
                return {
                    valid: false,
                    message: `[대코드 중복 오류] 대코드 '${l1Code}'에 서로 다른 대분류명('[${l1CodeToNameMap.get(
                        l1Code
                    )}]' vs '[${l1Name}]')이 지정되어 있습니다.`,
                };
            }
            l1CodeToNameMap.set(l1Code, l1Name);
        }

        const l2Code = cleanStr(item.lv2code);
        const l2Name = cleanStr(item.lv2);
        if (l1Name && l2Code && l2Name) {
            const l2Key = `${l1Name}__${l2Code}`;
            if (l2CodeToNameMap.has(l2Key) && l2CodeToNameMap.get(l2Key) !== l2Name) {
                return {
                    valid: false,
                    message: `[중코드 중복 오류] 대분류 '[${l1Name}]' 내 중코드 '${l2Code}'에 서로 다른 중분류명이 지정되어 있습니다.`,
                };
            }
            l2CodeToNameMap.set(l2Key, l2Name);
        }
    }
    return { valid: true };
};

/**
 * 보기(codes) 필드 수정 시 충돌 검증 + 동일 분류 자동 전파 + 매핑 응답(responses) 동기화
 */
export const applyCodeFieldPropagation = ({
    codes = [],
    responses = [],
    targetRow,
    field,
    rawValue,
    selectedCodeKeys = new Set(),
}) => {
    const keyOf = (r) =>
        r?.__rowKey ||
        r?._uid ||
        `${encodeURIComponent(cleanStr(r?.lv123code))}__${encodeURIComponent(cleanStr(r?.lv3))}`;
    const targetKey = keyOf(targetRow);
    const nextVal = cleanStr(rawValue);
    const curVal = cleanStr(targetRow?.[field]);
    const isBatch = selectedCodeKeys?.size > 1 && selectedCodeKeys.has(targetKey);

    if (!targetRow || (!isBatch && nextVal === curVal)) {
        return { changed: false, ok: true, nextCodes: codes, nextResponses: responses };
    }

    const activeRows = (codes || []).filter((r) => !r?.__pendingDelete);

    const getNextMaxCatCode = (codeField) => {
        let maxBelow97 = 0;
        activeRows.forEach((r) => {
            const n = parseInt(cleanStr(r?.[codeField]).replace(/\D/g, ""), 10) || 0;
            if (n > 0 && n < 97 && n > maxBelow97) maxBelow97 = n;
        });
        return String(maxBelow97 + 1);
    };

    let nextCodes = codes;
    let codeRenameFrom = null;
    let codeRenameTo = null;

    if (field === "lv1code") {
        const curLv1 = cleanStr(targetRow.lv1);
        const existingForCode = nextVal
            ? activeRows.find(
                  (r) =>
                      keyOf(r) !== targetKey &&
                      cleanStr(r.lv1code) === nextVal &&
                      cleanStr(r.lv1) !== ""
              )
            : null;

        if (!isBatch && nextVal && curLv1 !== "" && existingForCode && cleanStr(existingForCode.lv1) !== curLv1) {
            return {
                ok: false,
                error: `대코드 '${nextVal}'은(는) 이미 대분류 '[${existingForCode.lv1}]'에서 사용 중입니다.`,
            };
        }

        if (isBatch) {
            const batchLv1 = !nextVal
                ? null
                : existingForCode
                  ? cleanStr(existingForCode.lv1)
                  : curLv1 || null;
            nextCodes = codes.map((r) => {
                const rKey = keyOf(r);
                if (!selectedCodeKeys.has(rKey) || isCodeLocked(r)) return r;
                return {
                    ...r,
                    lv1code: nextVal,
                    ...(batchLv1 !== null ? { lv1: batchLv1 } : {}),
                    inEdit: false,
                };
            });
        } else {
            const autoLv1 =
                nextVal && curLv1 === "" && existingForCode ? cleanStr(existingForCode.lv1) : null;
            nextCodes = codes.map((r) => {
                const rKey = keyOf(r);
                const match =
                    rKey === targetKey ||
                    (!isCodeLocked(r) && curLv1 !== "" && cleanStr(r.lv1) === curLv1);
                return match
                    ? {
                          ...r,
                          lv1code: nextVal,
                          ...(rKey === targetKey && autoLv1 ? { lv1: autoLv1 } : {}),
                          inEdit: false,
                      }
                    : r;
            });
        }
    } else if (field === "lv1") {
        const oldLv1 = cleanStr(targetRow.lv1);
        const existingSameLv1 = nextVal
            ? activeRows.find(
                  (r) =>
                      keyOf(r) !== targetKey &&
                      cleanStr(r.lv1) === nextVal &&
                      cleanStr(r.lv1code) !== ""
              ) ||
              (cleanStr(targetRow.lv1) === nextVal && cleanStr(targetRow.lv1code) !== ""
                  ? targetRow
                  : null)
            : null;
        const resolvedLv1Code = !nextVal
            ? ""
            : existingSameLv1
              ? cleanStr(existingSameLv1.lv1code)
              : cleanStr(targetRow.lv1code) || getNextMaxCatCode("lv1code");

        nextCodes = codes.map((r) => {
            const rKey = keyOf(r);
            const match = isBatch
                ? selectedCodeKeys.has(rKey) && !isCodeLocked(r)
                : existingSameLv1
                  ? rKey === targetKey
                  : rKey === targetKey ||
                    (!isCodeLocked(r) && oldLv1 !== "" && cleanStr(r.lv1) === oldLv1);
            return match ? { ...r, lv1: nextVal, lv1code: resolvedLv1Code, inEdit: false } : r;
        });
    } else if (field === "lv2code") {
        const curLv1 = cleanStr(targetRow.lv1);
        const curLv2 = cleanStr(targetRow.lv2);
        const existingForL2 = nextVal
            ? activeRows.find(
                  (r) =>
                      keyOf(r) !== targetKey &&
                      cleanStr(r.lv1) === curLv1 &&
                      cleanStr(r.lv2code) === nextVal &&
                      cleanStr(r.lv2) !== ""
              ) ||
              (!curLv1
                  ? activeRows.find(
                        (r) =>
                            keyOf(r) !== targetKey &&
                            cleanStr(r.lv2code) === nextVal &&
                            cleanStr(r.lv2) !== ""
                    )
                  : null)
            : null;

        if (!isBatch && nextVal && curLv2 !== "" && existingForL2 && cleanStr(existingForL2.lv2) !== curLv2) {
            return {
                ok: false,
                error: `중코드 '${nextVal}'은(는) 동일 대분류 내 중분류 '[${existingForL2.lv2}]'에서 이미 사용 중입니다.`,
            };
        }

        if (isBatch) {
            const batchLv2 = !nextVal
                ? null
                : existingForL2
                  ? cleanStr(existingForL2.lv2)
                  : curLv2 || null;
            nextCodes = codes.map((r) => {
                const rKey = keyOf(r);
                if (!selectedCodeKeys.has(rKey) || isCodeLocked(r)) return r;
                return {
                    ...r,
                    lv2code: nextVal,
                    ...(batchLv2 !== null ? { lv2: batchLv2 } : {}),
                    inEdit: false,
                };
            });
        } else {
            const autoLv2 =
                nextVal && curLv2 === "" && existingForL2 ? cleanStr(existingForL2.lv2) : null;
            nextCodes = codes.map((r) => {
                const rKey = keyOf(r);
                const match =
                    rKey === targetKey ||
                    (!isCodeLocked(r) &&
                        curLv2 !== "" &&
                        cleanStr(r.lv1) === curLv1 &&
                        cleanStr(r.lv2) === curLv2);
                return match
                    ? {
                          ...r,
                          lv2code: nextVal,
                          ...(rKey === targetKey && autoLv2 ? { lv2: autoLv2 } : {}),
                          inEdit: false,
                      }
                    : r;
            });
        }
    } else if (field === "lv2") {
        const curLv1 = cleanStr(targetRow.lv1);
        const oldLv2 = cleanStr(targetRow.lv2);
        const existingSameLv2 = nextVal
            ? activeRows.find(
                  (r) =>
                      keyOf(r) !== targetKey &&
                      cleanStr(r.lv1) === curLv1 &&
                      cleanStr(r.lv2) === nextVal &&
                      cleanStr(r.lv2code) !== ""
              ) ||
              (!curLv1
                  ? activeRows.find(
                        (r) =>
                            keyOf(r) !== targetKey &&
                            cleanStr(r.lv2) === nextVal &&
                            cleanStr(r.lv2code) !== ""
                    )
                  : null) ||
              (cleanStr(targetRow.lv2) === nextVal && cleanStr(targetRow.lv2code) !== ""
                  ? targetRow
                  : null)
            : null;
        const resolvedLv2Code = !nextVal
            ? ""
            : existingSameLv2
              ? cleanStr(existingSameLv2.lv2code)
              : cleanStr(targetRow.lv2code) || getNextMaxCatCode("lv2code");

        nextCodes = codes.map((r) => {
            const rKey = keyOf(r);
            const match = isBatch
                ? selectedCodeKeys.has(rKey) && !isCodeLocked(r)
                : existingSameLv2
                  ? rKey === targetKey
                  : rKey === targetKey ||
                    (!isCodeLocked(r) &&
                        oldLv2 !== "" &&
                        cleanStr(r.lv1) === curLv1 &&
                        cleanStr(r.lv2) === oldLv2);
            return match ? { ...r, lv2: nextVal, lv2code: resolvedLv2Code, inEdit: false } : r;
        });
    } else if (field === "lv123code") {
        const oldCode = cleanStr(targetRow.lv123code ?? targetRow.code_num);
        if (nextVal) {
            const conflict = activeRows.find(
                (r) => keyOf(r) !== targetKey && cleanStr(r.lv123code ?? r.code_num) === nextVal
            );
            if (conflict) {
                return {
                    ok: false,
                    error: `소코드 '${nextVal}'은(는) 이미 보기 '[${
                        conflict.lv3 || "미입력"
                    }]'에서 사용 중입니다.`,
                };
            }
        }
        codeRenameFrom = oldCode;
        codeRenameTo = nextVal;
        nextCodes = codes.map((r) =>
            keyOf(r) === targetKey
                ? { ...r, lv123code: nextVal, code_num: nextVal, inEdit: false }
                : r
        );
    } else if (field === "lv3") {
        const curCode = cleanStr(targetRow.lv123code ?? targetRow.code_num);
        if (curCode && nextVal) {
            const conflict = activeRows.find(
                (r) =>
                    keyOf(r) !== targetKey &&
                    cleanStr(r.lv123code ?? r.code_num) === curCode &&
                    cleanStr(r.lv3) !== "" &&
                    cleanStr(r.lv3) !== nextVal
            );
            if (conflict) {
                return {
                    ok: false,
                    error: `소코드 '${curCode}'에 서로 다른 레이블을 지정할 수 없습니다.`,
                };
            }
        }
        nextCodes = codes.map((r) =>
            keyOf(r) === targetKey ? { ...r, lv3: nextVal, inEdit: false } : r
        );
    }

    // 매핑된 responses 동기화
    const bySubCode = new Map();
    nextCodes.forEach((c) => {
        if (c?.__pendingDelete) return;
        const k = cleanStr(c.lv123code ?? c.code_num);
        if (k) bySubCode.set(k, c);
    });

    const nextResponses = (responses || []).map((resp) => {
        let curCode = cleanStr(resp?.lv123code ?? resp?.code_num);
        if (!curCode) return resp;

        if (codeRenameFrom && curCode === codeRenameFrom && codeRenameTo !== null) {
            curCode = codeRenameTo;
        }
        if (!curCode) {
            return {
                ...resp,
                lv1: "",
                lv1code: "",
                lv2: "",
                lv2code: "",
                lv3: "",
                lv3code: "",
                lv123code: "",
                _edited: true,
            };
        }

        const m = bySubCode.get(curCode);
        if (!m) return resp;

        if (
            resp.lv1 === m.lv1 &&
            resp.lv1code === m.lv1code &&
            resp.lv2 === m.lv2 &&
            resp.lv2code === m.lv2code &&
            resp.lv3 === m.lv3 &&
            resp.lv123code === curCode
        ) {
            return resp;
        }

        return {
            ...resp,
            lv1: m.lv1,
            lv1code: m.lv1code,
            lv2: m.lv2,
            lv2code: m.lv2code,
            lv3: m.lv3,
            lv3code: curCode,
            lv123code: curCode,
            _edited: true,
        };
    });

    return { ok: true, changed: true, nextCodes, nextResponses };
};

export const toggleThreeStageSort = (prevSort = [], field) => {
    const cur = (prevSort || []).find((s) => s.field === field);
    if (!cur) return [{ field, dir: "asc" }];
    if (cur.dir === "asc") return [{ field, dir: "desc" }];
    return [];
};
