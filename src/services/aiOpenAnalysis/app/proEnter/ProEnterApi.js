import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import axios from "axios";

/**
 *  프로젝트 등록 > API
 *
 * @author jewoo
 * @since 2025-09-24<br />
 */
export function ProEnterApi() {

    const loadingSpinner = useContext(loadingSpinnerContext);

    // 데이터 조회 API
    const proEnterData = useMutation(
        async (data) => await api.post(data.params, "/project", "API_BASE_URL_OPENAI"),
        {
            onMutate: (vars) => {
                loadingSpinner.show();
            },
            onSettled: () => {
                loadingSpinner.hide();
            }
        }
    );
    // 보기 등록 API
    const proEnterSaveData = useMutation(
        async (data) => await api.post(data, "/project", "API_BASE_URL_OPENAI"),
        {
            onMutate: (vars) => {
                loadingSpinner.show();
            },
            onSettled: () => {
                loadingSpinner.hide();
            }
        }
    );

    // POF 조회 API (h-pro api : Vite 프록시 경유)
    const getPofInfo = useMutation(
        async (pofNumber) => {
            const url = `/api/pofInfo?pofNumber=${pofNumber}`;
            const res = await axios.post(url, {}, {
                headers: {
                    'apikey': 'xDhxuxOyYA11l8GOKT1D7ixLMM5nriduk3Wx8j7YadswCPii8P35DMEQE9i7ALElIQaM/DT9OELQM3oYx+MatQLiRYU1hlFM+b0k9t/+hbc='
                }
            });
            return res.data;
        },
        {
            onMutate: () => { },
            onSettled: () => { }
        }
    );

    return {
        proEnterData,
        proEnterSaveData,
        getPofInfo
    };
}
