import React, { useContext, useEffect, useState } from "react";
import Sidebar from "@/components/common/sidebar/Sidebar";
import {
  Info, Database, Wrench, FileText, Target, BarChart3, Grid,
  Table, ClipboardList, Sparkles, Upload, RefreshCw, Clock, Users, BrainCircuit,
  Map as MapIcon, ClipboardCheck
} from "lucide-react";
import { modalContext } from "@/components/common/Modal.jsx";
import NewDataModal from "./NewDataModal";
import ProjectSelectionModal from "./ProjectSelectionModal";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

const getMenuItems = () => {
  const serverName = sessionStorage.getItem("servername");
  const items = [
    {
      label: "데이터설정",
      items: [
        { label: "맵 관리", path: "/data_management/setting/map", icon: MapIcon }
      ]
    }
  ];

  if (serverName !== "NEW") {
    items.push({
      label: "",
      items: [
        { label: "설문 테스트", path: "/data_management/survey_test", icon: ClipboardCheck }
      ]
    });
  }

  return items;
};

const MenuBar = ({ projectName, lastUpdated, onOpenProjectModal }) => {
  const modal = useContext(modalContext);
  const loadingSpinner = useContext(loadingSpinnerContext);
  const auth = useSelector((store) => store.auth);
  const navigate = useNavigate();

  const [isNewDataModalOpen, setIsNewDataModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
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
    {
      label: "H-SRT",
      icon: <Grid size={16} />,
      path: "/data_status/hsrt/add_question",
      onClick: () => { navigate("/data_status/hsrt/add_question"); }
    },
    {
      label: "데이터관리",
      icon: <Database size={16} />,
      path: "/data_management/setting/map",
      highlight: true
    },
    {
      label: "AI오픈분석",
      icon: <BrainCircuit size={16} />,
      path: "/ai_open_analysis",
      onClick: () => {
        navigate("/ai_open_analysis");
      }
    },
    { label: "실사관리", icon: <ClipboardList size={16} />, path: "/field_management/analysis/frequency", onClick: () => { navigate("/field_management/analysis/frequency"); } },
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

    setIsProjectModalOpen(false); // 프로젝트 팝업 닫기

    // Trigger event context change for MapManagementPage
    window.dispatchEvent(new Event("pageSelected"));
  };



  const ExtraActions = (
    !(sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum') || '').toLowerCase().startsWith('q') ? (
      <div className="new-setting-wrapper" style={{ padding: '0 20px 16px 20px' }}>
        <button
          className="new-setting-btn"
          onClick={() => { window.dispatchEvent(new Event('openUploadModal')); }}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 14px',
            borderRadius: '8px',
            background: '#ffffff',
            border: '1px solid #22c55e',
            boxShadow: '0 1px 2px rgba(34, 197, 94, 0.05)',
            transition: 'all 0.2s ease',
            width: '100%',
            cursor: 'pointer',
            color: '#16a34a',
            fontWeight: 600,
            fontSize: '14px',
            gap: '8px'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#f0fdf4';
            e.currentTarget.style.border = '1px solid #16a34a';
            e.currentTarget.style.boxShadow = '0 2px 5px rgba(22, 163, 74, 0.1)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.border = '1px solid #22c55e';
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(34, 197, 94, 0.05)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <Upload size={16} strokeWidth={2.5} />
          <span className="new-setting-text">신규 세팅</span>
        </button>
      </div>
    ) : null
  );

  return (
    <>
      <Sidebar
        brand={{
          title: "데이터 관리",
          // logoText: "H-SRT",
          logoClass: "menu-bar-logo",
          onClick: () => navigate("/data_management/setting/map")
        }}
        menuGroups={getMenuItems()}
        projectInfo={projectInfoData}
        theme="green"
        moduleItems={moduleItems}
      // extraActions={ExtraActions}
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
          from="data_management"
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
    </>
  );
};

export default MenuBar;

