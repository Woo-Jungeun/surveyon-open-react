import React, { Fragment, useRef, useState, useCallback, useContext, useEffect } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { Input } from "@progress/kendo-react-inputs";
import { modalContext } from "@/components/common/Modal.jsx";
import { useSelector } from "react-redux";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import ProPermissionGrid from "@/components/app/proPermission/ProPermissionGrid.jsx";

/**
 * 사용자 설정
 *
 * @author jewoo
 * @since 2025-10-02<br />
 */
const ProPermission = () => {
  const modal = useContext(modalContext);
  const auth = useSelector((store) => store.auth);
  const [loading, setLoading] = useState(false);

  const projectnum = sessionStorage.getItem("projectnum");
  const projectname = sessionStorage.getItem("projectname");

  // formData 객체로 모든 값 관리
  const [formData, setFormData] = useState({
    analysisModel: "", // API KEY 유형
    projectName: "",   // API 이름
    apiKey: "",        // API KEY 값
  });

  // 공통 업데이트 핸들러
  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const [gridData, setGridData] = useState([]);

  // 등록 버튼 이벤트
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const errs = [];
    if (!formData.analysisModel) errs.push("권한을 선택해 주세요.");
    if (!formData.projectName.trim()) errs.push("POF를 입력해 주세요.");
    if (!formData.apiKey.trim()) errs.push("작업자를 입력해 주세요.");

    if (errs.length) {
      modal.showErrorAlert("알림", errs.join("\n"));
      return;
    }

    try {
      setLoading(true);

      const payload = {
        gb: "NewProject",
        ...formData,
        user: auth?.user?.userId || "",
      };
      console.log("👉 전송 payload", payload);

      // 실제 저장 API 연동 후 성공 시 목록 갱신
      setGridData((prev) => [
        ...prev,
        {
          no: prev.length + 1,
          apiType: formData.analysisModel,
          apiName: formData.projectName,
          apiKey: formData.apiKey,
          regDate: new Date().toISOString().slice(0, 19).replace("T", " "),
          defaultUse: false,
        },
      ]);
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
  }, [modal, projectnum]);

  return (
    <Fragment>
      <article className="subTitWrap">
        <p className="subStep">
          <span>사용자 설정</span>
          <span> 프로젝트 권한 등록</span>
        </p>

        <div className="subTit">
          <h2 className="titTxt"> 프로젝트 권한 등록</h2>
        </div>
      </article>

      <article className={`subContWrap`}>
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
                <div className="cmn_pop_ipt">
                  <span style={{ width: "200px" }}>POF</span>
                  <Input
                    className="k-input k-input-solid"
                    value={formData.projectName}
                    onChange={(e) => handleChange("projectName", e.value)}
                    disabled={loading}
                  />
                </div>
                <div className="cmn_pop_ipt">
                  <span style={{ width: "200px" }}>작업자</span>
                  <Input
                    className="k-input k-input-solid"
                    value={formData.apiKey}
                    onChange={(e) => handleChange("apiKey", e.value)}
                    disabled={loading}
                  />
                </div>
                <div className="cmn_pop_ipt">
                  <span style={{ width: "190px" }}>권한</span>
                  <DropDownList
                    data={["오픈팀(관리,읽기,쓰기)", "제작자(관리,읽기,쓰기)", "연구원(읽기,쓰기)", "고객(읽기)", "일반(읽기)"]}
                    value={formData.analysisModel}
                    onChange={(e) => handleChange("analysisModel", e.value)}
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
          <ProPermissionGrid data={gridData} setData={setGridData} />
        </div>
      </article>
    </Fragment>
  );
};

export default ProPermission;