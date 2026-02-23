import { useMutation, useQuery } from "react-query";
import { useContext } from "react";
import api from "@/common/queries/Api.js";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

export function WeightPageApi() {
    const loadingSpinner = useContext(loadingSpinnerContext);

    const getWeightVariable = useMutation(
        async (data) => await api.post(data, "/weight/get", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => loadingSpinner.show(),
            onSettled: () => loadingSpinner.hide()
        }
    );

    const evaluateTable = useMutation(
        async (data) => await api.post(data, "/analysis/evaluate/table", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => loadingSpinner.show(),
            onSettled: () => loadingSpinner.hide()
        }
    );

    const deleteWeight = useMutation(
        async (data) => await api.post(data, "/weight/delete", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => loadingSpinner.show(),
            onSettled: () => loadingSpinner.hide()
        }
    );

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
