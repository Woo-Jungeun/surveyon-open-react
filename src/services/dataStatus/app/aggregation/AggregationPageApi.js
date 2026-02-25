import { useMutation, useQuery } from "react-query";
import api from "@/common/queries/Api.js";

export function AggregationPageApi() {
    /** 문항 목록 조회 (예시) */
    const getVariableList = useMutation(
        async () => await api.post({}, "/pages/be30866e-b079-44b3-a26c-ad75f89c5134/variables/recoded", "API_BASE_URL_DATASTATUS")
    );

    /** 선택된 문항에 대한 데이터 조회 */
    const getAggregationData = useMutation(
        async (payload) => await api.post(payload, "/datasets/overview", "API_BASE_URL_DATASTATUS")
    );

    return {
        getVariableList,
        getAggregationData,
    };
}
