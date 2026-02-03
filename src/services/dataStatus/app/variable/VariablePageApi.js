import { useMutation, useQuery } from "react-query";
import api from "@/common/queries/Api.js";

export function VariablePageApi() {


    /** 원본 변수 목록 조회 */
    const getOriginalVariables = useMutation(
        async (data) => await api.post(data, "/pages/variables", "API_BASE_URL_DATASTATUS")
    );

    return {
        getOriginalVariables
    };
}
