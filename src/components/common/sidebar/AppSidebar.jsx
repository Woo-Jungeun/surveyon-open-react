/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import Sidebar from "./Sidebar";
import {
  Info, Database, Wrench, FileText, Target, BarChart3, Grid,
  Table, ClipboardList, Sparkles, Upload, RefreshCw, Clock, Users, BrainCircuit, ShieldCheck, Columns, LayoutDashboard, PlusCircle, FileCog, Wand2,
  Map as MapIcon, ClipboardCheck, Sparkle, Trash2
} from "lucide-react";
import { modalContext } from "@/components/common/Modal.jsx";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

// H-SRT & 데이터관리 모달 및 API
import NewDataModal from "@/services/dataStatus/app/menuBar/NewDataModal";
import ProjectSelectionModal from "@/services/dataStatus/app/menuBar/ProjectSelectionModal";
import PageListPopup from "@/services/dataStatus/app/variable/PageListPopup";
import { MenuBarApi as DataStatusMenuBarApi } from "@/services/dataStatus/app/menuBar/MenuBarApi";
import { VariablePageApi } from "@/services/dataStatus/app/variable/VariablePageApi";
import { DpRequestPageApi } from "@/services/dataStatus/app/hsrt/dpRequest/DpRequestPageApi";
import { FieldProgressPageApi } from "@/services/fieldManagement/app/fieldProgress/FieldProgressPageApi";

// AI 오픈분석 API & 스타일
import { MenuBarApi as AiMenuBarApi } from "@/services/aiOpenAnalysis/app/MenuBarApi";
import "@/assets/css/aiCharge.css";
import "@/services/dataStatus/app/menuBar/MenuBar.css";

/**
 * 설문온 통합 공통 사이드바 (AppSidebar)
 * - H-SRT (/data_status) : Blue 테마
 * - 데이터관리 (/data_management) : Green 테마
 * - AI 오픈분석 (/ai_open_analysis) : Orange 테마
 * - 실사관리 (/field_management) : Navy 테마
 * 
 * 대메뉴(서비스)별 고유 색상, 로고, 메뉴 및 전용 기능(잔액, 대시보드 선택 등)을
 * 완벽하게 유지하면서 단일 파일로 일원화 관리합니다.
 */
