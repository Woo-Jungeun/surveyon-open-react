import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

export function SurveyTestPageApi() {
    const loadingSpinner = useContext(loadingSpinnerContext);

    /** 통합 QA 분석 - multipart/form-data (Pn, DocumentFile, User) */
    const analyzeAll = useMutation(
        async (data) => await api.post(data, "/QA/analyze-all", "API_BASE_URL_DATAMANAGEMENT"),
        // {
        //     onMutate: () => loadingSpinner.show(),
        //     onSettled: () => loadingSpinner.hide(),
        // }
    );

    return { analyzeAll };
}
