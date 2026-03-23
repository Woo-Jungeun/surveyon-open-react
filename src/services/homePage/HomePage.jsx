import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "@/services/homePage/HomePage.css";
import InfoSection from "@/services/homePage/InfoSection";
import BoardSection from "@/services/homePage/BoardSection";
import MenuSection from "@/services/homePage/MenuSection";
import { useSelector } from "react-redux";
import { LoginApi } from "@/services/login/LoginApi";
import { useCookies } from "react-cookie";

const HomePage = () => {
  const navigate = useNavigate();
  const { validateToken } = LoginApi();
  const auth = useSelector((store) => store.auth);
  const [cookies] = useCookies();

  useEffect(() => {
    // 이미 로그인된 고객 계정이 메인 화면('/')에 접근하는 것을 방지
    const isLoggedIn = auth?.isLogin && cookies?.TOKEN;
    if (isLoggedIn && sessionStorage.getItem("groupcode") === "999999991") {
      let targetPath = "/data_status";
      const showmenu = sessionStorage.getItem("showmenu");
      if (showmenu) {
        const firstMenuLabel = showmenu.split(",")[0].replace(/\s+/g, "");
        const menuPathMap = {
          "빈도분석": "/data_status/analysis/additional",
          "배너설정": "/data_status/analysis/additional",
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
      navigate(targetPath, { replace: true });
      return;
    }

    if (auth?.user?.userId) {
      validateToken.mutate({ user: auth.user.userId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="homepage-container">
      <InfoSection />
      <BoardSection />
      <MenuSection />
    </div>
  );
};

export default HomePage;
