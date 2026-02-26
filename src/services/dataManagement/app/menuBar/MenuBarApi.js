import { useMutation, useQuery } from "react-query";
import api from "@/common/queries/Api.js";

export function MenuBarApi() {

    /** 페이지 메타데이터 조회 */
    const getPageMetadata = useMutation(
        async (data) => await api.post(data, "/pages/get", "API_BASE_URL_DATASTATUS")
    );

    return {
        getPageMetadata
    };
}
