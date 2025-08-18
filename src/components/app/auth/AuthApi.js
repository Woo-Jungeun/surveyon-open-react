import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";

export function AuthApi() {
    const getAuthMutation = useMutation(
        async (data) => {
            return await api.post(data, "/v1/authority/search");
        },
        {
            onSuccess: (res, req) => {
                //do...
            }
        }
    );

    /*운영자ID(콤보, 중복) 조회*/
    const getAuthUserIdMutation = useMutation(
        async (data) => {
            return await api.post(data, "/v1/combo/authority-id/search");
        },
        {
            onSuccess: (data, variables, context) => {
                //do...
            }
        }
    );

    return {
        getAuthMutation,
        getAuthUserIdMutation
    };
}
