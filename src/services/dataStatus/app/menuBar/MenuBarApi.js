import { useMutation, useQuery } from "react-query";
import api from "@/common/queries/Api.js";

export function MenuBarApi() {

    /** 페이지 메타데이터 조회 */
    const getPageMetadata = useMutation(
        async (data) => await api.post(data, "/pages/get", "API_BASE_URL_DATASTATUS")
    );

    /** 데이터 정보 조회 (최종 업데이트 시간 포함) */
    const getDataInfo = useMutation(
        async (data) => await api.post(data, "/data/info", "API_BASE_URL_DATAMANAGEMENT")
    );

    /** 데이터 맵 새로고침 */
    const syncMap = useMutation(
        async (data) => await api.post(data, "/data/sync", "API_BASE_URL_DATAMANAGEMENT")
    );

    return {
        getPageMetadata,
        getDataInfo,
        syncMap
    };
}
