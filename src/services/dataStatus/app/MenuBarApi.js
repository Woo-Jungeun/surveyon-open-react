import { useMutation, useQuery } from "react-query";
import api from "@/common/queries/Api.js";

export function MenuBarApi() {
    /** OpenAI 잔액 조회 */
    const getTest = useMutation(
        async (data) => await api.post({}, "/hellow", "API_BASE_URL_DATASTATUS")
    );


    return {
        getTest,
    };
}
