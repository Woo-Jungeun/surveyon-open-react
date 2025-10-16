import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

/**
 *  API KEY 등록 > API
 *
 * @author jewoo
 * @since 2025-10-02<br />
 */
export function ProKeyApi() {

    const loadingSpinner = useContext(loadingSpinnerContext);

    // api key 조회, 등록 API
    const proKeyData = useMutation(
        async (data) => await api.post(data?.params, "/pro_key_api.aspx"),
        {
            onMutate: (vars) => {
              // gb 값이 api_useyn_update일 경우 로딩바 표시하지 않음
              const gbValue = vars?.params?.gb;
              if (gbValue !== "api_useyn_update") {
                loadingSpinner.show();
              }
            },
            onSettled: (data, error, vars) => {
              // gb값이 api_useyn_update가 아닐 때만 닫기
              const gbValue = vars?.params?.gb;
              if (gbValue !== "api_useyn_update") {
                loadingSpinner.hide();
              }
            },
          }
        );

    return {
        proKeyData
    };
}
