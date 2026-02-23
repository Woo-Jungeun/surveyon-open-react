import { useMutation, useQuery } from "react-query";
import { useContext } from "react";
import api from "@/common/queries/Api.js";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

export function WeightPageApi() {
    const loadingSpinner = useContext(loadingSpinnerContext);

    /** 문항 목록 조회 (예시) */
    const getVariableList = useMutation(
        async () => await api.post({}, "/pages/be30866e-b079-44b3-a26c-ad75f89c5134/variables/recoded", "API_BASE_URL_DATASTATUS")
    );

    const getWeightVariable = useMutation(
        async (data) => await api.post(data, "/weight/get", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => loadingSpinner.show(),
            onSettled: () => loadingSpinner.hide()
        }
    );

    return {
        getVariableList,
        getWeightVariable,
    };
}
