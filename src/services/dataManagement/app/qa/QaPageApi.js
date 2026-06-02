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

    /** 구조화 문서 데이터 조회 - parsed-document (Pn, User) */
    const getParsedDocument = useMutation(
        async (data) => await api.post(data, "/qa/parsed-document", "API_BASE_URL_DATAMANAGEMENT"),
    );

    /** 구조화 문서 로직 검증 - validate-document (pn, user) */
    const validateDocument = useMutation(
        async (data) => await api.post(data, "/qa/validate-document", "API_BASE_URL_DATAMANAGEMENT"),
    );

    return { analyzeAll, getParsedDocument, validateDocument };
}
