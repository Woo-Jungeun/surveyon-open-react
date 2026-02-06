import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

/**
 * 토큰 사용 내역 API
 *
 * @author antigravity
 * @since 2026-02-06
 */
export function TokenUsageApi() {
    const loadingSpinner = useContext(loadingSpinnerContext);

    // 토큰 내역 조회 API
    const tokenUsageListData = useMutation(
        async (data) => await api.post({
            startDate: "",
            endDate: "",
            apigubun: "openai"
        }, "/TokenCost/list", "API_BASE_URL_OPENAI"),
        {
            onMutate: () => {
                loadingSpinner.show();
            },
            onSettled: () => {
                loadingSpinner.hide();
            }
        }
    );

    return {
        tokenUsageListData
    };
}
