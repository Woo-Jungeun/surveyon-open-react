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
        async (data) => await api.post(data?.params, "/pro_permission_api.aspx", "EX_API_BASE_URL")
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
