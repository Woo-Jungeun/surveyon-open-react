import React, { Fragment, useRef, useState, useCallback, useContext, useEffect } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { Input } from "@progress/kendo-react-inputs";
import { modalContext } from "@/components/common/Modal.jsx";
import { useSelector } from "react-redux";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import ProKeyGrid from "@/components/app/proKey/ProKeyGrid.jsx";

/**
 * API KEY 등록
 *
 * @author jewoo
 * @since 2025-10-01<br />
 */
const ProKey = () => {
  const modal = useContext(modalContext);
  const auth = useSelector((store) => store.auth);
  const [loading, setLoading] = useState(false);
  
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
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const errs = [];
    if (!formData.analysisModel) errs.push("API KEY 유형을 선택해 주세요.");
    if (!formData.projectName.trim()) errs.push("API 이름을 입력해 주세요.");
    if (!formData.apiKey.trim()) errs.push("API KEY를 입력해 주세요.");

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

  return (
    <Fragment>
      <article className="subTitWrap">
        <div className="subTit">
          <h2 className="titTxt">API KEY 등록</h2>
        </div>
      </article>

      <article className={`subContWrap`}>
        <div className="subCont">
          <form onSubmit={handleSubmit}>
            <div className="popCont">
              <div className="popTbl">
                <div className="cmn_pop_ipt">
                  <span style={{ width: "200px" }}>사용자</span>
                  <Input
                    className="k-input k-input-solid"
                    value={auth?.user?.userNm || ""}
                    disabled
                  />
                </div>
                <div className="cmn_pop_ipt">
                  <span style={{ width: "190px" }}>API KEY 유형선택</span>
                   <DropDownList
                    data={["개인키", "부서공용키", "회사공용키"]}
                    value={formData.analysisModel}
                    onChange={(e) => handleChange("analysisModel", e.value)}
                    disabled={loading}
                  />
                </div>
                <div className="cmn_pop_ipt">
                  <span style={{ width: "200px" }}>API 이름</span>
                  <Input
                    className="k-input k-input-solid"
                    value={formData.projectName}
                    onChange={(e) => handleChange("projectName", e.value)}
                    disabled={loading}
                  />
                </div>
                <div className="cmn_pop_ipt">
                  <span style={{ width: "200px" }}>API KEY</span>
                  <Input
                    className="k-input k-input-solid"
                    value={formData.apiKey}
                    onChange={(e) => handleChange("apiKey", e.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="popBtn">
              <div className="btnWrap">
                <Button
                  type="submit"
                  className="btnL"
                  themeColor="primary"
                  disabled={loading}
                >
                  등록
                </Button>
              </div>
            </div>
          </form>
          <ProKeyGrid data={gridData} setData={setGridData} />
        </div>
      </article>
    </Fragment>
  );
};

export default ProKey;