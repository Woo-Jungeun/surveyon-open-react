import React, { Fragment, useState, useCallback, useMemo, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
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

/**
 * 보기불러오기 (새창)
 *
 * @author jewoo
 * @since 2025-09-18<br />
 */
const OptionSettingExload = () => {
    const auth = useSelector((store) => store.auth);
    const modal = useContext(modalContext);

    const navigate = useNavigate();
    const DATA_ITEM_KEY = "no";
    const SELECTED_FIELD = "selected";
    const MENU_TITLE = "보기불러오기";

    const [searchParams] = useSearchParams();
    const projectnum = (searchParams.get("projectnum") || "").trim(); // 예: n221115
    const qnum = (searchParams.get("qnum") || "").trim();       // 예: 문1
    //console.log(projectnum, qnum);

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

    const { projectListData, excelListData, sampleDownloadData, uploadData } = OptionSettingApi();

    // 좌측에서 선택된 행 정보 (헤더 표기용)
    const [selectedProject, setSelectedProject] = useState(null); // { selprojectnum, project_qnum, pofname, ... }

    // 우측 데이터
    const [rightRows, setRightRows] = useState([]);
    // 질문 문구 (question_text)
    const [questionText, setQuestionText] = useState("");

    // 좌측 컬럼 (요청 매핑 반영)
    const [leftColumns, setLeftColumns] = useState(() => [
        { field: "no", title: "순번", show: true, width: "90px", allowHide: false },
        { field: "pof", title: "프로젝트", show: true, width: "120px", allowHide: false },
        { field: "selprojectnum", title: "웹프로젝트", show: true, width: "140px", allowHide: false },
        { field: "pofname", title: "프로젝트명", show: true, width: "200px", allowHide: false },
        { field: "servername", title: "오픈서버정보", show: true, width: "145px", allowHide: false },
        { field: "project_qnum", title: "문항정보", show: true, width: "120px", allowHide: false },
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
    ]);

    // 좌측 컬럼 메뉴
    const leftColumnMenu = (menuProps) => (
        <ExcelColumnMenu
            {...menuProps}
            columns={leftColumns}
            onColumnsChange={(updated) => {
                const map = new Map(updated.map((c) => [c.field, c]));
                const next = leftColumns.map((c) => (map.has(c.field) ? { ...c, ...map.get(c.field) } : c));
                setLeftColumns(next);
            }}
            filter={leftFilter}
            onFilterChange={({ filter }) => setLeftFilter(filter ?? undefined)}
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

    const mapToRightRow = (list = []) =>
        list.map((it, idx) => ({
            no: idx + 1,
            qnum: it?.qnum ?? "",
            lv1: it?.lv1 ?? "",
            lv2: it?.lv2 ?? "",
            lv3: it?.lv3 ?? "",
            lv123code: it?.lv123code ?? "",
            lv1code: it?.lv1code ?? "",
            lv2code: it?.lv2code ?? "",
        }));

    // 파일 업로드 input 제어
    const fileInputRef = useRef(null);

    const handleUploadClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // 보기 엑셀 업로드 
    // const handleFileChange = useCallback(async (e) => {
    //     const file = e.target.files?.[0];
    //     console.log(file)
    //     e.target.value = ""; // 같은 파일 재선택 가능하게 초기화
    //     if (!file) return;

    //     const sel = getSel();
    //     if (!sel.select_projectnum || !sel.select_qnum) {
    //         alert("좌측에서 프로젝트/문항을 먼저 선택하세요.");
    //         return;
    //     }
    //     // if (modal.showAlert("알림", "엑셀 업로드 데이터를 대체 하시겠습니까?")) return;
    //     modal.showConfirm(
    //         "알림",
    //         "엑셀 업로드 데이터를 대체 하시겠습니까?",
    //         {
    //             btns: [
    //                 {
    //                     title: "취소",
    //                     class: "popup__btn popup__btn--gray"
    //                 },
    //                 {
    //                     title: "확인",
    //                     click: async () => {
    //                         // api

    //                         try {
    //                             const form = new FormData();
    //                             form.append("gb", "excel_upload");
    //                             form.append("user", auth?.user?.userId || "");
    //                             form.append("projectnum", sel.projectnum);
    //                             // form.append("select_projectnum", sel.select_projectnum);
    //                             // form.append("select_qnum", sel.select_qnum);
    //                             // form.append("qid", sel.qid || "");
    //                             form.append("files", file, file.name);


    //                             const res = await uploadData.mutateAsync(form);
    //                             const data = res?.data ?? res;

    //                             if (data?.success === "777") {
    //                                 setRightRows(mapToRightRow(data?.resultjson || []));
    //                                 modal.showAlert("알림", "업로드가 완료되었습니다.");
    //                             } else if (data?.success === "762") {
    //                                 // 보기중복
    //                                 const dup = data?.jsondata || data?.resultjson || [];
    //                                 setRightRows(mapToRightRow(dup));
    //                                 modal.showErrorAlert("알림", "중복 코드가 있습니다. 그리드에서 확인하세요.");
    //                             } else {

    //                                 modal.showErrorAlert("에러", "업로드 중 오류가 발생했습니다.");
    //                             }
    //                         } catch (e) {
    //                             const r = err?.response;
    //                             if (r?.data instanceof Blob) {
    //                                 const text = await r.data.text();
    //                                 console.log("SERVER ERROR BODY >>>", text);
    //                             } else {
    //                                 console.log("UPLOAD ERROR >>>", err);
    //                             }
    //                             console.error(e);
    //                             modal.showErrorAlert("알림", "업로드 중 오류가 발생했습니다.");
    //                         }
    //                     }
    //                 }
    //             ]
    //         }
    //     );

    // }, [excelListData, auth?.user?.userId, projectnum, selectedProject, qnum]);
    // 엑셀 파일을 읽어 우측 그리드 스키마로 변환
    async function parseExcelFileToRows(file) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // defval: 빈 셀도 키가 있게, raw:false: 값 문자열화(날짜/숫자도 보기 좋게)
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });

        const norm = (v) => (typeof v === "string" ? v.trim() : v ?? "");
        const pick = (row, keys) => {
            for (const k of keys) if (row[k] !== undefined) return row[k];
            return "";
        };

        // 헤더 매핑(영문/국문 둘 다 시도)
        return rows
            .map((r, i) => ({
                no: i + 1,
                qnum: sel.select_qnum,
                lv1: norm(pick(r, ["lv1", "대분류", "대분류(lv1)"])),
                lv2: norm(pick(r, ["lv2", "중분류", "중분류(lv2)"])),
                lv3: norm(pick(r, ["lv3", "소분류", "소분류(lv3)"])),
                lv123code: String(pick(r, ["lv123code", "소분류코드", "lv123Code"] || "")),
                lv1code: norm(pick(r, ["lv1code", "대분류코드"])),
                lv2code: norm(pick(r, ["lv2code", "중분류코드"])),
            }))
            // 완전 공백 행 제거
            .filter(row => row.qnum || row.lv1 || row.lv2 || row.lv3 || row.lv123code);
    }
    
    const handleFileChange = useCallback(async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";            // 같은 파일 재선택 가능
        if (!file) return;

        try {
            // 엑셀을 바로 파싱해서 그리드에 넣기
            const rows = await parseExcelFileToRows(file);
            //console.log(rows);
            setRightRows(rows);
            setRightSort([]);
            setRightFilter(null);

            // 안내(선택)
            modal.showAlert("알림", `엑셀 파일을 불러와 미리보기로 표시했습니다.\n필요 시 '보기등록'을 눌러 저장하세요.`);
        } catch (err) {
            console.error(err);
            modal.showErrorAlert("에러", "엑셀 파일을 읽는 중 오류가 발생했습니다.");
        }
    }, [setRightRows, setRightSort, setRightFilter, modal]);

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

                saveBlobWithName(blob, `보기엑셀_샘플.xlsx`);
            } catch (err) {
                console.error(err);
                modal.showErrorAlert("에러", "샘플 다운로드 중 오류가 발생했습니다.");
            }
        }, [sampleDownloadData, auth?.user?.userId, projectnum, selectedProject, qnum]);

    // 보기 등록
    const handleRegisterClick = useCallback(
        async () => {
            const sel = getSel();
            if (!sel.select_projectnum || !sel.select_qnum) {
                modal.showErrorAlert("알림", "좌측에서 프로젝트/문항을 먼저 선택하세요.");
                return;
            }

            try {
                const payload = {
                    user: auth?.user?.userId || "",
                    projectnum: sel.projectnum,
                    gb: "enter_ex",
                    select_projectnum: sel.select_projectnum,
                    select_qnum: sel.select_qnum,
                    qid: sel.qid,
                };

                const res = await excelListData.mutateAsync(payload);
                console.log(res);
                const data = res?.data ?? res;
                const code = String(data?.success ?? "");

                if (code === "777") {
                    modal.showAlert("알림", "보기등록이 완료되었습니다.");
                } else if (code === "762") {
                    modal.showErrorAlert("알림", "중복 코드가 있습니다. 그리드에서 확인하세요.");
                    setRightRows(mapToRightRow(data?.jsondata || data?.resultjson || []));
                } else {
                    modal.showErrorAlert("에러", data?.error || "보기등록 중 오류가 발생했습니다.");
                }
            } catch (err) {
                console.error(err);
                modal.showErrorAlert("에러", "보기등록 중 오류가 발생했습니다.");
            }
        }, [excelListData, auth?.user?.userId, projectnum, selectedProject, rightRows]);

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
                                    sort: leftSort,
                                    filter: leftFilter,
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
        }, [leftFilter, leftColumns, onLeftRowClick, selectedProject, leftSort]
    );

    // 우측 그리드
    const RightGrid = useMemo(() => {
        return (
            <div className="panel right">
                <article className="subTitWrap">
                    <div className="subTit subTit--with-actions">
                        <div className="kvline">
                            <span className="kv"><b>보기정보</b></span>
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
    }, [rightRows, rightColumns, rightSort, rightFilter, handleUploadClick, handleFileChange, handleSampleClick, handleRegisterClick]);

    return (
        <Fragment>
            <div className="two-grid-layout">
                <GridData
                    dataItemKey={DATA_ITEM_KEY}
                    rowNumber={"no"}
                    selectedField={SELECTED_FIELD}
                    menuTitle={MENU_TITLE}
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