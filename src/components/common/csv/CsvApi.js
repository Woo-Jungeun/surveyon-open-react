import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";

/**
 * csv 다운로드 API
 *
 * @author jewoo
 * @since 2024-08-06<br />
 */
export function CsvApi(type) {

    const csvDownLoadMutation = useMutation(
        async (data) => {
            /*csv 파일 다운로드*/
            return await api.file(data, `/v1/${type}/csv/download`);
        },
        {
            onSuccess: (res, req) => {
            },
            onSettled: (data, error, variables, context) => {
            }
        }
    );

    return {
        csvDownLoadMutation
    };
}