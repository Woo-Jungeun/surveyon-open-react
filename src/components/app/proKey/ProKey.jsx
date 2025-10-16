import React, { Fragment, useState, useContext, useEffect } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { Input } from "@progress/kendo-react-inputs";
import { modalContext } from "@/components/common/Modal.jsx";
import { useSelector } from "react-redux";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import ProKeyGrid from "@/components/app/proKey/ProKeyGrid.jsx";
import { ProKeyApi } from "@/components/app/proKey/ProKeyApi";

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
      <article className="subTitWrap">
        <div className="subTit">
          <h2 className="titTxt">API KEY 등록</h2>
        </div>
      </article>

      <article className="subContWrap">
        <div className="subCont">
          <form onSubmit={handleSubmit}>
            <div className="popCont">
              <div className="popTbl">
                {/* 사용자 */}
                <div className="cmn_pop_ipt">
                  <span style={{ width: "200px" }}>사용자</span>
                  <Input
                    className="k-input k-input-solid"
                    value={auth?.user?.userNm || ""}
                    disabled
                  />
                </div>

                {/* API KEY 유형 */}
                <div className="cmn_pop_ipt">
                  <span style={{ width: "190px" }}>* API KEY 유형선택</span>
                  <DropDownList
                    data={apiTypeList}
                    textField="label"
                    dataItemKey="value"
                    value={apiTypeList.find((t) => t.value === formData.api_gubun)}
                    onChange={(e) => handleChange("api_gubun", e.value.value)}
                    disabled={loading}
                  />
                </div>

                {/* API 이름 */}
                <div className="cmn_pop_ipt">
                  <span style={{ width: "200px" }}>* API 이름</span>
                  <Input
                    className="k-input k-input-solid"
                    value={formData.api_name}
                    onChange={(e) => handleChange("api_name", e.value)}
                    disabled={loading}
                  />
                </div>

                {/* API KEY */}
                <div className="cmn_pop_ipt">
                  <span style={{ width: "200px" }}>* API KEY</span>
                  <Input
                    className="k-input k-input-solid"
                    value={formData.api_key}
                    onChange={(e) => handleChange("api_key", e.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* 등록 버튼 */}
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

          {/* 등록된 API KEY 목록 */}
          <ProKeyGrid data={gridData} setData={setGridData} fetchData={fetchData} />
        </div>
      </article>
    </Fragment>
  );
};

export default ProKey;