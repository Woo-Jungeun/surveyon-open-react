import { useMutation } from "react-query";
import api from "@/common/queries/Api.js";
import { useContext } from "react";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

export function BoardApi() {

    const loadingSpinner = useContext(loadingSpinnerContext);

    // 공지사항 Top5 조회 API
    const top5Notices = useMutation(
        async () => await api.post({}, "/notice/top5", "API_BASE_URL_BOARD"),
        {
            onMutate: () => {
                // loadingSpinner.show();
            },
            onSettled: () => {
                // loadingSpinner.hide();
            }
        }
    );

    // 패치노트 Top5 조회 API
    const top5PatchNotes = useMutation(
        async () => await api.post({}, "/patchnotes/top5", "API_BASE_URL_BOARD"),
        {
            onMutate: () => {
                // loadingSpinner.show();
            },
            onSettled: () => {
                // loadingSpinner.hide();
            }
        }
    );

    // 공지사항 목록 조회 API
    const noticeList = useMutation(
        async () => await api.post({}, "/notice/list", "API_BASE_URL_BOARD"),
        {
            onMutate: () => {
                loadingSpinner.show();
            },
            onSettled: () => {
                loadingSpinner.hide();
            }
        }
    );

    // 패치노트 목록 조회 API
    const patchNotesList = useMutation(
        async () => await api.post({}, "/patchnotes/list", "API_BASE_URL_BOARD"),
        {
            onMutate: () => {
                loadingSpinner.show();
            },
            onSettled: () => {
                loadingSpinner.hide();
            }
        }
    );

    // 공지사항 상세 조회 API
    const noticeDetail = useMutation(
        async (data) => await api.post(data, "/notice/detail", "API_BASE_URL_BOARD"),
        {
            onMutate: () => loadingSpinner.show(),
            onSettled: () => loadingSpinner.hide()
        }
    );

    // 패치노트 상세 조회 API
    const patchNotesDetail = useMutation(
        async (data) => await api.post(data, "/patchnotes/detail", "API_BASE_URL_BOARD"),
        {
            onMutate: () => loadingSpinner.show(),
            onSettled: () => loadingSpinner.hide()
        }
    );

    return {
        top5Notices,
        top5PatchNotes,
        noticeList,
        patchNotesList,
        noticeDetail,
        patchNotesDetail
    };
}
