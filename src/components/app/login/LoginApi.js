import api from "@/common/queries/Api.js";
import { useDispatch } from "react-redux";
import { encryptText } from "@/config/axios/Encrypt.jsx";
import { useMutation } from "react-query";
import { login } from "@/common/redux/action/AuthAction";
import { useCookies  } from 'react-cookie';
import { jwtDecode } from "jwt-decode";
import {persistor} from "@/common/redux/store/StorePersist.jsx";
import {useContext} from "react";
import {modalContext} from "@/components/common/Modal.jsx";

export function LoginApi() {
    const dispatch = useDispatch();
    const [, setCookie, removeCookie] = useCookies();
    const modal = useContext(modalContext);

    /**
     * 로그인 api
     * */
    const loginMutation = useMutation(
        async (data) => {
            /*encryptText 적용*/
            const publicKey = await api.publicKey();

            return await api.post({
                id: data?.id,
                password: encryptText(publicKey, data?.password)
            }, "/v1/login");
        },
        {
            onSuccess: async (res, v) => {
                if (res.status === "NS_OK") {
                    dispatch(login({
                        userId: jwtDecode(res?.item?.refreshToken)?.sub,
                        userNm: jwtDecode(res?.item?.refreshToken)?.name || '',
                        userAuth: jwtDecode(res?.item?.refreshToken)?.auth || ''
                    }));
                    setCookie("GS_RFT", btoa(res?.item?.refreshToken), {path: "/"});
                }else if(res.status === "NS_ER_AT_02") {
                    modal.showErrorAlert(res.status, "중복 로그인이 감지되었습니다.");
                }
                ({...res});
                v?.options?.onSuccess?.();
            },
            onError: (_, v) => {
                v?.options?.onError?.();
            },
        }
    );

    /**
     * 로그인 id 별 메뉴 권한 api 
     * */
    const loginMenuAuthMutation = useMutation(
        async () => {
            return await api.post({}, "/v1/menu-authority/search");
        },
        {
            onSuccess: (res, v) => {
                if(res.status === "NS_ER_AT_02") {
                    modal.showErrorAlert(res.status, "중복 로그인이 감지되었습니다.");
                }
                ({ ...res });
                v?.options?.onSuccess?.();
            },
            onError: (_, v) => {
                v?.options?.onError?.();
            },
        }
    );

    /**
     * 로그아웃 api
     * */
    const logoutMutation = useMutation(
        async () => {
            return await api.post({}, "/v1/logout");
        },
        {
            onSuccess: (res, v) => {
                v?.options?.onSuccess?.();
            },
            onError: (_, v) => {
                v?.options?.onError?.();
            },
        }
    );

    /**
     * 비밀번호 변경 api
     * */
    const updatePasswordMutation = useMutation(
        async (data) => {
            /*encryptText 적용*/
            const publicKey = await api.publicKey();

            return await api.post({
                userId: data?.userId,
                password: encryptText(publicKey, data?.password),
                newPassword1: encryptText(publicKey, data?.newPassword1),
                newPassword2: encryptText(publicKey, data?.newPassword2)
            }, "/v1/operator/password/modify");
        },
        {
            onSuccess: async (res, v) => {
                v?.options?.onSuccess?.();
                if (res.status === "NS_OK") {
                    const resultData = await logoutMutation.mutateAsync()
                    if (resultData.status === "NS_OK") {
                        await persistor.purge();
                        removeCookie("GS_RFT", {path: '/'});
                    }
                    modal.showAlert("알림", "비밀번호를 변경하였습니다. 다시 로그인 해주세요.");
                } else if (res.status === "NS_ER_AT_05") {
                   // modal.showAlert("알림", "기존 비밀번호를 확인해주세요.");
                    modal.showErrorAlert(res.status, "기존 비밀번호를 확인해주세요.");
                } else {
                    modal.showErrorAlert(res.status, "비밀번호를 변경하지 못했습니다. 다시한번 시도해주세요."); //오류 팝업 표출
                }
            },
            onError: (_, v) => {
                v?.options?.onError?.();
            },
        }
    );

    /**
     * 내 정보 조회 api
     * */
    const getMyInfoMutation = useMutation(
        async (data) => {
            return await api.post({}, "/v1/operator/my-information/search");
        },
        {
            onSuccess: (res, data) => {
            },
        }
    );

    /**
     * 내 정보 수정 api
     * */
    const updateMyInfoMutation = useMutation(
        async (data) => {
            return await api.post(data, "/v1/operator/my-information/modify");
        },
        {
            onSuccess: (res, data) => {
                //내 정보 수정 성공 시 리프레시 토큰 변경
                if (res.status === "NS_OK") {
                    if(res?.item?.refreshToken){
                        dispatch(login({
                            userId: jwtDecode(res?.item?.refreshToken)?.sub,
                            userNm: jwtDecode(res?.item?.refreshToken)?.name || '',
                            userAuth: jwtDecode(res?.item?.refreshToken)?.auth || ''
                        }));
                        setCookie("GS_RFT", btoa(res?.item?.refreshToken),{path:"/"});
                    }
                }
            },
        }
    );

    return { loginMutation, loginMenuAuthMutation, logoutMutation, updatePasswordMutation, getMyInfoMutation, updateMyInfoMutation };
}
