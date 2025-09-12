import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Fragment, useContext, useState } from "react";
import { useSelector } from "react-redux";
import { persistor } from "@/common/redux/store/StorePersist.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import { useCookies } from "react-cookie";

/**
 * 프로젝트 목록 클릭 시 → 탭: ["/"]
 * 문항 목록 이동 시 → 탭: ["/", "/pro_list"]
 * 분석 이동 시 → 탭: ["/", "/pro_list", "/open-setting"]
*/
const ROUTE_LABEL = {
  "/": "프로젝트 목록",
  "/pro_list": "문항 목록",
  "/open-setting": "분석",
};

// 현재 경로를 1뎁스로 정규화
const normalize = (p) => {
  if (!p || p === "/") return "/";
  const seg = p.split("?")[0].split("/").filter(Boolean);
  return "/" + (seg[0] || "");
};

// 현재 경로에 맞는 탭 트레일 계산
const trailFor = (key) => {
  if (key === "/open-setting") return ["/", "/pro_list", "/open-setting"];
  if (key === "/pro_list")     return ["/", "/pro_list"];
  return ["/"];
};

const MenuBar = () => {
  const [, , removeCookie] = useCookies();
  const auth = useSelector((store) => store.auth);
  const modal = useContext(modalContext);
  const navigate = useNavigate();
  const location = useLocation();
  const key = normalize(location.pathname);
  const tabs = trailFor(key);

  const doLogout = async () => {
    modal.showConfirm("알림", "로그아웃하시겠습니까?", {
      btns: [
        { title: "취소", background: "#75849a" },
        {
          title: "로그아웃",
          click: async () => {
            try {
              await persistor.purge();
              removeCookie("TOKEN", { path: "/" });
              navigate("/"); // 로그아웃 시 홈으로
            } catch {
              modal.showAlert("알림", "로그아웃을 하지 못하였습니다.");
            }
          },
        },
      ],
    });
  };

  return (
    <Fragment>
      <header>
        <h1
          className="logo"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/")}
        >
          설문온 <span className="fcG">OPEN</span>
        </h1>

        <div className="navWrap">
          <ul className="nav depth01">
            {tabs.map((path) => (
              <li key={path}>
                <NavLink
                  to={path}
                  end={path === "/"}                    // 루트는 end 필요
                  className={({ isActive }) => (isActive ? "on" : undefined)}
                >
                  {ROUTE_LABEL[path] ?? path}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="userWrap">
          <a className="userName" >{auth?.user?.userNm || ""}님</a>
          <a className="iconLogout" onClick={doLogout}>로그아웃</a>
        </div>
      </header>
    </Fragment>
  );
};

export default MenuBar;
