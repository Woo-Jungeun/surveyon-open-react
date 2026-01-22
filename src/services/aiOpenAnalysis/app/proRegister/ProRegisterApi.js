import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

/**
 *  문항 등록 > API
 *
 * @author jewoo
 * @since 2025-10-15<br />
 */
export function ProRegisterApi() {

    const loadingSpinner = useContext(loadingSpinnerContext);

    // 데이터 조회 API
    const proRegisterMutation = useMutation(
        async (data) => await api.post(data.params, "/pro_register_api.aspx", "EX_API_BASE_URL"),
        {
            onMutate: (data) => {
                //gb 값이 db_enter일 때만 멘트 지정
                const gb = data?.params?.gb;
                if (gb === "db_enter") {
                    loadingSpinner.show({
                        content: "모든 문항을 체크 중입니다. 시간이 다소 걸릴 수 있습니다.",
                    });
                } else {
                    loadingSpinner.show(); // 기본 문구 유지
                }
            },
            onSettled: () => {
                loadingSpinner.hide();
            },
        }
    );

    // 샘플 다운로드 
    const sampleDownloadData = useMutation(
        async (data) => await api.file(data, "/pro_register_api.aspx", "EX_API_BASE_URL"),
        {
            onMutate: (vars) => {
                //loadingSpinner.show(); 
            },
            onSettled: () => {
                //loadingSpinner.hide(); 
            }
        }
    );


    return {
        proRegisterMutation,
        sampleDownloadData
    };
}
