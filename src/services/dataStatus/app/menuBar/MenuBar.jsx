import React, { useContext, useEffect, useState } from "react";
import Sidebar from "@/components/common/sidebar/Sidebar";
import {
  Info, Database, Wrench, FileText, Target, BarChart3, Grid,
  Table, ClipboardList, Sparkles, Upload, RefreshCw, Clock, Users, BrainCircuit, ShieldCheck, Columns, LayoutDashboard, PlusCircle, FileCog, Wand2
} from "lucide-react";
import { modalContext } from "@/components/common/Modal.jsx";
import NewDataModal from "./NewDataModal";
import { MenuBarApi } from "./MenuBarApi";
import ProjectSelectionModal from "./ProjectSelectionModal";
import PageListPopup from "../variable/PageListPopup"; // Import PageListPopup
import { VariablePageApi } from "../variable/VariablePageApi"; // Import API for page list
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import "./MenuBar.css";

// 메뉴 아이템 정의
// 원래 있는건 그대로 두되 메뉴바에서 주석처리
/*
const MENU_ITEMS_OLD = [
  {
    label: "교차표",
    items: [
      // { label: "빈도분석", path: "/data_status/hsrt/add_question", icon: BarChart3 },
      // { label: "교차분석", path: "/data_status/analysis/cross", icon: Table, isPending: true },
      { label: "배너설정", path: "/data_status/hsrt/add_question", icon: Columns },
      { label: "문항", path: "/data_status/analysis/cross", icon: Table },
      // todo 임시 주석  [쿼터현황/관리] 메뉴
      // { label: "쿼터현황/관리", path: "/data_status/analysis/quota", icon: ClipboardList },
      // { label: "쿼터현황/관리", path: "/data_status/analysis/quota", icon: ClipboardList, isPending: true },
    ]
  },
  {
    label: "데이터설정",
    items: [
      { label: "페이지 설정", path: "/data_status/setting/page", icon: LayoutDashboard },
      { label: "스터브 생성", path: "/data_status/setting/recoding", icon: Wrench },
      { label: "DP 의뢰서 정의", path: "/data_status/setting/dp_definition", icon: FileText, isPending: true },
      { label: "가중치 생성", path: "/data_status/setting/weight", icon: Target },
    ]
  }
];
*/

// 신규 H-SRT 메뉴 아이템 반영
const MENU_ITEMS = [
  {
    label: "데이터 설정",
    items: [
      { label: "문항추가", path: "/data_status/hsrt/add_question", icon: PlusCircle },
      { label: "DP의뢰서", path: "/data_status/hsrt/dp_request", icon: FileCog },
    ]
  },
  {
    label: "집계 현황",
    items: [
      { label: "교차분석", path: "/data_status/hsrt/cross_analysis", icon: Table },
      { label: "추가분석", path: "/data_status/hsrt/additional_analysis", icon: BarChart3 },
    ]
  }
];

