import { useMutation, useQuery } from "react-query";
import api from "@/common/queries/Api.js";

import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

export function FieldProgressPageApi() {

    const loadingSpinner = useContext(loadingSpinnerContext);

    /** 빈도분석 목록 리스트 */
    const getOverviewList = useMutation(
        async (payload) => await api.post(payload, "/datasets/overview/list", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: (vars) => {
                // loadingSpinner.show();
            },
            onSettled: () => {
                // loadingSpinner.hide();
            }
        }
    );

    /** 선택된 문항에 대한 데이터 조회 */
    const getOverviewData = useMutation(
        async (payload) => await api.post(payload, "/datasets/overview", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: (vars) => {
                // loadingSpinner.show();
            },
            onSettled: () => {
                // loadingSpinner.hide();
            }
        }
    );

    /** 진행현황 HTML 테이블 조회 */
    const getSurveyProgressStyled = useMutation(
        async (payload) => await api.post(payload, "/survey-progress/styled", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: (vars) => {
                // loadingSpinner.show();
            },
            onSettled: () => {
                // loadingSpinner.hide();
            }
        }
    );

    /** 진행현황 차트 데이터 조회 */
    const getSurveyProgressChartData = useMutation(
        async (payload) => await api.post(payload, "/survey-progress/chart-data", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: (vars) => {
                // loadingSpinner.show();
            },
            onSettled: () => {
                // loadingSpinner.hide();
            }
        }
    );

    /** 진행현황 엑셀 다운로드 (export) */
    const exportSurveyProgressXlsx = useMutation(
        async (payload) => await api.post(payload, "/survey-progress/xlsx-export", "API_BASE_URL_DATASTATUS")
    );

    /** 실사관리 대시보드(페이지) 목록 조회 */
    const pageList = useMutation(
        async (data) => await api.post(data, "/survey-progress/list", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => {
                loadingSpinner.show();
            },
            onSettled: () => {
                loadingSpinner.hide();
            }
        }
    );

    return {
        getOverviewList,
        getOverviewData,
        getSurveyProgressStyled,
        getSurveyProgressChartData,
        exportSurveyProgressXlsx,
        pageList
    };
}

export { FieldProgressPageApi as FrequencyAnalysisPageApi };
