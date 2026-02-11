import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useCookies } from "react-cookie";
import { List, FileText, BarChart3, Database, BrainCircuit, Users, Sparkles, BookOpen, Settings, UserCog } from "lucide-react";
import Sidebar from "@/components/common/sidebar/Sidebar";
import { modalContext } from "@/components/common/Modal.jsx";
import { MenuBarApi } from "./MenuBarApi";
import "@/assets/css/aiCharge.css"; // Ensure styles are available

const AiSidebar = ({ onOpenProjectModal }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const auth = useSelector((store) => store.auth);
    const userGroup = auth?.user?.userGroup || "";
    const userAuth = auth?.user?.userAuth || "";
    const roleSource = userAuth || userGroup;
    const isAiSolutionTeam = userGroup === "AI솔루션팀";
    const manage = ["고객", "일반"].some(role => roleSource.includes(role)); // Not admin roles

    const modal = useContext(modalContext);
    const { getTokenUsage, getChargeCost, updateChargeCost } = MenuBarApi();

    const [balance, setBalance] = useState(null);
    const [chargeInput, setChargeInput] = useState("");

    // Project Info from Session
    const projectnum = sessionStorage.getItem("projectnum");
    const projectname = sessionStorage.getItem("projectname");
    const qnum = sessionStorage.getItem("qnum");

    // 문항 목록 페이지에서는 분석 메뉴 숨김
    const isOnProList = location.pathname.includes("/pro_list");

    // Fetch Balance
    useEffect(() => {
        const fetchBalance = async () => {
            const cachedBalance = sessionStorage.getItem("openai_balance");
            if (cachedBalance !== null && cachedBalance !== undefined) {
                setBalance(cachedBalance);
                return;
            }
            try {
                const res = await getTokenUsage.mutateAsync({ apigubun: "openai", user: auth?.user?.userId });
                if (res?.success === "777") {
                    const bal = res.resultjson?.balancecost;
                    setBalance(bal);
                    sessionStorage.setItem("openai_balance", bal);
                }
            } catch (e) {
                console.error("Failed to fetch OpenAI balance", e);
            }
        };

        if (auth?.isLogin) {
            fetchBalance();
        }
    }, [auth?.isLogin]);


    // AI Solution Team Charge Cost
    useEffect(() => {
        const fetchChargeCost = async () => {
            try {
                const res = await getChargeCost.mutateAsync({ apigubun: "openai", user: auth?.user?.userId });
                if (res?.success === "777") {
                    setChargeInput(res.resultjson?.chargecost || "");
                }
            } catch (e) {
                console.error("Failed to fetch charge cost", e);
            }
        };

        if (auth?.isLogin && isAiSolutionTeam) {
            fetchChargeCost();
        }
    }, [auth?.isLogin, isAiSolutionTeam]);

    // Handle Charge Update
    const handleUpdateCharge = async () => {
        if (!chargeInput) {
            modal.showAlert("알림", "충전 금액을 입력해주세요.");
            return;
        }
        try {
            const res = await updateChargeCost.mutateAsync({
                chargecostInput: Number(chargeInput),
                apigubun: "openai"
            });
            if (res?.success === "777") {
                modal.showAlert("알림", "충전 금액이 업데이트되었습니다.");
                getTokenUsage.mutateAsync({ apigubun: "openai", user: auth?.user?.userId }).then((res) => {
                    if (res?.success === "777") {
                        const bal = res.resultjson?.balancecost;
                        setBalance(bal);
                        sessionStorage.setItem("openai_balance", bal);
                    }
                });
            } else {
                modal.showAlert("알림", "업데이트에 실패했습니다.");
            }
        } catch (e) {
            console.error("Failed to update charge cost", e);
            modal.showAlert("알림", "업데이트 중 오류가 발생했습니다.");
        }
    };

    // Extra Actions Component (Balance Display)
    const BalanceCard = () => (
        <div className="ai-balance-card-container" style={{ padding: '0 16px 16px 16px' }}>
            {isAiSolutionTeam && (
                <div className="ai-charge-manage" style={{ marginBottom: '12px' }}>
                    <div className="ai-charge-input-wrapper">
                        <span className="ai-charge-currency">누적액 $</span>
                        <input
                            type="number"
                            className="ai-charge-input"
                            value={chargeInput}
                            onChange={(e) => setChargeInput(e.target.value)}
                            placeholder="0.00"
                        />
                    </div>
                    <button type="button" className="ai-charge-btn" onClick={handleUpdateCharge}>
                        업데이트
                    </button>
                </div>
            )}
            <div className="ai-balance-chip" style={{ width: '100%', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} className="ai-balance-icon" />
                    <span className="ai-balance-label">OPEN AI 잔액</span>
                </div>
                <span className="ai-balance-value">약 ${Number(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
        </div>
    );

    // Module Switcher Items
    const moduleItems = [

        { label: "설문제작", icon: <FileText />, path: "/project/pro_list", isDisabled: true },
        { label: "데이터현황", icon: <BarChart3 />, path: "/data_status" },
        { label: "데이터관리", icon: <Database />, path: "/data_status", isDisabled: true },
        { label: "AI오픈분석", icon: <BrainCircuit />, path: "/ai_open_analysis", highlight: true }, // Current App Highlighted
        { label: "응답자관리", icon: <Users />, path: "/project", isDisabled: true },
    ];

    // Menu Groups
    const menuGroups = [];

    // 1. Project List - REMOVED

    // 2. Current Project Actions (Only if project selected)
    if (projectnum && projectname) {
        menuGroups.push({
            label: "분석 설정",
            defaultOpen: true,
            items: [

                {
                    label: "문항 목록",
                    path: "/ai_open_analysis/pro_list",
                    icon: FileText,
                    isActive: (path) => path.includes("/pro_list"),
                    onClick: () => {
                        sessionStorage.setItem("qnum", "");
                        sessionStorage.setItem("project_lock", "");
                    }
                },
                ...(qnum && !isOnProList ? [{
                    label: "분석",
                    path: "/ai_open_analysis/option_setting",
                    icon: BrainCircuit,
                    isActive: (path) => path.includes("/option_setting")
                }] : []),
            ]
        });
    }



    // 4. Admin/Utils
    const adminItems = [];
    if (!manage) {
        adminItems.push({ label: "권한 관리", path: "/ai_open_analysis/pro_permission", icon: UserCog });
        // adminItems.push({ label: "API 설정", path: "/ai_open_analysis/pro_key", icon: Settings });
    }

    // Always add Manual
    adminItems.push({
        label: "매뉴얼",
        icon: BookOpen,
        onClick: () => window.open("/manual", "manual", "width=1280,height=900,scrollbars=yes")
    });

    if (isAiSolutionTeam) {
        adminItems.push({ label: "토큰 사용 내역", path: "/ai_open_analysis/token_usage", icon: BarChart3 });
    }

    if (adminItems.length > 0) {
        menuGroups.push({
            label: "관리 및 지원",
            items: adminItems
        });
    }


    const handleBrandClick = () => {
        sessionStorage.setItem("projectnum", "");
        sessionStorage.setItem("projectname", "");
        sessionStorage.setItem("servername", "");
        sessionStorage.setItem("projectpof", "");
        sessionStorage.setItem("merge_pn", "");
        sessionStorage.setItem("merge_pn_text", "");
        sessionStorage.setItem("qnum", "");
        sessionStorage.setItem("project_lock", "");
        sessionStorage.setItem("userPerm", "");
        navigate("/ai_open_analysis");
    };

    const projectInfo = {
        title: projectname || "조사명 없음",
        subTitle: projectnum || "ID 미지정",
        onSettingsClick: onOpenProjectModal
    };

    return (
        <Sidebar
            brand={{
                title: "오픈분석",
                logoText: "AI",
                logoClass: "brand-title",
                onClick: handleBrandClick,
                // Using text logo based on Sidebar logic
            }}
            menuGroups={menuGroups}
            moduleItems={moduleItems}
            projectInfo={projectInfo}
            readOnly={false}
            theme="orange" // Or maybe stick to purple as default
            bottomActions={<BalanceCard />}
        />
    );
};

export default AiSidebar;
