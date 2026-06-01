import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

export function QaPageApi() {
    const loadingSpinner = useContext(loadingSpinnerContext);

    /** 통합 QA 분석 - setup-from-document (pn, documentFile, user, modelType) */
    const analyzeAll = useMutation(
        async (data) => await api.post(data, "/qa/setup-from-document", "API_BASE_URL_DATAMANAGEMENT"),
    );

    return { analyzeAll };
}
