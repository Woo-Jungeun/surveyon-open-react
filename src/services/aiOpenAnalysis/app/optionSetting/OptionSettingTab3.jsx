import React, { useState, useMemo, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { cleanStr, toggleThreeStageSort } from "./optionSettingUtils";
import { OsaDropDown } from "./OptionSettingKendoSelect.jsx";
import { useOsaResizableTable } from "./useOsaResizableTable";

const TAB3_SENTIMENT_OPTIONS = [
    { value: "all", text: "전체" },
    { value: "pos", text: "긍정" },
    { value: "neg", text: "부정" },
    { value: "neu", text: "중립" },
];

const natCompare = (aVal, bVal) => {
    const sa = cleanStr(aVal);
    const sb = cleanStr(bVal);
    const na = /^\d+$/.test(sa) ? Number(sa) : null;
    const nb = /^\d+$/.test(sb) ? Number(sb) : null;
    if (na !== null && nb !== null) return na - nb;
    return sa.localeCompare(sb, "ko");
};

const formatSentLabel = (raw) => {
    const s = cleanStr(raw).toLowerCase();
    if (!s) return { text: "—", cls: "empty" };
    if (s === "pos" || s === "positive" || s === "긍정") return { text: "긍정", cls: "pos" };
    if (s === "neg" || s === "negative" || s === "부정") return { text: "부정", cls: "neg" };
    if (s === "neu" || s === "neutral" || s === "중립") return { text: "중립", cls: "neu" };
    return { text: raw, cls: "neu" };
};

const resolveRawDate = (r) => {
    if (!r || typeof r !== "object") return "";
    const direct =
        r.created_at ??
        r.write_date ??
        r.insert_date ??
        r.reg_date ??
        r.savedate ??
        r.wdate ??
        r.indate ??
        r.updated_at ??
        r.update_date ??
        r.record_date ??
        r.response_date ??
        r.date;
    const cleaned = cleanStr(direct);
    if (cleaned) return cleaned;

    for (const [k, v] of Object.entries(r)) {
        if (/duplicate_remove/i.test(k)) continue;
        if (/(date|time|created|updated|dt)$/i.test(k)) {
            const sv = cleanStr(v);
            if (sv) return sv;
        }
    }
    return "";
};

const formatDisplayDate = (raw) => {
    const s = cleanStr(raw);
    if (!s) return "";
    const m = s.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2}:\d{2})/);
    if (m) return `${m[1]} ${m[2]}`;
    return s;
};

/**
 * [PID별 데이터] 탭 — 실시간 빈도(freq) 집계 · 전 컬럼 AND 검색 · PID별 데이터 새로고침 (100% 주황색 테마)
 */
