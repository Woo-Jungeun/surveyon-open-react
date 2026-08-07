import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

export function AiReportPageApi() {
    const loadingSpinner = useContext(loadingSpinnerContext);

    /** AI 모델 목록 조회 API */
    const getAiModels = useMutation(
        async (data) => await api.post(data, "/variables/ai/models", "API_BASE_URL_DATASTATUS")
    );

    /** AI 요약보고서 - 기존 분석 정보 조회 */
    const getAiSummaryData = useMutation(
        async (data) => await api.post(data, "/ai-summary/get-summary", "API_BASE_URL_DATASTATUS")
    );

    /** AI 요약보고서 - 설문지 업로드 및 파싱 실행 */
    const uploadQuestionnaire = useMutation(
        async (data) => await api.form(data, "/ai-summary/upload-questionnaire", {}, "API_BASE_URL_DATASTATUS")
    );

    /** AI 요약보고서 - 설문지 분석 진행 상황 조회 */
    const getUploadProgress = useMutation(
        async (data) => await api.post(data, "/ai-summary/upload-progress", "API_BASE_URL_DATASTATUS")
    );

    /** AI 요약보고서 - 분석 프레임 저장 */
    const saveAiSummaryFrame = useMutation(
        async (data) => await api.post(data, "/ai-summary/save-frame", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => { loadingSpinner.show(); },
            onSettled: () => { loadingSpinner.hide(); }
        }
    );

    /** AI 요약보고서 - 카테고리 자동 분류 */
    const getAutoCategories = useMutation(
        async (data) => await api.post(data, "/ai-summary/auto-categories", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => { loadingSpinner.show(); },
            onSettled: () => { loadingSpinner.hide(); }
        }
    );

    /** AI 요약보고서 - L1 생성상태 및 결과로드 */
    const getL1Status = useMutation(
        async (data) => await api.post(data, "/ai-summary/load-l1-status", "API_BASE_URL_DATASTATUS")
    );

    /** AI 요약보고서 - L1 엑셀 다운로드 */
    const exportL1Excel = useMutation(
        async (data) => await api.post(data, "/ai-summary/export-excel", "API_BASE_URL_DATASTATUS")
    );

    /** AI 요약보고서 - L2 조사내용별 분석 생성 */
    const generateL2 = useMutation(
        async (data) => await api.post(data, "/ai-summary/generate-l2", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => { loadingSpinner.show(); },
            onSettled: () => { loadingSpinner.hide(); }
        }
    );

    return {
        getAiModels,
        getAiSummaryData,
        uploadQuestionnaire,
        getUploadProgress,
        saveAiSummaryFrame,
        getAutoCategories,
        getL1Status,
        exportL1Excel,
        generateL2
    };
}
