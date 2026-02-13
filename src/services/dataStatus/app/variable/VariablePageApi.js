import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

export function VariablePageApi() {

    const loadingSpinner = useContext(loadingSpinnerContext);

    /** 원본 변수 목록 조회 */
    const getOriginalVariables = useMutation(
        async (data) => await api.post(data, "/pages/variables", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: (vars) => {
                // loadingSpinner.show();
            }
        }
    );

    /** 페이지 목록 조회 */
    const pageList = useMutation(
        async (data) => await api.post(data, "/pages/list", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => {
                loadingSpinner.show();
            }
        }
    );

    return {
        getOriginalVariables,
        pageList
    };
}
