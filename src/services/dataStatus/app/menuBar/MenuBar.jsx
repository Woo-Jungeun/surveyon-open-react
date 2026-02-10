import React, { useContext, useEffect, useState } from "react";
import Sidebar from "@/components/common/sidebar/Sidebar";
import {
  Info, Database, Wrench, FileText, Target, BarChart3, Grid,
  Table, ClipboardList, Sparkles, Upload, RefreshCw, List, Users, BrainCircuit
} from "lucide-react";
import { modalContext } from "@/components/common/Modal.jsx";
import NewDataModal from "./NewDataModal";
import { MenuBarApi } from "./MenuBarApi";
import ProjectSelectionModal from "./ProjectSelectionModal";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

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
  const auth = useSelector((store) => store.auth);
  const navigate = useNavigate();
  const { getPageMetadata } = MenuBarApi();

  const [isNewDataModalOpen, setIsNewDataModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [pageInfo, setPageInfo] = useState({
    title: projectName || sessionStorage.getItem("projectname") || "조사명 없음",
    processedAt: lastUpdated || "-"
  });

  // 페이지 메타데이터 조회 (프로젝트 정보 업데이트)
  useEffect(() => {
    const fetchData = async () => {
      if (auth?.user?.userId) {
        const userId = auth.user.userId;
        const pageId = "0c1de699-0270-49bf-bfac-7e6513a3f525";

        try {
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
                title: resultjson?.title,
                processedAt: formattedDate
              }));
            }
          }
        } catch (error) {
          console.error("API Error:", error);
        }
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.user?.userId]); // getPageMetadata를 의존성에서 제거하여 무한 루프 방지

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
    subTitle: sessionStorage.getItem("projectpof") || "ID 미지정",
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
    </div>
  );

  return (
    <>
      <Sidebar
        brand={{ title: "데이터 현황", logoText: "SRT", logoClass: "menu-bar-logo" }}
        menuGroups={MENU_ITEMS}
        projectInfo={projectInfoData}
        theme="blue"
        moduleItems={moduleItems}
        extraActions={ExtraActions}
      />
      {isNewDataModalOpen && (
        <NewDataModal
          onClose={() => setIsNewDataModalOpen(false)}
          onConfirm={(data) => {
            console.log("New Data:", data);
            setIsNewDataModalOpen(false);
          }}
        />
      )}
      {isProjectModalOpen && (
        <ProjectSelectionModal
          onSelect={(project) => {
            sessionStorage.setItem("projectnum", project.projectnum || "");
            sessionStorage.setItem("projectname", project.projectname || "");
            sessionStorage.setItem("servername", project.servername || "");
            sessionStorage.setItem("projectpof", project.projectpof || "");
            sessionStorage.setItem("merge_pn", project.merge_pn || "");
            sessionStorage.setItem("merge_pn_text", project.merge_pn_text || "");
            setIsProjectModalOpen(false);
            navigate(0); // Refresh to apply session changes
          }}
          onClose={() => {
            setIsProjectModalOpen(false);
            // Only go home if no project is selected
            const projectnum = sessionStorage.getItem("projectnum");
            if (!projectnum) {
              navigate("/"); // Go home if no project selected
            }
          }}
        />
      )}
    </>
  );
};

export default MenuBar;
