import React, { useState, useCallback, useEffect, useContext, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { login } from "@/common/redux/action/AuthAction";
import { useNavigate, useLocation } from "react-router-dom";
import GridHeaderBtnPrimary from "@/components/style/button/GridHeaderBtnPrimary.jsx";
import GridHeaderBtnTxt from "@/components/style/button/GridHeaderBtnTxt.jsx";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { ProListApi } from "@/services/aiOpenAnalysis/app/proList/ProListApi.js";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import { Button } from "@progress/kendo-react-buttons";
import ProListPopup from "@/services/aiOpenAnalysis/app/proList/ProListPopup";    // 필터문항설정 팝업
import "@/services/aiOpenAnalysis/app/proList/ProList.css";
import { modalContext } from "@/components/common/Modal.jsx";
import moment from "moment";

/**
 * 문항 목록
 *
 * @author jewoo
 * @since 2025-09-12<br />
 */

//--------- 권한 레벨 --------- 
const PERM = { READ: 0, WRITE: 1, MANAGE: 2 };

function roleToPerm(usergroup) {
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
const hasPerm = (userPerm, need) => userPerm >= need;

const GROUP_MIN_PERM = {
    VIEW: PERM.READ,
    ADMIN: PERM.WRITE,
    EDIT: PERM.MANAGE,
};
const FIELD_MIN_PERM = {
    tokens_text: PERM.READ,
    filterSetting: PERM.WRITE,
    project_lock: PERM.MANAGE,
};

// 정렬 
const natKey = (v) => {
    if (v == null) return Number.NEGATIVE_INFINITY;
    const s = String(v).trim();
    return /^\d+$/.test(s) ? Number(s) : s.toLowerCase();
};

// 정렬용 프록시를 붙일 대상 필드
const NAT_FIELDS = ["status_cnt", "status_cnt_duplicated", "status_cnt_fin", "tokens_text"]; // 필요 시 추가

// rows에 __sort__* 필드를 덧붙이고, 원필드→프록시 맵을 리턴
const addSortProxies = (rows = []) => {
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

const ProList = () => {
    const auth = useSelector((store) => store.auth);
    const userAuth = auth?.user?.userAuth || "";
    const dispatch = useDispatch();
    const modal = useContext(modalContext);
    const navigate = useNavigate();
    const DATA_ITEM_KEY = "no";
    const SELECTED_FIELD = "selected";
    const { state } = useLocation();
    const projectnumFromState = state?.projectnum;
    const [projectnum, setProjectnum] = useState(() =>
        projectnumFromState ?? sessionStorage.getItem("projectnum") ?? ""   //프로젝트 번호 없으면 세션에서 가져옴
    );
    useEffect(() => {
        if (projectnumFromState) {
            setProjectnum(projectnumFromState);
            sessionStorage.setItem("projectnum", projectnumFromState);
            sessionStorage.setItem("projectname", state?.projectname);
            sessionStorage.setItem("servername", state?.servername);
            sessionStorage.setItem("projectpof", state?.projectpof);
        }
    }, [projectnumFromState]);

    // 정렬/필터를 controlled
    const [sort, setSort] = useState([]);
    const [filter, setFilter] = useState(null);
    const [popupShow, setPopupShow] = useState(false);        // 필터문항설정 팝업 popupShow

    const { proListData, editMutation, excelDownloadMutation } = ProListApi();

    // 스크롤 위치 저장용 ref
    const scrollTopRef = useRef(0);

    //재조회 후 그리드 업데이트 플래그
    const [gridDataKey, setGridDataKey] = useState(0);
    const [timeStamp, setTimeStamp] = useState(0); // cache buster
    const [mergeEditsById, setMergeEditsById] = useState(new Map()); // 행별 머지 텍스트 편집값
    const [mergeSavedBaseline, setMergeSavedBaseline] = useState(new Map());

    // mergeSavedBaseline, mergeEditsById 초기화 
    useEffect(() => {
        const rows = proListData?.data?.resultjson ?? [];
        if (!rows.length) return;

        setMergeSavedBaseline(new Map(rows.map(r => [r.id, r.merge_qnum || ""])));
        setMergeEditsById(new Map(rows.map(r => [r.id, r.merge_qnum || ""])));
    }, [proListData?.data?.resultjson]);

    //컬럼 표출 권한 체크
    const [userPerm, setUserPerm] = useState(PERM.READ);

    useEffect(() => {
        const ug = proListData?.data?.usergroup;
        if (!ug) return;
        setUserPerm(roleToPerm(ug));

        // userAuth가 이미 동일하면 dispatch 생략
        if (auth?.user?.userAuth !== ug) {
            dispatch(login({ ...auth?.user, userAuth: ug }));
        }
    }, [proListData?.data?.usergroup]);

    // 서브그룹으로 묶으면서 리프 헤더를 숨기는 헬퍼
    const withSubgroup = (sub, leafOrder = 0) => (col) => ({
        ...col,
        subgroup: sub,
        noLeafHeader: true,
        leafOrder,
    });

    const [columns, setColumns] = useState(() => [
        // ----- VIEW -----
        { field: "no", title: "no", group: "VIEW", show: true, allowHide: false, order: 1, width: "80px" },
        { field: "model", title: "모델", group: "VIEW", show: true, allowHide: false, order: 2 },
        { field: "qnum", title: "문번호", group: "VIEW", show: true, allowHide: false, order: 3, width: "150px" },

        // 문항최종(이미 묶음)
        withSubgroup("문항최종", 1)({ field: "qnum_text", title: "문항최종번호", group: "VIEW", show: true, allowHide: false, order: 4 }),
        withSubgroup("문항최종", 2)({ field: "question_fin", title: "문항최종", group: "VIEW", show: true, allowHide: false, order: 4, width: "350px", wrap: true }),

        { field: "status_cnt", title: "응답자수", group: "VIEW", show: true, allowHide: false, order: 5 },
        { field: "status_cnt_duplicated", title: "분석대상수", group: "VIEW", show: true, allowHide: false, order: 6 },
        { field: "status_cnt_fin", title: "분석완료수", group: "VIEW", show: true, allowHide: false, order: 7 },
        { field: "status_text", title: "진행상황", group: "VIEW", show: true, allowHide: false, order: 8 },
        { field: "filterSetting", title: "필터문항 설정", group: "VIEW", show: true, editable: false, allowHide: false, order: 9 },
        { field: "tokens_text", title: "예상비용", group: "VIEW", show: true, allowHide: false, order: 10 },

        // ----- ADMIN → "분석/제외"로 합치기 -----
        { field: "useYN", title: "분석", group: "ADMIN", show: true, order: 1 },
        { field: "exclude", title: "제외", group: "ADMIN", show: true, order: 2 },

        // ----- EDIT  → "문항통합"으로 합치기 -----
        withSubgroup("문항통합저장", 1)({ field: "qnum_text", title: "", group: "EDIT", show: true, allowHide: false, order: 1 }),
        withSubgroup("문항통합저장", 2)({ field: "merge_qnum", title: "", group: "EDIT", show: true, allowHide: false, order: 1 }),

        { field: "project_lock", title: "수정", group: "EDIT", show: true, order: 2 },
    ]);

    // 행 클릭 → /option_setting 로 이동
    const goOpenSetting = ((merge_qnum) => navigate('/ai_open_analysis/option_setting', { state: { projectnum, qnum: merge_qnum, userPerm: userPerm } }));

    // 권한 반영 컬럼 배열
    const columnsForPerm = useMemo(() => {
        return columns.map((c) => {
            const need = (FIELD_MIN_PERM[c.field] ?? GROUP_MIN_PERM[c.group || "VIEW"] ?? PERM.READ);
            const canSee = hasPerm(userPerm, need);
            return { ...c, show: (c.show !== false) && canSee };
        });
    }, [columns, userPerm]);

    // 공통 메뉴 팩토리: 컬럼 메뉴에 columns & setColumns 전달
    const columnMenu = useMemo(() => {
        const handleColumnsChange = (updated) => {
            const map = new Map(updated.map(c => [c.field, c]));
            setColumns(prev => prev.map(c => map.get(c.field) ? { ...c, ...map.get(c.field) } : c));
        };
        return (menuProps) => (
            <ExcelColumnMenu
                {...menuProps}
                columns={columnsForPerm}
                onColumnsChange={handleColumnsChange}
                filter={filter}
                onFilterChange={(e) => setFilter(e ?? null)}
                onSortChange={(e) => setSort(e ?? [])}
            />
        );
    }, [columnsForPerm, filter]);

    const saveBlobWithName = (blob, filename = "download.xlsx") => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename; // 고정 파일명
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    // 보기추출 엑셀 다운로드  이벤트
    const handleExportExcel = async () => {
        try {
            const payload = {
                user: auth?.user?.userId || "",
                projectnum,
                gb: "export_lb_excel"
            };
            const res = await excelDownloadMutation.mutateAsync(payload);

            const blob = res?.data instanceof Blob ? res.data : (res instanceof Blob ? res : null);

            if (!blob) {
                modal.showErrorAlert("에러", "보기추출 파일을 받지 못했습니다.");
                return;
            }

            if (blob.type?.includes("application/json")) {
                modal.showErrorAlert("에러", "보기 추출 요청이 거부되었습니다.");
                return;
            }

            saveBlobWithName(blob, `보기 추출 (개발자용)_${projectnum}_${moment().format("YYYYMMDDHHmmss")}.xlsx`);

        } catch (err) {
            console.error(err);
            modal.showErrorAlert("오류", "보기 추출 중 오류가 발생했습니다.");
        }
    };

    //grid rendering 
    const GridRenderer = (props) => {
        const renderCount = useRef(0);
        renderCount.current += 1;
        const { selectedState, setSelectedState, idGetter, dataState, dataItemKey, selectedField, handleSearch, scrollTopRef, mergeSavedBaseline, setMergeSavedBaseline } = props;

        const groupOrder = ["VIEW", "ADMIN", "EDIT"]; // 상단 그룹 순서

        const [locksById, setLocksById] = useState(new Map());          // 행 잠금상태
        const [excludedById, setExcludedById] = useState(new Map());    // 분석/제외 토글 상태

        const pendingFlushRef = useRef(false); // 저장 후 1회 입력 캐시 초기화 플래그
        const { dataWithProxies, proxyField } = useMemo(
            () => addSortProxies(dataState?.data || []),
            [dataState?.data]
        );
        const mappedSort = useMemo(
            () => (sort || []).map(s => ({ ...s, field: proxyField[s.field] ?? s.field })),
            [sort, proxyField]
        );
        // 저장 여부 확인 
        const blockWhenDirty = useCallback(() => {
            // 블러된 변경: 상태 기반
            const changed = getMergeChanges();
            const hasChanged = Object.keys(changed).length > 0;

            // 블러 전 변경: 셀에 붙여둔 .cell-merge-diff 존재 여부
            const gridEl = document.getElementById('grid_01');
            const hasDirtyCell = !!(gridEl && gridEl.querySelector('.cell-merge-diff'));
            if (hasChanged || hasDirtyCell) {
                modal.showErrorAlert("알림", "문항통합 입력에 저장되지 않은 내용이 있습니다.\n[문항통합저장]을 먼저 눌러 저장해 주세요.");
                return true; // block
            }
            return false; // proceed
        }, [dataState?.data, mergeEditsById, modal]);

        // ---------------- merge helpers ----------------
        const norm = (s) => String(s ?? "").trim();
        const getMergeVal = (row) =>
            mergeEditsById.has(row?.id) ? mergeEditsById.get(row?.id) : (row?.merge_qnum ?? "");
        const setMergeVal = (row, v) =>
            setMergeEditsById(m => { const n = new Map(m); n.set(row?.id, v); return n; });

        // 변경 검출 기준 = 서버값 merge_qnum
        const getMergeChanges = () => {
            const rows = dataState?.data ?? [];
            const changed = {};
            rows.forEach(r => {
                if (isLocked(r)) return;
                const base = norm(mergeSavedBaseline.get(r.id) ?? "");
                const cur = norm(getMergeVal(r));
                if (cur !== base) changed[r.id] = cur;
            });
            return changed;
        };
        // 현재 입력 기준 그룹 계산(화면 순서 유지)
        const dupGroups = useMemo(() => {
            const rows = dataState?.data ?? [];
            const map = new Map(); // key -> Row[]
            rows.forEach(r => {
                const key = norm(getMergeVal(r));
                if (!key) return;
                if (!map.has(key)) map.set(key, []);
                map.get(key).push(r); // 화면 순서 유지
            });
            const firstOfGroup = new Set();
            const restOfGroup = new Set();
            for (const [, arr] of map) {
                if (arr.length >= 2) {
                    firstOfGroup.add(arr[0].id);
                    for (let i = 1; i < arr.length; i++) restOfGroup.add(arr[i].id);
                }
            }
            return { firstOfGroup, restOfGroup, map };
        }, [dataState?.data, mergeEditsById]);

        // 표출 머지 여부는 "현재 입력" 기준으로 계산
        const isMergeRow = (row) => dupGroups.restOfGroup.has(row?.id);
        // 문항통합저장: "수정한 행" ∪ "그로 인해 실제 상태가 바뀐 행"만 호출
        const sendMergeAll = async () => {
            const beforeEdits = new Map(mergeEditsById);
            rememberScroll(); // 스크롤 위치 저장
            const rows = dataState?.data ?? [];
            const changesObj = getMergeChanges();                 // { id: "텍스트" }
            const changedIds = new Set(Object.keys(changesObj).map(n => Number(n))); // [추가]

            if (changedIds.size === 0) {
                modal.showErrorAlert("알림", "변경된 항목이 없습니다.");
                return;
            }

            // 빈 값 검증
            const idToNo = new Map(rows.map(r => [String(r.id), r.no]));
            const blankIds = [...changedIds].filter((qid) => norm(changesObj[qid]) === "");
            if (blankIds.length > 0) {
                const blankNos = blankIds.map((qid) => idToNo.get(String(qid))).filter(Boolean);
                modal.showErrorAlert("알림", `[행: ${blankNos.join(", ")}] 분석을 위해 '문항통합'란을 입력해 주세요.`);
                setMergeEditsById(beforeEdits);
                return;
            }

            // 서버 그룹(이전) & UI 그룹(현재 입력) 빌드
            const buildGroups = (items, getter) => {
                const m = new Map(); // key -> Row[]
                items.forEach(r => {
                    const key = norm(getter(r));
                    if (!key) return;
                    if (!m.has(key)) m.set(key, []);
                    m.get(key).push(r); // 화면 순서 유지
                });
                return m;
            };
            const serverGroups = buildGroups(rows, r => r.merge_qnum); // 이전
            const uiGroups = buildGroups(rows, r => getMergeVal(r));     // 현재(입력)

            // toCall = (수정한 행) ∪ (상태가 실제 바뀐 행)
            const toCall = new Map(); // id -> '분석' | '머지'

            // 1) 수정한 행은 무조건 후보에 포함 (요구사항 반영)
            for (const id of changedIds) {
                const r = rows.find(x => Number(x.id) === id);
                if (!r) continue;
                if (String(r?.useYN ?? "").trim() === "제외") continue; // 제외는 스킵
                const key = norm(getMergeVal(r));
                const g = uiGroups.get(key) || [];
                const target = (g.length >= 2 && g[0]?.id !== r.id) ? "머지" : "분석";
                toCall.set(r.id, target);
            }

            // 2) 그 변경으로 인해 '분석/머지' 상태가 바뀐 행만 추가
            //    (= 서버 상태 vs 현재 입력 기준 target 이 달라진 경우만)
            const affectedIds = new Set();
            for (const id of changedIds) {
                const r = rows.find(x => Number(x.id) === id);
                if (!r) continue;
                const oldKey = norm(r.merge_qnum);
                const newKey = norm(getMergeVal(r));
                (serverGroups.get(oldKey) || []).forEach(x => affectedIds.add(Number(x.id)));
                (uiGroups.get(newKey) || []).forEach(x => affectedIds.add(Number(x.id)));
            }

            for (const r of rows) {
                if (!affectedIds.has(Number(r.id))) continue;
                if (String(r?.useYN ?? "").trim() === "제외") continue; // 제외는 건드리지 않음
                if (isLocked(r)) continue;

                const key = norm(getMergeVal(r));
                const g = uiGroups.get(key) || [];
                const target = (g.length >= 2 && g[0]?.id !== r.id) ? "머지" : "분석";

                // 서버 상태와 다를 때만 추가 (실제 바뀐 행만)
                if (normalizeUseYN(r) !== target) {
                    toCall.set(r.id, target); // set이라 중복 덮어쓰기 OK
                }
            }

            try {
                // 3) 문항통합 저장
                const payload = {
                    user: auth?.user?.userId || "",
                    projectnum,
                    gb: "allmerge",
                    val: changesObj,
                };
                const res = await editMutation.mutateAsync(payload);
                if (res?.success !== "777") throw new Error("merge 저장 실패");
                pendingFlushRef.current = true; // 0) 저장 직후 dirty-block 무시 모드 ON  ← 핵심
                setMergeSavedBaseline(new Map(
                    rows.map(r => [r.id, getMergeVal(r)])
                ));
                setMergeEditsById(new Map(
                    rows.map(r => [r.id, getMergeVal(r)])
                ));
                // DOM 노란색 제거 (렌더 직후)
                requestAnimationFrame(() => {
                    const grid = document.getElementById("grid_01");
                    if (grid) {
                        grid.querySelectorAll(".cell-merge-diff").forEach(el => {
                            el.classList.remove("cell-merge-diff");
                        });
                    }
                });
                // 4) 선택된 행들만 useYN 동기화
                for (const r of rows) {
                    if (!affectedIds.has(Number(r.id))) continue;
                    if (String(r?.useYN ?? "").trim() === "제외") continue; // 제외는 건드리지 않음
                    if (isLocked(r)) continue;
                    await sendAnalysis({ scope: "row", id: r.id, excluded: false, refresh: false });
                }

                // 다음 재조회에서 1회 입력 캐시 초기화 + 재조회
                pendingFlushRef.current = true;
                setTimeStamp(Date.now());
            } catch (e) {
                console.error(e);
                modal.showErrorAlert("에러", "저장 중 오류가 발생했습니다.");
            }
        };

        // ---------------- analysis helpers ----------------
        // useYN 기반으로 제외 여부 파싱
        const deriveExcluded = (row) => {
            const u = String(row?.useYN ?? "").trim();
            if (u === "제외") return true;       // 제외
            return false;                        // '분석', '머지', 공백 등은 포함
        };

        // 초기화: API 데이터 들어올 때 한 번 세팅
        useEffect(() => {
            const m = new Map();
            (dataState?.data ?? []).forEach((row) => {
                m.set(row?.id, deriveExcluded(row));
            });
            setExcludedById(m);
        }, [dataState?.data]);

        const isExcluded = (row) =>
            excludedById.has(row?.id) ? !!excludedById.get(row?.id) : deriveExcluded(row);

        const setExcluded = (row, excluded) =>
            setExcludedById(m => { const n = new Map(m); n.set(row.id, excluded); return n; });

        // API 호출 (row / all)
        const sendAnalysis = async ({ scope, id, excluded, refresh = true }) => {
            const payload = {
                user: auth?.user?.userId || "",
                projectnum,
                gb: scope === "row" ? "analysis" : "allanalysis",
                columnname: "useyn",
                val: excluded ? "제외" : "분석",
                ...(scope === "row" ? { qid: id } : {}),
            };
            rememberScroll(); // 스크롤 위치 저장 
            const res = await editMutation.mutateAsync(payload);
            if (res?.success === "777") {
                if (refresh) {
                    setTimeStamp(Date.now());
                    setGridDataKey((k) => k + 1);
                }
            } else {
                modal.showErrorAlert("에러", "오류가 발생했습니다.");
            }
        };

        const guard = (need, fn) => (...args) => {
            if (!hasPerm(userPerm, need)) return; // 권한 없으면 noop
            return fn?.(...args);
        };

        // 행 토글
        const toggleExcluded = guard(PERM.WRITE, async (row) => {
            if (blockWhenDirty()) return;
            const prev = isExcluded(row);
            setExcluded(row, !prev); // 낙관적
            try {
                await sendAnalysis({ scope: "row", excluded: !prev, id: row?.id });
            } catch (e) {
                setExcluded(row, prev); // 실패 롤백
                console.error(e);
            }
        });

        // 서버 useYN → '분석' | '머지' | '제외'
        const normalizeUseYN = (row) => {
            const u = String(row?.useYN ?? '').trim();
            if (u === '제외') return '제외';
            if (u === '머지') return '머지';
            return '분석';
        };


        // 전체 토글
        const bulkSetExcluded = async (excluded) => {
            const rows = dataState?.data ?? [];
            const prev = new Map(excludedById);

            // 머지 행은 기존 상태 유지
            const next = new Map(
                rows.map((r) => [r?.id, isMergeRow(r) ? isExcluded(r) : excluded])
            );
            setExcludedById(next);

            try {
                await sendAnalysis({ scope: 'all', excluded });
            } catch (e) {
                setExcludedById(prev);
                console.error(e);
            }
        };

        // ---------------- lock helpers ----------------
        // 행별 잠금상태 초기화: API의 project_lock 값에 맞춤
        useEffect(() => {
            const map = new Map();
            (dataState?.data ?? []).forEach((row) => {
                map.set(row?.id, row?.project_lock === "수정불가");
            });
            setLocksById(map);
        }, [dataState?.data, idGetter]);

        const isLocked = (row) => !!locksById.get(row?.id);
        const setRowLocked = (row, locked) =>
            setLocksById((m) => {
                const next = new Map(m);
                next.set(row?.id, locked);
                return next;
            });

        // 재조회 전 스크롤 저장
        const rememberScroll = () => {
            const grid = document.querySelector("#grid_01 .k-grid-content");
            if (grid) {
                scrollTopRef.current = grid.scrollTop;
            } else {
                console.warn("[rememberScroll] grid 요소를 찾지 못함");
            }
        };

        // 재조회 후 스크롤 복원 (렌더 완료 후)
        useEffect(() => {
            if (!dataState?.data?.length) return;
            const saved = scrollTopRef.current;
            const timer = setTimeout(() => {
                const grid = document.querySelector("#grid_01 .k-grid-content");
                if (grid) {
                    grid.scrollTop = saved;
                } else {
                    console.warn("[restoreScroll] grid 요소를 찾지 못함");
                }
            }, 30);
            return () => clearTimeout(timer);
        }, [dataState?.data]);

        // 수정 잠금 api 연결     
        const sendLock = async (gbVal, lockVal, id) => {
            const payload = {
                user: auth?.user?.userId || "",
                projectnum,
                gb: gbVal,
                columnname: "project_lock",
                val: lockVal,
                ...(gbVal === "rowEdit" ? { qid: id } : {}),
            };
            rememberScroll(); // 스크롤 위치 저장 
            const res = await editMutation.mutateAsync(payload);
            if (res?.success === "777") {
                handleSearch?.();   // 재조회
            } else {
                modal.showErrorAlert("에러", "오류가 발생했습니다.");
            }
        };

        // 수정 잠금 api 구분
        const lockApi = {
            // 행 하나 잠금/해제
            lockOne: (id) => sendLock("rowEdit", "수정불가", id),
            unlockOne: (id) => sendLock("rowEdit", "수정", id),

            // 전체 잠금/해제
            lockAll: () => sendLock("allEdit", "수정불가"),
            unlockAll: () => sendLock("allEdit", "수정"),
        };

        const toggleRowLock = guard(PERM.MANAGE, async (row) => {
            if (blockWhenDirty()) return;
            if (isExcluded(row)) return; // 제외 상태에서는 아무 것도 하지 않음
            const prev = isLocked(row);
            setRowLocked(row, !prev);
            try {
                await (prev ? lockApi.unlockOne(row?.id) : lockApi.lockOne(row?.id));
            } catch (e) {
                setRowLocked(row, prev);              // 실패 시 롤백
                console.error(e);
            }
        });

        const bulkSetLock = async (locked) => {
            if (blockWhenDirty()) return;
            const ids = (dataState?.data ?? []).map((r) => r.id);
            const prev = new Map(locksById);
            setLocksById(new Map(ids.map((id) => [id, locked])));
            rememberScroll(); // 스크롤 위치 저장 
            try {
                await (locked ? lockApi.lockAll() : lockApi.unlockAll());
            } catch (e) {
                setLocksById(prev);                   // 실패 시 롤백
                console.error(e);
            }
        };

        // ---------------- header/action helpers ----------------
        // 개별 컬럼 렌더 공통 함수
        const actions = {
            onHeaderUseYN: guard(PERM.WRITE, () => { if (!blockWhenDirty()) bulkSetExcluded(false); }),
            onHeaderExclude: guard(PERM.WRITE, () => { if (!blockWhenDirty()) bulkSetExcluded(true); }),
            onHeaderMergeSave: guard(PERM.MANAGE, () => sendMergeAll()),
            onHeaderEditLockAll: guard(PERM.MANAGE, () => { if (!blockWhenDirty()) bulkSetLock(true); }),
            onHeaderEditUnlockAll: guard(PERM.MANAGE, () => { if (!blockWhenDirty()) bulkSetLock(false); }),
        };

        // 헤더 버튼(단일)
        const HeaderBtn = ({ className = 'btnS', children, onClick }) => (
            <div onClick={(e) => e.stopPropagation()} // 정렬/소팅 이벤트 막기
                style={{ display: 'flex', justifyContent: 'center' }}>
                <Button className={className} onClick={onClick}>{children}</Button>
            </div>
        );

        // 헤더 버튼(2개)
        const HeaderBtnGroup = ({ buttons }) => (
            <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                {buttons.map((b, i) => (
                    <Button key={i} className={b.className ?? 'btnS'} onClick={b.onClick}>
                        {b.text}
                    </Button>
                ))}
            </div>
        );

        // 라벨 + 버튼그룹(세로 스택)
        const HeaderLabeledBtnGroup = ({ label, buttons }) => (
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
            >
                <span style={{ fontWeight: 500 }}>{label}</span>
                <HeaderBtnGroup buttons={buttons} />
            </div>
        );

        // 컬럼에서 wrap이면 멀티라인 셀 사용 => 문항 최종 
        const WrapCell = (field) => (cellProps) => (
            <td className="cell-wrap">{cellProps.dataItem?.[field]}</td>
        );

        const renderLeafColumn = (c) => {
            // 분석 상태가 머지일 경우 숨길 컬럼 
            const BlankWhenMergeCell = (field) => (cellProps) => {
                const row = cellProps.dataItem;
                return <td>{isMergeRow(row) ? '' : row?.[field]}</td>;
            };

            // ADMIN: 분석(버튼 헤더)
            if (c.field === 'useYN') {
                return (
                    <Column
                        key={c.field}
                        field={c.field}
                        title={c.title}
                        width={c.width ?? '72px'}
                        sortable={false}
                        filterable={false}
                        columnMenu={undefined}
                        headerCell={() => (
                            <HeaderBtn className="btnS" onClick={actions.onHeaderUseYN}>
                                분석
                            </HeaderBtn>
                        )}
                        cell={(cellProps) => {
                            const row = cellProps.dataItem;
                            const excluded = isExcluded(row);
                            const locked = isLocked(row);

                            const includeLabel = isMergeRow(row) ? '머지' : '분석'; // 입력 기준 표출
                            const state = excluded ? 'exclude' : (includeLabel === '머지' ? 'merge' : 'analysis');
                            const label = excluded ? '제외' : includeLabel;
                            const cls = `chip chip--${state} ${locked ? 'chip--disabled' : ''}`;

                            return (
                                <td style={{ textAlign: 'center' }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                                    <Button className={cls} disabled={locked} onClick={() => { if (!locked) toggleExcluded(row); }}>
                                        <span className="chip-check" aria-hidden>✓</span>
                                        <span className="chip-label">{label}</span>
                                    </Button>
                                </td>
                            );
                        }}
                    />
                );
            }
            // ADMIN: 제외(버튼 헤더)
            if (c.field === 'exclude') {
                return (
                    <Column
                        key={c.field}
                        field={c.field}
                        title={c.title}
                        width={c.width ?? '72px'}
                        sortable={false}
                        filterable={false}
                        columnMenu={undefined}
                        headerCell={() => (
                            <HeaderBtn className="btnS btnTxt type01" onClick={actions.onHeaderExclude}>
                                제외
                            </HeaderBtn>
                        )}
                        cell={(cellProps) => {
                            const row = cellProps.dataItem;
                            const { merge_qnum } = row;
                            const excluded = isExcluded(row);
                            const locked = isLocked(row);
                            return (
                                <td style={{ textAlign: 'center' }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}>
                                    {!excluded && !isMergeRow(row) && ( // 머지 행이면 숨김
                                        <Button
                                            className={`btnM ${locked ? 'btnM--disabled' : ''}`}
                                            themeColor={locked ? 'base' : 'primary'}
                                            disabled={locked}
                                            onClick={() => {
                                                if (!locked && !blockWhenDirty()) goOpenSetting(merge_qnum);
                                            }}
                                        >
                                            분석
                                        </Button>
                                    )}
                                </td>
                            );
                        }}
                    />
                );
            }
            // EDIT: 수정(헤더에 버튼 2개)
            if (c.field === 'project_lock') {
                return (
                    <Column
                        key={c.field}
                        field={c.field}
                        width={c.width ?? '120px'}
                        sortable={false}
                        filterable={false}
                        columnMenu={undefined}
                        headerCell={() => (
                            <HeaderLabeledBtnGroup
                                label="수정"
                                buttons={[
                                    { text: 'X', className: 'btnS btnTxt type02', onClick: () => bulkSetLock(true) },
                                    { text: 'O', className: 'btnS btnType02', onClick: () => bulkSetLock(false) },
                                ]}
                            />
                        )}
                        cell={(cellProps) => {
                            const { dataItem } = cellProps;
                            const locked = isLocked(dataItem);
                            const excluded = isExcluded(dataItem);
                            // 제외 상태면 버튼 자체를 안보이게
                            if (excluded) {
                                return <td style={{ textAlign: 'center' }}></td>;
                            }
                            return (
                                <td style={{ textAlign: 'center' }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Button
                                        className={`btnS k-icon-button${locked ? '' : ''}`}
                                        onClick={() => toggleRowLock(dataItem)}
                                        title={locked ? '잠금 해제' : '잠금'}
                                    >
                                        <span style={{ fontSize: 16, lineHeight: 1 }} aria-hidden="true">
                                            {locked ? '🔒' : '🔓'}
                                        </span>
                                    </Button>
                                </td>
                            );
                        }}
                    />
                );
            }
            // 필터문항설정 팝업 버튼 
            if (c.field === 'filterSetting') {
                return (
                    <Column
                        key={c.field}
                        field={c.field}
                        title={c.title}
                        sortable={false}
                        columnMenu={undefined}
                        cell={(cellProps) => {
                            const row = cellProps.dataItem;
                            const excluded = isExcluded(row);
                            // 제외 상태면 버튼 숨김
                            if (excluded) {
                                return <td style={{ textAlign: 'center' }}></td>;
                            }
                            return (
                                <td style={{ textAlign: "center" }}>
                                    <Button className="btnM" themeColor="primary"
                                        onClick={(e) => { e.stopPropagation(); setPopupShow(true); }}
                                        onMouseDown={(e) => e.stopPropagation()} >
                                        설정
                                    </Button>
                                </td>
                            );
                        }}
                    />
                );
            }
            // 문항최종 subgroup 아래의 리프 헤더 숨김
            if (c.noLeafHeader && c.subgroup === "문항최종") {
                return (
                    <Column
                        key={c.field}
                        field={c.field}
                        width={c.width}
                        title=""                       // 헤더 텍스트도 비우기
                        editable={c.editable}
                        sortable={false}               // 정렬 끔
                        filterable={false}             // 필터 끔
                        columnMenu={undefined}         // 컬럼 메뉴 끔
                        headerCell={() => <></>}       // 헤더 콘텐츠 자체 미렌더
                        headerClassName="no-leaf-header"
                        cell={c.wrap ? WrapCell(c.field) : undefined}   // wrap이면 멀티라인 셀 사용
                    />
                );
            }
            if (c.field === 'status_text') {
                return (
                    <Column
                        key={c.field}
                        field={c.field}
                        title={c.title}
                        columnMenu={columnMenu}
                        cell={BlankWhenMergeCell('status_text')}
                    />
                );
            }
            if (
                c.field === 'status_cnt_duplicated' || c.field === 'status_cnt_fin' || c.field === 'tokens_text') {
                return (
                    <Column
                        key={c.field}
                        // 정렬은 프록시 필드 사용
                        field={proxyField?.[c.field] ?? `__sort__${c.field}`}
                        title={c.title}
                        width={c.width}
                        sortable
                        // 메뉴/필터는 원본 필드 기준으로 동작하도록 교정
                        columnMenu={(menuProps) => columnMenu({ ...menuProps, field: c.field })}
                        // 셀 표시는 기존처럼: 머지 행이면 빈칸
                        cell={BlankWhenMergeCell(c.field)}
                    />
                );
            }
            if (c.field === 'status_cnt') {
                return (
                    <Column
                        key={c.field}
                        // 정렬은 프록시 필드 사용
                        field={proxyField?.[c.field] ?? `__sort__${c.field}`}
                        title={c.title}
                        width={c.width}
                        sortable
                        // 메뉴/필터는 원본 필드 기준으로 동작하게 교정
                        columnMenu={(menuProps) => columnMenu({ ...menuProps, field: c.field })}
                        // 셀은 원본 값 그대로 표시
                        cell={(p) => <td title={p.dataItem?.[c.field]}>{p.dataItem?.[c.field]}</td>}
                    />
                );
            }
            // 1번째 컬럼은 그대로(텍스트)
            if (c.field === 'qnum_text') {
                return (
                    <Column
                        key={c.field}
                        field={c.field}
                        title=""
                        sortable={false}
                        filterable={false}
                        columnMenu={undefined}
                        headerCell={() => <></>}
                    />
                );
            }
            // 2번째 컬럼 = 입력 가능 + 값 다르면 노란색
            if (c.field === 'merge_qnum') {
                return (
                    <Column
                        key={c.field}
                        field={c.field}
                        title=""
                        sortable={false}
                        filterable={false}
                        columnMenu={undefined}
                        headerCell={() => <></>}
                        cell={(cellProps) => {
                            const row = cellProps.dataItem;
                            const original = norm(row?.merge_qnum ?? "");
                            const cur = getMergeVal(row);     // controlled value          
                            const tdRef = useRef(null);
                            const locked = isLocked(row); // "수정불가"면 true
                            const excluded = isExcluded(row);
                            const disabled = locked || excluded;
                            const baseline = mergeSavedBaseline.get(row.id) ?? original;

                            return (
                                <td
                                    ref={tdRef}
                                    className={!disabled && norm(cur) !== baseline ? 'cell-merge-diff' : ''}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <input
                                        type="text"
                                        className="merge-input"
                                        key={`${row.id}:${cur}`}     // 재조회로 값이 바뀌면 인풋을 리마운트
                                        defaultValue={cur}           // 타이핑 중에는 리렌더 안 일어남(포커스 유지)
                                        disabled={disabled}
                                        placeholder="번호 입력"

                                        onInput={(e) => {
                                            const now = norm(e.currentTarget.value);
                                            if (!tdRef.current) return;
                                            if (disabled) return;
                                            if (now !== baseline) tdRef.current.classList.add('cell-merge-diff');
                                            else tdRef.current.classList.remove('cell-merge-diff');
                                        }}
                                        onBlur={(e) => setMergeVal(row, e.currentTarget.value)} // 포커스 빠질 때만 저장
                                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                    />
                                </td>
                            );
                        }}
                    />
                );
            }
            // 나머지는 기본 헤더
            return (
                <Column
                    key={c.field}
                    field={c.field}
                    title={c.title}
                    width={c.width}
                    editable={c.editable}
                    columnMenu={columnMenu}
                />
            );
        };

        const visible = columnsForPerm.filter(c => c.show !== false);

        // 상위로 묶지 않는 단일 컬럼
        const roots = visible.filter(c => !c.group);

        // 1단 그룹 → 2단 subgroup → leaf
        const groups = groupOrder
            .map(name => {
                const inGroup = visible.filter(c => c.group === name);
                const subgroups = [...new Set(inGroup.map(c => c.subgroup).filter(Boolean))];
                return { name, inGroup, subgroups };
            })
            .filter(g => g.inGroup.length > 0);

        return (
            <>
                <article className="subTitWrap">
                    <div className="subTit">
                        <h2 className="titTxt">문항 목록
                            {state?.projectname && (<span className="projectName"> {state.projectname}</span>)}
                            <span
                                className="info-icon"
                                data-tooltip={`문항 목록|조사(Qmaster): 등록 시 오픈응답문항 중 텍스트로 입력된 데이터 자동 등록\n신규(수동): "문항등록"을 통해 엑셀로 문항을 선택하여 등록`}
                            ></span>
                        </h2>

                        <div className="btnWrap">
                            {(!userAuth.includes("고객") && !userAuth.includes("일반") && !userAuth.includes("연구원")) && (
                                <GridHeaderBtnTxt onClick={handleExportExcel}>보기 추출 (개발자용)
                                </GridHeaderBtnTxt>
                            )}

                            {(!userAuth.includes("고객") && !userAuth.includes("일반")) && (
                                <GridHeaderBtnPrimary onClick={() => navigate('/pro_register')}>문항 등록
                                    <span
                                        className="info-icon"
                                        data-tooltip={`문항 등록|엑셀로 새로운 문항 추가`}
                                    ></span>
                                </GridHeaderBtnPrimary>
                            )}
                        </div>
                    </div>
                </article>

                <article className="subContWrap">
                    <div className="subCont">
                        <div className="cmn_gird_wrap">
                            <div id="grid_01" className="cmn_grid multihead">
                                <KendoGrid
                                    // key={gridKey}
                                    parentProps={{
                                        height: "750px",
                                        data: dataWithProxies,
                                        dataItemKey: dataItemKey,    // 합성 키 또는 단일 키 
                                        selectedState,
                                        setSelectedState,
                                        selectedField,               //  선택 필드 전달
                                        idGetter,                     // GridData가 만든 getter 그대로
                                        sortable: { mode: "multiple", allowUnsort: true }, // 다중 정렬
                                        filterable: true,              // 필터 허용
                                        sortChange: ({ sort: next }) => {
                                            const nextRaw = (next || []).map(d => {
                                                const orig = Object.keys(proxyField).find(k => proxyField[k] === d.field);
                                                return { ...d, field: orig || d.field };
                                            });
                                            setSort(nextRaw ?? []);
                                        },
                                        filterChange: ({ filter }) => { setFilter(filter ?? null); },
                                        sort: mappedSort,
                                        filter: filter,
                                        // onRowClick,
                                        columnVirtualization: false,    // 멀티 헤더에서 가상화는 끄는 걸 권장
                                    }}
                                >
                                    {/* 단일 컬럼들: (no, 모델, 문번호) → 헤더가 2행을 세로로 차지 */}
                                    {roots.map(renderLeafColumn)}

                                    {/* 그룹 헤더 */}
                                    {groups.map(g => {
                                        // 같은 그룹 안에서 subgroup 단위로 묶기
                                        const inGroup = visible.filter(c => c.group === g.name);
                                        const bySub = new Map(); // subgroupName -> { cols, order }

                                        inGroup.forEach((c, idx) => {
                                            const key = c.subgroup || "__root__";
                                            const entry = bySub.get(key) || { cols: [], order: Number.POSITIVE_INFINITY, _idx: idx };
                                            entry.cols.push(c);
                                            const ord = Number.isFinite(c.order) ? c.order : 1e6;
                                            entry.order = Math.min(entry.order, ord);   // 서브그룹의 정렬 기준 = 자식들의 최소 order
                                            bySub.set(key, entry);
                                        });

                                        // root 컬럼은 개별 아이템으로, 서브그룹은 묶음 아이템으로 합치기
                                        const items = [];

                                        const root = bySub.get("__root__");
                                        if (root) {
                                            root.cols.forEach((c, i) => {
                                                items.push({ type: "col", order: Number.isFinite(c.order) ? c.order : 1e6, _idx: i, col: c });
                                            });
                                            bySub.delete("__root__");
                                        }

                                        for (const [sub, entry] of bySub.entries()) {
                                            // 서브그룹 내부 컬럼 순서도 원하면 c.leafOrder 등으로 정렬 가능
                                            const colsSorted = entry.cols.slice().sort((a, b) =>
                                                (a.leafOrder ?? 0) - (b.leafOrder ?? 0)
                                            );
                                            items.push({ type: "sub", order: entry.order, _idx: entry._idx, sub, cols: colsSorted });
                                        }

                                        // order → 원래 인덱스 순으로 안정 정렬
                                        items.sort((a, b) => (a.order - b.order) || (a._idx - b._idx));
                                        return (
                                            <Column
                                                key={`grp:${g.name}`}
                                                title={g.name}
                                                headerCell={() => (
                                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                                                        {g.name}
                                                        {g.name === "ADMIN" && (
                                                            <span
                                                                className="info-icon"
                                                                data-tooltip={`ADMIN|• ✓분석: 분석 할 문항만 체크\n• ✓제외: 분석 안 할 문항 체크\n• 분석 버튼: 각 문항별 카테고리 자동분류 페이지로 이동`}
                                                            ></span>
                                                        )}
                                                        {g.name === "EDIT" && (
                                                            <span
                                                                className="info-icon"
                                                                data-tooltip={`EDIT|• 문항통합저장 버튼: 여러 문항을 하나로 통합해 분석\n• 🔓 수정 가능: 분석 전 수정 가능\n• 🔒 수정 불가: 분석 완료 후 수정 불가`}
                                                            ></span>
                                                        )}
                                                    </div>
                                                )}
                                            >
                                                {items.map(it =>
                                                    it.type === "col"
                                                        ? renderLeafColumn(it.col)
                                                        : (
                                                            <Column
                                                                key={`sub:${g.name}:${it.sub}`}
                                                                // 문항최종은 기존처럼 텍스트 유지 + 아래줄 제거
                                                                title={it.sub === "문항최종" ? "문항최종" : ""}
                                                                headerClassName={[
                                                                    (it.sub === "문항최종" || it.sub === "문항통합저장")
                                                                        ? "sub-no-bottom-border"
                                                                        : "",
                                                                ].filter(Boolean).join(" ")}
                                                                headerCell={
                                                                    it.sub === "문항통합저장"
                                                                        ? () => (
                                                                            <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", justifyContent: "center" }}>
                                                                                <Button className="btnS btnType04" onClick={actions.onHeaderMergeSave}>
                                                                                    문항통합저장
                                                                                </Button>
                                                                            </div>
                                                                        )
                                                                        : undefined
                                                                }
                                                            >
                                                                {it.cols.map(renderLeafColumn)}
                                                            </Column>
                                                        )
                                                )}
                                            </Column>
                                        );
                                    })}

                                </KendoGrid>
                            </div>
                        </div>
                    </div>
                </article>
                {/* 필터문항설정 팝업 */}
                {popupShow &&
                    <ProListPopup
                        popupShow={popupShow}
                        setPopupShow={setPopupShow}
                    />
                }
            </>
        );
    }

    return (
        <GridData
            key={gridDataKey}
            dataItemKey={DATA_ITEM_KEY}
            rowNumber={"no"}
            rowNumberOrder="desc"
            selectedField={SELECTED_FIELD}
            searchMutation={proListData}
            initialParams={{             /*초기파라미터 설정*/
                user: auth?.user?.userId || "",
                projectnum: projectnum || "",
                gb: "select",
                _ts: timeStamp, // 캐시 버스터
            }}
            renderItem={(props) =>
                <GridRenderer {...props}
                    scrollTopRef={scrollTopRef}
                    mergeEditsById={mergeEditsById}
                    setMergeEditsById={setMergeEditsById}
                    mergeSavedBaseline={mergeSavedBaseline}
                    setMergeSavedBaseline={setMergeSavedBaseline}
                />}
        />
    );
};

export default ProList;