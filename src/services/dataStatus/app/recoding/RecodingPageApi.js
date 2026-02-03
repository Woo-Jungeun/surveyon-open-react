import { useMutation, useQuery } from "react-query";
import api from "@/common/queries/Api.js";

export function RecodingPageApi() {

    /** recoded 변수 목록 조회 */
    const getRecodedVariables = useMutation(
        async (data) => await api.post(data, "/pages/variables/recoded/get", "API_BASE_URL_DATASTATUS")
    );

    /** recoded 변수 저장/수정 */
    const setRecodedVariable = useMutation(
        async (data) => await api.post(data, "/pages/variables/recoded/set", "API_BASE_URL_DATASTATUS")
    );

    /** recoded 변수 삭제 */
    const deleteRecodedVariable = useMutation(
        async (data) => await api.post(data, "/pages/variables/recoded/delete", "API_BASE_URL_DATASTATUS")
    );

    /** 로직 체크 */
    const verifyRecodeLogic = useMutation(
        async (data) => await api.post(data, "/analysis/evaluate-table", "API_BASE_URL_DATASTATUS")
    );

    return {
        getRecodedVariables,
        setRecodedVariable,
        deleteRecodedVariable,
        verifyRecodeLogic
    };
}
