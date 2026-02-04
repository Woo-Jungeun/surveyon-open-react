import { useMutation, useQuery } from "react-query";
import api from "@/common/queries/Api.js";

export function CrossTabPageApi() {

    /** 교차테이블 목록 조회 */
    const getCrossTabList = useMutation(
        async (data) => await api.post(data, "/tables/list", "API_BASE_URL_DATASTATUS")
    );

    /** 선택 교차테이블 데이터 조회 */
    const getCrossTabData = useMutation(
        async (data) => await api.post(data, "/tables/get", "API_BASE_URL_DATASTATUS")
    );

    /** 교차테이블 저장 */
    const saveCrossTable = useMutation(
        async (data) => await api.post(data, "/tables/set", "API_BASE_URL_DATASTATUS")
    );

    /** 교차테이블 삭제 */
    const deleteCrossTable = useMutation(
        async (data) => await api.post(data, "/tables/delete", "API_BASE_URL_DATASTATUS")
    );

    /** 교차테이블 분석 실행 */
    const evaluateTable = useMutation(
        async (data) => await api.post(data, "/analysis/evaluate-table", "API_BASE_URL_DATASTATUS")
    );

    return {
        getCrossTabList,
        getCrossTabData,
        saveCrossTable,
        deleteCrossTable,
        evaluateTable
    };
}
