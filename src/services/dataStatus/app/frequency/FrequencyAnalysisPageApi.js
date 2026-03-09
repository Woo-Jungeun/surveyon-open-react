import { useMutation, useQuery } from "react-query";
import api from "@/common/queries/Api.js";

import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

export function FrequencyAnalysisPageApi() {

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

    return {
        getOverviewList,
        getOverviewData
    };
}
