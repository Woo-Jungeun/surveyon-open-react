import api from "@/common/queries/Api.js";
import { useDispatch } from "react-redux";
import { encryptText } from "@/config/axios/Encrypt.jsx";
import { useMutation } from "react-query";
import { login } from "@/common/redux/action/AuthAction";
import { useCookies } from 'react-cookie';
import { jwtDecode } from "jwt-decode";
import { persistor } from "@/common/redux/store/StorePersist.jsx";
import { useContext } from "react";
import { modalContext } from "@/components/common/Modal.jsx";
import { AES256 } from "@/common/utils/AES256"
import { useNavigate, useLocation } from "react-router-dom";

export function LoginApi() {
    const dispatch = useDispatch();
    const [, setCookie, removeCookie] = useCookies();
    const modal = useContext(modalContext);
    const navigate = useNavigate();
    const location = useLocation();

    /**
     * 로그인 api
     * */
    const loginMutation = useMutation(
        async (data) => {
            const payload = {
                user: data?.user ?? "",
                pass: AES256.Crypto.encryptAES256(String(data?.pass ?? "")),    //암호화
            };
            return await api.post(payload, "/pro_login_api.aspx");
        },
        {
            onSuccess: (res, v) => {
                const parseOutput = (out) => {
                    if (!out) return null;
                    if (typeof out === "string") {
                        try { return JSON.parse(out); } catch { return null; }
                    }
                    return out;
                };
                if (res?.success === "777") {
                    const from = location.state?.from || "/";
                    navigate(from); // 이전 페이지 또는 홈으로 이동
                    // 성공 처리: 스토어/쿠키/세션 동기화
                    const out = parseOutput(res?.output);
                    const info = Array.isArray(out) ? out[0] : out || {};
                    const { username = "", groupposition = "", loginkey = "", expiration = "" } = info;

                    // 1) redux 저장
                    dispatch(
                        login({
                            userId: v?.user ?? "",       // mutate 시 넘긴 값
                            userNm: username,
                            userGroup: groupposition,
                        })
                    );
                    // 2) 쿠키 저장 (로그인키)
                    if (loginkey) {
                        setCookie("TOKEN", loginkey, { path: "/", sameSite: "Lax" }); // 필요시 secure:true
                    }
                }
                // else if (res.status === "NS_ER_AT_02") {
                //     modal.showErrorAlert(res.status, "중복 로그인이 감지되었습니다.");    //axios에서 처리
                // }

            },
            onError: (err, v) => {
                modal?.showErrorAlert?.("NETWORK", "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
                // v?.options?.onError?.(err);
            },
            onMutate: () => {
                // loadingSpinner.show();
            },
            onSettled: () => {
                // loadingSpinner.hide();
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
                if (res.status === "NS_ER_AT_02") {
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
                        removeCookie("TOKEN", { path: '/' });
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
                    if (res?.item?.refreshToken) {
                        dispatch(login({
                            userId: jwtDecode(res?.item?.refreshToken)?.sub,
                            userNm: jwtDecode(res?.item?.refreshToken)?.name || '',
                            userAuth: jwtDecode(res?.item?.refreshToken)?.auth || ''
                        }));
                        setCookie("TOKEN", btoa(res?.item?.refreshToken), { path: "/" });
                    }
                }
            },
        }
    );

    return { loginMutation, loginMenuAuthMutation, logoutMutation, updatePasswordMutation, getMyInfoMutation, updateMyInfoMutation };
}
