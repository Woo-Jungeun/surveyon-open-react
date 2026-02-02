import { useMutation, useQuery } from "react-query";
import api from "@/common/queries/Api.js";

export function VariablePageApi() {
    /** 문항 목록 조회 */
    const getVariableList = useMutation(
        async (data) => await api.post(data, "/page", "API_BASE_URL_DATASTATUS")
    );


    return {
        getVariableList,
    };
}
