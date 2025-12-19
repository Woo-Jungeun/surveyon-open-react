import React, { Fragment, useState, useContext, useEffect } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { Input } from "@progress/kendo-react-inputs";
import { modalContext } from "@/components/common/Modal.jsx";
import { useSelector } from "react-redux";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import ProKeyGrid from "@/services/aiOpenAnalysis/app/proKey/ProKeyGrid.jsx";
import { ProKeyApi } from "@/services/aiOpenAnalysis/app/proKey/ProKeyApi";

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
  const { proKeyData } = ProKeyApi();

  /** API KEY 유형 목록 */
  const apiTypeList = [
    { value: "1", label: "개인키" },
    { value: "2", label: "부서공용키" },
    { value: "3", label: "회사공용키" },
  ];

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
      const res = await proKeyData.mutateAsync(payload);
      if (res?.success === "777") {
        setGridData(res?.resultjson || []);
      } else {
        modal.showErrorAlert("에러", "API KEY 목록을 불러오지 못했습니다.");
      }

    } catch (err) {
      modal.showErrorAlert("에러", "API KEY 목록 조회 중 오류가 발생했습니다.");
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

              // 폼 초기화 
              setFormData({
                api_gubun: "1", // 기본값: 개인키
                api_name: "",
                api_key: "",
              });
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

  return (
    <Fragment>
      <article className="subTitWrap pro-list-header">
        <div className="subTit">
          <h2 className="titTxt">API KEY 등록
            <span
              className="info-icon"
              data-tooltip={`API KEY 등록|사용자 계정 전체 프로젝트 기준으로 OPEN AI API KEY를 등록해야\n 자동 "보기분석", "응답자분석", "번역" 실행이 가능합니다.`}
            ></span>
          </h2>
        </div>
      </article>

      <article className="subContWrap">
        <div className="subCont">
          <div className="pro-key-container">
            <form onSubmit={handleSubmit} className="pro-key-form">
              {/* Header inside form */}
              <div style={{ textAlign: 'center', paddingBottom: '5px', borderBottom: '1px solid #f0f0f0', marginBottom: '5px' }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#333',
                  marginBottom: '2px',
                }}>
                  API KEY 등록
                </h3>
                <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                  OPEN AI API KEY를 등록합니다.
                </p>
              </div>

              {/* Row 1: 사용자 */}
              <div className="cmn_pop_ipt" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                <span className="iptTit" style={{ width: '100px', marginBottom: '0', color: '#333', fontWeight: '500', fontSize: '13px' }}>사용자</span>
                <Input
                  className="k-input k-input-solid"
                  value={auth?.user?.userNm || ""}
                  disabled
                  style={{ flex: 1, height: '28px', background: '#f5f5f5', border: '1px solid #ddd' }}
                />
              </div>

              {/* Row 2: API KEY 유형선택 */}
              <div className="cmn_pop_ipt" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                <span className="iptTit" style={{ width: '100px', marginBottom: '0', color: '#333', fontWeight: '500', fontSize: '13px' }}>
                  유형선택 <span style={{ color: '#ff5252' }}>*</span>
                  <span
                    className="info-icon"
                    data-tooltip={`API KEY 유형선택|부서나 개인이 등록한 APIKEY가 없을 경우 "회사공용"을 등록하여 사용하기`}
                    style={{ marginLeft: "5px" }}
                  ></span>
                </span>
                <DropDownList
                  data={apiTypeList}
                  textField="label"
                  dataItemKey="value"
                  value={apiTypeList.find((t) => t.value === formData.api_gubun)}
                  onChange={(e) => handleChange("api_gubun", e.value.value)}
                  disabled={loading}
                  style={{ flex: 1, height: '28px' }}
                />
              </div>

              {/* Row 3: API 이름 */}
              <div className="cmn_pop_ipt" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                <span className="iptTit" style={{ width: '100px', marginBottom: '0', color: '#333', fontWeight: '500', fontSize: '13px' }}>API 이름 <span style={{ color: '#ff5252' }}>*</span></span>
                <Input
                  className="k-input k-input-solid"
                  value={formData.api_name}
                  onChange={(e) => handleChange("api_name", e.value)}
                  disabled={loading}
                  style={{ flex: 1, height: '28px' }}
                />
              </div>

              {/* Row 4: API KEY */}
              <div className="cmn_pop_ipt" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                <span className="iptTit" style={{ width: '100px', marginBottom: '0', color: '#333', fontWeight: '500', fontSize: '13px' }}>API KEY <span style={{ color: '#ff5252' }}>*</span></span>
                <Input
                  className="k-input k-input-solid"
                  value={formData.api_key}
                  onChange={(e) => handleChange("api_key", e.value)}
                  disabled={loading}
                  style={{ flex: 1, height: '28px' }}
                />
              </div>

              <div style={{ marginTop: '15px', textAlign: 'center' }}>
                <Button
                  type="submit"
                  themeColor="primary"
                  disabled={loading}
                  style={{
                    width: '100%',
                    maxWidth: '200px',
                    height: '32px',
                    fontSize: '13px',
                    fontWeight: '600',
                    borderRadius: '6px',
                    backgroundColor: '#ff8024',
                    border: 'none'
                  }}
                >
                  등록
                </Button>
              </div>
            </form>
          </div>

          {/* 등록된 API KEY 목록 */}
          <ProKeyGrid data={gridData} setData={setGridData} fetchData={fetchData} />
        </div>
      </article>
    </Fragment>
  );
};

export default ProKey;