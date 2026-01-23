import { useMutation, useQuery } from "react-query";
import api from "@/common/queries/Api.js";

export function MenuBarApi() {
    /** OpenAI 잔액 조회 */
    const getTokenUsage = useMutation(
        async (data) => await api.post(data, "/TokenUse/list", "API_BASE_URL_OPENAI")
    );

    /** 충전 금액 조회 */
    const getChargeCost = useMutation(
        async (data) => await api.post(data, "/TokenUse/chargecostselect", "API_BASE_URL_OPENAI")
    );

    /** 충전 금액 업데이트 */
    const updateChargeCost = useMutation(
        async (data) => await api.post(data, "/TokenUse/chargecostup", "API_BASE_URL_OPENAI")
    );

    return {
        getTokenUsage,
        getChargeCost,
        updateChargeCost
    };
}
