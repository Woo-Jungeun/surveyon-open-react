import React, { useState, useCallback, useEffect, useContext, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { login } from "@/common/redux/action/AuthAction";
import { useNavigate, useLocation } from "react-router-dom";
import GridData from "@/components/common/grid/GridData.jsx";
import { ProListApi } from "@/services/aiOpenAnalysis/app/proList/ProListApi.js";
import "@/services/aiOpenAnalysis/app/AiCommonLayout.css";
import { modalContext } from "@/components/common/Modal.jsx";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import ProList2GridRenderer from "./ProList2GridRenderer";
import { PERM, roleToPerm, hasPerm, GROUP_MIN_PERM, FIELD_MIN_PERM, natKey, NAT_FIELDS, addSortProxies, parseRows } from "./ProListUtils";
import * as XLSX from "xlsx";

/**
 * 문항 목록2 (UI 고도화용 사본)
 *
 * @author jewoo
 * @since 2026-08-24<br />
 */

const ProList2 = () => {
    const auth = useSelector((store) => store.auth);
    const userAuth = auth?.user?.userAuth || "";
    const dispatch = useDispatch();
    const modal = useContext(modalContext);
    const loadingSpinner = useContext(loadingSpinnerContext);
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
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
        // 문항 목록 진입 시, 이전 문항 선택 정보 초기화
        sessionStorage.setItem("qnum", "");
        sessionStorage.setItem("project_lock", "");
    }, [projectnumFromState]);

    // 정렬/필터를 controlled
    const [sort, setSort] = useState([]);
    const [filter, setFilter] = useState(null);
    const [popupShow, setPopupShow] = useState(false);        // 필터문항설정 팝업 popupShow
    const [popupMode, setPopupMode] = useState("all");        // "all" | "single"
    const [popupRow, setPopupRow] = useState(null);           // 행 데이터

    const {
        proListData,
        fetchPidDiff,
        toggleAnalysis,
        toggleAllAnalysis,
        toggleRowEdit,
        toggleAllEdit,
        allMerge,
        batchEditQuestionFin,
        bulkUpdate,
        deleteQnums,
        fetchFilterQnums,
        importLbAllExcel,
        importLbAllJson,
        exportLbDevExcel,
        exportLbDpTxt,
        exportDataAllExcel
    } = ProListApi();

    // 스크롤 위치 저장용 ref
    const scrollTopRef = useRef(0);

    //재조회 후 그리드 업데이트 플래그
    const [gridDataKey, setGridDataKey] = useState(0);
    const [timeStamp, setTimeStamp] = useState(0); // cache buster
    const [mergeEditsById, setMergeEditsById] = useState(new Map()); // 행별 머지 텍스트 편집값
    const [mergeSavedBaseline, setMergeSavedBaseline] = useState(new Map());

    // mergeSavedBaseline, mergeEditsById 초기화 
    useEffect(() => {
        const rows = parseRows(proListData?.data?.resultjson);
        if (!rows.length) return;

        setMergeSavedBaseline(new Map(rows.map(r => [r.id, r.merge_qnum || ""])));
        setMergeEditsById(new Map(rows.map(r => [r.id, r.merge_qnum || ""])));
    }, [proListData?.data?.resultjson]);

    // Lifted state from GridRenderer
    const [locksById, setLocksById] = useState(new Map());          // 행 잠금상태
    const [excludedById, setExcludedById] = useState(new Map());    // 분석/제외 토글 상태

    // useYN 기반으로 제외 여부 파싱
    const deriveExcluded = useCallback((row) => {
        const u = String(row?.useYN ?? "").trim();
        if (u === "제외") return true;       // 제외
        return false;                        // '분석', '머지', 공백 등은 포함
    }, []);

    // 초기화: API 데이터 들어올 때 한 번 세팅
    useEffect(() => {
        const rows = parseRows(proListData?.data?.resultjson);
        const m = new Map();
        const l = new Map();
        rows.forEach((row) => {
            m.set(row?.id, deriveExcluded(row));
            l.set(row?.id, row?.project_lock === "수정불가");
        });
        setExcludedById(m);
        setLocksById(l);
    }, [proListData?.data?.resultjson, deriveExcluded]);

    //컬럼 표출 권한 체크 (초기값: Redux auth / 세션 정보 활용하여 로딩 중 헤더 덜컥거림 방지)
    const [userPerm, setUserPerm] = useState(() => {
        const ug = auth?.user?.userAuth || sessionStorage.getItem("userAuth");
        return ug ? roleToPerm(ug) : PERM.MANAGE;
    });

    useEffect(() => {
        const ug = proListData?.data?.usergroup;
        if (!ug) return;
        setUserPerm(roleToPerm(ug));
        sessionStorage.setItem("userAuth", ug);

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
        { field: "chk", title: "", group: "VIEW", show: true, allowHide: false, order: 0, width: "40px" },
        { field: "no", title: "no", group: "VIEW", show: true, allowHide: false, order: 1, width: "50px" },
        { field: "model", title: "모델", group: "VIEW", show: true, allowHide: false, order: 2, width: "60px" },
        { field: "qnum", title: "문번호", group: "VIEW", show: true, allowHide: false, order: 3, width: "80px", wrap: true },

        { field: "qnum_text", title: "문항번호", group: "VIEW", show: true, allowHide: false, order: 4, width: "65px", wrap: true },
        { field: "question_fin", title: "문항최종", group: "VIEW", show: true, allowHide: false, order: 5, wrap: true },

        { field: "status_cnt", title: "응답자수", group: "응답 → 분석대상 (중복제거) → 완료", show: true, allowHide: false, order: 5, width: "80px" },
        { field: "status_cnt_duplicated", title: "분석\n대상수", group: "응답 → 분석대상 (중복제거) → 완료", show: true, allowHide: false, order: 6, width: "65px" },
        { field: "status_cnt_fin", title: "분석\n완료수", group: "응답 → 분석대상 (중복제거) → 완료", show: true, allowHide: false, order: 7, width: "65px" },
        { field: "status_text", title: "진행상황", group: "VIEW", show: true, allowHide: false, order: 8, width: "80px" },
        { field: "filterSetting", title: "필터문항\n설정", group: "VIEW", show: true, editable: false, allowHide: true, order: 9, width: "75px" },
        { field: "tokens_text", title: "예상비용", group: "VIEW", show: true, allowHide: false, order: 10, width: "80px" },

        // ----- ADMIN -----
        { field: "useYN", title: "관리", group: "ADMIN", show: true, order: 1, width: "115px" },
        { field: "exclude", title: "분석보기", group: "ADMIN", show: true, order: 2, width: "90px" },

        // ----- EDIT -----
        { field: "merge_qnum", title: "문항통합", group: "EDIT", show: true, allowHide: false, order: 1, width: "125px" },
        { field: "project_lock", title: "수정", group: "EDIT", show: true, allowHide: false, order: 2 },
    ]);

    const goOpenSetting = useCallback((merge_qnum, project_lock) => {
        sessionStorage.setItem("qnum", merge_qnum || "");
        sessionStorage.setItem("project_lock", project_lock || "");
        sessionStorage.setItem("userPerm", userPerm);
        navigate('/ai_open_analysis/option_setting_2');
    }, [navigate, userPerm]);

    // 권한 반영 컬럼 배열
    const columnsForPerm = useMemo(() => {
        return columns.map((c) => {
            const need = (FIELD_MIN_PERM[c.field] ?? GROUP_MIN_PERM[c.group || "VIEW"] ?? PERM.READ);
            const canSee = hasPerm(userPerm, need);
            let editable = c.editable;
            if (c.field === 'merge_qnum') {
                editable = hasPerm(userPerm, PERM.MANAGE);
            }

            return { ...c, show: (c.show !== false) && canSee, editable };
        });
    }, [columns, userPerm]);

    const saveBlobWithName = useCallback((blob, filename = "download.xlsx") => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }, []);

    // 보기추출(개발자용) 엑셀 다운로드 이벤트
    const handleExportExcelDev = useCallback(async () => {
        try {
            const payload = {
                user: auth?.user?.userId || "",
                projectnum
            };
            const res = await exportLbDevExcel.mutateAsync(payload);

            if (String(res?.success) === '720') {
                modal.showErrorAlert("알림", res.message || "분석된 보기가 없습니다.");
                return;
            }

            const blob = res?.data instanceof Blob ? res.data : (res instanceof Blob ? res : null);

            if (!blob) {
                modal.showErrorAlert("에러", "보기추출 파일을 받지 못했습니다.");
                return;
            }

            if (blob.type?.includes("application/json")) {
                try {
                    const text = await blob.text();
                    const json = JSON.parse(text);
                    if (String(json.success) === '720') {
                        modal.showErrorAlert("알림", json.message || "분석된 보기가 없습니다.");
                    } else {
                        modal.showErrorAlert("에러", json.message || "보기 추출 요청이 거부되었습니다.");
                    }
                } catch (e) {
                    modal.showErrorAlert("에러", "보기 추출 요청이 거부되었습니다.");
                }
                return;
            }

            saveBlobWithName(blob, `open.xlsx`);

        } catch (err) {
            console.error(err);
            modal.showErrorAlert("오류", "보기 추출 중 오류가 발생했습니다.");
        }
    }, [auth?.user?.userId, projectnum, exportLbDevExcel, modal, saveBlobWithName]);

    // 보기추출(DP용) 엑셀 다운로드 이벤트
    const handleExportExcelDP = useCallback(async () => {
        try {
            const payload = {
                user: auth?.user?.userId || "",
                projectnum
            };
            const res = await exportLbDpTxt.mutateAsync(payload);

            if (String(res?.success) === '720') {
                modal.showErrorAlert("알림", res.message || "분석된 보기가 없습니다.");
                return;
            }

            const blob = res?.data instanceof Blob ? res.data : (res instanceof Blob ? res : null);

            if (!blob) {
                modal.showErrorAlert("에러", "보기추출 파일을 받지 못했습니다.");
                return;
            }

            if (blob.type?.includes("application/json")) {
                try {
                    const text = await blob.text();
                    const json = JSON.parse(text);
                    if (String(json.success) === '720') {
                        modal.showErrorAlert("알림", json.message || "분석된 보기가 없습니다.");
                    } else {
                        modal.showErrorAlert("에러", json.message || "보기 추출 요청이 거부되었습니다.");
                    }
                } catch (e) {
                    modal.showErrorAlert("에러", "보기 추출 요청이 거부되었습니다.");
                }
                return;
            }

            saveBlobWithName(blob, `open.txt`);

        } catch (err) {
            console.error(err);
            modal.showErrorAlert("오류", "보기 추출 중 오류가 발생했습니다.");
        }
    }, [auth?.user?.userId, projectnum, exportLbDpTxt, modal, saveBlobWithName]);

    // 보기등록(ALL) 엑셀 업로드 이벤트
    const handleImportExcel = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            loadingSpinner.show();
            const formData = new FormData();
            formData.append("user", auth?.user?.userId || "");
            formData.append("projectnum", projectnum);
            formData.append("excel_file", file);

            const res = await importLbAllExcel.mutateAsync(formData);
            if (String(res?.success) === '777') {
                modal.showConfirm("알림", "보기 등록이 완료되었습니다.", {
                    btns: [
                        {
                            title: "확인",
                            click: () => {
                                setGridDataKey(prev => prev + 1);
                                setTimeStamp(Date.now());
                            }
                        }
                    ]
                });
            } else {
                modal.showErrorAlert("에러", res?.message || "보기 등록 중 오류가 발생했습니다.");
            }

        } catch (err) {
            console.error(err);
            modal.showErrorAlert("오류", "보기 등록 파일 처리 중 오류가 발생했습니다.");
        } finally {
            loadingSpinner.hide();
            e.target.value = null;
        }
    }, [auth?.user?.userId, projectnum, importLbAllExcel, modal, loadingSpinner]);

    // 응답추출(ALL) 엑셀 다운로드 이벤트
    const handleExportRaw = useCallback(async () => {
        try {
            const payload = {
                user: auth?.user?.userId || "",
                projectnum
            };
            const res = await exportDataAllExcel.mutateAsync(payload);

            if (String(res?.success) === '720') {
                modal.showErrorAlert("알림", res.message || "추출할 응답 데이터가 없습니다.");
                return;
            }

            const blob = res?.data instanceof Blob ? res.data : (res instanceof Blob ? res : null);

            if (!blob) {
                modal.showErrorAlert("에러", "응답추출 파일을 받지 못했습니다.");
                return;
            }

            if (blob.type?.includes("application/json")) {
                try {
                    const text = await blob.text();
                    const json = JSON.parse(text);
                    if (String(json.success) === '720') {
                        modal.showErrorAlert("알림", json.message || "추출할 응답 데이터가 없습니다.");
                    } else {
                        modal.showErrorAlert("에러", json.message || "응답 추출 요청이 거부되었습니다.");
                    }
                } catch (e) {
                    modal.showErrorAlert("에러", "응답 추출 요청이 거부되었습니다.");
                }
                return;
            }

            saveBlobWithName(blob, `${projectnum}.xlsx`);

        } catch (err) {
            console.error(err);
            modal.showErrorAlert("오류", "응답 추출 중 오류가 발생했습니다.");
        }
    }, [auth?.user?.userId, projectnum, exportDataAllExcel, modal, saveBlobWithName]);

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
                search_text: "",
                _ts: timeStamp, // 캐시 버스터
            }}
            renderItem={(props) =>

                <>
                    <ProList2GridRenderer {...props}
                        scrollTopRef={scrollTopRef}
                        mergeEditsById={mergeEditsById}
                        setMergeEditsById={setMergeEditsById}
                        mergeSavedBaseline={mergeSavedBaseline}
                        setMergeSavedBaseline={setMergeSavedBaseline}
                        locksById={locksById}
                        setLocksById={setLocksById}
                        excludedById={excludedById}
                        setExcludedById={setExcludedById}
                        auth={auth}
                        projectnum={projectnum}
                        userPerm={userPerm}
                        modal={modal}
                        navigate={navigate}
                        proListApiResponse={proListData?.data}
                        fetchPidDiff={fetchPidDiff}
                        toggleAnalysis={toggleAnalysis}
                        toggleAllAnalysis={toggleAllAnalysis}
                        toggleRowEdit={toggleRowEdit}
                        toggleAllEdit={toggleAllEdit}
                        allMerge={allMerge}
                        batchEditQuestionFin={batchEditQuestionFin}
                        bulkUpdate={bulkUpdate}
                        deleteQnums={deleteQnums}
                        fetchFilterQnums={fetchFilterQnums}
                        columns={columns}
                        setColumns={setColumns}
                        columnsForPerm={columnsForPerm}
                        filter={filter}
                        setFilter={setFilter}
                        sort={sort}
                        setSort={setSort}
                        popupShow={popupShow}
                        setPopupShow={setPopupShow}
                        popupMode={popupMode}
                        setPopupMode={setPopupMode}
                        popupRow={popupRow}
                        setPopupRow={setPopupRow}
                        goOpenSetting={goOpenSetting}
                        handleExportExcelDev={handleExportExcelDev}
                        handleExportExcelDP={handleExportExcelDP}
                        handleImportExcel={handleImportExcel}
                        handleExportRaw={handleExportRaw}
                        fileInputRef={fileInputRef}
                        userAuth={userAuth}
                    />
                    {/* 화면 밖 파일 입력기 */}
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        style={{ display: "none" }}
                        ref={fileInputRef}
                        onChange={handleImportExcel}
                    />
                </>
            }
        />
    );
};

export default ProList2;
