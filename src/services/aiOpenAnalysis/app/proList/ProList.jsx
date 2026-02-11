import React, { useState, useCallback, useEffect, useContext, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { login } from "@/common/redux/action/AuthAction";
import { useNavigate, useLocation } from "react-router-dom";
import GridData from "@/components/common/grid/GridData.jsx";
import { ProListApi } from "@/services/aiOpenAnalysis/app/proList/ProListApi.js";
import "@/services/aiOpenAnalysis/app/AiCommonLayout.css";
import { modalContext } from "@/components/common/Modal.jsx";
import ProListGridRenderer from "./ProListGridRenderer";
import { PERM, roleToPerm, hasPerm, GROUP_MIN_PERM, FIELD_MIN_PERM, natKey, NAT_FIELDS, addSortProxies } from "./ProListUtils";

/**
 * 문항 목록
 *
 * @author jewoo
 * @since 2025-09-12<br />
 */

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
        // 문항 목록 진입 시, 이전 문항 선택 정보 초기화
        sessionStorage.setItem("qnum", "");
        sessionStorage.setItem("project_lock", "");
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
        const rows = proListData?.data?.resultjson ?? [];
        const m = new Map();
        const l = new Map();
        rows.forEach((row) => {
            m.set(row?.id, deriveExcluded(row));
            l.set(row?.id, row?.project_lock === "수정불가");
        });
        setExcludedById(m);
        setLocksById(l);
    }, [proListData?.data?.resultjson, deriveExcluded]);

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
        withSubgroup("문항최종", 1)({ field: "qnum_text", title: "문항최종번호", group: "VIEW", show: true, allowHide: false, order: 4, wrap: true }),
        withSubgroup("문항최종", 2)({ field: "question_fin", title: "문항최종", group: "VIEW", show: true, allowHide: false, order: 4, width: "350px", wrap: true }),

        { field: "status_cnt", title: "응답자수", group: "VIEW", show: true, allowHide: false, order: 5 },
        { field: "status_cnt_duplicated", title: "분석\n대상수", group: "VIEW", show: true, allowHide: false, order: 6 },
        { field: "status_cnt_fin", title: "분석\n완료수", group: "VIEW", show: true, allowHide: false, order: 7 },
        { field: "status_text", title: "진행상황", group: "VIEW", show: true, allowHide: false, order: 8 },
        { field: "filterSetting", title: "필터문항\n설정", group: "VIEW", show: true, editable: false, allowHide: true, order: 9 },
        { field: "tokens_text", title: "예상비용", group: "VIEW", show: true, allowHide: false, order: 10 },

        // ----- ADMIN -----
        { field: "useYN", title: "관리", group: "ADMIN", show: true, order: 1, width: "130px" },
        { field: "exclude", title: "분석보기", group: "ADMIN", show: true, order: 2, width: "100px" },

        // ----- EDIT  → "문항통합"으로 합치기 -----
        withSubgroup("문항통합저장", 1)({ field: "qnum_text", title: "", group: "EDIT", show: true, allowHide: false, order: 1, wrap: true }),
        withSubgroup("문항통합저장", 2)({ field: "merge_qnum", title: "", group: "EDIT", show: true, allowHide: false, order: 1, wrap: true }),

        { field: "project_lock", title: "수정", group: "EDIT", show: true, allowHide: false, order: 2 },
    ]);

    const goOpenSetting = useCallback((merge_qnum, project_lock) => {
        sessionStorage.setItem("qnum", merge_qnum || "");
        sessionStorage.setItem("project_lock", project_lock || "");
        sessionStorage.setItem("userPerm", userPerm);
        navigate('/ai_open_analysis/option_setting');
    }, [navigate, userPerm]);

    // 권한 반영 컬럼 배열
    const columnsForPerm = useMemo(() => {
        return columns.map((c) => {
            const need = (FIELD_MIN_PERM[c.field] ?? GROUP_MIN_PERM[c.group || "VIEW"] ?? PERM.READ);
            const canSee = hasPerm(userPerm, need);
            // merge_qnum은 관리자(MANAGE)만 수정 가능
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
        a.download = filename; // 고정 파일명
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
                projectnum,
                gb: "export_lb_excel"
            };
            const res = await excelDownloadMutation.mutateAsync(payload);

            if (res?.success === "720") {
                modal.showErrorAlert("알림", "분석된 보기가 없습니다.");
                return;
            }

            const blob = res?.data instanceof Blob ? res.data : (res instanceof Blob ? res : null);

            if (!blob) {
                modal.showErrorAlert("에러", "보기추출 파일을 받지 못했습니다.");
                return;
            }

            if (blob.type?.includes("application/json")) {
                modal.showErrorAlert("에러", "보기 추출 요청이 거부되었습니다.");
                return;
            }

            saveBlobWithName(blob, `open.xlsx`);

        } catch (err) {
            console.error(err);
            modal.showErrorAlert("오류", "보기 추출 중 오류가 발생했습니다.");
        }
    }, [auth?.user?.userId, projectnum, excelDownloadMutation, modal, saveBlobWithName]);

    // 보기추출(DP용) 엑셀 다운로드 이벤트
    const handleExportExcelDP = useCallback(async () => {
        try {
            const payload = {
                user: auth?.user?.userId || "",
                projectnum,
                gb: "export_lb_dp"
            };
            const res = await excelDownloadMutation.mutateAsync(payload);

            if (res?.success === "720") {
                modal.showErrorAlert("알림", "분석된 보기가 없습니다.");
                return;
            }

            const blob = res?.data instanceof Blob ? res.data : (res instanceof Blob ? res : null);

            if (!blob) {
                modal.showErrorAlert("에러", "보기추출 파일을 받지 못했습니다.");
                return;
            }

            if (blob.type?.includes("application/json")) {
                modal.showErrorAlert("에러", "보기 추출 요청이 거부되었습니다.");
                return;
            }

            saveBlobWithName(blob, `open.txt`);

        } catch (err) {
            console.error(err);
            modal.showErrorAlert("오류", "보기 추출 중 오류가 발생했습니다.");
        }
    }, [auth?.user?.userId, projectnum, excelDownloadMutation, modal, saveBlobWithName]);

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
                <ProListGridRenderer {...props}
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
                    editMutation={editMutation}
                    columns={columns}
                    setColumns={setColumns}
                    columnsForPerm={columnsForPerm}
                    filter={filter}
                    setFilter={setFilter}
                    sort={sort}
                    setSort={setSort}
                    popupShow={popupShow}
                    setPopupShow={setPopupShow}
                    goOpenSetting={goOpenSetting}
                    handleExportExcelDev={handleExportExcelDev}
                    handleExportExcelDP={handleExportExcelDP}
                    userAuth={userAuth}
                />}
        />
    );
};

export default ProList;