const OptionSettingTab3 = ({ lvCode = "3", rawdata = [], onRefreshRawdata }) => {
    const [sort, setSort] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const tableScrollRef = useRef(null);
    useOsaResizableTable(tableScrollRef, String(lvCode));

    const [colFilters, setColFilters] = useState({
        pid: "",
        cid: "",
        answer: "",
        l1: "",
        l2: "",
        freq: "",
        code: "",
        l3: "",
        sent: "all",
        date: "",
    });

    const handleRefreshClick = async () => {
        if (!onRefreshRawdata || refreshing) return;
        setRefreshing(true);
        try {
            await onRefreshRawdata();
        } finally {
            setRefreshing(false);
        }
    };

    // 1) 소코드(lv123code || code_num) 기준 전체 출현 빈도 실시간 Map 계산
    const normalizedRows = useMemo(() => {
        const freqMap = new Map();
        (rawdata || []).forEach((r) => {
            const c = cleanStr(r?.lv123code ?? r?.code_num ?? r?.lv3code);
            if (c) freqMap.set(c, (freqMap.get(c) || 0) + 1);
        });

        return (rawdata || []).map((r, idx) => {
            const code = cleanStr(r?.lv123code ?? r?.code_num ?? r?.lv3code);
            const freq = code ? freqMap.get(code) || 0 : 0;
            const answerText =
                r?.answerfin ?? r?.answer_fin ?? r?.answer ?? r?.answer_origin ?? "";
            const rawDate = resolveRawDate(r);
            return {
                ...r,
                _key: `${r?.pid ?? "p"}_${r?.cid ?? 1}_${idx}`,
                pid: cleanStr(r?.pid),
                cid: cleanStr(r?.cid || 1),
                answer_origin: String(r?.answer_origin ?? ""),
                answerfin: String(answerText),
                lv1: cleanStr(r?.lv1),
                lv2: cleanStr(r?.lv2),
                lv3: cleanStr(r?.lv3),
                code,
                freq,
                sentiment: cleanStr(r?.sentiment),
                rawDate,
                date: formatDisplayDate(rawDate),
            };
        });
    }, [rawdata]);

    // 2) 전 컬럼 AND 검색 필터 + 3단계 정렬
    const filteredSorted = useMemo(() => {
        const match = (val, kw) => {
            const needle = kw.trim().toLowerCase();
            if (!needle) return true;
            return String(val ?? "").toLowerCase().includes(needle);
        };

        let list = normalizedRows.filter((r) => {
            if (!match(r.pid, colFilters.pid)) return false;
            if (!match(r.cid, colFilters.cid)) return false;
            if (
                colFilters.answer.trim() &&
                !match(r.answer_origin, colFilters.answer) &&
                !match(r.answerfin, colFilters.answer)
            ) {
                return false;
            }
            if (!match(r.lv1, colFilters.l1)) return false;
            if (!match(r.lv2, colFilters.l2)) return false;
            if (!match(r.freq, colFilters.freq)) return false;
            if (!match(r.code, colFilters.code)) return false;
            if (!match(r.lv3, colFilters.l3)) return false;
            if (colFilters.sent !== "all") {
                const sInfo = formatSentLabel(r.sentiment);
                if (colFilters.sent !== sInfo.cls) return false;
            }
            if (
                colFilters.date.trim() &&
                !match(r.date, colFilters.date) &&
                !match(r.rawDate, colFilters.date)
            ) {
                return false;
            }
            return true;
        });

        if (sort.length > 0) {
            const { field, dir } = sort[0];
            const mul = dir === "desc" ? -1 : 1;
            list = [...list].sort((a, b) => natCompare(a?.[field], b?.[field]) * mul);
        }

        return list;
    }, [normalizedRows, colFilters, sort]);

    const renderSortBadge = (field) => {
        const cur = sort.find((s) => s.field === field);
        if (!cur) return <span className="osa-sort-icon">⇅</span>;
        return <span className="osa-sort-icon active">{cur.dir === "asc" ? "↑" : "↓"}</span>;
    };

    const showLv1 = String(lvCode) === "3";
    const showLv2 = String(lvCode) === "2" || String(lvCode) === "3";
    const hasActiveFilter =
        Boolean(colFilters.pid.trim()) ||
        Boolean(colFilters.cid.trim()) ||
        Boolean(colFilters.answer.trim()) ||
        Boolean(colFilters.l1.trim()) ||
        Boolean(colFilters.l2.trim()) ||
        Boolean(colFilters.freq.trim()) ||
        Boolean(colFilters.code.trim()) ||
        Boolean(colFilters.l3.trim()) ||
        colFilters.sent !== "all" ||
        Boolean(colFilters.date.trim());

    return (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <div className="osa-subtoolbar">
                <div className="osa-subtoolbar-left">
                    <span className="osa-tab3-count">
                        조회 건수: <b>{filteredSorted.length.toLocaleString()}</b>건
                        {hasActiveFilter && (
                            <span style={{ marginLeft: "6px", color: "#94a3b8" }}>
                                (전체 {normalizedRows.length.toLocaleString()}건)
                            </span>
                        )}
                    </span>
                </div>

                {onRefreshRawdata && (
                    <button
                        type="button"
                        className="osa-icon-btn"
                        disabled={refreshing}
                        style={{ width: "30px", height: "30px", marginLeft: "auto" }}
                        title="PID별 데이터 새로고침"
                        aria-label="PID별 데이터 새로고침"
                        onClick={handleRefreshClick}
                    >
                        <RefreshCw size={14} className={refreshing ? "osa-spin" : ""} />
                    </button>
                )}
            </div>

            <div ref={tableScrollRef} className="osa-table-scroll">
                <table
                    className="osa-table"
                    style={{ minWidth: showLv1 ? "980px" : showLv2 ? "860px" : "740px" }}
                >
                    <thead>
                        <tr className="osa-th-row">
                            <th style={{ width: "48px", textAlign: "center", padding: "6px 4px" }}>
                                #
                            </th>
                            <th style={{ width: "130px" }}>
                                <span
                                    className="osa-th-sortable"
                                    onClick={() => setSort((p) => toggleThreeStageSort(p, "pid"))}
                                >
                                    PID {renderSortBadge("pid")}
                                </span>
                            </th>
                            <th style={{ width: "58px", textAlign: "center", padding: "6px 4px" }}>
                                <span
                                    className="osa-th-sortable"
                                    onClick={() => setSort((p) => toggleThreeStageSort(p, "cid"))}
                                >
                                    CID {renderSortBadge("cid")}
                                </span>
                            </th>
                            <th style={{ width: "23%" }}>
                                <span
                                    className="osa-th-sortable"
                                    onClick={() =>
                                        setSort((p) => toggleThreeStageSort(p, "answerfin"))
                                    }
                                >
                                    최종 응답 {renderSortBadge("answerfin")}
                                </span>
                            </th>
                            {showLv1 && (
                                <th style={{ width: "11%" }}>
                                    <span
                                        className="osa-th-sortable"
                                        onClick={() =>
                                            setSort((p) => toggleThreeStageSort(p, "lv1"))
                                        }
                                    >
                                        대분류 {renderSortBadge("lv1")}
                                    </span>
                                </th>
                            )}
                            {showLv2 && (
                                <th style={{ width: "11%" }}>
                                    <span
                                        className="osa-th-sortable"
                                        onClick={() =>
                                            setSort((p) => toggleThreeStageSort(p, "lv2"))
                                        }
                                    >
                                        중분류 {renderSortBadge("lv2")}
                                    </span>
                                </th>
                            )}
                            <th style={{ width: "66px", textAlign: "center" }}>
                                <span
                                    className="osa-th-sortable"
                                    onClick={() => setSort((p) => toggleThreeStageSort(p, "freq"))}
                                >
                                    빈도 {renderSortBadge("freq")}
                                </span>
                            </th>
                            <th style={{ width: "84px", textAlign: "center" }}>
                                <span
                                    className="osa-th-sortable"
                                    onClick={() => setSort((p) => toggleThreeStageSort(p, "code"))}
                                >
                                    소코드 {renderSortBadge("code")}
                                </span>
                            </th>
                            <th>
                                <span
                                    className="osa-th-sortable"
                                    onClick={() => setSort((p) => toggleThreeStageSort(p, "lv3"))}
                                >
                                    소분류 {renderSortBadge("lv3")}
                                </span>
                            </th>
                            <th style={{ width: "92px", textAlign: "center" }}>
                                <span
                                    className="osa-th-sortable"
                                    onClick={() =>
                                        setSort((p) => toggleThreeStageSort(p, "sentiment"))
                                    }
                                >
                                    감성 {renderSortBadge("sentiment")}
                                </span>
                            </th>
                            <th style={{ width: "155px" }}>
                                <span
                                    className="osa-th-sortable"
                                    onClick={() =>
                                        setSort((p) => toggleThreeStageSort(p, "rawDate"))
                                    }
                                >
                                    작성일 {renderSortBadge("rawDate")}
                                </span>
                            </th>
                        </tr>

                        {/* 2행: 전 컬럼 AND 검색 필터 */}
                        <tr className="osa-filter-row">
                            <th />
                            <th>
                                <input
                                    type="text"
                                    className="osa-col-filter-input"
                                    placeholder="PID 검색"
                                    value={colFilters.pid}
                                    onChange={(e) =>
                                        setColFilters((p) => ({ ...p, pid: e.target.value }))
                                    }
                                />
                            </th>
                            <th>
                                <input
                                    type="text"
                                    className="osa-col-filter-input"
                                    style={{ textAlign: "center" }}
                                    placeholder="CID"
                                    value={colFilters.cid}
                                    onChange={(e) =>
                                        setColFilters((p) => ({ ...p, cid: e.target.value }))
                                    }
                                />
                            </th>
                            <th>
                                <input
                                    type="text"
                                    className="osa-col-filter-input"
                                    placeholder="응답 검색"
                                    value={colFilters.answer}
                                    onChange={(e) =>
                                        setColFilters((p) => ({ ...p, answer: e.target.value }))
                                    }
                                />
                            </th>
                            {showLv1 && (
                                <th>
                                    <input
                                        type="text"
                                        className="osa-col-filter-input"
                                        placeholder="대분류"
                                        value={colFilters.l1}
                                        onChange={(e) =>
                                            setColFilters((p) => ({ ...p, l1: e.target.value }))
                                        }
                                    />
                                </th>
                            )}
                            {showLv2 && (
                                <th>
                                    <input
                                        type="text"
                                        className="osa-col-filter-input"
                                        placeholder="중분류"
                                        value={colFilters.l2}
                                        onChange={(e) =>
                                            setColFilters((p) => ({ ...p, l2: e.target.value }))
                                        }
                                    />
                                </th>
                            )}
                            <th>
                                <input
                                    type="text"
                                    className="osa-col-filter-input"
                                    style={{ textAlign: "center" }}
                                    placeholder="빈도"
                                    value={colFilters.freq}
                                    onChange={(e) =>
                                        setColFilters((p) => ({ ...p, freq: e.target.value }))
                                    }
                                />
                            </th>
                            <th>
                                <input
                                    type="text"
                                    className="osa-col-filter-input"
                                    style={{ textAlign: "center" }}
                                    placeholder="소코드"
                                    value={colFilters.code}
                                    onChange={(e) =>
                                        setColFilters((p) => ({ ...p, code: e.target.value }))
                                    }
                                />
                            </th>
                            <th>
                                <input
                                    type="text"
                                    className="osa-col-filter-input"
                                    placeholder="소분류"
                                    value={colFilters.l3}
                                    onChange={(e) =>
                                        setColFilters((p) => ({ ...p, l3: e.target.value }))
                                    }
                                />
                            </th>
                            <th>
                                <OsaDropDown
                                    size="sm"
                                    options={TAB3_SENTIMENT_OPTIONS}
                                    value={colFilters.sent}
                                    onValueChange={(v) =>
                                        setColFilters((p) => ({ ...p, sent: v }))
                                    }
                                />
                            </th>
                            <th>
                                <input
                                    type="text"
                                    className="osa-col-filter-input"
                                    placeholder="작성일"
                                    value={colFilters.date}
                                    onChange={(e) =>
                                        setColFilters((p) => ({ ...p, date: e.target.value }))
                                    }
                                />
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredSorted.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={9 + (showLv1 ? 1 : 0) + (showLv2 ? 1 : 0)}
                                    style={{
                                        padding: "44px 12px",
                                        textAlign: "center",
                                        color: "#94a3b8",
                                    }}
                                >
                                    조회된 데이터가 없습니다.
                                </td>
                            </tr>
                        ) : (
                            filteredSorted.map((row, idx) => {
                                const sInfo = formatSentLabel(row.sentiment);
                                const rowNo = (idx + 1).toLocaleString();
                                return (
                                    <tr key={row._key}>
                                        <td
                                            style={{
                                                textAlign: "center",
                                                color: "#64748b",
                                                fontVariantNumeric: "tabular-nums",
                                            }}
                                        >
                                            {rowNo}
                                        </td>
                                        <td title={row.pid}>{row.pid}</td>
                                        <td style={{ textAlign: "center", color: "#64748b" }}>
                                            {row.cid}
                                        </td>
                                        <td title={row.answerfin || row.answer_origin}>
                                            {row.answerfin || row.answer_origin || "—"}
                                        </td>
                                        {showLv1 && (
                                            <td style={{ color: "#64748b" }}>{row.lv1 || "—"}</td>
                                        )}
                                        {showLv2 && (
                                            <td style={{ color: "#64748b" }}>{row.lv2 || "—"}</td>
                                        )}
                                        <td style={{ textAlign: "center" }}>
                                            <span
                                                className={`osa-freq-badge ${row.freq === 0 ? "zero" : ""
                                                    }`}
                                            >
                                                {row.freq.toLocaleString()}
                                            </span>
                                        </td>
                                        <td
                                            style={{
                                                textAlign: "center",
                                                fontWeight: row.code ? 600 : 400,
                                                color: row.code ? "#ea580c" : "#cbd5e1",
                                            }}
                                        >
                                            {row.code || "—"}
                                        </td>
                                        <td title={row.lv3}>{row.lv3 || "—"}</td>
                                        <td style={{ textAlign: "center" }}>
                                            <span
                                                className={`osa-sent-pill ${sInfo.cls}`}
                                                style={{ cursor: "default" }}
                                            >
                                                {sInfo.text}
                                            </span>
                                        </td>
                                        <td
                                            title={row.rawDate || ""}
                                            style={{
                                                color: "#64748b",
                                                fontSize: "12px",
                                                fontVariantNumeric: "tabular-nums",
                                            }}
                                        >
                                            {row.date || "—"}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default OptionSettingTab3;