const MenuBar = ({ projectName, lastUpdated, onOpenProjectModal }) => {
  const modal = useContext(modalContext);
  const loadingSpinner = useContext(loadingSpinnerContext);
  const auth = useSelector((store) => store.auth);
  const navigate = useNavigate();
  const { getPageMetadata, getDataInfo, syncMap } = MenuBarApi();
  const { pageList } = VariablePageApi(); // Use VariablePageApi for page list

  const [isNewDataModalOpen, setIsNewDataModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isPageListPopupOpen, setIsPageListPopupOpen] = useState(false);
  const [pageListData, setPageListData] = useState([]);

  const [pageInfo, setPageInfo] = useState({
    title: projectName || sessionStorage.getItem("projectname") || "조사명 없음",
    processedAt: lastUpdated || "-"
  });

  // 초기 진입 시 프로젝트가 없으면 프로젝트 선택 팝업 오픈
  useEffect(() => {
    const projectnum = sessionStorage.getItem("projectnum");
    if (!projectnum) {
      setIsProjectModalOpen(true);
    }
  }, []);

  // 모듈 전환 메뉴 아이템
  const moduleItems = [
    { label: "설문제작", icon: <FileText size={16} />, path: "/project/pro_list", isDisabled: true },
    { label: "H-SRT", icon: <Grid size={16} />, path: "/data_status/hsrt/add_question", highlight: true },
    {
      label: "데이터관리",
      icon: <Database size={16} />,
      path: "/data_management/setting/map",
      onClick: () => { navigate("/data_management/setting/map"); }
    },
    {
      label: "AI오픈분석",
      icon: <BrainCircuit size={16} />,
      path: "/ai_open_analysis",
      onClick: () => {
        navigate("/ai_open_analysis");
      }
    },
    { label: "실사관리", icon: <ClipboardList size={16} />, path: "/field_management/analysis/progress" },
    { label: "응답자관리", icon: <Users size={16} />, path: "/project", isDisabled: true },
  ];

  // 사이드바에 전달할 프로젝트 정보
  const projectInfoData = {
    title: pageInfo.title,
    subTitle: sessionStorage.getItem("merge_pn") || sessionStorage.getItem("projectpof") || "ID 미지정",
    onSettingsClick: auth?.user?.userGroup === "H-SRT고객" ? undefined : () => {
      if (onOpenProjectModal) {
        onOpenProjectModal();
      } else {
        setIsProjectModalOpen(true);
      }
    }
  };

  // 날짜 포맷팅 함수
  const formatDate = (rawDate) => {
    if (!rawDate) return "-";
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return rawDate;
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  // 데이터 정보 조회 (최종 업데이트 시간)
  const fetchDataInfo = async (pn) => {
    // H-SRT 고객일 경우 데이터 정보 조회를 건너뜁니다
    if (sessionStorage.getItem("groupcode") === "999999991") return;

    const userId = auth?.user?.userId;
    if (!userId || !pn) return;
    try {
      const result = await getDataInfo.mutateAsync({ user: userId, pn });
      if (result?.success === "777") {
        setPageInfo(prev => ({
          ...prev,
          processedAt: formatDate(result.resultjson.parquetBakedAt)
        }));
      } else {
        const errorMsg = result?.errortext || result?.errorcontent || result?.message;
        if (errorMsg) {
          modal.showErrorAlert("에러", errorMsg || "데이터 정보 조회에 실패했습니다.");
        }
      }
    } catch (err) {
      console.warn("fetchDataInfo error", err);
    }
  };

  // PN이 있을 경우 초기 정보 조회
  useEffect(() => {
    const mergePn = sessionStorage.getItem("merge_pn");
    if (mergePn) {
      fetchDataInfo(mergePn);
    }
  }, [auth?.user?.userId]);

  // 프로젝트는 있지만 대시보드가 선택되지 않은 경우 (대시보드 수정가능 상태) 자동 조회 및 한 개일 때 선택
  useEffect(() => {
    const checkAndAutoSelectPage = async () => {
      const user = auth?.user?.userId;
      const mergePn = sessionStorage.getItem("merge_pn");
      const currentPageId = sessionStorage.getItem("pageId");

      if (user && mergePn && (!currentPageId || currentPageId === "null" || currentPageId === "undefined")) {
        try {
          const pageRes = await pageList.mutateAsync({ user: user, pn: mergePn });
          if (pageRes?.success === "777") {
            const pages = pageRes.resultjson || [];
            if (pages.length === 1) {
              handlePageSelect(pages[0]);
            }
          }
        } catch (e) {
          console.warn("Auto-select page error", e);
        }
      }
    };

    checkAndAutoSelectPage();
  }, [auth?.user?.userId, pageList.mutateAsync]);

  // 데이터 새로고침 (update-map)
  const handleRefresh = async () => {
    const userId = auth?.user?.userId;
    const pn = sessionStorage.getItem("merge_pn");

    if (!userId || !pn) {
      modal.showAlert("알림", "프로젝트 정보나 사용자 정보가 없습니다.");
      return;
    }

    try {
      loadingSpinner.show();
      const result = await syncMap.mutateAsync({ user: userId, pn });

      if (result?.success === "777") {
        modal.showAlert("알림", "데이터 새로고침이 성공적으로 완료되었습니다.");
        // 새로고침 후 시간 정보 다시 가져오기
        await fetchDataInfo(pn);
        // 연관된 페이지들(예: SRT) 다시 조회하도록 이벤트 발생
        window.dispatchEvent(new Event("pageSelected"));
      } else {
        const errorMsg = result?.errortext || result?.errorcontent || result?.message;
        if (errorMsg) {
          modal.showErrorAlert("에러", errorMsg || "데이터 새로고침에 실패했습니다.");
        }
      }
    } catch (err) {
      console.error("Refresh error", err);
      modal.showErrorAlert("오류", "데이터 새로고침 중 오류가 발생했습니다.");
    } finally {
      loadingSpinner.hide();
    }
  };

  // 추가 액션 영역 (날짜와 새로고침 아이콘 한 줄 정리)
  const isHsrtCustomer = sessionStorage.getItem("groupcode") === "999999991";
  const ExtraActions = isHsrtCustomer ? null : (
    <div className="menu-bar-actions">
      <div className="menu-bar-refresh-bar">
        <div className="menu-bar-info-group">
          <Clock size={12} strokeWidth={2.5} />
          <span>{pageInfo.processedAt}</span>
        </div>
        <button
          className="menu-bar-refresh-btn-minimal"
          onClick={handleRefresh}
          title="데이터 새로고침"
        >
          <RefreshCw size={14} className={syncMap.isLoading ? "spin" : ""} />
        </button>
      </div>
    </div>
  );

  // 대시보드 선택 처리
  const handlePageSelect = async (selectedPage) => {
    setIsPageListPopupOpen(false);
    const userId = auth?.user?.userId;
    const pageId = selectedPage.page_id || selectedPage.pageid || selectedPage.id;
    const pageTitle = selectedPage.title || selectedPage.name || "제목 없음";

    if (!userId || !pageId) return;

    // Save pageId and pagetitle to session storage
    sessionStorage.setItem("pageId", pageId);
    sessionStorage.setItem("pagetitle", pageTitle);
    window.dispatchEvent(new Event("pageSelected"));

    setPageState({
      title: pageTitle,
      merge_pn: sessionStorage.getItem("merge_pn") || "-"
    });

    // try {
    //   loadingSpinner.show();
    //   // 대시보드 메타데이터 조회 API 호출
    //   //const metadataResult = await getPageMetadata.mutateAsync({ user: userId, pageid: pageId });
    //   loadingSpinner.hide();
    // } catch (error) {
    //   console.error("API Error:", error);
    //   loadingSpinner.hide();
    //   modal.showErrorAlert("오류", "메타데이터 조회 중 오류가 발생했습니다.");
    // }
  };

  const handleProjectSelect = async (project) => {
    // 1. 세션 스토리지 저장
    sessionStorage.setItem("projectnum", project.projectnum || "");
    sessionStorage.setItem("projectname", project.projectname || "");
    sessionStorage.setItem("servername", project.servername || "");
    sessionStorage.setItem("projectpof", project.projectpof || "");
    sessionStorage.setItem("merge_pn", project.merge_pn || "");
    sessionStorage.setItem("merge_pn_text", project.merge_pn_text || "");

    // Update local state for immediate feedback
    setPageInfo(prev => ({
      ...prev,
      title: project.projectname || "조사명 없음"
    }));

    // Reset page info on project change
    sessionStorage.setItem("pageId", "");
    sessionStorage.setItem("pagetitle", "");
    setPageState({
      title: "대시보드(수정가능)",
      merge_pn: "-"
    });

    setIsProjectModalOpen(false); // 프로젝트 팝업 닫기

    // 프로젝트 선택 후 데이터 정보(시간) 조회
    if (project.merge_pn) {
      fetchDataInfo(project.merge_pn);
    }

    // 프로젝트/대시보드 관련 상태가 변경되었음을 알림
    window.dispatchEvent(new Event("pageSelected"));

    // 2. 대시보드 목록 조회
    try {
      const user = auth?.user?.userId;
      const mergePn = project.merge_pn;
      if (!user || !mergePn) {
        modal.showErrorAlert("알림", "프로젝트 정보가 올바르지 않습니다 (MergePN 누락).");
        return;
      }

      const pageRes = await pageList.mutateAsync({ user: user, pn: mergePn });

      if (pageRes?.success === "777") {
        const pages = pageRes.resultjson || [];
        if (pages.length === 1) {
          // 한 개일 때 바로 선택 (자동 저장)
          handlePageSelect(pages[0]);
        } else if (pages.length > 1) {
          // 여러 개일 때 팝업
          setPageListData(pages);
          setIsPageListPopupOpen(true);
        }
      }
    } catch (e) {
      modal.showErrorAlert("오류", "대시보드 목록 조회 중 오류가 발생했습니다.");
    }
  };

  // 대시보드 정보 state 추가
  const [pageState, setPageState] = useState({
    title: sessionStorage.getItem("pagetitle") || "대시보드(수정가능)",
    merge_pn: sessionStorage.getItem("merge_pn") || "-"
  });

  // pageSelected 이벤트 발생(다른 곳에서 삭제, 변경 등) 시 즉각 갱신
  useEffect(() => {
    const handlePageUpdate = () => {
      setPageState({
        title: sessionStorage.getItem("pagetitle") || "대시보드(수정가능)",
        merge_pn: sessionStorage.getItem("merge_pn") || "-"
      });
    };
    window.addEventListener("pageSelected", handlePageUpdate);
    return () => window.removeEventListener("pageSelected", handlePageUpdate);
  }, []);

  // 사이드바에 전달할 대시보드 정보
  const sidebarPageInfo = {
    title: pageState.title,
    subTitle: pageState.merge_pn,
    onSettingsClick: auth?.user?.userGroup === "H-SRT고객" ? undefined : () => {
      const user = auth?.user?.userId;
      const mergePn = sessionStorage.getItem("merge_pn");
      if (user && mergePn) {
        pageList.mutateAsync({ user: user, pn: mergePn }).then(res => {
          if (res?.success === "777") {
            setPageListData(res.resultjson);
            setIsPageListPopupOpen(true);
          }
        });
      }
    }
  };

  const userGroup = auth?.user?.userGroup || "";
  const isAiSolutionTeam = userGroup === "AI솔루션팀";
  const isHSRTCustomer = userGroup === "H-SRT고객";

  let computedMenuGroups = [...MENU_ITEMS];

  // H-SRT고객인 경우 세션에 있는 showmenu 값(권한 메뉴)으로만 메뉴 아이템을 필터링 구성합니다.
  if (isHSRTCustomer) {
    const showMenuStr = sessionStorage.getItem("showmenu");
    if (showMenuStr) {
      // 대소문자 구분 및 공백 없이 일치시키기 위해 소문자화 진행
      const allowedMenus = showMenuStr.split(",").map(m => m.replace(/\s+/g, '').toLowerCase());
      computedMenuGroups = computedMenuGroups.map(group => {
        const filteredItems = group.items.filter(item => {
          const cleanLabel = item.label.replace(/\s+/g, '').toLowerCase();
          return allowedMenus.some(allowed => allowed === cleanLabel);
        });
        return { ...group, items: filteredItems };
      }).filter(group => group.items.length > 0);
    }
  }

  if (isAiSolutionTeam) {
    computedMenuGroups.push({
      label: "시스템 관리",
      items: [
        { label: "메뉴 권한 설정", path: "/data_status/hsrt/menu_permission", icon: ShieldCheck },
      ]
    });
  }

  return (
    <>
      <Sidebar
        brand={{
          title: "",
          logoText: "H-SRT",
          logoClass: "menu-bar-logo",
          onClick: () => navigate(isHsrtCustomer ? "/data_status/hsrt/cross_analysis" : "/data_status/hsrt/add_question")
        }}
        menuGroups={computedMenuGroups}
        projectInfo={projectInfoData}
        pageInfo={sidebarPageInfo} // Add this
        theme="blue"
        moduleItems={moduleItems}
      />

      {isNewDataModalOpen && (
        <NewDataModal
          onClose={() => setIsNewDataModalOpen(false)}
          onConfirm={(data) => {
            setIsNewDataModalOpen(false);
          }}
        />
      )}
      {isProjectModalOpen && (
        <ProjectSelectionModal
          from="data_status"
          onSelect={handleProjectSelect}
          onClose={() => {
            setIsProjectModalOpen(false);
            const projectnum = sessionStorage.getItem("projectnum");
            if (!projectnum) {
              navigate("/");
            }
          }}
        />
      )}
      {/* Page List Popup */}
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

export default MenuBar;
