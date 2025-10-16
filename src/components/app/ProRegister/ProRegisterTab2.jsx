import React, { useState, useRef, useContext, Fragment, useCallback, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { modalContext } from "@/components/common/Modal.jsx";
import { Button } from "@progress/kendo-react-buttons";
import { Input } from "@progress/kendo-react-inputs";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import ProRegisterPopup from "@/components/app/proRegister/ProRegisterPopup";
import { ProRegisterApi } from "@/components/app/proRegister/ProRegisterApi.js";
import moment from "moment";
import * as XLSX from "xlsx";

/**
 * 문항 등록 > Excel
 *
 * @author jewoo
 * @since 2025-10-15<br />
 */
const ProRegisterTab2 = () => {
  const auth = useSelector((store) => store.auth);
  const modal = useContext(modalContext);
  const navigate = useNavigate();
  const { proRegisterMutation, sampleDownloadData } = ProRegisterApi();

  const projectnum = sessionStorage.getItem("projectnum");
  const projectname = sessionStorage.getItem("projectname");

  const [analysisModel, setAnalysisModel] = useState("설문온");
  const [file, setFile] = useState(null);
  const [idColumn, setIdColumn] = useState("");
  const [idList, setIdList] = useState([]);   // id 컬럼명 리스트 
  const [loading, setLoading] = useState(false);
  const [popupShow, setPopupShow] = useState(false);
  const [popupData, setPopupData] = useState([]); // 팝업으로 보낼 데이터
  const [selectData, setSelectData] = useState([]);
  const fileInputRef = useRef(null);

  /** 파일 선택 시 첫 번째 시트의 A1~C1 헤더 읽기, 문항선택 팝업 데이터 생성 */
  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    // 파일 없을 경우(삭제 시) 상태 초기화
    if (!f) {
      setFile(null);
      setIdList([]);
      setIdColumn("");
      setPopupData([]);
      return;
    }

    setFile(f);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // 2차원 배열

        const firstRow = (json[0] || []).slice(0, 3).filter(Boolean); // A1,B1,C1
        if (firstRow.length === 0) {
          modal.showErrorAlert("에러", "엑셀 첫 행(A1~C1)에 데이터가 없습니다.");
          return;
        }

        setIdList(firstRow);
        setIdColumn(firstRow[0]); // 첫 번째 값 자동 선택

        // 문항 선택 데이터 
        const questionRow = (json[0] || []).slice(0);
        const columnRow = (json[1] || []).slice(0);

        const mappedData = [];
        for (let i = 0; i < questionRow.length; i++) {
          const q = questionRow[i]?.trim?.() || "";
          const c = columnRow[i]?.trim?.() || "";
          if (q && c) {
            mappedData.push({
              question: q,  // 문항내용(질문)
              column: c,    // 컬럼명
            });
          }
        }

        setPopupData(mappedData); // popupData 구성
      } catch (err) {
        console.error(err);
        modal.showErrorAlert("에러", "엑셀을 읽는 중 오류가 발생했습니다.");
      }
    };
    reader.readAsArrayBuffer(f);
  };

  // 샘플 다운로드 
  const saveBlobWithName = (blob, filename = "download.xlsx") => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename; // 고정 파일명
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // 샘플 다운로드 (Blob만 처리, 파일명 고정)
  const handleSampleClick = useCallback(
    async () => {
      try {
        const payload = {
          gb: "excel_sample",
          user: auth?.user?.userId || "",
          projectnum
        };

        const res = await sampleDownloadData.mutateAsync(payload);
        const blob = res?.data instanceof Blob ? res.data : (res instanceof Blob ? res : null);

        if (!blob) {
          modal.showErrorAlert("에러", "샘플 파일을 받지 못했습니다.");
          return;
        }

        // 서버가 에러를 JSON(Blob)으로 줄 수도 있어서 가드
        if (blob.type?.includes("application/json")) {
          modal.showErrorAlert("에러", "샘플 다운로드 요청이 거부되었습니다.");
          return;
        }

        saveBlobWithName(blob, `문항 등록 엑셀_샘플_` + moment().format("YYYYMMDDHHmmss") + `.xlsx`);
      } catch (err) {
        console.error(err);
        modal.showErrorAlert("에러", "샘플 다운로드 중 오류가 발생했습니다.");
      }
    }, []);

  /** 엑셀 데이터 -> 선택된 문항 기준으로 JSON 생성 */
  const buildJsonData = (workbook, selectData) => {
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // 2차원 배열

    const headers = json[1]; // 두 번째 행이 컬럼명 (예: id, q10, q20, ...)
    const rows = json.slice(2); // 세 번째 행부터 실제 데이터
    const idIndex = headers.indexOf("id");

    const result = [];

    // 선택된 문항만 변환
    selectData.forEach((sel) => {
      const qnum = sel.column;
      const qnumText = sel.question;
      const colIndex = headers.indexOf(qnum);

      if (colIndex === -1) return; // 엑셀에 해당 컬럼이 없으면 skip

      rows.forEach((row) => {
        const pid = row[idIndex];
        let answer = row[colIndex];

        // 공백, 빈값 구분 로직 
        if (answer === undefined || answer === null) {
          return;
        } else if (typeof answer === "string" && answer.trim() === "") {
          answer = " "; // 공백문자만 있는 셀 → " "
        }
        if (pid != null) {
          result.push({
            pid,
            qnum,
            qnum_text: qnumText,
            answer,
            contents: "",
          });
        }
      });
    });
    return result;
  };

  // 등록 버튼 이벤트
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    // 필수값 유효성 체크
    if (!file) {
      modal.showErrorAlert("알림", "파일을 선택해주세요.");
      return;
    }
    if (!analysisModel || analysisModel.trim() === "") {
      modal.showErrorAlert("알림", "분석모델을 선택해주세요.");
      return;
    }
    if (!idColumn || idColumn.trim() === "") {
      modal.showErrorAlert("알림", "아이디 컬럼을 선택해주세요.");
      return;
    }
    if (!selectData || selectData.length === 0) {
      modal.showErrorAlert("알림", "문항을 최소 1개 이상 선택해주세요.");
      return;
    }

    try {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const jsonData = buildJsonData(workbook, selectData);

        // todo '(예정)' 제거 처리
        const cleanModel = analysisModel.replace(/\(.*\)/g, "").trim();

        const payload = {
          params: {
            gb: "excel_enter",
            user: auth?.user?.userId || "",
            projectnum,
            data: jsonData,
            model: cleanModel
          },
        };
        console.log("payload", payload);
        const res = await proRegisterMutation.mutateAsync(payload);
        console.log("res", res)
        if (res?.success === "777") {
          modal.showConfirm("알림", "문항이 등록되었습니다.", {
            btns: [{ title: "확인", click: () => navigate("/pro_list") }],   // 문항 목록 페이지로 이동
          });
        } else if (res?.success === "768") {
          const dupJson = res?.resultjson || {};
          const dupList = Object.entries(dupJson).map(([k, v]) => `${k}: ${v}`).join("\n");
          modal.showErrorAlert(
            "에러",
            `중복된 문항이 발견되었습니다.\n\n${dupList || "(중복 항목 없음)"}`
          );
        } else if (res?.success === "769") {
          const dupJson = res?.resultjson || {};
          const dupList = Object.entries(dupJson).map(([k, v]) => `${k}: ${v.join(", ")}`).join("\n");
          modal.showErrorAlert(
            "에러",
            `중복된 아이디가 발견되었습니다.\n\n${dupList || "(중복 항목 없음)"}`
          );
        } else {
          modal.showErrorAlert("에러", "등록 중 오류가 발생했습니다.");
        }
      }
      reader.readAsArrayBuffer(file);
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
          <table className="popTbl">
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
                  <Button type="button" className="btnTxt" themeColor="primary" disabled={loading} onClick={handleSampleClick}>
                    엑셀 샘플
                  </Button>
                </td>
              </tr>

              {/* 아이디컬럼 */}
              <tr>
                <td>* 아이디컬럼</td>
                <td>
                  {idList.length > 0 ? (
                    <DropDownList
                      data={idList}
                      value={idColumn}
                      onChange={(e) => setIdColumn(e.value)}
                      // style={{ width: "300px" }}
                      disabled={loading}
                    />
                  ) : (
                    <span style={{ color: "#888" }}>파일 선택 시 자동 인식됩니다.</span>
                  )}
                </td>
              </tr>
              {/* 문항선택 */}
              <tr>
                <td>* 문항선택</td>
                <td>
                  <Button
                    type="button"
                    themeColor="primary"
                    disabled={loading || idList.length === 0}
                    onClick={(e) => { setPopupShow(true); }}>
                    선택
                  </Button>
                  {selectData.length > 0 && (
                    <div style={{ marginTop: "12px" }}>
                      <ul
                        style={{
                          listStyle: "none",
                          margin: 0,
                          padding: 0,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                        }}
                      >
                        {selectData.map((item) => (
                          <li
                            key={item.column}
                            style={{
                              background: "#f7f7f7",
                              borderRadius: "4px",
                              padding: "4px 8px",
                              fontSize: "13px",
                              color: "#333",
                            }}
                          >
                            {item.question}{" "}
                            <span style={{ color: "#888" }}>({item.column})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
          popupData={popupData}   // 팝업 그리드 데이터 리스트 
          setPopupData={setPopupData}
          selectData={selectData}   // 선택 데이터
          setSelectData={setSelectData}
        />
      }
    </Fragment>
  );
};
export default ProRegisterTab2;