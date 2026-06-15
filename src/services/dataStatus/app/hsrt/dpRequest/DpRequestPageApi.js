import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

export function DpRequestPageApi() {

    const loadingSpinner = useContext(loadingSpinnerContext);

    /** DP 의뢰서 - 배너 및 기본 정보 가져오기 */
    const getBannerDetail = useMutation(
        async (data) => await api.post(data, "/dp-request/banner/detail", "API_BASE_URL_DATASTATUS")
    );

    /** 자동 배너 구성 마법사 - 기본 변수 목록 */
    const getBaseVariableList = useMutation(
        async (data) => await api.post(data, "/variables/base/list", "API_BASE_URL_DATASTATUS")
    );

    /** 신규 문항 ID 채번 */
    const getNextBaseVariableId = useMutation(
        async (data) => await api.post(data, "/variables/base/next-id", "API_BASE_URL_DATASTATUS")
    );

    /** 파생 문항 목록 조회 */
    const getComputedVariableList = useMutation(
        async (data) => await api.post(data, "/variables/computed/list", "API_BASE_URL_DATASTATUS")
    );

    /** 기본 문항 추가 (merge) */
    const saveBaseVariableMerge = useMutation(
        async (data) => await api.post(data, "/variables/base/merge", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => { loadingSpinner.show(); },
            onSettled: () => { loadingSpinner.hide(); }
        }
    );

    /** 계산 문항 재계산 */
    const recomputeComputedVariables = useMutation(
        async (data) => await api.post(data, "/variables/computed/recompute", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => { loadingSpinner.show(); },
            onSettled: () => { loadingSpinner.hide(); }
        }
    );

    /** 변수 삭제 */
    const deleteBaseVariable = useMutation(
        async (data) => await api.post(data, "/variables/base/delete", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => { loadingSpinner.show(); },
            onSettled: () => { loadingSpinner.hide(); }
        }
    );

    /** DP 의뢰서 - 테이블 설정 초기 맥락 조회 */
    const getTableRenderContext = useMutation(
        async (data) => await api.post(data, "/dp-request/table/render-context", "API_BASE_URL_DATASTATUS")
    );

    /** DP 의뢰서 - 테이블 설정 상세 정보 조회 (원본 편집 조회용) */
    const getTableDetail = useMutation(
        async (data) => await api.post(data, "/dp-request/table/detail", "API_BASE_URL_DATASTATUS")
    );

    /** DP 의뢰서 - 테이블 설정 저장 */
    const saveTableSettings = useMutation(
        async (data) => await api.post(data, "/dp-request/table/save", "API_BASE_URL_DATASTATUS")
    );

    /** DP 의뢰서 - 전체 컨텍스트(단계별 상태/카운트) 조회 */
    const getDpContext = useMutation(
        async (data) => await api.post(data, "/dp-request/context", "API_BASE_URL_DATASTATUS")
    );

    /** 자동 배너 구성 - 배너 생성 API */
    const generateBanner = useMutation(
        async (data) => await api.post(data, "/dp-request/banner/generate", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => { loadingSpinner.show(); },
            onSettled: () => { loadingSpinner.hide(); }
        }
    );

    /** 생성된 배너 변수 저장 API */
    const saveBannerDetail = useMutation(
        async (data) => await api.post(data, "/dp-request/banner/save", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => { loadingSpinner.show(); },
            onSettled: () => { loadingSpinner.hide(); }
        }
    );

    /** DP 의뢰서 - Recoded (스터브) 오버뷰 조회 */
    const getRecodedOverview = useMutation(
        async (data) => await api.post(data, "/dp-request/recoded/overview", "API_BASE_URL_DATASTATUS")
    );

    /** DP 의뢰서 - Summary 조회 */
    const getSummaryDetail = useMutation(
        async (data) => await api.post(data, "/dp-request/summary/detail", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => { loadingSpinner.show(); },
            onSettled: () => { loadingSpinner.hide(); }
        }
    );

    /** DP 의뢰서 - Recoded (스터브) 오버뷰 저장 */
    const saveRecodedOverview = useMutation(
        async (data) => await api.post(data, "/dp-request/recoded/overview/save", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => { loadingSpinner.show(); },
            onSettled: () => { loadingSpinner.hide(); }
        }
    );

    /** 변수 리코딩(스터브 등) 저장 API */
    const saveRecodedSet = useMutation(
        async (data) => await api.post(data, "/variables/recoded/set", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => { loadingSpinner.show(); },
            onSettled: () => { loadingSpinner.hide(); }
        }
    );

    /** 변수 리코딩(스터브 등) 삭제 API */
    const deleteRecodedSet = useMutation(
        async (data) => await api.post(data, "/variables/recoded/delete", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => { loadingSpinner.show(); },
            onSettled: () => { loadingSpinner.hide(); }
        }
    );

    /** 신규 스터브 생성 API */
    const createStub = useMutation(
        async (data) => await api.post(data, "/dp-request/recoded/stubs/create", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => { loadingSpinner.show(); },
            onSettled: () => { loadingSpinner.hide(); }
        }
    );

    /** DP 의뢰서 - 요약표 자동 생성 (척도형) */
    const generateSummaryAuto = useMutation(
        async (data) => await api.post(data, "/dp-request/summary/auto-generate", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => { loadingSpinner.show(); },
            onSettled: () => { loadingSpinner.hide(); }
        }
    );

    /** DP 의뢰서 - 요약표 저장 */
    const saveSummaryDetail = useMutation(
        async (data) => await api.post(data, "/dp-request/summary/save", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => { loadingSpinner.show(); },
            onSettled: () => { loadingSpinner.hide(); }
        }
    );
    /** DP 의뢰서 - 표 순서 상세 조회 */
    const getOrderDetail = useMutation(
        async (data) => await api.post(data, "/dp-request/order/detail", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => { loadingSpinner.show(); },
            onSettled: () => { loadingSpinner.hide(); }
        }
    );

    /** DP 의뢰서 - 표 순서 상세 변경 내역 저장 */
    const saveOrderDetail = useMutation(
        async (data) => await api.post(data, "/dp-request/order/save", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => { loadingSpinner.show(); },
            onSettled: () => { loadingSpinner.hide(); }
        }
    );

    /** 개별 변수(카테고리) 평가 수행 */
    const evaluateVariable = useMutation(
        async (data) => await api.post(data, "/analysis/evaluate/table", "API_BASE_URL_DATASTATUS")
    );

    /** 교차분석 - 차트 데이터 조회 */
    const evaluateChartData = useMutation(
        async (data) => await api.post(data, "/analysis/evaluate/chart-data", "API_BASE_URL_DATASTATUS")
    );

    /** 교차분석 - 초기 문맥 조회 */
    const getOverviewContext = useMutation(
        async (data) => await api.post(data, "/datasets/overview/context", "API_BASE_URL_DATASTATUS")
    );

    /** 교차분석 - 전체표 결과 조회 */
    const getOverview = useMutation(
        async (data) => await api.post(data, "/datasets/overview", "API_BASE_URL_DATASTATUS")
    );

    /** 교차분석 - 전체표 결과 조회 (스타일 포함 HTML) */
    const getOverviewStyled = useMutation(
        async (data) => await api.post(data, "/datasets/overview/styled", "API_BASE_URL_DATASTATUS")
    );

    /** 표 설정 - 스타일 예시 조회 */
    const getStyleExamples = useMutation(
        async (data) => await api.post(data, "/datasets/overview/style-examples", "API_BASE_URL_DATASTATUS")
    );
    /** 교차분석 - HTML 복사 (export) */
    const exportOverviewHtml = useMutation(
        async (data) => await api.post(data, "/datasets/overview/html-export", "API_BASE_URL_DATASTATUS")
    );
    /** 교차분석 - 엑셀 다운로드 (export) */
    const exportOverviewXlsx = useMutation(
        async (data) => await api.post(data, "/datasets/overview/xlsx-export", "API_BASE_URL_DATASTATUS")
    );

    /** 교차분석 - 현재 결과 저장 (Snapshot) */
    const createSnapshot = useMutation(
        async (data) => await api.post(data, "/datasets/overview/snapshots/create", "API_BASE_URL_DATASTATUS")
    );

    /** 교차분석 - 표시 옵션 저장 */
    const savePageSettings = useMutation(
        async (data) => await api.post(data, "/pages/set", "API_BASE_URL_DATASTATUS")
    );

    /** AI 데이터 요약 조회 */
    const getAiSummary = useMutation(
        async (data) => await api.post(data, "/AiSummary", "API_BASE_URL_OPENAI")
    );

    /** DP 의뢰서 - 설정 재적용 (source_based 부모 스터브만 가능) */
    const reapplyPreset = useMutation(
        async (data) => await api.post(data, "/dp-request/recoded/overview/reapply-preset", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => { loadingSpinner.show(); },
            onSettled: () => { loadingSpinner.hide(); }
        }
    );

    return {
        getBannerDetail,
        getBaseVariableList,
        getNextBaseVariableId,
        getComputedVariableList,
        saveBaseVariableMerge,
        recomputeComputedVariables,
        deleteBaseVariable,
        getTableRenderContext,
        getTableDetail,
        saveTableSettings,
        getDpContext,
        generateBanner,
        saveBannerDetail,
        getSummaryDetail,
        generateSummaryAuto,
        saveSummaryDetail,
        getRecodedOverview,
        saveRecodedOverview,
        saveRecodedSet,
        deleteRecodedSet,
        createStub,
        getOrderDetail,
        saveOrderDetail,
        evaluateVariable,
        evaluateChartData,
        getOverviewContext,
        getOverview,
        getOverviewStyled,
        getStyleExamples,
        exportOverviewHtml,
        exportOverviewXlsx,
        createSnapshot,
        savePageSettings,
        getAiSummary,
        reapplyPreset
    };
}
