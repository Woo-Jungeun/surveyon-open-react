import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";

export const FileApi = () => {
    const downloadFileMutation = useMutation(
        async (data) => {
            return await api.file(data, "/v1/file/download");
        },
        {
            onSuccess: (res, req) => {
                //do...
            }
        }
    );

    return { downloadFileMutation };
};
