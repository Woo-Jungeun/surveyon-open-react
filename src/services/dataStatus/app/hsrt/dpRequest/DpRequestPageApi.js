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

    /** 파생 문항 목록 조회 */
    const getComputedVariableList = useMutation(
        async (data) => await api.post(data, "/variables/computed/list", "API_BASE_URL_DATASTATUS")
    );

    /** 파생 문항 저장 (실제로는 base/merge 지만 computed 저장에 사용) */
    const saveComputedVariable = useMutation(
        async (data) => await api.post(data, "/variables/base/merge", "API_BASE_URL_DATASTATUS"),
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
        async (data) => await api.post(data, "/analysis/evaluate/table", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => { loadingSpinner.show(); },
            onSettled: () => { loadingSpinner.hide(); }
        }
    );

    /** 교차분석 - 초기 문맥 조회 */
    const getOverviewContext = useMutation(
        async (data) => await api.post(data, "/datasets/overview/context", "API_BASE_URL_DATASTATUS")
    );

    /** 교차분석 - 전체표 결과 조회 */
    const getOverview = useMutation(
        async (data) => await api.post(data, "/datasets/overview", "API_BASE_URL_DATASTATUS")
    );

    /** 교차분석 - 표시 옵션 저장 */
    const savePageSettings = useMutation(
        async (data) => await api.post(data, "/pages/set", "API_BASE_URL_DATASTATUS")
    );

    return {
        getBannerDetail,
        getBaseVariableList,
        getComputedVariableList,
        saveComputedVariable,
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
        getOrderDetail,
        saveOrderDetail,
        evaluateVariable,
        getOverviewContext,
        getOverview,
        savePageSettings
    };
}
