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
    api_gubun: "1", // 기본값 개인키
    api_name: "",
    api_key: "",
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

    // 필수값 체크
    const errs = [];
    if (!formData.api_gubun) errs.push("API KEY 유형을 선택해 주세요.");
    if (!formData.api_name.trim()) errs.push("API 이름을 입력해 주세요.");
    if (!formData.api_key.trim()) errs.push("API KEY를 입력해 주세요.");

    if (errs.length) {
      modal.showErrorAlert("알림", errs.join("\n"));
      return;
    }

    try {
      setLoading(true);

      const payload = {
        params: {
          gb: "api_enter",
          ...formData,
          user: auth?.user?.userId || "",
        }
      };
      const res = await proKeyData.mutateAsync(payload);
      if (res?.success === "777") {
        modal.showConfirm("알림", "API KEY가 등록되었습니다.", {
          btns: [{
            title: "확인",
            click: async () => {
              await fetchData(); // 재조회
            },
          }],
        });
      } else if (res?.success === "770") {
        // 이미 등록된 api key입니다..
        modal.showErrorAlert("에러", res?.message);
      } else {
        modal.showErrorAlert("에러", "등록 중 오류가 발생했습니다.");
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

                {/* API 이름 */}
                <div className="cmn_pop_ipt">
                  <span style={{ width: "200px" }}>* POF</span>
                  <Input
                    className="k-input k-input-solid"
                    value={formData.api_name}
                    onChange={(e) => handleChange("api_name", e.value)}
                    disabled={loading}
                  />
                </div>
                {/* 권한 */}
                <div className="cmn_pop_ipt">
                  <span style={{ width: "190px" }}>권한</span>
                  <DropDownList
                    data={["오픈팀(관리,읽기,쓰기)", "제작자(관리,읽기,쓰기)", "연구원(읽기,쓰기)", "고객(읽기)", "일반(읽기)"]}
                    value={formData.analysisModel}
                    onChange={(e) => handleChange("analysisModel", e.value)}
                    disabled={loading}
                  />
                </div>
                {/* 작업자 */}
                <div className="cmn_pop_ipt">
                  <span style={{ width: "200px" }}>* 작업자</span>
                  <Input
                    className="k-input k-input-solid"
                    value={formData.api_key}
                    onChange={(e) => handleChange("api_key", e.value)}
                    disabled={loading}
                  />
                </div>
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