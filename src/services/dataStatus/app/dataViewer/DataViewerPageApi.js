import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";


export function DataViewerPageApi() {
    const loadingSpinner = useContext(loadingSpinnerContext);

    /** 전체 데이터 행 조회 */
    const getPageRows = useMutation(
        async (data) => await api.post(data, "/pages/rows", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: (vars) => {
                loadingSpinner.show();
            },
            onSettled: () => {
                loadingSpinner.hide();
            }
        }
    );

    return {
        getPageRows
    };
}
