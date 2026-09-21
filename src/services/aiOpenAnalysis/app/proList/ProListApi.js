import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

/**
 * 문항 목록 > API 서비스 (최신 Core API 명세 기준 완벽 대응)
 *
 * @author jewoo
 * @since 2026-09-18
 */
export function ProListApi() {
    const loadingSpinner = useContext(loadingSpinnerContext);

    // [A-1] 메인 목록 및 KPI 조회 (POST /pro_list/select)
    const proListData = useMutation(
        async (data) => {
            const params = data?.params || data || {};
            const payload = {
                user: params.user || "",
                projectnum: params.projectnum || "",
                servername: params.servername || sessionStorage.getItem("servername") || "",
                search_text: params.search_text ?? params.searchKey ?? ""
            };
            return await api.post(payload, "/pro_list/select", "API_BASE_URL_OPENAI");
        },
        {
            onMutate: () => {
                loadingSpinner?.show?.();
            },
            onSettled: () => {
                setTimeout(() => {
                    loadingSpinner?.hide?.();
                }, 400);
            }
        }
    );

    // [A-2] PID 수치 차이 모달 내역 조회 (POST /pro_list/pid_diff)
    const fetchPidDiff = useMutation(
        async (payload) => await api.post(payload, "/pro_list/pid_diff", "API_BASE_URL_OPENAI")
    );

    // [B-10] DB 문항 목록 조회 (POST /pro_register/db_select)
    const fetchRegisterDbList = useMutation(
        async (payload) => await api.post(payload, "/pro_register/db_select", "API_BASE_URL_OPENAI")
    );

    // [B-11] DB 오픈데이터 등록 실행 (POST /pro_register/db_enter)
    const enterRegisterDb = useMutation(
        async (payload) => await api.post(payload, "/pro_register/db_enter", "API_BASE_URL_OPENAI")
    );

    // [B-샘플] 엑셀 업로드 샘플 파일 다운로드 (GET /pro_register/excel_sample)
    const getExcelSample = useMutation(
        async () => await api.fileGet("/pro_register/excel_sample", {}, "API_BASE_URL_OPENAI")
    );

    // [B-12] 엑셀 파일 파싱 (FILE /pro_register/excel_parse)
    const parseExcelRegister = useMutation(
        async (formData) => await api.form(formData, "/pro_register/excel_parse", {}, "API_BASE_URL_OPENAI")
    );

    // [B-13] 엑셀 오픈데이터 최종 저장 (POST /pro_register/excel_enter)
    const enterExcelRegister = useMutation(
        async (payload) => await api.post(payload, "/pro_register/excel_enter", "API_BASE_URL_OPENAI")
    );

    // [B-14] 보기등록 엑셀 파일 파싱 (FILE /pro_list/import_lb_all_excel)
    const importLbAllExcel = useMutation(
        async (formData) => await api.form(formData, "/pro_list/import_lb_all_excel", {}, "API_BASE_URL_OPENAI")
    );

    // [B-15] 보기등록 JSON 파싱 데이터 최종 저장 (POST /pro_list/import_lb_all)
    const importLbAllJson = useMutation(
        async (payload) => await api.post(payload, "/pro_list/import_lb_all", "API_BASE_URL_OPENAI")
    );

    // [C-16] 보기추출 (개발자용 Excel 다운로드) (POST /pro_list/export_lb_excel_file)
    const exportLbDevExcel = useMutation(
        async (payload) => await api.file(payload, "/pro_list/export_lb_excel_file", "API_BASE_URL_OPENAI")
    );

    // [C-17] 보기추출 (DP용 Text 다운로드) (POST /pro_list/export_lb_dp_file)
    const exportLbDpTxt = useMutation(
        async (payload) => await api.file(payload, "/pro_list/export_lb_dp_file", "API_BASE_URL_OPENAI")
    );

    // [C-18] 응답추출 (전체문항 Excel 다운로드) (POST /pro_list/export_data_all_file)
    const exportDataAllExcel = useMutation(
        async (payload) => await api.file(payload, "/pro_list/export_data_all_file", "API_BASE_URL_OPENAI")
    );

    // [D-행1] 개별 행 및 그룹 분석/제외 토글 (POST /pro_list/analysis)
    const toggleAnalysis = useMutation(
        async (payload) => await api.post(payload, "/pro_list/analysis", "API_BASE_URL_OPENAI")
    );

    // [D-행2] 프로젝트 전체 문항 분석/제외 일괄 전환 (POST /pro_list/allanalysis)
    const toggleAllAnalysis = useMutation(
        async (payload) => await api.post(payload, "/pro_list/allanalysis", "API_BASE_URL_OPENAI")
    );

    // [D-행3] 개별 행 및 그룹 수정 잠금/가능 토글 (POST /pro_list/rowEdit)
    const toggleRowEdit = useMutation(
        async (payload) => await api.post(payload, "/pro_list/rowEdit", "API_BASE_URL_OPENAI")
    );

    // [D-행4] 프로젝트 전체 문항 수정 잠금/가능 일괄 전환 (POST /pro_list/allEdit)
    const toggleAllEdit = useMutation(
        async (payload) => await api.post(payload, "/pro_list/allEdit", "API_BASE_URL_OPENAI")
    );

    // [D-행5] 문항통합 묶기 (Merge) 및 풀기 (Unmerge) 단일 통합 API (POST /pro_list/allmerge)
    const allMerge = useMutation(
        async (payload) => await api.post(payload, "/pro_list/allmerge", "API_BASE_URL_OPENAI")
    );

    // [E-일괄1] 문항최종 명칭 일괄 수정 (POST /pro_list/batch_question_fin)
    const batchEditQuestionFin = useMutation(
        async (payload) => await api.post(payload, "/pro_list/batch_question_fin", "API_BASE_URL_OPENAI")
    );

    // [E-일괄2] 선택 문항 일괄 설정 전환 (POST /pro_list/bulk_update)
    const bulkUpdate = useMutation(
        async (payload) => await api.post(payload, "/pro_list/bulk_update", "API_BASE_URL_OPENAI")
    );

    // [E-일괄3] 선택 문항 삭제 (POST /pro_list/qnum_delete)
    const deleteQnums = useMutation(
        async (payload) => await api.post(payload, "/pro_list/qnum_delete", "API_BASE_URL_OPENAI")
    );

    // [F-필터1] 필터문항 목록 조회 (POST /pro_list/filter_select_qnum)
    const fetchFilterQnums = useMutation(
        async (payload) => await api.post(payload, "/pro_list/filter_select_qnum", "API_BASE_URL_OPENAI")
    );

    // [F-필터2] 단일 문항 필터 설정 저장 (POST /pro_list/filter_update_single)
    const filterUpdateSingle = useMutation(
        async (payload) => await api.post(payload, "/pro_list/filter_update_single", "API_BASE_URL_OPENAI")
    );

    // [F-필터3] 전체 분석문항 필터 일괄 저장 (POST /pro_list/filter_update_all)
    const filterUpdateAll = useMutation(
        async (payload) => await api.post(payload, "/pro_list/filter_update_all", "API_BASE_URL_OPENAI")
    );

    // 하위 호환용 래퍼 및 가상 mutation 레퍼런스
    const updateSingleYn = toggleAnalysis;
    const unmergeGroup = allMerge;
    const saveMergeQnum = allMerge;
    const editMutation = bulkUpdate;
    const excelDownloadMutation = exportLbDevExcel;

    return {
        proListData,
        fetchPidDiff,
        fetchRegisterDbList,
        enterRegisterDb,
        getExcelSample,
        parseExcelRegister,
        enterExcelRegister,
        importLbAllExcel,
        importLbAllJson,
        exportLbDevExcel,
        exportLbDpTxt,
        exportDataAllExcel,
        toggleAnalysis,
        toggleAllAnalysis,
        toggleRowEdit,
        toggleAllEdit,
        allMerge,
        batchEditQuestionFin,
        bulkUpdate,
        deleteQnums,
        fetchFilterQnums,
        filterUpdateSingle,
        filterUpdateAll,

        // 하위 호환용 필드
        updateSingleYn,
        unmergeGroup,
        saveMergeQnum,
        editMutation,
        excelDownloadMutation
    };
}

