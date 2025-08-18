import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";

/**
 * 엑셀 다운로드 API
 *
 * @author jewoo
 * @since 2024-06-05<br />
 */
export function ExcelApi(type) {

    const excelDownLoadMutation = useMutation(
        async (data) => {
            /*엑셀 파일 다운로드*/
            return await api.file(data, `/v1/${type}/excel/download`);
        },
        {
            onSuccess: (res, req) => {

            },
            onSettled: (data, error, variables, context) => {
                // console.log("onSettled", data, error, variables, context);
            }
        }
    );

    return {
        excelDownLoadMutation
    };
}