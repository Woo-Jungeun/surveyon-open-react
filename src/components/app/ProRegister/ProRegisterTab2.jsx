import React, { useState, useRef, useContext } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { modalContext } from "@/components/common/Modal.jsx";
import { Button } from "@progress/kendo-react-buttons";
import { Input } from "@progress/kendo-react-inputs";
import { DropDownList } from "@progress/kendo-react-dropdowns";

const ProRegisterTab2 = () => {
  const auth = useSelector((store) => store.auth);
  const modal = useContext(modalContext);
  const navigate = useNavigate();

  const projectnum = sessionStorage.getItem("projectnum");
  const projectname = sessionStorage.getItem("projectname");

  const [analysisModel, setAnalysisModel] = useState("");
  const [file, setFile] = useState(null);
  const [idColumn, setIdColumn] = useState("");
  const [answerColumn, setAnswerColumn] = useState("");
  const [qnum, setQnum] = useState("");
  const [qcontent, setQcontent] = useState("");
  const [articleColumn, setArticleColumn] = useState("");
  const [loading, setLoading] = useState(false);

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
        answerColumn,
        qnum,
        qcontent,
        articleColumn,
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
    <form onSubmit={handleSubmit}>
      <div className="popCont">
        <table className="popTbl" style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
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
                  data={["설문온", "기사분석", "댓글분석"]}
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
                <Button type="submit" themeColor="primary" disabled={loading} style={{ marginLeft: "8px" }}>
                  파일 업로드
                </Button>
              </td>
            </tr>

            {/* 아이디컬럼 */}
            <tr>
              <td>* 아이디컬럼</td>
              <td>
                <Input value={idColumn} onChange={(e) => setIdColumn(e.target.value)} disabled={loading} />
              </td>
            </tr>

            {/* 문항응답컬럼 */}
            <tr>
              <td>* 문항응답컬럼(오픈/제목)</td>
              <td>
                <Input 
                    value={answerColumn} 
                    onChange={(e) => setAnswerColumn(e.target.value)} 
                    disabled={loading}
                    placeholder="영문 10자 미만"
                     />
              </td>
            </tr>

            {/* 문항최종 (키워드, 주제) */}
            <tr>
              <td rowSpan={2} style={{ verticalAlign: "middle" }}>
                * 문항최종(키워드, 주제)
              </td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ minWidth: "80px" }}>* 문번호</span>
                  <Input
                    value={qnum}
                    onChange={(e) => setQnum(e.target.value)}
                    placeholder="예: 문1, 기사1"
                    disabled={loading}
                    style={{ width: "200px" }}
                  />
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ minWidth: "80px" }}>* 문항내용</span>
                  <Input
                    value={qcontent}
                    onChange={(e) => setQcontent(e.target.value)}
                    placeholder="문항 내용 입력"
                    disabled={loading}
                    style={{ flex: 1 }}
                  />
                </div>
              </td>
            </tr>

            {/* 내용컬럼 */}
            <tr>
              <td>내용컬럼(기사)</td>
              <td>
                <Input
                  value={articleColumn}
                  onChange={(e) => setArticleColumn(e.target.value)}
                  disabled={loading}
                />
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
  );
};
export default ProRegisterTab2;