import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import axios from "axios";

export function BoardApi() {

    const loadingSpinner = useContext(loadingSpinnerContext);

    // 데이터 조회 API
    const top5Notices = useMutation(
        async () => await api.post({}, "/notice/top5.aspx", "API_BASE_URL_BOARD"),
        {
            onMutate: (vars) => {
                loadingSpinner.show();
            },
            onSettled: () => {
                loadingSpinner.hide();
            }
        }
    );

    return {
        top5Notices
    };
}
