import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";

/**
 * 권한 관리 > API
 *
 * @author jewoo
 * @since 2025-10-17<br />
 */
export function ProPermissionApi() {

    const proPermissionData = useMutation(
        async (data) => {
            const res = await api.post(data?.params, "/Project", "API_BASE_URL_PROJECT");
            if (res && res.output !== undefined && res.resultjson === undefined) {
                res.resultjson = res.output;
            }
            const detailMsg = res?.output?.message || res?.resultjson?.message;
            if (detailMsg && (!res.message || res.message === "정상 접속" || res.message === "성공")) {
                res.message = detailMsg;
            }
            return res;
        }
    );

    const pagesMembersSet = useMutation(
        async (data) => {
            const groupcode = sessionStorage.getItem("groupcode");
            const myRole = groupcode === "999999991" ? "client" : (sessionStorage.getItem("myRole") || "");
            const payload = {
                ...data?.params,
                my_role: data?.params?.my_role || myRole,
                groupcode: data?.params?.groupcode || groupcode || ""
            };
            return await api.post(payload, "/pages/members/set", "API_BASE_URL_DATASTATUS");
        }
    );

    const pagesMembersList = useMutation(
        async (data) => {
            const groupcode = sessionStorage.getItem("groupcode");
            const myRole = groupcode === "999999991" ? "client" : (sessionStorage.getItem("myRole") || "");
            const payload = {
                ...data?.params,
                role: data?.params?.role || myRole,
                groupcode: data?.params?.groupcode || groupcode || ""
            };
            return await api.post(payload, "/pages/members/list", "API_BASE_URL_DATASTATUS");
        }
    );

    const pagesMembersDelete = useMutation(
        async (data) => await api.post(data?.params, "/pages/members/delete", "API_BASE_URL_DATASTATUS")
    );

    return {
        proPermissionData,
        pagesMembersSet,
        pagesMembersList,
        pagesMembersDelete
    };
}
