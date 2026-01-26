import React from "react";
import { FileText, BarChart3, Database, BrainCircuit, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useCookies } from "react-cookie";

const menuItems = [
  {
    id: "survey-creation",
    title: "설문제작",
    path: "/survey_creation",
    description:
      "직관적인 인터페이스로 다양한 유형의 설문을 손쉽게 제작할 수 있습니다.",
    icon: FileText,
    status: "예정",
    color: "#A060FF",
    bg: "rgba(160,96,255,0.12)",
    statusColor: "#6E6E6E"
  },
  {
    id: "data-dashboard",
    title: "데이터현황",
    path: "/data_status",
    description:
      "문항집계, 교차분석, AI 분석, AI 보고서를 통해 수집된 데이터를 종합적으로 분석합니다.",
    icon: BarChart3,
    status: "개발중",
    color: "#4EA3FF",
    bg: "rgba(78,163,255,0.12)",
    statusColor: "#F8B400"
  },
  {
    id: "data-management",
    title: "데이터관리",
    path: "/data_management",
    description:
      "설문 응답 데이터를 효율적으로 관리하고 필터링, 정제, 내보내기 작업을 수행합니다.",
    icon: Database,
    status: "예정",
    color: "#23C6A3",
    bg: "rgba(35,198,163,0.12)",
    statusColor: "#6E6E6E"
  },
  {
    id: "ai-open-analysis",
    title: "AI오픈분석",
    path: "/ai_open_analysis",
    description:
      "개방형 응답에 대한 AI 기반 심층 분석으로 인사이트를 발굴합니다.",
    icon: BrainCircuit,
    status: "정식오픈",
    color: "#FF913A",
    bg: "rgba(255,145,58,0.12)",
    statusColor: "#2DB670"
  },
  {
    id: "respondent-management",
    title: "응답자관리",
    path: "/respondent_management",
    description:
      "응답자 정보를 체계적으로 관리하고 응답 현황을 모니터링합니다.",
    icon: Users,
    status: "예정",
    color: "#6D67FF",
    bg: "rgba(109,103,255,0.12)",
    statusColor: "#6E6E6E"
  }
];

const MenuSection = () => {
  const navigate = useNavigate();
  const auth = useSelector((store) => store.auth);
  const [cookies] = useCookies(["TOKEN"]);
  const isLoggedIn = auth?.isLogin && cookies?.TOKEN;

  return (
    <section className="hp-menu-section">
      <div className="hp-menu-title-wrap">
        <h2 className="hp-menu-title">통합 플랫폼 기능</h2>
        <p className="hp-menu-desc">
          설문온의 강력한 5가지 핵심 기능을 경험해보세요.
        </p>
        {!isLoggedIn && (
          <p className="hp-menu-desc" style={{ color: "#FF5252", marginTop: "8px", fontWeight: "500" }}>
            * 로그인 후 이용 가능합니다.
          </p>
        )}
      </div>

      <div className="hp-menu-grid">
        {menuItems.map((item) => {
          // 설문제작, 데이터관리, 응답자관리는 항상 disabled
          const isDisabled =
            item.id === "survey-creation" ||
            item.id === "data-management" ||
            // item.id === "respondent-management" || item.id === "data-dashboard";
            item.id === "respondent-management";
          const handleCardClick = () => {
            if (isDisabled) return;

            if (!isLoggedIn) {
              navigate("/login", { state: { from: item.path } });
              return;
            }

            // 데이터현황은 Figma로 이동
            // if (item.id === "data-dashboard") {
            //   window.open("https://www.figma.com/make/u0CvOS5hjvbUv9C6aisDE6/Flowchart-Builder--%EB%B3%B5%EC%82%AC-?t=AWSAkepOTGxvb6VA-20&fullscreen=1", "_blank");
            // } else {
            navigate(item.path);
            // }
          };

          return (
            <div
              key={item.id}
              className="hp-menu-card"
              style={{
                "--menu-color": item.color,
                "--menu-bg": item.bg,
                cursor: isDisabled ? "not-allowed" : "pointer"
              }}
              onClick={handleCardClick}
            >
              <div
                className="hp-menu-card-top"
                style={{ backgroundColor: item.color }}
              ></div>

              <div
                className="hp-menu-status"
                style={{ backgroundColor: item.statusColor }}
              >
                {item.status}
              </div>

              <div className="hp-menu-content">
                <div
                  className="hp-menu-icon-wrap"
                  style={{ backgroundColor: item.bg }}
                >
                  <item.icon className="hp-menu-icon" style={{ color: item.color }} />
                </div>

                <h3 className="hp-menu-card-title">{item.title}</h3>
                <p className="hp-menu-card-desc">{item.description}</p>

                <button
                  className={`hp-menu-card-btn ${isDisabled ? "disabled" : ""}`}
                  style={{ backgroundColor: item.color }}
                  disabled={isDisabled}
                  onClick={(e) => {
                    e.stopPropagation(); // 카드 클릭과 중복 방지
                    handleCardClick();
                  }}
                >
                  시작하기 →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section >
  );
};

export default MenuSection;
