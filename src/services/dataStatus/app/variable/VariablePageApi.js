import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

export function VariablePageApi() {

    const loadingSpinner = useContext(loadingSpinnerContext);

    /** 문항관리 목록 조회 */
    const getOriginalVariables = useMutation(
        async (data) => await api.post(data, "/datasets/variables", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: (vars) => {
                // loadingSpinner.show();
            }
        }
    );

    /** 대시보드 목록 조회 */
    const pageList = useMutation(
        async (data) => await api.post(data, "/pages/list", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => {
                loadingSpinner.show();
            },
            onSettled: () => {
                loadingSpinner.hide();
            }
        }
    );

    /** 대시보드 목록 수정, 추가 */
    const pageSet = useMutation(
        async (data) => await api.post(data, "/pages/set", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => {
                loadingSpinner.show();
            },
            onSettled: () => {
                loadingSpinner.hide();
            }
        }
    );

    /** 대시보드 삭제 */
    const pageDelete = useMutation(
        async (data) => await api.post(data, "/pages/delete", "API_BASE_URL_DATASTATUS"),
        {
            onMutate: () => {
                loadingSpinner.show();
            },
            onSettled: () => {
                loadingSpinner.hide();
            }
        }
    );

    return {
        getOriginalVariables,
        pageList,
        pageSet,
        pageDelete
    };
}