const AppSidebar = ({ service, onOpenProjectModal, id = "app-sidebar", ...restSidebarProps }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const modal = useContext(modalContext);
  const loadingSpinner = useContext(loadingSpinnerContext);
  const auth = useSelector((store) => store.auth);

  // 1. 서비스 모드 판별 (prop 우선, 없으면 location.pathname 기준 자동 판별)
  const currentMode = useMemo(() => {
    if (service) return service;
    const path = location.pathname;
    if (path.startsWith("/ai_open_analysis") || path.startsWith("/project")) return "aiOpen";
    if (path.startsWith("/data_management")) return "dataManagement";
    if (path.startsWith("/field_management")) return "fieldManagement";
    return "hsrt";
  }, [service, location.pathname]);

  // 권한 및 사용자 정보
  const userName = auth?.user?.userName || "";
  const userGroup = auth?.user?.userGroup || "";
  const userAuth = auth?.user?.userAuth || "";
  const groupCode = sessionStorage.getItem("groupcode") || "";
  const isAiSolutionTeam = userGroup === "AI솔루션팀";
  const isHsrtCustomer = userGroup === "H-SRT고객" || groupCode === "999999991";

  // 공통 프로젝트 정보 (세션 스토리지 기반)
  const projectnum = sessionStorage.getItem("projectnum");
  const projectname = sessionStorage.getItem("projectname");
  const mergePn = sessionStorage.getItem("merge_pn");
  const currentMyRole = sessionStorage.getItem("myRole");
  const serverName = sessionStorage.getItem("servername");

  // 모달 상태 관리
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isNewDataModalOpen, setIsNewDataModalOpen] = useState(false);
  const [isPageListPopupOpen, setIsPageListPopupOpen] = useState(false);
  const [pageListData, setPageListData] = useState([]);

  // =========================================================
  // [A] H-SRT 전용 로직 (대시보드 선택, 최종시간, 새로고침 등)
  // =========================================================
  const { getDataInfo, syncMap } = DataStatusMenuBarApi();
  const { pageList } = VariablePageApi();
  const { pageList: fieldPageList } = FieldProgressPageApi();
  const { getDpContext } = DpRequestPageApi();
  const [dpContext, setDpContext] = useState(null);

  const [pageInfo, setPageInfo] = useState({
    title: projectname || "조사명 없음",
    processedAt: "-"
  });

  const getCleanPageTitle = () => {
    const raw = sessionStorage.getItem("pagetitle");
    if (!raw || raw === "undefined" || raw === "null") return "대시보드(수정가능)";
    return raw;
  };

  const [pageState, setPageState] = useState({
    title: getCleanPageTitle(),
    merge_pn: mergePn || "-",
    myRole: currentMyRole || ""
  });

  const formatDate = (rawDate) => {
    if (!rawDate || rawDate === "-") return "-";
    const d = new Date(rawDate);
    const pad = (n) => String(n).padStart(2, '0');
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    return String(rawDate).replace(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}):\d{2}/, "$1");
  };

  const fetchDataInfo = async (pn) => {
    if (sessionStorage.getItem("groupcode") === "999999991") return;
    const userId = auth?.user?.userId;
    if (!userId || !pn) return;
    try {
      const result = await getDataInfo.mutateAsync({ user: userId, pn });
      if (String(result?.success) === '777' && result?.resultjson) {
        let rawDate = null;
        if (currentMode === "hsrt") {
          rawDate = result.resultjson.parquetBakedAt;
        } else if (currentMode === "fieldManagement") {
          rawDate = result.resultjson.mngParquetBakedAt;
        } else if (currentMode === "dataManagement") {
          rawDate = result.resultjson.answersSyncedAt;
        }

        setPageInfo(prev => ({
          ...prev,
          processedAt: formatDate(rawDate)
        }));
      }
    } catch (err) {
      console.warn("fetchDataInfo error", err);
    }
  };

  const fetchDpContext = useCallback(async () => {
    const pageId = sessionStorage.getItem("pageId");
    const userId = auth?.user?.userId;
    if (!pageId || !userId) {
      setDpContext(null);
      return;
    }
    try {
      const res = await getDpContext.mutateAsync({ pageid: pageId, user: userId });
      if (res?.resultjson) setDpContext(res.resultjson);
    } catch (e) {
      // silent
    }
  }, [auth?.user?.userId]);

  useEffect(() => {
    if (currentMode === "hsrt") {
      fetchDpContext();
      const handleDpUpdate = (e) => {
        if (e?.detail) setDpContext(e.detail);
        else fetchDpContext();
      };
      window.addEventListener("dpContextUpdated", handleDpUpdate);
      window.addEventListener("pageSelected", fetchDpContext);
      return () => {
        window.removeEventListener("dpContextUpdated", handleDpUpdate);
        window.removeEventListener("pageSelected", fetchDpContext);
      };
    }
  }, [currentMode, fetchDpContext]);

  // pageSelected / pageTitleUpdated 이벤트 발생 시 즉각 갱신
  useEffect(() => {
    if (currentMode !== "hsrt") return;
    const handlePageUpdate = () => {
      setPageState({
        title: getCleanPageTitle(),
        merge_pn: sessionStorage.getItem("merge_pn") || "-",
        myRole: sessionStorage.getItem("myRole") || ""
      });
    };
    window.addEventListener("pageSelected", handlePageUpdate);
    window.addEventListener("pageTitleUpdated", handlePageUpdate);
    return () => {
      window.removeEventListener("pageSelected", handlePageUpdate);
      window.removeEventListener("pageTitleUpdated", handlePageUpdate);
    };
  }, [currentMode]);

  // 대시보드 권한 정보 실시간 갱신 및 sessionStorage 세팅
  useEffect(() => {
    if (currentMode !== "hsrt") return;
    const fetchMyRole = async () => {
      const user = auth?.user?.userId;
      const pn = sessionStorage.getItem("merge_pn");
      const currentPageId = sessionStorage.getItem("pageId");
      if (user && pn && currentPageId) {
        try {
          const pageRes = await pageList.mutateAsync({ user, pn });
          if (String(pageRes?.success) === '777') {
            const pages = pageRes.resultjson || [];
            const currentPage = pages.find(p => (p.page_id || p.pageid || p.id) === currentPageId);
            if (currentPage) {
              const prevRole = sessionStorage.getItem("myRole") || "";
              const nextRole = currentPage.my_role || "";
              if (prevRole !== nextRole) {
                sessionStorage.setItem("myRole", nextRole);
                window.dispatchEvent(new Event("pageSelected"));
              }
            }
          }
        } catch (e) {
          console.warn("fetchMyRole error", e);
        }
      }
    };
    fetchMyRole();
  }, [currentMode, auth?.user?.userId, pageState.merge_pn]);

  useEffect(() => {
    if ((currentMode === "hsrt" || currentMode === "dataManagement") && mergePn) {
      fetchDataInfo(mergePn);
    }
  }, [currentMode, auth?.user?.userId, mergePn]);


  // H-SRT 대시보드 자동 선택
  useEffect(() => {
    if (currentMode !== "hsrt") return;
    const checkAndAutoSelectPage = async () => {
      const user = auth?.user?.userId;
      const currentPageId = sessionStorage.getItem("pageId");
      if (user && mergePn && (!currentPageId || currentPageId === "null" || currentPageId === "undefined")) {
        try {
          const pageRes = await pageList.mutateAsync({ user, pn: mergePn });
          if (String(pageRes?.success) === '777') {
            const pages = pageRes.resultjson || [];
            if (pages.length === 1) {
              handlePageSelect(pages[0]);
            } else {
              setPageListData(pages);
              setIsPageListPopupOpen(true);
            }
          }
        } catch (e) {
          console.warn("Auto-select page error", e);
        }
      }
    };
    checkAndAutoSelectPage();
  }, [currentMode, auth?.user?.userId, mergePn]);

  const handlePageSelect = async (page) => {
    const pageId = page.page_id || page.pageid || page.id || "";
    const pageTitle = page.title || page.pagetitle || page.name || "대시보드(수정가능)";
    const myRole = page.my_role || page.role || "";

    sessionStorage.setItem("pageId", pageId);
    sessionStorage.setItem("pagetitle", pageTitle);
    sessionStorage.setItem("myRole", myRole);

    setPageState({
      title: pageTitle,
      merge_pn: mergePn || sessionStorage.getItem("merge_pn") || "-",
      myRole: myRole
    });
    setIsPageListPopupOpen(false);

    try {
      const userId = auth?.user?.userId;
      if (userId && pageId) {
        const res = await getDpContext.mutateAsync({ pageid: pageId, user: userId });
        const context = res?.resultjson || res?.data?.resultjson || res;
        if (context) {
          setDpContext(context);
          window.dispatchEvent(new CustomEvent("dpContextUpdated", { detail: context }));
        }
        const pageHasStub = Boolean(
          context?.steps?.recoded?.completed === true ||
          context?.steps?.recoded?.completed === 1 ||
          context?.steps?.recoded?.completed === '1' ||
          context?.steps?.recoded?.completed === 'true'
        );

        if (myRole === "viewer") {
          navigate("/data_status/hsrt/cross_analysis");
        } else if (pageHasStub) {
          navigate("/data_status/hsrt/cross_analysis");
        } else {
          navigate("/data_status/hsrt/dp_request?dp_view=table");
        }
      }
    } catch (e) {
      console.warn("getDpContext error on page select", e);
      if (myRole === "viewer") {
        navigate("/data_status/hsrt/cross_analysis");
      } else {
        navigate("/data_status/hsrt/dp_request?dp_view=table");
      }
    } finally {
      window.dispatchEvent(new Event("pageSelected"));
    }
  };

  const handleRefresh = async () => {
    const userId = auth?.user?.userId;
    const pn = sessionStorage.getItem("merge_pn");
    if (!userId || !pn) {
      modal.showAlert("알림", "프로젝트 정보나 사용자 정보가 없습니다.");
      return;
    }
    try {
      loadingSpinner.show();
      const bakeTarget = currentMode === "fieldManagement"
        ? "mng"
        : currentMode === "dataManagement"
          ? "both"
          : "srt";
      const result = await syncMap.mutateAsync({ user: userId, pn, bakeTarget });
      if (String(result?.success) === '777') {
        modal.showAlert("알림", "데이터 새로고침이 성공적으로 완료되었습니다.");
        await fetchDataInfo(pn);
        window.dispatchEvent(new Event("pageSelected"));
      } else {
        const errorMsg = result?.errortext || result?.errorcontent || result?.message;
        modal.showErrorAlert("에러", errorMsg || "데이터 새로고침에 실패했습니다.");
      }
    } catch (err) {
      modal.showErrorAlert("오류", "데이터 새로고침 중 오류가 발생했습니다.");
    } finally {
      loadingSpinner.hide();
    }
  };

  // 실사관리 초기화 (merge_pn 존재 시 데이터 조회 및 silsaPageId 설정)
  useEffect(() => {
    if (currentMode === "fieldManagement" && mergePn) {
      fetchDataInfo(mergePn);
      const user = auth?.user?.userId;
      if (user) {
        fieldPageList.mutateAsync({ user: user, pn: mergePn })
          .then(pageRes => {
            if (String(pageRes?.success) === '777') {
              const pages = pageRes.resultjson || [];
              if (pages.length > 0) {
                const pageId = pages[0].id || pages[0].pageid;
                sessionStorage.setItem("silsaPageId", pageId);
              } else {
                sessionStorage.setItem("silsaPageId", "dummy_page_id_for_field_management");
              }
              window.dispatchEvent(new Event("pageSelected"));
            }
          })
          .catch(err => {
            console.warn("Auto-select silsaPageId error on mount", err);
            sessionStorage.setItem("silsaPageId", "dummy_page_id_for_field_management");
            window.dispatchEvent(new Event("pageSelected"));
          });
      }
    }
  }, [currentMode, auth?.user?.userId, mergePn]);

  // =========================================================
  // [B] AI 오픈분석 전용 로직 (OpenAI 잔액 조회, 충전)
  // =========================================================
  const { getTokenUsage, getChargeCost, updateChargeCost } = AiMenuBarApi();
  const [balance, setBalance] = useState(null);
  const [chargeInput, setChargeInput] = useState("");
  const qnum = sessionStorage.getItem("qnum");
  const isOnProList = location.pathname.includes("/pro_list");

  useEffect(() => {
    if (currentMode !== "aiOpen" || !auth?.isLogin) return;
    const cachedBalance = sessionStorage.getItem("openai_balance");
    if (cachedBalance !== null && cachedBalance !== undefined) {
      setBalance(cachedBalance);
      return;
    }
    getTokenUsage.mutateAsync({ apigubun: "openai", user: auth?.user?.userId })
      .then(res => {
        if (String(res?.success) === '777') {
          const bal = res.resultjson?.balancecost;
          setBalance(bal);
          sessionStorage.setItem("openai_balance", bal);
        }
      })
      .catch(e => console.error("Failed to fetch OpenAI balance", e));
  }, [currentMode, auth?.isLogin]);

  useEffect(() => {
    if (currentMode !== "aiOpen" || !auth?.isLogin || !isAiSolutionTeam) return;
    getChargeCost.mutateAsync({ apigubun: "openai", user: auth?.user?.userId })
      .then(res => {
        if (String(res?.success) === '777') {
          setChargeInput(res.resultjson?.chargecost || "");
        }
      })
      .catch(e => console.error("Failed to fetch charge cost", e));
  }, [currentMode, auth?.isLogin, isAiSolutionTeam]);

  const handleUpdateCharge = async () => {
    if (!chargeInput) {
      modal.showAlert("알림", "충전 금액을 입력해주세요.");
      return;
    }
    try {
      const res = await updateChargeCost.mutateAsync({
        chargecostInput: Number(chargeInput),
        apigubun: "openai",
        user: auth?.user?.userId
      });
      if (String(res?.success) === '777') {
        modal.showAlert("알림", "충전 금액이 업데이트되었습니다.");
        getTokenUsage.mutateAsync({ apigubun: "openai", user: auth?.user?.userId }).then((r) => {
          if (String(r?.success) === '777') {
            const bal = r.resultjson?.balancecost;
            setBalance(bal);
            sessionStorage.setItem("openai_balance", bal);
          }
        });
      } else {
        modal.showAlert("알림", "업데이트에 실패했습니다.");
      }
    } catch (e) {
      modal.showAlert("알림", "업데이트 중 오류가 발생했습니다.");
    }
  };

  const BalanceCard = () => (
    <div className="ai-balance-card-container" style={{ padding: '0 16px 16px 16px' }}>
      {isAiSolutionTeam && (
        <>
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

          <div className="ai-balance-chip" style={{ width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} className="ai-balance-icon" />
              <span className="ai-balance-label">OPEN AI 잔액</span>
            </div>
            <span className="ai-balance-value">약 ${Number(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </>
      )}
    </div>
  );

  // =========================================================
  // [C] 공통 프로젝트 선택 핸들러
  // =========================================================
  const handleProjectSelect = async (project) => {
    sessionStorage.setItem("projectnum", project.projectnum || "");
    sessionStorage.setItem("projectname", project.projectname || "");
    sessionStorage.setItem("servername", project.servername || "");
    sessionStorage.setItem("projectpof", project.projectpof || "");
    sessionStorage.setItem("merge_pn", project.merge_pn || "");
    sessionStorage.setItem("merge_pn_text", project.merge_pn_text || "");

    setPageInfo(prev => ({
      ...prev,
      title: project.projectname || "조사명 없음"
    }));

    sessionStorage.setItem("pageId", "");
    sessionStorage.setItem("pagetitle", "");
    sessionStorage.setItem("myRole", "");
    setPageState({
      title: "대시보드(수정가능)",
      merge_pn: "-",
      myRole: ""
    });

    setIsProjectModalOpen(false);

    if (currentMode === "hsrt") {
      if (project.merge_pn) fetchDataInfo(project.merge_pn);
      window.dispatchEvent(new Event("pageSelected"));
      try {
        const user = auth?.user?.userId;
        const mergePnVal = project.merge_pn;
        if (user && mergePnVal) {
          const pageRes = await pageList.mutateAsync({ user, pn: mergePnVal });
          if (String(pageRes?.success) === '777') {
            const pages = pageRes.resultjson || [];
            if (pages.length === 1) {
              handlePageSelect(pages[0]);
            } else if (pages.length > 1) {
              setPageListData(pages);
              setIsPageListPopupOpen(true);
            }
          }
        }
      } catch (e) {
        console.warn("Project select error", e);
      }
    } else if (currentMode === "dataManagement") {
      if (project.merge_pn) fetchDataInfo(project.merge_pn);
      window.dispatchEvent(new Event("pageSelected"));
      navigate("/data_management/setting/map");
    } else if (currentMode === "aiOpen") {
      sessionStorage.setItem("qnum", "");
      sessionStorage.setItem("project_lock", "");
      window.dispatchEvent(new Event("pageSelected"));
      navigate('/ai_open_analysis/pro_list', {
        state: {
          projectnum: project.projectnum,
          projectname: project.projectname,
          servername: project.servername,
          projectpof: project.projectpof
        },
        replace: true
      });
    } else if (currentMode === "fieldManagement") {
      if (project.merge_pn) {
        fetchDataInfo(project.merge_pn);
        try {
          const user = auth?.user?.userId;
          const pageRes = await fieldPageList.mutateAsync({ user: user, pn: project.merge_pn });
          if (String(pageRes?.success) === '777') {
            const pages = pageRes.resultjson || [];
            if (pages.length > 0) {
              const pageId = pages[0].id || pages[0].pageid;
              sessionStorage.setItem("silsaPageId", pageId);
            } else {
              sessionStorage.setItem("silsaPageId", "dummy_page_id_for_field_management");
            }
          }
        } catch (e) {
          sessionStorage.setItem("silsaPageId", "dummy_page_id_for_field_management");
        }
      }
      window.dispatchEvent(new Event("pageSelected"));
      navigate("/field_management/analysis/progress");
    }
  };

  // 초기 진입 시 프로젝트 선택 팝업 오픈 (미선택 시)
  useEffect(() => {
    if (!projectnum) {
      setIsProjectModalOpen(true);
    }
  }, []);

  // =========================================================
  // [D] 공통 모듈 전환 스위처 메뉴 (대메뉴별 하이라이트)
  // =========================================================
  const moduleItems = [
    { label: "설문제작", icon: <FileText size={16} />, path: "/project/pro_list", isDisabled: true },
    {
      label: "H-SRT",
      icon: <Grid size={16} />,
      path: "/data_status",
      highlight: currentMode === "hsrt",
      onClick: () => { navigate("/data_status"); }
    },
    {
      label: "데이터관리",
      icon: <Database size={16} />,
      path: "/data_management/setting/map",
      highlight: currentMode === "dataManagement",
      onClick: () => { navigate("/data_management/setting/map"); }
    },
    {
      label: "AI오픈분석",
      icon: <BrainCircuit size={16} />,
      path: "/ai_open_analysis",
      highlight: currentMode === "aiOpen",
      onClick: () => { navigate("/ai_open_analysis"); }
    },
    {
      label: "실사관리",
      icon: <ClipboardList size={16} />,
      path: "/field_management/analysis/progress",
      highlight: currentMode === "fieldManagement",
      onClick: () => { navigate("/field_management/analysis/progress"); }
    },
    { label: "응답자관리", icon: <Users size={16} />, path: "/project", isDisabled: true },
  ];

  // =========================================================
  // [E] 대메뉴별 메뉴 아이템 및 설정 빌드
  // =========================================================
  let computedTheme = "blue";
  let computedBrand = {};
  let computedMenuGroups = [];
  let computedExtraActions = null;
  let computedBottomActions = null;

  // 1) H-SRT 모드 (Blue 테마)
  if (currentMode === "hsrt") {
    computedTheme = "blue";
    computedBrand = {
      title: "",
      logoText: "H-SRT",
      logoClass: "menu-bar-logo",
      onClick: () => navigate(isHsrtCustomer ? "/data_status/hsrt/cross_analysis" : "/data_status")
    };

    const hasStub = Boolean(
      dpContext?.steps?.recoded?.completed === true ||
      dpContext?.steps?.recoded?.completed === 1 ||
      dpContext?.steps?.recoded?.completed === '1' ||
      dpContext?.steps?.recoded?.completed === 'true'
    );
    const isSummaryDisabled = !hasStub;
    const targetDpView = hasStub ? "recoded" : "table";
    const targetDpPath = `/data_status/hsrt/dp_request?dp_view=${targetDpView}`;

    const dpRequestChildren = [
      {
        label: "표 설정",
        path: "/data_status/hsrt/dp_request?dp_view=table",
        view: "table",
        description: "기본 표 구조 및 표시 옵션 설정",
        isActive: (pathname, loc) => pathname === "/data_status/hsrt/dp_request" && (!new URLSearchParams(loc?.search || "").get("dp_view") || new URLSearchParams(loc?.search || "").get("dp_view") === "table")
      },
      {
        label: "배너",
        path: "/data_status/hsrt/dp_request?dp_view=banner",
        view: "banner",
        description: "열(Banner) 변수 및 비교 집단 구성",
        isActive: (pathname, loc) => pathname === "/data_status/hsrt/dp_request" && new URLSearchParams(loc?.search || "").get("dp_view") === "banner"
      },
      {
        label: "스터브",
        path: "/data_status/hsrt/dp_request?dp_view=recoded",
        view: "recoded",
        description: "행(Stub) 변수 및 리코딩 문항 구성",
        isActive: (pathname, loc) => pathname === "/data_status/hsrt/dp_request" && new URLSearchParams(loc?.search || "").get("dp_view") === "recoded"
      },
      {
        label: "요약표",
        path: "/data_status/hsrt/dp_request?dp_view=summary",
        view: "summary",
        description: "최종 집계 요약 및 결과 테이블 조회",
        disabled: isSummaryDisabled,
        disabledMessage: "스터브 저장 완료 후 요약표를 설정할 수 있습니다.",
        isActive: (pathname, loc) => pathname === "/data_status/hsrt/dp_request" && new URLSearchParams(loc?.search || "").get("dp_view") === "summary"
      }
    ];

    const hasCompletedTable = dpContext?.completed_steps?.table === true;
    const hasSummaryTables = dpContext?.summary_tables_active === true;
    const isViewer = currentMyRole === "viewer";

    computedMenuGroups = [
      {
        label: "데이터 설정",
        items: [
          { label: "문항추가", path: "/data_status/hsrt/add_question", icon: PlusCircle, isVisible: !isViewer },
          {
            label: "DP의뢰서",
            path: targetDpPath,
            icon: FileCog,
            isVisible: !isViewer,
            children: dpRequestChildren,
            isActive: (pathname) => pathname.startsWith("/data_status/hsrt/dp_request")
          }
        ].filter(i => i.isVisible !== false)
      },
      {
        label: "집계 현황",
        items: [
          {
            label: "교차분석",
            path: "/data_status/hsrt/cross_analysis",
            icon: Table,
            isDisabled: !isViewer && !hasCompletedTable,
            disabledTooltip: "DP의뢰서 [표 설정] 저장 완료 후 활성화됩니다."
          },
          {
            label: "추가분석",
            path: "/data_status/hsrt/additional_analysis",
            icon: BarChart3,
            isDisabled: !isViewer && !hasCompletedTable,
            disabledTooltip: "DP의뢰서 [표 설정] 저장 완료 후 활성화됩니다."
          }
        ]
      },
      {
        label: "AI 분석",
        items: [
          {
            label: "AI 요약보고서",
            path: "/data_status/hsrt/ai_report",
            icon: Sparkles,
            isDisabled: !isViewer && !hasSummaryTables,
            disabledTooltip: "DP의뢰서 [요약표 설정] 저장 완료 후 활성화됩니다."
          }
        ]
      }
    ];

    // H-SRT고객인 경우 세션에 있는 showmenu 값(권한 메뉴)으로만 메뉴 아이템을 필터링 구성합니다.
    if (isHsrtCustomer) {
      const showMenuStr = sessionStorage.getItem("showmenu");
      if (showMenuStr) {
        const allowedMenus = showMenuStr.split(",").map(m => m.replace(/\s+/g, '').toLowerCase());
        computedMenuGroups = computedMenuGroups.map(group => {
          const filteredItems = group.items.filter(item => {
            const cleanLabel = item.label.replace(/\s+/g, '').toLowerCase();
            return allowedMenus.some(allowed => allowed === cleanLabel);
          });
          return { ...group, items: filteredItems };
        }).filter(group => group.items.length > 0);
      }
    } else {
      if (isViewer) {
        computedMenuGroups = computedMenuGroups.map(group => {
          const filteredItems = group.items.filter(item =>
            item.label === "교차분석" || item.label === "AI 요약보고서"
          );
          return { ...group, items: filteredItems };
        }).filter(group => group.items.length > 0);
      }
    }

    const isBlockedFromPermission =
      userName === "H-SRT고객" ||
      userGroup === "H-SRT고객" ||
      groupCode === "999999991" ||
      currentMyRole === "custom_srt";

    const showAdminMenu = !isBlockedFromPermission && (currentMyRole === "admin" || (currentMyRole === "" && isAiSolutionTeam));
    if (showAdminMenu) {
      computedMenuGroups.push({
        label: "시스템 관리",
        items: [
          { label: "대시보드 권한 설정", path: "/data_status/hsrt/menu_permission", icon: ShieldCheck }
        ]
      });
    }

    // 2단 카드: 좌측 라벨+시간, 우측 세로 중앙 새로고침 버튼 (원본 디자인 100% 일치)
    computedExtraActions = isHsrtCustomer ? null : (
      <div className="menu-bar-actions">
        <div className="menu-bar-refresh-card">
          <div className="menu-bar-refresh-card-left" title="현재 H-SRT에 반영된 데이터의 수집 기준 일시입니다.">
            <span className="menu-bar-refresh-label">데이터 기준 일시</span>
            <div className="menu-bar-refresh-time-row">
              <Clock size={12} strokeWidth={2.2} className="menu-bar-clock-icon" />
              <span className="menu-bar-time-text">{formatDate(pageInfo.processedAt)}</span>
            </div>
          </div>
          <button
            type="button"
            className="menu-bar-refresh-icon-btn"
            onClick={handleRefresh}
            title="최신 응답 데이터를 반영하여 H-SRT를 새로고침합니다."
          >
            <RefreshCw size={13} className={(syncMap.isLoading || syncMap.isPending) ? "spin" : ""} />
          </button>
        </div>
      </div>
    );
  }
  // 2) 데이터관리 모드 (Green 테마)
  else if (currentMode === "dataManagement") {
    computedTheme = "green";
    computedBrand = {
      title: "데이터 관리",
      logoClass: "menu-bar-logo",
      onClick: () => navigate("/data_management/setting/map")
    };

    const mgmtItems = [
      {
        label: "데이터설정",
        items: [
          { label: "맵 관리", path: "/data_management/setting/map", icon: MapIcon }
        ]
      }
    ];

    if (serverName !== "NEW") {
      mgmtItems.push({
        label: "",
        items: [
          { label: "설문지 인식", path: "/data_management/qa", icon: BrainCircuit },
          { label: "설문&스크립트 교차검증", path: "/data_management/survey_test", icon: ClipboardCheck },
          { label: "AI 데이터 생성", path: "/data_management/ai_data", icon: Sparkles }
        ]
      });
    }

    computedMenuGroups = mgmtItems;

    computedExtraActions = (
      <div className="menu-bar-actions">
        <div className="menu-bar-refresh-card">
          <div className="menu-bar-refresh-card-left" title="현재 데이터 관리에 반영된 데이터의 수집 기준 일시입니다.">
            <span className="menu-bar-refresh-label">데이터 기준 일시</span>
            <div className="menu-bar-refresh-time-row">
              <Clock size={12} strokeWidth={2.2} className="menu-bar-clock-icon" />
              <span className="menu-bar-time-text">{formatDate(pageInfo.processedAt)}</span>
            </div>
          </div>
          <button
            type="button"
            className="menu-bar-refresh-icon-btn"
            onClick={handleRefresh}
            title="최신 응답 데이터를 반영하여 데이터 관리를 새로고침합니다."
          >
            <RefreshCw size={13} className={(syncMap?.isLoading || syncMap?.isPending) ? "spin" : ""} />
          </button>
        </div>
      </div>
    );
  }
  // 3) AI 오픈분석 모드 (Orange 테마)
  else if (currentMode === "aiOpen") {
    computedTheme = "orange";
    computedBrand = {
      title: "오픈분석",
      logoText: "AI",
      logoClass: "brand-title",
      onClick: () => {
        sessionStorage.setItem("qnum", "");
        sessionStorage.setItem("project_lock", "");
        navigate("/ai_open_analysis/pro_list");
      }
    };

    const aiGroups = [];
    if (projectnum && projectname) {
      aiGroups.push({
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
            label: location.pathname.includes("/option_setting_2") ? "분석2" : "분석",
            path: location.pathname.includes("/option_setting_2") ? "/ai_open_analysis/option_setting_2" : "/ai_open_analysis/option_setting",
            icon: BrainCircuit,
            isActive: (path) => path.includes("/option_setting")
          }] : [])
        ]
      });
    }

    const adminItems = [];
    if (isAiSolutionTeam) {
      adminItems.push({ label: "토큰 사용 내역", path: "/ai_open_analysis/token_usage", icon: BarChart3 });
    }
    if (adminItems.length > 0) {
      aiGroups.push({ items: adminItems });
    }

    computedMenuGroups = aiGroups;
    computedBottomActions = <BalanceCard />;
  }
  // 4) 실사관리 모드 (Navy 테마)
  else if (currentMode === "fieldManagement") {
    computedTheme = "navy";
    computedBrand = {
      title: "실사관리",
      onClick: () => navigate("/field_management/analysis/progress")
    };

    computedMenuGroups = [
      {
        label: "",
        items: [
          { label: "문항별집계", path: "/field_management/analysis/progress", icon: Grid },
          { label: "쿼터관리", icon: ClipboardList, isPending: true },
          { label: "데이터 삭제(불량)", icon: Trash2, isPending: true },
        ]
      }
    ];

    computedExtraActions = (
      <div className="menu-bar-actions">
        <div className="menu-bar-refresh-card">
          <div className="menu-bar-refresh-card-left" title="현재 실사관리에 반영된 데이터의 수집 기준 일시입니다.">
            <span className="menu-bar-refresh-label">데이터 기준 일시</span>
            <div className="menu-bar-refresh-time-row">
              <Clock size={12} strokeWidth={2.2} className="menu-bar-clock-icon" />
              <span className="menu-bar-time-text">{formatDate(pageInfo.processedAt)}</span>
            </div>
          </div>
          <button
            type="button"
            className="menu-bar-refresh-icon-btn"
            onClick={handleRefresh}
            title="최신 응답 데이터를 반영하여 새로고침합니다."
          >
            <RefreshCw size={13} className={(syncMap?.isLoading || syncMap?.isPending) ? "spin" : ""} />
          </button>
        </div>
      </div>
    );
  }

  // 권한별 접근 페이지 제어 (페이지 진입/갱신 시 강제 리다이렉트)
  useEffect(() => {
    if (currentMode !== "hsrt") return;
    const myRole = pageState.myRole || sessionStorage.getItem("myRole") || "";
    const groupCode = sessionStorage.getItem("groupcode") || "";
    const userName = auth?.user?.userName || "";
    const userGroup = auth?.user?.userGroup || "";
    const path = location.pathname;

    const isBlockedFromPermission =
      userName === "H-SRT고객" ||
      userGroup === "H-SRT고객" ||
      groupCode === "999999991" ||
      myRole === "custom_srt";

    // H-SRT고객 등 권한 제한 사용자의 메뉴별 경로 접근 규제
    if (isBlockedFromPermission && path.startsWith("/data_status/hsrt")) {
      const showMenuStr = sessionStorage.getItem("showmenu");
      let allowedPaths = [];
      let defaultPath = "/data_status/hsrt/cross_analysis";

      if (showMenuStr) {
        const allowedMenus = showMenuStr.split(",").map(m => m.replace(/\s+/g, '').toLowerCase());
        allowedPaths = allowedMenus.map(allowed => {
          for (const group of computedMenuGroups) {
            const item = group.items?.find(it => it.label?.replace(/\s+/g, '').toLowerCase() === allowed);
            if (item) return item.path;
          }
          return null;
        }).filter(Boolean);
      }

      if (allowedPaths.length > 0) {
        defaultPath = allowedPaths[0];
      }

      const isPathAllowed = allowedPaths.length === 0
        ? path.toLowerCase() === defaultPath.toLowerCase()
        : allowedPaths.some(p => path.toLowerCase() === p.toLowerCase());

      if (!isPathAllowed) {
        navigate(defaultPath, { replace: true });
        return;
      }
    }

    if (myRole === "viewer") {
      if (!path.includes("cross_analysis") && !path.includes("ai_report")) {
        navigate("/data_status/hsrt/cross_analysis", { replace: true });
      }
    } else if (myRole === "editor") {
      if (path.includes("menu_permission")) {
        navigate("/data_status/hsrt/add_question", { replace: true });
      }
    }
  }, [currentMode, pageState.myRole, location.pathname, auth?.user]);

  const projectInfoData = {
    title: pageInfo.title,
    subTitle: currentMode === "aiOpen"
      ? (sessionStorage.getItem("projectnum") || sessionStorage.getItem("projectpof") || "ID 미지정")
      : (sessionStorage.getItem("merge_pn") || sessionStorage.getItem("projectpof") || "ID 미지정"),
    onSettingsClick: (isHsrtCustomer && currentMode === "hsrt") ? undefined : () => {
      if (onOpenProjectModal) {
        onOpenProjectModal();
      } else {
        setIsProjectModalOpen(true);
      }
    }
  };

  const displayPageTitle = (pageState.title && pageState.title !== "undefined" && pageState.title !== "null")
    ? pageState.title
    : "대시보드(수정가능)";

  const handleOpenPageList = () => {
    const user = auth?.user?.userId;
    const pn = sessionStorage.getItem("merge_pn");
    if (user && pn) {
      pageList.mutateAsync({ user, pn }).then((pageRes) => {
        if (String(pageRes?.success) === '777') {
          setPageListData(pageRes.resultjson || []);
          setIsPageListPopupOpen(true);
        }
      });
    }
  };

  const sidebarPageInfo = currentMode === "hsrt" ? {
    title: displayPageTitle,
    onSettingsClick: isHsrtCustomer ? undefined : handleOpenPageList,
    onClick: isHsrtCustomer ? undefined : handleOpenPageList
  } : undefined;

  return (
    <>
      <Sidebar
        id={id}
        brand={computedBrand}
        menuGroups={computedMenuGroups}
        projectInfo={projectInfoData}
        pageInfo={sidebarPageInfo}
        theme={computedTheme}
        moduleItems={moduleItems}
        extraActions={computedExtraActions}
        bottomActions={computedBottomActions}
        {...restSidebarProps}
      />

      {/* 신규 데이터 모달 */}
      {isNewDataModalOpen && (
        <NewDataModal
          onClose={() => setIsNewDataModalOpen(false)}
          onConfirm={() => setIsNewDataModalOpen(false)}
        />
      )}

      {/* 프로젝트 선택 모달 */}
      {isProjectModalOpen && (
        <ProjectSelectionModal
          from={currentMode === "aiOpen" ? "ai_open" : (currentMode === "dataManagement" ? "data_management" : "data_status")}
          onSelect={handleProjectSelect}
          onClose={() => {
            setIsProjectModalOpen(false);
            const pnum = sessionStorage.getItem("projectnum");
            if (!pnum) {
              navigate("/");
            }
          }}
        />
      )}

      {/* H-SRT 대시보드 리스트 팝업 */}
      {isPageListPopupOpen && (
        <PageListPopup
          isOpen={isPageListPopupOpen}
          data={pageListData}
          onClose={() => setIsPageListPopupOpen(false)}
          onSelect={handlePageSelect}
        />
      )}
    </>
  );
};

export default AppSidebar;
