import { useMutation } from "react-query";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import {
    getAnalysisInfo,
    getAnalysisResponses,
    getAnalysisCodes,
    getAnalysisRawdata,
    getAnalysisStatus,
    checkAnalysisPopup,
    saveAnalysisInfo,
    saveAnalysisCodes,
    saveAnalysisResponses,
    startAnalysisWorker,
    getAnalysisWorkerStatus,
    stopAnalysisWorker,
    downloadAnalysisExcel,
    searchImportProjects,
    getImportCodes,
    applyImportCodes,
    deleteAnalysisQuestion,
} from "@/api/analysisApi.js";

/**
 * 분석 > API (ASP.NET Core /analysis/* 신규 API 래퍼 연동)
 *
 * @author jewoo
 * @since 2025-08-08
 */
export function OptionSettingApi() {
    const loadingSpinner = useContext(loadingSpinnerContext);

    // 데이터 조회 API (레거시 option_edit_api.aspx 대체)
    const optionEditData = useMutation(
        async (variables) => {
            const params = variables?.params || variables || {};
            const { gb, projectnum = "", qnum = "", user = "", qid = "", checkyn = "0" } = params;

            switch (gb) {
                case "info":
                    return await getAnalysisInfo(projectnum, qnum, user);
                case "in":
                    return await getAnalysisResponses(projectnum, qnum);
                case "lb":
                    return await getAnalysisCodes(projectnum, qnum);
                case "list":
                    return await getAnalysisRawdata(projectnum, qnum);
                case "popupcheck":
                    return await checkAnalysisPopup(projectnum, qnum, qid, String(checkyn ?? "0"));
                case "del_qnum":
                    return await deleteAnalysisQuestion(projectnum, qnum, qid, user);
                default:
                    return await getAnalysisInfo(projectnum, qnum, user);
            }
        },
        {
            onMutate: (variables) => {
                const gb = variables?.params?.gb;
                if (gb !== "info" && gb !== "del_qnum" && !variables?.params?.skipSpinner && !variables?.skipSpinner) {
                    loadingSpinner?.show?.();
                }
            },
            onSettled: (_data, _error, variables) => {
                const gb = variables?.params?.gb;
                if (gb !== "info" && gb !== "del_qnum" && !variables?.params?.skipSpinner && !variables?.skipSpinner) {
                    loadingSpinner?.hide?.();
                }
            },
        }
    );

    // 데이터 저장 API (레거시 option_save_api.aspx 대체)
    const optionSaveData = useMutation(
        async (variables) => {
            const { gb, projectnum = "", qnum = "", user = "", data = [], lvcode = "1", duplicate_answer = "n" } =
                variables || {};
            if (gb === "info") {
                const infoObj = Array.isArray(data) ? data[0] || {} : data;
                return await saveAnalysisInfo(projectnum, qnum, infoObj, user);
            }
            if (gb === "lb") {
                return await saveAnalysisCodes(projectnum, qnum, data, user, lvcode);
            }
            if (gb === "in") {
                return await saveAnalysisResponses(projectnum, qnum, duplicate_answer, data, user, lvcode);
            }
            return await saveAnalysisCodes(projectnum, qnum, data, user, lvcode);
        },
        {
            onMutate: (variables) => {
                if (variables?.gb !== "info" && !variables?.skipSpinner) loadingSpinner?.show?.();
            },
            onSettled: (_data, _error, variables) => {
                if (variables?.gb !== "info" && !variables?.skipSpinner) loadingSpinner?.hide?.();
            },
        }
    );

    // 분석 워커 시작 (/analysis/worker/start)
    const optionAnalysisStart = useMutation(async (data) => {
        const { projectnum = "", qnum = "", action = "analyze", user = "", ...rest } = data || {};
        return await startAnalysisWorker(projectnum, qnum, action, user, rest);
    });

    // 워커 상태 폴링 (/analysis/worker/status)
    const optionAnalysisStatus = useMutation(async (params) => {
        return await getAnalysisWorkerStatus(params?.job, params?.offset ?? 0);
    });

    // 워커 강제 중지 (/analysis/worker/stop)
    const optionAnalysisClear = useMutation(async (params) => {
        return await stopAnalysisWorker(params?.job || params?.jobId, params?.projectnum, params?.qnum, params?.user);
    });

    // 분석 상태 조회 (/analysis/status)
    const optionStatus = useMutation(async (params) => {
        return await getAnalysisStatus(params?.projectnum, params?.qnum, params?.qid);
    });

    // 타 프로젝트/문항 검색 (/analysis/import/projects)
    const projectListData = useMutation(async (variables) => {
        const params = variables?.params || variables || {};
        return await searchImportProjects(params?.search ?? "");
    });

    // 타 문항 보기 조회 및 반영 (/analysis/import/codes, /analysis/import/apply)
    const excelListData = useMutation(async (payload) => {
        if (payload?.gb === "enter_ex") {
            return await applyImportCodes(payload?.projectnum, payload?.qnum, payload?.data || [], payload?.user);
        }
        return await getImportCodes(payload?.select_projectnum, payload?.select_qnum);
    });

    // 엑셀 다운로드 (/analysis/export/excel)
    const excelDownloadData = useMutation(async (data) => {
        return await downloadAnalysisExcel(data?.projectnum, data?.qnum, data?.user);
    });

    return {
        optionEditData,
        optionSaveData,
        optionAnalysisStart,
        optionAnalysisStatus,
        optionAnalysisClear,
        optionStatus,
        projectListData,
        excelListData,
        excelDownloadData,
    };
}
