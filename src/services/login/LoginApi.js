import api from "@/common/queries/Api.js";
import { useDispatch } from "react-redux";
import { useMutation } from "react-query";
import { login } from "@/common/redux/action/AuthAction";
import { useCookies } from 'react-cookie';
import { useContext } from "react";
import { modalContext } from "@/components/common/Modal.jsx";
import { AES256 } from "@/common/utils/AES256"
import { useNavigate, useLocation } from "react-router-dom";

export function LoginApi() {
    const dispatch = useDispatch();
    const [, setCookie] = useCookies();
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
            return await api.post(payload, "/Login/check");
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
            },
            onError: (err, v) => {
                modal?.showErrorAlert?.("NETWORK", "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
            },
            onMutate: () => {
            },
            onSettled: () => {
            },

        }
    );

    /**
     * 로그아웃 api
     * */
    const logoutMutation = useMutation(
        async (payload) => await api.post(payload, "/pro_login_api.aspx"),
        {
            onSuccess: (res, v) => {
                v?.options?.onSuccess?.();
            },
            onError: (_, v) => {
                v?.options?.onError?.();
            },
        }
    );


    return { loginMutation, logoutMutation };
}
