import React, { useState, useRef, useContext, Fragment } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { modalContext } from "@/components/common/Modal.jsx";
import { Button } from "@progress/kendo-react-buttons";
import { Input } from "@progress/kendo-react-inputs";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import ProRegisterPopup from "@/components/app/proRegister/ProRegisterPopup";

const ProRegisterTab2 = () => {
  const auth = useSelector((store) => store.auth);
  const modal = useContext(modalContext);
  const navigate = useNavigate();

  const projectnum = sessionStorage.getItem("projectnum");
  const projectname = sessionStorage.getItem("projectname");

  const [analysisModel, setAnalysisModel] = useState("설문온");
  const [file, setFile] = useState(null);
  const [idColumn, setIdColumn] = useState("");
  const [loading, setLoading] = useState(false);
  const [popupShow, setPopupShow] = useState(false);   

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!analysisModel || !file || !idColumn || !answerColumn || !qnum || !qcontent) {
      modal.showErrorAlert("알림", "필수 입력값을 모두 입력해 주세요.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        gb: "NewProjectExcel",
        analysisModel,
        idColumn,
        qnum,
        user: auth?.user?.userId || "",
      };

      const formData = new FormData();
      Object.entries(payload).forEach(([k, v]) => formData.append(k, v));
      if (file) formData.append("file", file);

      // const res = await proEnterSaveData.mutateAsync(formData);

    } catch (err) {
      modal.showErrorAlert("알림", "네트워크 오류로 등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Fragment>
      <form onSubmit={handleSubmit}>
        <div className="popCont">
          <table className="popTbl" style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {/* 웹프로젝트명 */}
              <tr>
                <td style={{ width: "250px" }}>웹프로젝트명</td>
                <td>
                  <Input value={projectnum || ""} disabled />
                </td>
              </tr>

              {/* 조사명 */}
              <tr>
                <td style={{ width: "250px" }}>조사명</td>
                <td>
                  <Input value={projectname || ""} disabled />
                </td>
              </tr>

              {/* 분석모델선택 */}
              <tr>
                <td>* 분석모델선택</td>
                <td>
                  <DropDownList
                    data={["설문온", "댓글분석(예정)", "기사분석(예정)"]}
                    value={analysisModel}
                    onChange={(e) => setAnalysisModel(e.value)}
                    disabled={loading}
                  />
                </td>
              </tr>

              {/* 파일 업로드 */}
              <tr>
                <td>* 파일 업로드</td>
                <td>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx,.xls,.csv"
                    disabled={loading}
                  />
                  <Button type="button" themeColor="primary" disabled={loading} style={{ marginLeft: "8px" }} >파일 업로드</Button>
                  <Button type="button" className="btnTxt" disabled={loading} style={{ marginLeft: "8px" }}>엑셀 샘플</Button>
                </td>
              </tr>

              {/* 아이디컬럼 */}
              <tr>
                <td>* 아이디컬럼</td>
                <td>
                  <Input value={idColumn} onChange={(e) => setIdColumn(e.target.value)} disabled={loading} />
                </td>
              </tr>
              {/* 문항선택 */}
              <tr>
                <td>* 문항선택</td>
                <td>
                  <Button type="button" themeColor="primary" disabled={loading}
                    onClick={(e) => { setPopupShow(true); }}>
                    선택
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 등록 버튼 */}
        <div className="popBtn" style={{ marginTop: "16px", textAlign: "center" }}>
          <Button type="submit" className="btnL" themeColor="primary" disabled={loading}>
            등록
          </Button>
        </div>
      </form>
      {/* 필터문항설정 팝업 */}
      {popupShow &&
        <ProRegisterPopup
          popupShow={popupShow}
          setPopupShow={setPopupShow}
        />
      }
    </Fragment>
  );
};
export default ProRegisterTab2;