import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "@/services/homePage/HomePage.css";
import InfoSection from "@/services/homePage/InfoSection";
import BoardSection from "@/services/homePage/BoardSection";
import MenuSection from "@/services/homePage/MenuSection";
import { useSelector } from "react-redux";
import { LoginApi } from "@/services/login/LoginApi";

const HomePage = () => {
  const navigate = useNavigate();
  const { validateToken } = LoginApi();
  const auth = useSelector((store) => store.auth);
  useEffect(() => {
    // 고객 브라우저로 한 번 로그인한 이력이 있다면 메인 화면 진입 시 /cs로 리다이렉트
    if (localStorage.getItem("lastLoginType") === "customer") {
      navigate("/cs", { replace: true });
      return;
    }

    // 홈 화면 진입 시 프로젝트 관련 세션 데이터 초기화
    // const keysToClear = [
    //   "projectnum", "projectname", "servername", "projectpof",
    //   "merge_pn", "merge_pn_text", "qnum", "project_lock", "userPerm"
    // ];
    // keysToClear.forEach(key => sessionStorage.removeItem(key));

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
