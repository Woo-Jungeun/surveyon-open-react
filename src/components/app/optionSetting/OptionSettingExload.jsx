import React, { Fragment, useState, useCallback, useMemo, useRef, useContext } from "react";
import GridData from "@/components/common/grid/GridData.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { OptionSettingApi } from "@/components/app/optionSetting/OptionSettingApi.js";
import { useSelector } from "react-redux";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import { useSearchParams } from "react-router-dom";
import "@/components/app/optionSetting/OptionSetting.css";
import { Button } from "@progress/kendo-react-buttons";
import { modalContext } from "@/components/common/Modal";
import * as XLSX from "xlsx";
import moment from "moment";

/**
 * 보기불러오기 (새창)
 *
 * @author jewoo
 * @since 2025-09-18<br />
 */
const OptionSettingExload = () => {
    const auth = useSelector((store) => store.auth);
    const modal = useContext(modalContext);

    const DATA_ITEM_KEY = "no";
    const SELECTED_FIELD = "selected";

    const [searchParams] = useSearchParams();
    const projectnum = (searchParams.get("projectnum") || "").trim(); // 예: n221115
    const qnum = (searchParams.get("qnum") || "").trim();       // 예: 문1

    // 좌측 전용 정렬/필터
    const [leftSort, setLeftSort] = useState([]);
    const [leftFilter, setLeftFilter] = useState(null);

    // 우측 전용 정렬/필터
    const [rightSort, setRightSort] = useState([]);
    const [rightFilter, setRightFilter] = useState(null);

    // 우측 선택 안 쓸 거라 더미 상태/세터
    const [rightSelected] = useState({});
    const noopSelect = useCallback(() => { }, []);
    const rightIdGetter = useCallback(item => item?.no, []);

    const { projectListData, excelListData, sampleDownloadData } = OptionSettingApi();

    // 좌측에서 선택된 행 정보 (헤더 표기용)
    const [selectedProject, setSelectedProject] = useState(null); // { selprojectnum, project_qnum, pofname, ... }

    // 우측 데이터
    const [rightRows, setRightRows] = useState([]);
    // 질문 문구 (question_text)
    const [questionText, setQuestionText] = useState("");

    // 좌측 컬럼 (요청 매핑 반영)
    const [leftColumns, setLeftColumns] = useState(() => [
        { field: "no", title: "순번", show: true, width: "90px", allowHide: false },
        { field: "pof", title: "프로젝트", show: true, width: "150px", allowHide: false },
        { field: "selprojectnum", title: "웹프로젝트", show: true, width: "140px", allowHide: false },
        { field: "pofname", title: "프로젝트명", show: true, width: "240px", allowHide: false },
        { field: "servername", title: "오픈서버정보", show: true, width: "150px", allowHide: false },
        { field: "project_qnum", title: "문항정보", show: true, width: "150px", allowHide: false },
        { field: "id", title: "id", show: false, allowHide: false },

    ]);

    // 우측 컬럼 (요청 매핑 반영)
    const [rightColumns] = useState(() => [
        { field: "no", title: "순번", width: "80px", show: true },
        { field: "qnum", title: "문번호", width: "120px", show: true },
        { field: "lv1", title: "대분류(lv1)", show: true },
        { field: "lv2", title: "중분류(lv2)", show: true },
        { field: "lv3", title: "소분류(lv3)", show: true },
        { field: "lv123code", title: "소분류코드", width: "130px", show: true },
        { field: "lv1code", title: "대분류코드", show: false },
        { field: "lv2code", title: "중분류코드", show: false },
        { field: "ex_gubun", title: "ex_gubun", show: false },
    ]);

    // 좌측 컬럼 메뉴 정렬/필터
    const leftColumnMenu = (menuProps) => (
        <ExcelColumnMenu
            {...menuProps}
            columns={leftColumns}
            onColumnsChange={(updated) => {
                const map = new Map(updated.map((c) => [c.field, c]));
                const next = leftColumns.map(c => {
                    const u = map.get(c.field);
                    return u ? { ...c, ...u } : c
                });
                setLeftColumns(next);
            }}
            filter={leftFilter}
            onFilterChange={(e) => setLeftFilter(e ?? null)}
            onSortChange={(e) => setLeftSort(e ?? [])} // sortArr는 배열 형태
        />
    );

    // 좌측 행 클릭 → 우측 로드
    const onLeftRowClick = useCallback(
        async (e) => {
            const row = e?.dataItem;
            if (!row) return;

            // 현재 프로젝트번호/문항정보는 이 필드로 표기
            setSelectedProject({
                selprojectnum: row?.selprojectnum ?? "",
                project_qnum: row?.project_qnum ?? "",
                pofname: row?.pofname ?? "",
                id: row?.id ?? "",
            });

            // 우측 API 호출
            const payload = {
                user: auth?.user?.userId || "",
                projectnum,
                gb: "exlist",
                select_projectnum: row?.selprojectnum ?? projectnum ?? "",
                select_qnum: row?.project_qnum ?? qnum ?? "",
                qid: row?.id ?? "",
            };
            const res = await excelListData.mutateAsync(payload);
            const data = res?.data ?? res;
            setQuestionText(data?.question_text ?? "");
            const list = (data?.resultjson ?? []).map((it, idx) => ({
                no: idx + 1,
                qnum: it?.qnum ?? "",
                lv1: it?.lv1 ?? "",
                lv2: it?.lv2 ?? "",
                lv3: it?.lv3 ?? "",
                lv123code: it?.lv123code ?? "",
                lv1code: it?.lv1code ?? "",
                lv2code: it?.lv2code ?? "",
            }));
            setRightRows(list);
            setRightSort([]);       // 옵션: 우측 정렬 초기화
            setRightFilter(null);   // 옵션: 우측 필터 초기화
        }, [excelListData, auth?.user?.userId, projectnum, qnum]);

    //--------------------------file--------------------------
    // 파일 저장 
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

    // ===== 공용 유틸 =====
    const getSel = () => ({
        select_projectnum: selectedProject?.selprojectnum || projectnum || "",
        projectnum: selectedProject?.selprojectnum || projectnum || "",
        select_qnum: selectedProject?.project_qnum || qnum || "",
        qid: selectedProject?.id || ""
    });

    // 파일 업로드 input 제어
    const fileInputRef = useRef(null);

    const handleUploadClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // 공통: 트림/노멀라이즈
    const norm = (v) => {
        if (typeof v !== "string") return v ?? "";
        // 일반 trim + 모든 유니코드 공백 제거
        return v.replace(/\s+/g, "").trim();
    };

    // 첫 시트에서 A1/B1(혹은 A1 단일 문자열) → {xlsProject, xlsQnum} 얻기
    function readHeaderIds(ws) {
        const a1 = norm(ws?.A1?.w ?? ws?.A1?.v ?? "");
        const b1 = norm(ws?.B1?.w ?? ws?.B1?.v ?? "");
        if (a1 && b1) return { xlsProject: a1, xlsQnum: b1 };

        // A1에 "프로젝트 공백 문번호" 형태로 붙어있는 경우
        if (a1) {
            const parts = a1.split(/\s+/).filter(Boolean);
            if (parts.length >= 2) return { xlsProject: parts[0], xlsQnum: parts[1] };
            // 혹시 "q250089uk:A2-2" 처럼 기호로 붙으면 기호로도 분리
            const byPunct = a1.split(/[\s,:;|]+/).filter(Boolean);
            if (byPunct.length >= 2) return { xlsProject: byPunct[0], xlsQnum: byPunct[1] };
        }
        return { xlsProject: "", xlsQnum: "" };
    }

    // A3:G* 영역만 표로 변환
    function sheetRangeToRows(ws, lastRowIdxZeroBase) {
        const XLSrange = XLSX.utils.encode_range({
            s: { r: 2, c: 0 },                  // r=2 → 3행(A3)
            e: { r: lastRowIdxZeroBase, c: 6 }, // c=6 → G열
        });
        // 고정 헤더명으로 직접 지정
        const rows = XLSX.utils.sheet_to_json(ws, {
            range: XLSrange,
            header: ["lv1", "lv1code", "lv2", "lv2code", "lv3", "lv123code", "ex_gubun"],
            blankrows: false,
            defval: "",
            raw: false,
        });
        return rows;
    }

    // 첫 시트만 읽어서 검증 후, A3:G*를 우측 그리드 스키마로 표출
    async function parseExcelFileToRows_firstSheetOnly(file, selProject, selQnum) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const wsName = wb.SheetNames[0];           // 첫 번째 시트 고정
        const ws = wb.Sheets[wsName];
        if (!ws) throw new Error("엑셀 첫 번째 시트를 찾을 수 없습니다.");

        // 1) A1/B1(또는 A1 단일)에서 프로젝트/문번호 읽기
        const { xlsProject, xlsQnum } = readHeaderIds(ws);

        const pScreen = norm(selProject);
        const qScreen = norm(selQnum);
        const pXls = norm(xlsProject);
        const qXls = norm(xlsQnum);

        if (!pXls || !qXls) {
            throw new Error("엑셀 1행(A1/B1)에 웹프로젝트번호/문번호가 없습니다.");
        }
        // 대소문자/공백 무시 비교
        if (pScreen.toLowerCase() !== pXls.toLowerCase() || qScreen.toLowerCase() !== qXls.toLowerCase()) {
            throw new Error(`엑셀 헤더 값이 화면값과 다릅니다.\n화면: ${pScreen} / ${qScreen}\n엑셀: ${pXls} / ${qXls}`);
        }

        // 2) A3:G* 만 읽기
        // 끝행은 시트 범위에서 얻음
        const ref = ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]) : null;
        const lastR = ref ? ref.e.r : 10000; // fallback

        const rawRows = sheetRangeToRows(ws, lastR);

        // 3) 우측 그리드 스키마로 매핑(no, qnum 포함)
        const rows = rawRows
            .map((r, i) => ({
                no: i + 1,
                qnum: qScreen,                             // 현재 문번호 고정
                lv1: norm(r.lv1),
                lv1code: norm(r.lv1code),
                lv2: norm(r.lv2),
                lv2code: norm(r.lv2code),
                lv3: norm(r.lv3),
                lv123code: String(norm(r.lv123code)),
                ex_gubun: norm(r.ex_gubun),
            }))
            // 완전 공백 행 제거
            .filter(x => x.lv1 || x.lv2 || x.lv3 || x.lv123code);

        return rows;
    }

    // 파일 선택
    const handleFileChange = useCallback(async (e) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // 같은 파일 재선택 허용
        if (!file) return;

        // 화면(또는 좌측 선택)의 기준값
        const sel = getSel();
        const selProject = sel.select_projectnum || projectnum;
        const selQnum = sel.select_qnum || qnum;

        try {
            const rows = await parseExcelFileToRows_firstSheetOnly(file, selProject, selQnum);
            setRightRows(rows);
            setRightSort([]);
            setRightFilter(null);
            modal.showAlert("알림", "엑셀을 불러왔습니다. (프로젝트/문번호 검증 완료)");
        } catch (err) {
            console.error(err);
            modal.showErrorAlert("에러", String(err.message || err));
        }
    }, [projectnum, qnum, modal]);


    // 샘플 다운로드 (Blob만 처리, 파일명 고정)
    const handleSampleClick = useCallback(
        async () => {
            try {
                const sel = getSel();
                if (!sel.select_projectnum || !sel.select_qnum) {
                    modal.showErrorAlert("알림", "좌측에서 프로젝트/문항을 먼저 선택하세요.");
                    return;
                }

                const payload = {
                    user: String(auth?.user?.userId || ""),
                    gb: "excel_sample",
                    projectnum: String(sel.projectnum),
                    select_projectnum: String(sel.select_projectnum),
                    select_qnum: String(sel.select_qnum),
                    qid: String(sel.qid || ""),
                };

                const res = await sampleDownloadData.mutateAsync(payload);
                const blob = res?.data instanceof Blob ? res.data : (res instanceof Blob ? res : null);

                if (!blob) {
                    modal.showErrorAlert("에러", "샘플 파일을 받지 못했습니다.");
                    return;
                }

                // 서버가 에러를 JSON(Blob)으로 줄 수도 있어서 가드
                if (blob.type?.includes("application/json")) {
                    const txt = await blob.text();
                    console.log("server error json/text:", txt);
                    modal.showErrorAlert("에러", "샘플 다운로드 요청이 거부되었습니다.");
                    return;
                }

                saveBlobWithName(blob, `보기엑셀_샘플_` + moment().format("YYYYMMDDHHmmss") + `.xlsx`);
            } catch (err) {
                console.error(err);
                modal.showErrorAlert("에러", "샘플 다운로드 중 오류가 발생했습니다.");
            }
        }, []);

    // 보기 등록
    const handleRegisterClick = useCallback(async () => {
        const sel = getSel();
        if (!sel.select_projectnum || !sel.select_qnum) {
            modal.showErrorAlert("알림", "좌측에서 프로젝트/문항을 먼저 선택하세요.");
            return;
        }
        //console.log("rightRows", rightRows)
        try {
            const filteredRows = rightRows.map(({ no, ...rest }) => rest); //순번 컬럼 제거 후 등록 
            const payload = {
                user: auth?.user?.userId || "",
                projectnum: projectnum,
                gb: "enter_ex",
                qnum: qnum,
                data: filteredRows, // 그리드 데이터
            };
            console.log("payload", payload)
            const res = await excelListData.mutateAsync(payload);
            //console.log("res", res);

            if (res?.success === "777") {

                // 부모창에 등록 성공 신호 보내기
                if (window.opener) {
                    window.opener.postMessage({ type: "EXLOAD_REGISTER_SUCCESS" }, window.location.origin);
                }

                modal.showConfirm("알림", "보기등록이 완료되었습니다.", {
                    btns: [
                        {
                            title: "확인",
                            click: () => {
                                window.close();
                            },
                        },
                    ],
                });
            } else if (res?.success === "768") {
                let dupList = [];
                try {
                    dupList = typeof res?.resultjson === "string"
                        ? JSON.parse(res.resultjson)
                        : (res?.resultjson || []);
                } catch (e) {
                    console.error("dup parse error", e);
                }
            
                // 줄바꿈 형식으로 보기 구성
                const dupText = dupList.map(it => `${it.lv3 || ""}(${it.lv123code || ""})`).join("\n");
            
                modal.showErrorAlert("알림", "이미 등록된 보기가 있습니다.\n\n" + dupText);
            } else {
                modal.showErrorAlert("에러", "보기등록 중 오류가 발생했습니다.");
            }
        } catch (err) {
            console.error("err", err);
            modal.showErrorAlert("에러", "보기등록 중 오류가 발생했습니다.");
        }
    }, [rightRows]);

    // 좌측 그리드
    const LeftGrid = useCallback(
        (props) => {
            const { selectedState, setSelectedState, idGetter, dataState, dataItemKey, selectedField } = props;

            return (
                <div className="panel left">
                    <article className="subTitWrap">
                        <div className="subTit">
                            {/* <h2 className="titTxt">프로젝트 목록</h2> */}
                            <div className="kvline">
                                <span className="kv"><b>프로젝트번호</b> : <em>{projectnum}</em></span>
                                <span className="kv"><b>문항정보</b> : <em>{qnum}</em></span>
                            </div>
                        </div>
                    </article>

                    <div className="cmn_gird_wrap">
                        <div id="grid_left" className="cmn_grid">
                            <KendoGrid
                                parentProps={{
                                    data: dataState?.data,
                                    dataItemKey,
                                    selectedState,
                                    setSelectedState,
                                    selectedField,
                                    idGetter,
                                    sortable: { mode: "multiple", allowUnsort: true },
                                    filterable: true,
                                    sortChange: ({ sort }) => setLeftSort(sort ?? []),
                                    filterChange: ({ filter }) => setLeftFilter(filter ?? undefined),
                                    initialSort: leftSort,
                                    initialFilter: leftFilter,
                                    onRowClick: onLeftRowClick,
                                    pageable: false, // 페이징 제거
                                    toolbar: null,   // 툴바 제거
                                }}
                            >
                                {leftColumns.filter((c) => c.show !== false).map((c) => (
                                    <Column
                                        key={c.field}
                                        field={c.field}
                                        title={c.title}
                                        width={c.width}
                                        editable={false}
                                        columnMenu={leftColumnMenu}
                                    />
                                ))}
                            </KendoGrid>
                        </div>
                    </div>
                </div>
            );
        }, [leftFilter, leftColumns, leftSort]
    );
    // 우측 그리드
    const RightGrid = useMemo(() => {
        return (
            <div className="panel right">
                <article className="subTitWrap">
                    <div className="subTit subTit--with-actions">
                        <div className="kvline">
                            <span className="kv"><b>보기정보 </b></span>
                            <span className="kv" style={{ display: "block", fontSize: "13px" }}>{questionText}</span>
                        </div>

                        <div>
                            <div className="actions">
                                <Button type="button" className="btnTxt" onClick={handleUploadClick}>보기엑셀업로드</Button>
                                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleFileChange} />
                                <Button type="button" className="btnTxt" onClick={handleSampleClick}>보기엑셀샘플</Button>
                            </div>
                        </div>
                    </div>
                </article>

                <div className="cmn_gird_wrap">
                    <div id="grid_right" className="cmn_grid">
                        <KendoGrid
                            parentProps={{
                                data: rightRows,
                                dataItemKey: "no",
                                sortable: { mode: "multiple", allowUnsort: true },
                                filterable: true,
                                sort: rightSort,
                                filter: rightFilter,
                                sortChange: ({ sort }) => setRightSort(sort ?? []),
                                filterChange: ({ filter }) => setRightFilter(filter ?? null),
                                selectedState: rightSelected,       // 비어있는 선택 상태
                                setSelectedState: noopSelect,       // 아무 것도 안 함
                                selectedField: undefined,           // 선택 필드 미사용(가능하면 undefined)
                                idGetter: rightIdGetter,            // 안전하게 id 계산
                            }}
                        >
                            {rightColumns.filter((c) => c.show !== false).map((c) => (
                                <Column key={c.field} field={c.field} title={c.title} width={c.width} />
                            ))}
                        </KendoGrid>
                    </div>
                    {/* 보기 등록 버튼 */}
                    {rightRows.length !== 0 &&
                        <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 8px" }}>
                            <Button
                                className="btnTxt"
                                type="button"
                                onClick={handleRegisterClick}
                            >
                                보기등록
                            </Button>
                        </div>
                    }
                </div>
            </div>
        );
    }, [rightRows, rightColumns, rightSort, rightFilter, handleUploadClick, handleFileChange, handleSampleClick]);

    return (
        <Fragment>
            <div className="two-grid-layout">
                <GridData
                    dataItemKey={DATA_ITEM_KEY}
                    rowNumber={"no"}
                    selectedField={SELECTED_FIELD}
                    searchMutation={projectListData}
                    initialParams={{
                        user: auth?.user?.userId || "",
                        projectnum: projectnum,
                        gb: "projectlist"
                    }}
                    searchable={false}
                    pageable={false}
                    renderItem={(props) => <LeftGrid {...props} />}
                />
                {RightGrid}
            </div>
        </Fragment>
    );
};

export default OptionSettingExload; 