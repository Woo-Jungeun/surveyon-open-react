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

// 메뉴 아이템 정의
const MENU_ITEMS = [
  {
    label: "데이터설정",
    items: [
      { label: "문항 관리", path: "/data_status/setting/variable", icon: Info },
      {
        label: "전체 데이터(뷰어)", path: "/data_status/setting/viewer", icon: Database,
        onClick: (e) => {
          e.preventDefault();
          const width = window.screen.width;
          const height = window.screen.height;
          window.open("/data_status/setting/viewer", "_blank", `width=${width},height=${height},left=0,top=0,resizable=yes,scrollbars=yes`);
        }
      },
      { label: "변수 생성", path: "/data_status/setting/recoding", icon: Wrench },
      { label: "DP 의뢰서 정의", path: "/data_status/setting/dp_definition", icon: FileText, isPending: true },
      { label: "가중치 생성", path: "/data_status/setting/weight", icon: Target },
    ]
  },
  {
    label: "집계 현황",
    items: [
      { label: "문항 집계 현황", path: "/data_status/aggregation/status", icon: BarChart3 },
      { label: "교차 테이블", path: "/data_status/aggregation/cross", icon: Grid },
      { label: "DP 테이블", path: "/data_status/aggregation/dp_table", icon: Table, isPending: true },
      { label: "쿼터현황/관리", path: "/data_status/aggregation/quota", icon: ClipboardList },
    ]
  },
  {
    label: "AI요약",
    items: [
      { label: "AI분석", path: "/data_status/ai/analysis", icon: Sparkles, isPending: true },
      { label: "AI리포트", path: "/data_status/ai/report", icon: FileText, isPending: true },
    ]
  },
];

const MenuBar = ({ projectName, lastUpdated, onOpenProjectModal }) => {
  const modal = useContext(modalContext);
  const loadingSpinner = useContext(loadingSpinnerContext);
  const auth = useSelector((store) => store.auth);
  const navigate = useNavigate();
  const { getPageMetadata } = MenuBarApi();
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
    { label: "데이터현황", icon: <BarChart3 size={16} />, path: "/data_status/setting/variable", highlight: true },
    { label: "데이터관리", icon: <Database size={16} />, path: "/data_status", isDisabled: true },
    {
      label: "AI오픈분석",
      icon: <BrainCircuit size={16} />,
      path: "/project/pro_list",
      onClick: () => {
        navigate("/project/pro_list");
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

  // 추가 액션 영역 (데이터 등록, 새로고침 버튼)
  const ExtraActions = (
    <div style={{ padding: '0 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <button
        className="menu-bar-action-btn"
        onClick={() => setIsNewDataModalOpen(true)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', borderRadius: '8px', border: '1px solid #e0e0e0', background: '#fff', fontSize: '14px', fontWeight: '600', color: '#333', cursor: 'pointer' }}
      >
        <Upload size={16} />
        <span>데이터 신규등록</span>
      </button>
      <button
        className="menu-bar-action-btn"
        onClick={() => modal.showAlert("알림", "데이터 새로고침 기능은 준비 중입니다.")}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', borderRadius: '8px', border: '1px solid #e0e0e0', background: '#fff', fontSize: '14px', fontWeight: '600', color: '#333', cursor: 'pointer' }}
      >
        <RefreshCw size={16} />
        <span>데이터 새로고침</span>
      </button>
      <div className="last-updated-text" style={{ fontSize: '11px', color: '#999', textAlign: 'center', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
        <Clock size={12} strokeWidth={2.5} />
        <span>{pageInfo.processedAt}</span>
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
      title: "페이지 없음",
      merge_pn: "-"
    });

    setIsProjectModalOpen(false); // 프로젝트 팝업 닫기

    // 2. 페이지 목록 조회
    try {
      const user = auth?.user?.userId;
      const mergePn = project.merge_pn;
      if (!user || !mergePn) {
        modal.showErrorAlert("알림", "프로젝트 정보가 올바르지 않습니다 (MergePN 누락).");
        return;
      }

      const pageRes = await pageList.mutateAsync({ user: user, merge_pn: mergePn });

      if (pageRes?.success === "777" && pageRes.resultjson?.length > 0) {
        setPageListData(pageRes.resultjson);
        setIsPageListPopupOpen(true); // 페이지 목록 팝업 열기
      } else {
        modal.showAlert("알림", "조회된 페이지가 없습니다. \n프로젝트를 다시 선택해주세요.", null, () => {
          setIsProjectModalOpen(true);
        });
      }
    } catch (e) {
      modal.showErrorAlert("오류", "페이지 목록 조회 중 오류가 발생했습니다.");
    }
  };

  // 페이지 정보 state 추가
  const [pageState, setPageState] = useState({
    title: sessionStorage.getItem("pagetitle") || "페이지 없음",
    merge_pn: sessionStorage.getItem("merge_pn") || "-"
  });

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
      // 페이지 메타데이터 조회 API 호출
      const metadataResult = await getPageMetadata.mutateAsync({ user: userId, pageid: pageId });

      if (metadataResult?.success === "777") {
        const { resultjson } = metadataResult;
        if (resultjson) {
          // 처리 일시 포맷팅 (YYYY-MM-DD HH:mm:ss)
          const rawDate = resultjson?.dataset?.processedAt;
          let formattedDate = "-";
          if (rawDate) {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
              const pad = (n) => String(n).padStart(2, '0');
              formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
            } else {
              formattedDate = rawDate;
            }
          }

          setPageInfo(prev => ({
            ...prev,
            processedAt: formattedDate
          }));
        }
      } else {
        modal.showErrorAlert("에러", metadataResult?.message || "메타데이터 조회 실패");
      }
      loadingSpinner.hide();
    } catch (error) {
      console.error("API Error:", error);
      loadingSpinner.hide();
      modal.showErrorAlert("오류", "메타데이터 조회 중 오류가 발생했습니다.");
    }
  };

  // 사이드바에 전달할 페이지 정보
  const sidebarPageInfo = {
    title: pageState.title,
    subTitle: pageState.merge_pn,
    onSettingsClick: () => {
      // Open page list popup
      // We need to fetch the list like in handleProjectSelect, or just open if we have data?
      // We might need to re-fetch if project changed, but usually project is same.
      // Let's try to reuse the fetch logic or just open if we have data.
      // But better to fetch to be safe or checks.
      // Since handleProjectSelect fetches and sets data, maybe we can just open?
      // But what if we refreshed? pageList data might be empty.
      // So we should fetch page list again using current merge_pn.

      const user = auth?.user?.userId;
      const mergePn = sessionStorage.getItem("merge_pn");
      if (user && mergePn) {
        pageList.mutateAsync({ user: user, merge_pn: mergePn }).then(res => {
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
          onClick: () => navigate("/data_status/setting/variable")
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
