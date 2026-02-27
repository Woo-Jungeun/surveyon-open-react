import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

export function MapManagementPageApi() {

    const loadingSpinner = useContext(loadingSpinnerContext);

    /** 맵 관리 조회 */
    const getMapVariables = useMutation(
        async (data) => await api.post(data, "/read", "API_BASE_URL_DATAMANAGEMENT"),
        {
            onMutate: (vars) => {
                // loadingSpinner.show();
            }
        }
    );

    /** 맵 관리 저장 (수정/삭제) */
    const updateMapVariables = useMutation(
        async (data) => await api.post(data, "/map/variables/update", "API_BASE_URL_DATAMANAGEMENT"),
        {
            onMutate: () => loadingSpinner.show(),
            onSettled: () => loadingSpinner.hide(),
        }
    );

    return {
        getMapVariables,
        updateMapVariables
    };
}
