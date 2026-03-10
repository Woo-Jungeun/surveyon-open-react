import React, { useContext, useEffect, useState } from "react";
import Sidebar from "@/components/common/sidebar/Sidebar";
import {
  Info, Database, Wrench, FileText, Target, BarChart3, Grid,
  Table, ClipboardList, Sparkles, Upload, RefreshCw, Clock, Users, BrainCircuit
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
const MENU_ITEMS = [
  {
    label: "집계 현황",
    items: [
      { label: "빈도분석", path: "/data_status/analysis/frequency", icon: BarChart3 },
      { label: "교차분석", path: "/data_status/analysis/cross", icon: Table, isPending: true },
      { label: "추가분석", path: "/data_status/analysis/additional", icon: Grid },
      // todo 임시 주석  [쿼터현황/관리] 메뉴
      // { label: "쿼터현황/관리", path: "/data_status/analysis/quota", icon: ClipboardList },
      { label: "쿼터현황/관리", path: "/data_status/analysis/quota", icon: ClipboardList, isPending: true },
    ]
  },
  {
    label: "AI요약",
    items: [
      { label: "AI분석", path: "/data_status/ai/analysis", icon: Sparkles, isPending: true },
      { label: "AI리포트", path: "/data_status/ai/report", icon: FileText, isPending: true },
    ]
  },
  {
    label: "데이터설정",
    items: [
      // { label: "문항 관리", path: "/data_status/setting/variable", icon: Info },
      /* {
        label: "전체 데이터(뷰어)", path: "/data_status/setting/viewer", icon: Database,
        onClick: (e) => {
          e.preventDefault();
          const width = window.screen.width;
          const height = window.screen.height;
          window.open("/data_status/setting/viewer", "_blank", `width=${width},height=${height},left=0,top=0,resizable=yes,scrollbars=yes`);
        }
      }, */
      { label: "변수 생성", path: "/data_status/setting/recoding", icon: Wrench },
      { label: "DP 의뢰서 정의", path: "/data_status/setting/dp_definition", icon: FileText, isPending: true },
      { label: "가중치 생성", path: "/data_status/setting/weight", icon: Target },
    ]
  },
];

const MenuBar = ({ projectName, lastUpdated, onOpenProjectModal }) => {
  const modal = useContext(modalContext);
  const loadingSpinner = useContext(loadingSpinnerContext);
  const auth = useSelector((store) => store.auth);
  const navigate = useNavigate();
  const { getPageMetadata, getDataInfo, updateMap } = MenuBarApi();
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
    { label: "데이터현황", icon: <BarChart3 size={16} />, path: "/data_status/analysis/frequency", highlight: true },
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
    { label: "응답자관리", icon: <Users size={16} />, path: "/project", isDisabled: true },
  ];

  // 사이드바에 전달할 프로젝트 정보
  const projectInfoData = {
    title: pageInfo.title,
    subTitle: sessionStorage.getItem("merge_pn") || sessionStorage.getItem("projectpof") || "ID 미지정",
    onSettingsClick: () => {
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
    const userId = auth?.user?.userId;
    if (!userId || !pn) return;
    try {
      const result = await getDataInfo.mutateAsync({ user: userId, pn });
      if (result?.parquetBakedAt) {
        setPageInfo(prev => ({
          ...prev,
          processedAt: formatDate(result.parquetBakedAt)
        }));
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
      const result = await updateMap.mutateAsync({ user: userId, pn });

      if (result) {
        modal.showAlert("알림", "데이터 새로고침이 성공적으로 완료되었습니다.");
        // 새로고침 후 시간 정보 다시 가져오기
        await fetchDataInfo(pn);
      }
    } catch (err) {
      console.error("Refresh error", err);
      modal.showErrorAlert("오류", "데이터 새로고침 중 오류가 발생했습니다.");
    } finally {
      loadingSpinner.hide();
    }
  };

  // 추가 액션 영역 (날짜와 새로고침 아이콘 한 줄 정리)
  const ExtraActions = (
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
          <RefreshCw size={14} className={updateMap.isLoading ? "spin" : ""} />
        </button>
      </div>
    </div>
  );

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

    // 2. 대시보드 목록 조회
    try {
      const user = auth?.user?.userId;
      const mergePn = project.merge_pn;
      if (!user || !mergePn) {
        modal.showErrorAlert("알림", "프로젝트 정보가 올바르지 않습니다 (MergePN 누락).");
        return;
      }

      const pageRes = await pageList.mutateAsync({ user: user, pn: mergePn });

      if (pageRes?.success === "777" && pageRes.resultjson?.length > 0) {
        setPageListData(pageRes.resultjson);
        setIsPageListPopupOpen(true); // 대시보드 목록 팝업 열기
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

  // ... (existing code)

  const handlePageSelect = async (selectedPage) => {
    setIsPageListPopupOpen(false);
    const userId = auth?.user?.userId;
    const pageId = selectedPage.id || selectedPage.pageid;
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

    try {
      loadingSpinner.show();
      // 대시보드 메타데이터 조회 API 호출
      const metadataResult = await getPageMetadata.mutateAsync({ user: userId, pageid: pageId });
      console.log(metadataResult)
      // 페이지 메타데이터 조회 성공 시 로그만 출력하고, 
      // 사이드바의 '마지막 업데이트' 시간은 /d/data/info API 연동을 유지하기 위해 여기서 업데이트하지 않음
      loadingSpinner.hide();
    } catch (error) {
      console.error("API Error:", error);
      loadingSpinner.hide();
      modal.showErrorAlert("오류", "메타데이터 조회 중 오류가 발생했습니다.");
    }
  };

  // 사이드바에 전달할 대시보드 정보
  const sidebarPageInfo = {
    title: pageState.title,
    subTitle: pageState.merge_pn,
    onSettingsClick: () => {
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

  return (
    <>
      <Sidebar
        brand={{
          title: "데이터 현황",
          logoText: "SRT",
          logoClass: "menu-bar-logo",
          onClick: () => navigate("/data_status/analysis/frequency")
        }}
        menuGroups={MENU_ITEMS}
        projectInfo={projectInfoData}
        pageInfo={sidebarPageInfo} // Add this
        theme="blue"
        moduleItems={moduleItems}
        extraActions={ExtraActions}
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
