import api from "@/common/queries/Api.js";
import { useDispatch } from "react-redux";
import { useMutation } from "react-query";
import { login } from "@/common/redux/action/AuthAction";
import { useCookies } from 'react-cookie';
import { useContext } from "react";
import { modalContext } from "@/components/common/Modal.jsx";
import { AES256 } from "@/common/utils/AES256"
import { useNavigate, useLocation } from "react-router-dom";
import { persistor } from "@/common/redux/store/StorePersist.jsx";

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
            return await api.post(payload, "/Login/check", "API_BASE_URL_OPENAI");
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
                    const originalState = location.state?.originalState;

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
                    // 2) 쿠키 저장 (로그인키 & X-Auth-Token)
                    const cookieOptions = { path: "/", sameSite: "Lax" }; // 필요시 secure:true
                    if (loginkey) {
                        setCookie("TOKEN", loginkey, cookieOptions);
                    }
                    if (res?.Token) {
                        setCookie("X-Auth-Token", res.Token, cookieOptions);
                    }

                    // 3) 모든 세팅 완료 후 navigate (isLoggedIn이 true가 된 다음 이동)
                    navigate(from, { replace: true, state: originalState });
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

    const loginCsMutation = useMutation(
        async (data) => {
            const payload = {
                user: data?.user ?? ""
            };
            return await api.post(payload, "/Login/check/cs", "API_BASE_URL_OPENAI");
        },
        {
            onSuccess: (res, v) => {
                // 성공 확인 (success: '777' 이거나 token 값이 존재할 경우)
                if (res?.success === "777" || res?.token || res?.loginkey) {
                    const originalState = location.state?.originalState;

                    // 응답에서 주요 값 추출
                    const tokenStr = res.token || res.loginkey || res.Token;
                    const projectnum = res.projectnum || "";
                    const merge_pn = res.merge_pn || "";
                    const page_id = res.page_id || "";
                    const showmenu = res.showmenu || ""; // "빈도분석,추가분석,변수생성,가중치생성"
                    const groupcode = res.groupcode || "";
                    const page_title = res.page_title || "";

                    // 프로젝트, 페이지, 권한 메뉴 정보를 세션 스토리지에 저장
                    sessionStorage.setItem("projectnum", projectnum);
                    sessionStorage.setItem("merge_pn", merge_pn);
                    sessionStorage.setItem("pageId", page_id);
                    sessionStorage.setItem("showmenu", showmenu);
                    sessionStorage.setItem("groupcode", groupcode);

                    // 임시로 화면에 보여줄 이름 설정 (응답에 projectname이 없으면 projectnum 사용)
                    if (res.projectname) sessionStorage.setItem("projectname", res.projectname);
                    else if (merge_pn) sessionStorage.setItem("projectname", merge_pn);

                    if (page_title) sessionStorage.setItem("pagetitle", page_title);

                    if (groupcode === "999999991") {
                        sessionStorage.setItem("userName", "H-SRT고객");
                    }

                    // 1) redux 저장 (식별을 위해 userGroup에 H-SRT고객 표기)
                    dispatch(
                        login({
                            userId: v?.user ?? "",
                            userNm: groupcode === "999999991" ? "H-SRT고객" : (res.username || "고객"),
                            userGroup: groupcode === "999999991" ? "H-SRT고객" : (res.groupposition || "고객"),
                        })
                    );

                    // 2) 쿠키(토큰) 저장
                    const cookieOptions = { path: "/", sameSite: "Lax" }; // 필요시 secure:true
                    if (tokenStr) {
                        setCookie("TOKEN", tokenStr, cookieOptions);
                        setCookie("X-Auth-Token", tokenStr, cookieOptions);
                    }

                    // 3) 이동 처리 (H-SRT고객은 지정된 첫 번째 권한 메뉴로 바로 이동)
                    let targetPath = "/data_status";
                    if (groupcode === "999999991" && showmenu) {
                        const firstMenuLabel = showmenu.split(",")[0].replace(/\s+/g, "");
                        const menuPathMap = {
                            "빈도분석": "/data_status/analysis/frequency",
                            "교차분석": "/data_status/analysis/cross",
                            "추가분석": "/data_status/analysis/additional",
                            "쿼터현황/관리": "/data_status/analysis/quota",
                            "AI분석": "/data_status/ai/analysis",
                            "AI리포트": "/data_status/ai/report",
                            "변수생성": "/data_status/setting/recoding",
                            "DP의뢰서정의": "/data_status/setting/dp_definition",
                            "가중치생성": "/data_status/setting/weight",
                        };
                        if (menuPathMap[firstMenuLabel]) {
                            targetPath = menuPathMap[firstMenuLabel];
                        }
                    }

                    let finalPath = targetPath;
                    if (groupcode !== "999999991") {
                        finalPath = location.state?.from || targetPath;
                    }
                    navigate(finalPath, { replace: true, state: originalState });
                } else {
                    modal?.showErrorAlert?.("에러", res?.message || "로그인 정보를 확인할 수 없습니다.");
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
        async (payload) => await api.post(payload, "/Login/logout", "API_BASE_URL_OPENAI"),
        {
            onSuccess: (res, v) => {
                removeCookie("X-Auth-Token", { path: "/" });
                localStorage.removeItem("X-Auth-Token"); // 혹시 모르니 로컬스토리지도 삭제
                sessionStorage.removeItem("openai_balance");
                v?.options?.onSuccess?.();
            },
            onError: (_, v) => {
                v?.options?.onError?.();
            },
        }
    );


    /**
     * 토큰 유효성 검사 api
     * */
    const validateToken = useMutation(
        async (data) => {
            const payload = {
                user: data?.user ?? "",
            };
            return await api.post(payload, "/Login/token/validate", "API_BASE_URL_OPENAI");
        },
        {
            onSuccess: async (res) => {
                try {
                    if (res?.errorCode === "704") {
                        // 세션 만료 또는 유효하지 않음 -> 로그아웃 처리
                        const isCustomer = sessionStorage.getItem("groupcode") === "999999991";
                        await persistor.purge();
                        removeCookie("TOKEN", { path: "/" });
                        removeCookie("X-Auth-Token", { path: "/" });
                        sessionStorage.clear();
                        if (isCustomer) sessionStorage.setItem("wasCustomer", "true");
                        navigate(isCustomer ? "/cs" : "/login");
                    }
                } catch (e) {
                    console.error("Token validation error", e);
                }
            },
            onError: async () => {
                // 에러 발생 시에도 로그아웃 처리 (보안상 안전)
                const isCustomer = sessionStorage.getItem("groupcode") === "999999991";
                await persistor.purge();
                removeCookie("TOKEN", { path: "/" });
                removeCookie("X-Auth-Token", { path: "/" });
                sessionStorage.clear();
                if (isCustomer) sessionStorage.setItem("wasCustomer", "true");
                navigate(isCustomer ? "/cs" : "/login");
            }
        }
    );

    return { loginMutation, loginCsMutation, logoutMutation, validateToken };
}
