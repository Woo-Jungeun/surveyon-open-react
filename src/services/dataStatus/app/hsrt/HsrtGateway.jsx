import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { DpRequestPageApi } from "./dpRequest/DpRequestPageApi";

export default function HsrtGateway() {
  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);
  const { getDpContext } = DpRequestPageApi();

  useEffect(() => {
    let isMounted = true;
    let cleanupPageListener = null;

    const routeUser = async () => {
      const pageId = sessionStorage.getItem("pageId");
      const myRole = sessionStorage.getItem("myRole");
      const groupcode = sessionStorage.getItem("groupcode");
      const userId = auth?.user?.userId;
      const isHsrtCustomer = auth?.user?.userGroup === "H-SRT고객" || groupcode === "999999991";

      // 1. H-SRT 고객이거나 viewer 역할이면 무조건 교차분석
      if (isHsrtCustomer || myRole === "viewer") {
        if (isMounted) navigate("/data_status/hsrt/cross_analysis", { replace: true });
        return;
      }

      // 2. pageId가 있는 경우 DP Context로 스터브 세팅 여부 확인
      if (pageId && pageId !== "null" && pageId !== "undefined" && userId) {
        try {
          const res = await getDpContext.mutateAsync({ pageid: pageId, page_id: pageId, user: userId });
          const context = res?.resultjson || res?.data?.resultjson || res;
          const hasStub = Boolean(
            context?.steps?.recoded?.completed === true ||
            context?.steps?.recoded?.completed === 1 ||
            context?.steps?.recoded?.completed === '1' ||
            context?.steps?.recoded?.completed === 'true'
          );

          if (isMounted) {
            if (hasStub) {
              navigate("/data_status/hsrt/cross_analysis", { replace: true });
            } else {
              navigate("/data_status/hsrt/dp_request?dp_view=table", { replace: true });
            }
          }
        } catch (err) {
          console.warn("HsrtGateway getDpContext check error:", err);
          if (isMounted) {
            navigate("/data_status/hsrt/dp_request?dp_view=table", { replace: true });
          }
        }
        return;
      }

      // 3. pageId가 아직 없는 경우: MenuBar의 자동 선택 완료(pageSelected) 이벤트 대기
      const handlePageSelected = () => {
        const newPageId = sessionStorage.getItem("pageId");
        if (newPageId && newPageId !== "null" && newPageId !== "undefined") {
          routeUser();
        }
      };

      window.addEventListener("pageSelected", handlePageSelected);
      const timer = setTimeout(() => {
        if (isMounted) {
          window.removeEventListener("pageSelected", handlePageSelected);
          navigate("/data_status/hsrt/dp_request?dp_view=table", { replace: true });
        }
      }, 1000);

      cleanupPageListener = () => {
        window.removeEventListener("pageSelected", handlePageSelected);
        clearTimeout(timer);
      };
    };

    routeUser();

    return () => {
      isMounted = false;
      if (cleanupPageListener) cleanupPageListener();
    };
  }, [auth?.user?.userId]);

  return (
    <div style={{
      display: "flex",
      height: "100%",
      minHeight: "400px",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: "12px",
      color: "#6b7280"
    }}>
      <div style={{
        width: "32px",
        height: "32px",
        border: "3px solid #e5e7eb",
        borderTopColor: "#3b82f6",
        borderRadius: "50%",
        animation: "hsrtSpin 0.8s linear infinite"
      }} />
      <span style={{ fontSize: "14px", fontWeight: 500 }}>화면으로 이동 중입니다...</span>
      <style>{`
        @keyframes hsrtSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
