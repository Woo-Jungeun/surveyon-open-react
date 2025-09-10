import { NavLink, useNavigate } from "react-router-dom";
import { Fragment, useContext, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { persistor } from "@/common/redux/store/StorePersist.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import { useCookies } from "react-cookie";
import { LoginApi } from "@/components/app/login/LoginApi.js";
import { menuTreeSet } from "@/common/utils/DataTypeUtil.jsx";
import PasswordSettingPopup from "@/components/app/login/PasswordSettingPopup.jsx";
import MyPagePopup from "@/components/app/login/MyPagePopup.jsx";

const MenuBar = ({ authMenuList, setAuthMenuList, setMenuData }) => {
  const [, , removeCookie] = useCookies();
  const auth = useSelector((store) => store.auth);
  const modal = useContext(modalContext);
  const navigate = useNavigate()

  const { loginMenuAuthMutation, logoutMutation, getMyInfoMutation } = LoginApi();
  const [passwordPopupShow, setPasswordPopupShow] = useState(false);  // 비밀번호 설정 팝업 popupShow
  const [passwordPopupValue, setPasswordPopupValue] = useState({});        // 비밀번호 설정 팝업 popupValue
  const [myPagePopupShow, setMyPagePopupShow] = useState(false);      // 마이페이지 팝업 popupShow
  const [myPagePopupValue, setMyPagePopupValue] = useState({});            // 마이페이지 팝업 popupValue

  useEffect(() => {
    //로그인 성공 시 아이디 별 메뉴 권한 리스트
    if (auth.isLogin) {
      menuListFunc().then();
    }
  }, []);

  /**
   * 선택된 대메뉴 활성화
   * */
  const [pathname, setPathname] = useState();
  useEffect(() => {
    setPathname("/" + location.pathname.split("/")[1]);
  }, [location.pathname]);

  /**
   * 아이디 별 메뉴 권한 체크
   *
   * @author JungEun Woo
   * @since 2024-04-22<br />
   */
  const menuListFunc = async () => {
    let menuTree = [];
    const res = await loginMenuAuthMutation.mutateAsync();
    if (res.status === "NS_OK") {
      //메뉴 트리
      menuTree = menuTreeSet(res.items);
      setAuthMenuList(menuTree);
      setMenuData(res.items); // 가공되지않은 메뉴 데이터
    }
  }

  /**
   * 로그아웃 API
   *
   * @author JungEun Woo
   * @since 2024-04-12<br />
   */
  const doLogout = async () => {
    modal.showConfirm("알림",
      "로그아웃하시겠습니까?", {
      btns: [
        {
          title: "취소",
          background: "#75849a"
        },
        {
          title: "로그아웃",
          click: async () => {
            try {
              const result = await logoutMutation.mutateAsync();
              if (result.status === "NS_OK") {
                await persistor.purge();
                removeCookie("TOKEN", { path: '/' });
              } else {
                modal.showAlert("알림", "로그아웃을 하지 못하였습니다.");
              }

            } catch (err) {
              modal.showAlert("알림", "로그아웃을 하지 못하였습니다.");
            }
          }
        }
      ]
    });
  }

  /**
   * PasswordSettingPopup 값 변경
   */
  const passwordSetting = () => {
    setPasswordPopupValue({ userId: auth?.user?.userId });
    setPasswordPopupShow(true);
  }

  /**
   * MyPagePopup 값 변경
   */
  const myPage = async () => {
    const res = await getMyInfoMutation.mutateAsync();
    if (res.status === "NS_OK") {
      setMyPagePopupValue(res.item);
      setMyPagePopupShow(true);
    }
  }

  return (
    <Fragment>
      <header>
        <h1 className="logo"
          style={{ cursor: "pointer" }}
          onClick={() => {
            navigate("/")
          }}>
          설문온 <span className="fcG">OPEN</span></h1>
        <div className="navWrap">
          <ul className="nav depth01">
            <li key={"li-1"}>
              <NavLink to="/o2/main_list" className={({ isActive }) => (isActive ? "on" : undefined)}>프로젝트 목록</NavLink>
            </li>
            <li key={"li-2"}>
              <NavLink to="/o2/pro_list" className={({ isActive }) => (isActive ? "on" : undefined)}>문항 목록</NavLink>

            </li>
            <li key={"li-3"}>
              <NavLink to="/o2" end className={({ isActive }) => (isActive ? "on" : undefined)}>분석</NavLink>
            </li>
          </ul>
        </div>
        <div className="userWrap">
          <a className="userName" onClick={myPage}>{auth?.user?.userNm || ''}님</a>
          <a className="iconSetPw" onClick={passwordSetting}>비밀번호 설정</a>
          <a className="iconLogout" onClick={doLogout}>로그아웃</a>
        </div>
      </header>
      {passwordPopupShow &&
                <PasswordSettingPopup
                    popupShow={passwordPopupShow}
                    setPopupShow={setPasswordPopupShow}
                    popupValue={passwordPopupValue}
                    setPopupValue={setPasswordPopupValue}
                />
            }
            {myPagePopupShow &&
                <MyPagePopup
                    popupShow={myPagePopupShow}
                    setPopupShow={setMyPagePopupShow}
                    popupValue={myPagePopupValue}
                    setPopupValue={setMyPagePopupValue}
                />
            }
    </Fragment>
  );
};

export default MenuBar;
