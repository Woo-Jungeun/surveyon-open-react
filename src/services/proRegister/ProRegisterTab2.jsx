import React, { useState, useRef, useContext, Fragment, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { modalContext } from "@/components/common/Modal.jsx";
import { Button } from "@progress/kendo-react-buttons";
import { Input } from "@progress/kendo-react-inputs";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import ProRegisterPopup from "./ProRegisterPopup";
import { ProRegisterApi } from "./ProRegisterApi.js";
import { getExcelGuideHTML } from "./ExcelGuideHTML.js";
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
  const [idList, setIdList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [popupShow, setPopupShow] = useState(false);
  const [popupData, setPopupData] = useState([]);
  const [selectData, setSelectData] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    setSelectData([]); // 파일 변경 시 선택된 문항 초기화
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
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const firstRow = (json[0] || []).slice(0, 3).filter(Boolean);
        if (firstRow.length === 0) {
          modal.showErrorAlert("에러", "엑셀 첫 행(A1~C1)에 데이터가 없습니다.");
          return;
        }

        setIdList(firstRow);
        setIdColumn(firstRow[0]);

        const questionRow = (json[0] || []).slice(0);
        const columnRow = (json[1] || []).slice(0);

        const mappedData = [];
        for (let i = 0; i < questionRow.length; i++) {
          const q = questionRow[i]?.trim?.() || "";
          const c = columnRow[i]?.trim?.() || "";
          if (q && c) {
            mappedData.push({ question: q, column: c });
          }
        }

        setPopupData(mappedData);
      } catch (err) {
        modal.showErrorAlert("에러", "엑셀을 읽는 중 오류가 발생했습니다.");
      }
    };
    reader.readAsArrayBuffer(f);
  };

  const saveBlobWithName = (blob, filename = "download.xlsx") => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleSampleClick = useCallback(async () => {
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

      if (blob.type?.includes("application/json")) {
        modal.showErrorAlert("에러", "샘플 다운로드 요청이 거부되었습니다.");
        return;
      }

      saveBlobWithName(blob, `문항 등록 엑셀_샘플_` + moment().format("YYYYMMDDHHmmss") + `.xlsx`);
    } catch (err) {
      modal.showErrorAlert("에러", "샘플 다운로드 중 오류가 발생했습니다.");
    }
  }, []);

  const buildJsonData = (workbook, selectData) => {
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const questionRow = json[0];
    const headers = json[1];
    const rows = json.slice(2);

    // idColumn은 첫 번째 행(questionRow)에서 선택되므로 거기서 인덱스를 찾아야 함
    const idIndex = questionRow.indexOf(idColumn);

    const result = [];

    selectData.forEach((sel) => {
      const qnum = sel.column;
      const qnumText = sel.question;
      const colIndex = headers.indexOf(qnum);

      if (colIndex === -1) return;
      rows.forEach((row) => {
        const pid = row[idIndex];
        let answer = row[colIndex];
        if (answer === undefined || answer === null) {
          return;
        } else if (typeof answer === "string" && answer.trim() === "") {
          answer = " ";
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

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

        if (jsonData.length === 0) {
          modal.showErrorAlert(
            "알림",
            "엑셀에 등록할 응답 데이터가 없거나, \n엑셀 형식이 가이드와 일치하지 않습니다."
          );
          return;
        }
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
        const res = await proRegisterMutation.mutateAsync(payload);
        if (res?.success === "777") {
          modal.showConfirm("알림", "문항이 등록되었습니다.", {
            btns: [{ title: "확인", click: () => navigate("/ai_open_analysis/pro_list") }],
          });
        } else if (res?.success === "768" || res?.success === "769") {
          let dupJson = res?.resultjson || {};

          try {
            if (typeof dupJson === "string") {
              dupJson = JSON.parse(dupJson);
            }
          } catch (err) {
            console.error("dupJson parse error:", err);
            dupJson = {};
          }

          const isIdDup = res?.success === "769";
          const dupList = Object.entries(dupJson || {})
            .map(([k, v]) => {
              if (Array.isArray(v)) return `${k}: ${v.join(", ")}`;
              return `${k}: ${v}`;
            })
            .join("\n");

          modal.showErrorAlert(
            "에러",
            `${isIdDup ? "중복된 아이디가 발견되었습니다." : "중복된 문항이 발견되었습니다."}\n\n${dupList || "(중복 항목 없음)"}`
          );
        }
        else {
          modal.showErrorAlert("에러", "등록 중 오류가 발생했습니다.");
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      modal.showErrorAlert("알림", "네트워크 오류로 등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const openGuideWindow = () => {
    window.open(
      '/excel_guide',
      '엑셀 작성 가이드',
      'width=900,height=780,scrollbars=no,resizable=no'
    );
  };

  return (
    <>
      <div className="excel-upload-container">
        <form onSubmit={handleSubmit} className="excel-upload-form">
          {/* Header */}
          <div className="excel-form-header">
            <div>
              <h3 className="excel-form-title">Excel 파일 업로드</h3>
              <p className="excel-form-subtitle">엑셀 파일을 업로드하여 문항을 등록하세요.</p>
            </div>
            <button
              type="button"
              onClick={openGuideWindow}
              className="excel-guide-btn-small"
              title="작성 가이드 보기"
            >
              <span>?</span> 가이드
            </button>
          </div>

          {/* 웹프로젝트명 */}
          <div className="excel-form-field">
            <label className="excel-form-label">웹프로젝트명</label>
            <Input className="k-input k-input-solid" value={projectnum || ""} disabled />
          </div>

          {/* 조사명 */}
          <div className="excel-form-field">
            <label className="excel-form-label">조사명</label>
            <Input className="k-input k-input-solid" value={projectname || ""} disabled />
          </div>

          {/* 분석모델선택 */}
          <div className="excel-form-field">
            <label className="excel-form-label">
              분석모델선택 <span className="required">*</span>
            </label>
            <DropDownList
              // data={["설문온", "댓글분석(예정)", "기사분석(예정)"]}
              data={["설문온"]}
              value={analysisModel}
              onChange={(e) => setAnalysisModel(e.value)}
              disabled={loading}
            />
          </div>

          {/* 파일 업로드 */}
          <div className="excel-form-field">
            <label className="excel-form-label">
              파일 업로드 <span className="required">*</span>
            </label>
            <div className="excel-file-upload-group">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv"
                disabled={loading}
                className="excel-file-input"
              />
              <Button
                type="button"
                themeColor="primary"
                disabled={loading}
                onClick={handleSampleClick}
                className="excel-sample-btn"
              >
                샘플 다운로드
              </Button>
            </div>
          </div>

          {/* 아이디컬럼 */}
          <div className="excel-form-field">
            <label className="excel-form-label">
              아이디컬럼 <span className="required">*</span>
            </label>
            {idList.length > 0 ? (
              <DropDownList
                data={idList}
                value={idColumn}
                onChange={(e) => setIdColumn(e.value)}
                disabled={loading}
              />
            ) : (
              <div className="excel-id-placeholder">파일 선택 시 자동 인식됩니다.</div>
            )}
          </div>

          {/* 문항선택 */}
          <div className="excel-form-field">
            <label className="excel-form-label">
              문항선택 <span className="required">*</span>
            </label>
            <Button
              type="button"
              themeColor="primary"
              disabled={loading || idList.length === 0}
              onClick={() => setPopupShow(true)}
              style={{ width: '100%' }}
            >
              문항 선택하기
            </Button>
            {selectData.length > 0 && (
              <div className="excel-selected-items">
                <div className="excel-selected-header">선택된 문항 ({selectData.length}개)</div>
                <ul className="excel-selected-list">
                  {selectData.map((item) => (
                    <li key={item.column} className="excel-selected-item">
                      {item.question} <span className="column-name">({item.column})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 등록 버튼 */}
          <Button
            type="submit"
            themeColor="primary"
            disabled={loading}
            className="excel-submit-btn"
          >
            {loading ? "등록 중..." : "등록하기"}
          </Button>
        </form>
      </div>

      {/* 문항선택 팝업 */}
      {popupShow && (
        <ProRegisterPopup
          popupShow={popupShow}
          setPopupShow={setPopupShow}
          popupData={popupData}
          setPopupData={setPopupData}
          selectData={selectData}
          setSelectData={setSelectData}
          idColumn={idColumn}
        />
      )}
    </>
  );
};

export default ProRegisterTab2;