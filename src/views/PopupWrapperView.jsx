import { Fragment } from "react";
import { Outlet } from "react-router-dom";

export default function PopupWrapperView() {
  return (
    <Fragment>
      {/* 메뉴/푸터 없는 레이아웃 */}
      <section className="layout-bare">
        <Outlet />
      </section>
    </Fragment>
  );
}
