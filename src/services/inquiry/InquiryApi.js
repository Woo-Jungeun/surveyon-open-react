import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

export function InquiryApi() {

    const loadingSpinner = useContext(loadingSpinnerContext);



    // 문의하기 목록 조회 API
    const inquiryList = useMutation(
        async (data) => await api.post(data, "/qna/list", "API_BASE_URL_BOARD"),
        {
            onMutate: () => {
                loadingSpinner.show();
            },
            onSettled: () => {
                loadingSpinner.hide();
            }
        }
    );


    // 문의하기 상세 조회 API
    const inquiryDetail = useMutation(
        async (data) => await api.post(data, "/qna/detail", "API_BASE_URL_BOARD"),
        {
            onMutate: () => loadingSpinner.show(),
            onSettled: () => loadingSpinner.hide()
        }
    );

    // 문의하기 트랜잭션 (등록/수정/삭제)
    const inquiryTransaction = useMutation(
        async (data) => await api.post(data, "/qna", "API_BASE_URL_BOARD"),
        {
            onMutate: () => loadingSpinner.show(),
            onSettled: () => loadingSpinner.hide()
        }
    );

    return {

        inquiryList,
        inquiryDetail,
        inquiryTransaction,
    };
}
