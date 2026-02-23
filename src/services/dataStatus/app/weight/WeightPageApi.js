import { useMutation, useQuery } from "react-query";
import { useContext } from "react";
import api from "@/common/queries/Api.js";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

export function WeightPageApi() {
    const loadingSpinner = useContext(loadingSpinnerContext);

    // 가중치 문항 상세 정보 조회
    const getWeightVariable = useMutation(
        async (data) => await api.post(data, "/weight/get", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => loadingSpinner.show(),
            onSettled: () => loadingSpinner.hide()
        }
    );

    // "현재 분포" 교차분석표 산출 및 조회
    const evaluateTable = useMutation(
        async (data) => await api.post(data, "/analysis/evaluate/table", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => loadingSpinner.show(),
            onSettled: () => loadingSpinner.hide()
        }
    );

    // 가중치 문항 삭제
    const deleteWeight = useMutation(
        async (data) => await api.post(data, "/weight/delete", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => loadingSpinner.show(),
            onSettled: () => loadingSpinner.hide()
        }
    );

    // 신규 가중치 문항 생성 및 수정
    const setWeight = useMutation(
        async (data) => await api.post(data, "/weight/set", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => loadingSpinner.show(),
            onSettled: () => loadingSpinner.hide()
        }
    );

    return {
        getWeightVariable,
        evaluateTable,
        deleteWeight,
        setWeight,
    };
}
