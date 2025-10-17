import React, { Fragment, useState, useContext, useEffect, useCallback } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { Input } from "@progress/kendo-react-inputs";
import { modalContext } from "@/components/common/Modal.jsx";
import { useSelector } from "react-redux";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import ProPermissionGrid from "@/components/app/proPermission/ProPermissionGrid.jsx";
import { ProPermissionApi } from "@/components/app/proPermission/ProPermissionApi";

/**
 * 사용자 설정
 *
 * @author jewoo
 * @since 2025-10-17<br />
 */
const ProPermission = () => {
  const modal = useContext(modalContext);
  const auth = useSelector((store) => store.auth);
  const [loading, setLoading] = useState(false);
  const { proPermissionData } = ProPermissionApi();

  const projectnum = sessionStorage.getItem("projectnum");
  const projectname = sessionStorage.getItem("projectname");

  /** formData (기본값: 개인키) */
  const [formData, setFormData] = useState({
    pof: "",
    permission_gubun: "",
    worker_name: "",
    worker_id: "",
    worker_password: "",
    worker_position: "",
  });

  // 공통 업데이트 핸들러
  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const [gridData, setGridData] = useState([]);

  // 그리드 데이터 조회
  const fetchData = async () => {
    try {
      const payload = {
        params: {
          gb: "api_select",
          user: auth?.user?.userId || "",
        }
      };
      const res = await proPermissionData.mutateAsync(payload);
      if (res?.success === "777") {
        setGridData(res?.resultjson || []);
      } else {
        modal.showErrorAlert("에러", "사용자 설정 목록을 불러오지 못했습니다.");
      }

    } catch (err) {
      modal.showErrorAlert("에러", "사용자 설정 조회 중 오류가 발생했습니다.");
    }
  };

  /** 최초 진입 시 목록 조회 */
  useEffect(() => {
    fetchData();
  }, []);

  // 등록 버튼 
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const errs = [];
    if (!formData.pof.trim()) errs.push("POF를 입력해 주세요.");
    if (!formData.permission_gubun) errs.push("작업권한을 선택해 주세요.");

    if (["고객(읽기)", "일반(읽기)"].includes(formData.permission_gubun)) {
      if (!formData.worker_id.trim()) errs.push("고객 이메일을 입력해 주세요.");
      if (!formData.worker_password.trim()) errs.push("고객 비밀번호를 입력해 주세요.");
    } else {
      if (!formData.worker_name.trim()) errs.push("작업자 이름을 입력해 주세요.");
    }

    if (errs.length) {
      modal.showErrorAlert("알림", errs.join("\n"));
      return;
    }

    try {
      setLoading(true);
      console.log("formData", formData)
      // 고객 / 일반 구분하여 worker_position 설정
      let worker_position = "";
      if (formData.permission_gubun === "고객(읽기)") worker_position = "고객";
      else if (formData.permission_gubun === "일반(읽기)") worker_position = "일반";

      const payload = {
        params: {
          gb: "worker_enter",
          projectname,
          projectnum,
          ...formData,
          worker_position, // 추가됨
          user: auth?.user?.userId || "",
        },
      };
      console.log("payload", payload)
      const res = await proPermissionData.mutateAsync(payload);
      if (res?.success === "777") {
        modal.showConfirm("알림", "프로젝트 권한이 등록되었습니다.", {
          btns: [
            {
              title: "확인",
              click: async () => {
                await fetchData();
              },
            },
          ],
        });
      } else if (res?.success === "773") {
        // 773	이미 등록된 담당자입니다.
        modal.showErrorAlert("에러", res?.message);
      } else {
        modal.showErrorAlert("에러", res?.message || "등록 중 오류가 발생했습니다.");
      }
    } catch (err) {
      modal.showErrorAlert("알림", "네트워크 오류로 등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 프로젝트 삭제 이벤트
  const handleDeleteProject = useCallback(() => {
    modal.showConfirmAlert("확인", "프로젝트를 삭제하시겠습니까?", async () => {
      try {
        setLoading(true);
        // 👉 실제 삭제 API 호출 자리
        console.log("삭제 실행 projectnum:", projectnum);

        // 삭제 후 처리 예시
        modal.showAlert("알림", "프로젝트가 삭제되었습니다.");
        setGridData([]); // grid 초기화
      } catch (err) {
        modal.showErrorAlert("에러", "삭제 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  return (
    <Fragment>
      <article className="subTitWrap">
        <p className="subStep">
          <span>사용자 설정</span>
          <span> 프로젝트 권한 등록</span>
        </p>

        <div className="subTit">
          <h2 className="titTxt">프로젝트 권한 등록</h2>
        </div>
      </article>

      <article className="subContWrap">
        <div className="subCont">
          <form onSubmit={handleSubmit}>
            <div className="popCont">
              <div className="popTbl">
                <div className="cmn_pop_ipt">
                  <span style={{ width: "200px" }}>프로젝트명</span>
                  <Input
                    className="k-input k-input-solid"
                    value={projectname || ""}
                    disabled
                  />
                </div>
                <div className="cmn_pop_ipt">
                  <span style={{ width: "200px" }}>웹프로젝트번호</span>
                  <Input
                    className="k-input k-input-solid"
                    value={projectnum || ""}
                    disabled
                  />
                </div>

                {/* POF */}
                <div className="cmn_pop_ipt">
                  <span style={{ width: "200px" }}>* POF</span>
                  <Input
                    className="k-input k-input-solid"
                    value={formData.pof}
                    onChange={(e) => handleChange("pof", e.value)}
                    disabled={loading}
                  />
                </div>

                {/* 작업권한 */}
                <div className="cmn_pop_ipt">
                  <span style={{ width: "190px" }}>* 권한</span>
                  <DropDownList
                    data={[
                      "오픈팀(관리,읽기,쓰기)",
                      "제작자(관리,읽기,쓰기)",
                      "연구원(읽기,쓰기)",
                      "고객(읽기)",
                      "일반(읽기)",
                    ]}
                    value={formData.permission_gubun}
                    onChange={(e) => handleChange("permission_gubun", e.value)}
                    disabled={loading}
                  />
                </div>

                {/* 고객 or 일반일 경우 → 고객 이메일 / 고객비번 */}
                {["고객(읽기)", "일반(읽기)"].includes(formData.permission_gubun) ? (
                  <>
                    <div className="cmn_pop_ipt">
                      <span style={{ width: "200px" }}>* 고객 이메일</span>
                      <Input
                        className="k-input k-input-solid"
                        value={formData.worker_id || ""}
                        onChange={(e) => handleChange("worker_id", e.value)}
                        disabled={loading}
                      />
                    </div>

                    <div className="cmn_pop_ipt">
                      <span style={{ width: "200px" }}>* 고객 비밀번호</span>
                      <Input
                        type="password"
                        className="k-input k-input-solid"
                        value={formData.worker_password || ""}
                        onChange={(e) => handleChange("worker_password", e.value)}
                        disabled={loading}
                      />
                    </div>
                  </>
                ) : (
                  /* 고객/일반 외 → 작업자 이름 */
                  <div className="cmn_pop_ipt">
                    <span style={{ width: "200px" }}>* 작업자</span>
                    <Input
                      className="k-input k-input-solid"
                      value={formData.worker_name}
                      onChange={(e) => handleChange("worker_name", e.value)}
                      disabled={loading}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="popBtn">
              <div className="btnWrap" style={{ display: "flex", width: "100%" }}>
                <Button
                  type="button"
                  className="btnTxt"
                  themeColor="primary"
                  disabled={loading}
                  style={{ marginRight: "auto" }}
                  onClick={handleDeleteProject}

                >
                  프로젝트 삭제
                </Button>
                <Button
                  type="submit"
                  className="btnL"
                  themeColor="primary"
                  disabled={loading}
                  style={{ marginLeft: "auto" }}
                >
                  등록
                </Button>
              </div>
            </div>
          </form>

          {/* 사용자 설정 목록 */}
          <ProPermissionGrid data={gridData} setData={setGridData} fetchData={fetchData} />
        </div>
      </article>
    </Fragment>
  );
};

export default ProPermission;