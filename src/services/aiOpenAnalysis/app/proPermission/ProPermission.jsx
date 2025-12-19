import React, { Fragment, useState, useContext, useEffect } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { Input } from "@progress/kendo-react-inputs";
import { modalContext } from "@/components/common/Modal.jsx";
import { useSelector } from "react-redux";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import ProPermissionGrid from "@/services/aiOpenAnalysis/app/proPermission/ProPermissionGrid.jsx";
import { ProPermissionApi } from "@/services/aiOpenAnalysis/app/proPermission/ProPermissionApi";
import { useNavigate } from "react-router-dom";
import { DatePicker } from "@progress/kendo-react-dateinputs";
import moment from "moment";

/**
 * 권한 관리
 *
 * @author jewoo
 * @since 2025-10-17<br />
 */
const ProPermission = () => {
  const modal = useContext(modalContext);
  const auth = useSelector((store) => store.auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { proPermissionData } = ProPermissionApi();

  const projectnum = sessionStorage.getItem("projectnum");
  const projectname = sessionStorage.getItem("projectname");
  const projectpof = sessionStorage.getItem("projectpof");

  const [userOptions, setUserOptions] = useState([]); // 사용자 목록
  const [filteredUsers, setFilteredUsers] = useState([]); // 필터링된 사용자 목록

  /** formData (기본값: 개인키) */
  const [formData, setFormData] = useState({
    pof: projectpof || "",
    permission_gubun: "",
    worker_name: "",
    worker_id: "",
    worker_password: "",
    worker_position: "",
    worker_expired: moment().add(100, 'years').toDate(),
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
          gb: "worker_list",
          projectnum,
          user: auth?.user?.userId || "",
        }
      };
      const res = await proPermissionData.mutateAsync(payload);
      if (res?.success === "777") {
        setGridData(res?.resultjson || []);
      } else {
        modal.showErrorAlert("에러", "권한 관리 목록을 불러오지 못했습니다.");
      }

    } catch (err) {
      modal.showErrorAlert("에러", "권한 관리 조회 중 오류가 발생했습니다.");
    }
  };

  /** 사용자 목록 조회 (등록된 사용자 API) */
  const fetchUserList = async () => {
    try {
      const payload = {
        params: {
          gb: "worker_search",
          user: auth?.user?.userId || "",
        },
      };
      const res = await proPermissionData.mutateAsync(payload);
      if (res?.success === "777") {
        const list = res.resultjson.map((u) => ({
          text: `${u.Name}(${u.Position})`,
          value: u.Id,
          position: u.Position,
          name: u.Name,
        }));
        setUserOptions(list);
        setFilteredUsers(list);
      } else {
        modal.showErrorAlert("에러", "사용자 목록을 불러오지 못했습니다.");
      }
    } catch (err) {
      modal.showErrorAlert("에러", "사용자 목록 조회 중 오류가 발생했습니다.");
    }
  };

  /** 필터 이벤트 (한 글자 입력 시 필터링) */
  const handleUserFilterChange = (e) => {
    const filterValue = (e.filter?.value || "").toLowerCase();
    const next = userOptions.filter((u) =>
      u.text.toLowerCase().includes(filterValue)
    );
    setFilteredUsers(next);
  };

  /** 최초 진입 시 조회 */
  useEffect(() => {
    fetchData(); // 그리드 조회
    fetchUserList(); // 사용자 리스트 조회
  }, []);

  // 등록 버튼
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const errs = [];
    if (!formData.permission_gubun) errs.push("작업권한을 선택해 주세요.");

    if (["고객(읽기)", "일반(읽기)"].includes(formData.permission_gubun)) {
      if (!formData.worker_name.trim()) errs.push("고객 이름을 입력해 주세요.");
      if (!formData.worker_id.trim()) errs.push("고객 이메일을 입력해 주세요.");
      if (!formData.worker_password.trim()) errs.push("고객 비밀번호를 입력해 주세요.");
      if (!formData.worker_expired) errs.push("만료일자를 선택해 주세요.");
    } else {
      if (!formData.worker_name.trim()) errs.push("작업자 이름을 입력해 주세요.");
    }

    if (errs.length) {
      modal.showErrorAlert("알림", errs.join("\n"));
      return;
    }

    try {
      setLoading(true);
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
          worker_position: formData.worker_position || worker_position || "",
          worker_expired: formData.worker_expired
            ? moment(formData.worker_expired).set({ hour: 23, minute: 59, second: 59 }).format("YYYY-MM-DD HH:mm:ss")
            : "",
          user: auth?.user?.userId || "",
        },
      };

      const res = await proPermissionData.mutateAsync(payload);
      if (res?.success === "777") {
        modal.showConfirm("알림", "프로젝트 권한이 등록되었습니다.", {
          btns: [
            {
              title: "확인",
              click: async () => {
                await fetchData();

                // 폼 초기화
                setFormData({
                  pof: projectpof || "",
                  permission_gubun: "",
                  worker_name: "",
                  worker_id: "",
                  worker_password: "",
                  worker_position: "",
                  worker_expired: moment().add(100, 'years').toDate(),
                });
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
  const handleDeleteProject = async () => {
    try {
      // 삭제 확인 모달
      modal.showConfirm("알림", "프로젝트를 삭제하시겠습니까?", {
        btns: [
          { title: "취소" },
          {
            title: "삭제",
            click: async () => {
              try {
                const payload = {
                  params: {
                    gb: "project_del",
                    projectnum,
                    user: auth?.user?.userId || "",
                  },
                };
                const res = await proPermissionData.mutateAsync(payload);
                if (res?.success === "777") {
                  modal.showConfirm("알림", "프로젝트가 삭제되었습니다.", {
                    btns: [
                      {
                        title: "확인",
                        click: async () => {
                          sessionStorage.setItem("projectnum", "");
                          sessionStorage.setItem("projectname", "");
                          sessionStorage.setItem("servername", "");
                          sessionStorage.setItem("projectpof", "");
                          navigate("/ai_open_analysis"); //프로젝트 목록 페이지로 이동
                        },
                      },
                    ],
                  });
                } else {
                  modal.showErrorAlert("에러", res?.message || "삭제 중 오류가 발생했습니다.");
                }
              } catch (err) {
                modal.showErrorAlert("오류", "삭제 요청 중 네트워크 오류가 발생했습니다.");
              }
            },
          },
        ],
      });
    } catch (err) {
      modal.showErrorAlert("오류", "삭제 처리 중 문제가 발생했습니다.");
    }
  };

  return (
    <Fragment>
      <style>{`
        .custom-datepicker {
            width: 100% !important;
            flex: 1;
        }
        .custom-datepicker .k-dateinput,
        .custom-datepicker .k-input,
        .custom-datepicker .k-input-inner {
            width: 100% !important;
            height: 20px !important;
        }
        .custom-datepicker .k-input-button,
        .custom-datepicker .k-select,
        .custom-datepicker .k-button-icon,
        .custom-datepicker .k-svg-icon,
        .custom-datepicker .k-icon {
            color: #ff8024 !important;
        }
        .custom-datepicker .k-input-button {
            background: transparent !important;
            border: none !important;
        }
        .custom-datepicker .k-input-button svg {
            display: block !important;
            width: 24px;
            height: 24px;
            color: #ff8024 !important;
        }
      `}</style>
      <article className="subTitWrap pro-list-header">
        <div className="subTit">
          <h2 className="titTxt">
            프로젝트 권한 관리
            <span
              className="info-icon"
              data-tooltip={`프로젝트 권한 관리|등록된 프로젝트를 기준으로 다른 작업자에게 읽기, 쓰기, 권한을 부여합니다.`}
            ></span>
          </h2>
          <div className="btnWrap">
            <Button
              type="button"
              className="btnTxt"
              themeColor="primary"
              disabled={loading}
              onClick={handleDeleteProject}
            >
              프로젝트 삭제
              <span
                className="info-icon"
                data-tooltip={`프로젝트 삭제|프로젝트 삭제 시 모든 문항이 함께 삭제되므로 신중히 진행하세요.`}
              ></span>
            </Button>
          </div >
        </div >
      </article >

      <article className="subContWrap">
        <div className="subCont">
          <div className="pro-permission-container">
            <form onSubmit={handleSubmit} className="pro-permission-form">
              {/* Header inside form */}
              <div style={{ textAlign: 'center', paddingBottom: '5px', borderBottom: '1px solid #f0f0f0', marginBottom: '5px' }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#333',
                  marginBottom: '2px',
                }}>
                  권한 등록
                </h3>
                <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                  프로젝트에 대한 접근 권한을 설정합니다.
                </p>
              </div>

              {/* Row 1: 프로젝트명 */}
              <div className="cmn_pop_ipt" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                <span className="iptTit" style={{ width: '100px', marginBottom: '0', color: '#333', fontWeight: '500', fontSize: '13px' }}>프로젝트명</span>
                <Input
                  className="k-input k-input-solid"
                  value={projectname || ""}
                  disabled
                  style={{ flex: 1, height: '28px', background: '#f5f5f5', border: '1px solid #ddd' }}
                />
              </div>

              {/* Row 2: 웹프로젝트번호 */}
              <div className="cmn_pop_ipt" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                <span className="iptTit" style={{ width: '100px', marginBottom: '0', color: '#333', fontWeight: '500', fontSize: '13px' }}>웹프로젝트번호</span>
                <Input
                  className="k-input k-input-solid"
                  value={projectnum || ""}
                  disabled
                  style={{ flex: 1, height: '28px', background: '#f5f5f5', border: '1px solid #ddd' }}
                />
              </div>

              {/* Row 3: POF */}
              <div className="cmn_pop_ipt" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span className="iptTit" style={{ width: '100px', marginBottom: '0', color: '#333', fontWeight: '500', fontSize: '13px' }}>POF <span style={{ color: '#ff5252' }}>*</span></span>
                <Input
                  className="k-input k-input-solid"
                  value={formData.pof}
                  onChange={(e) => handleChange("pof", e.value)}
                  disabled
                  style={{ flex: 1, height: '28px', background: '#f5f5f5', border: '1px solid #ddd' }}
                />
              </div>

              {/* Row 4: 권한 */}
              <div className="cmn_pop_ipt" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                <span className="iptTit" style={{ width: '100px', marginBottom: '0', color: '#333', fontWeight: '500', fontSize: '13px' }}>권한 <span style={{ color: '#ff5252' }}>*</span></span>
                <DropDownList
                  data={[
                    "오픈팀(관리,읽기,쓰기)",
                    "제작자(관리,읽기,쓰기)",
                    "연구원(읽기,쓰기)",
                    // todo 임시 주석
                    // "고객(읽기)",
                    // "일반(읽기)",
                  ]}
                  value={formData.permission_gubun}
                  onChange={(e) => handleChange("permission_gubun", e.value)}
                  disabled={loading}
                  style={{ flex: 1, height: '28px' }}
                />
              </div>

              {/* Row 5: 작업자 or 고객명 */}
              {["고객(읽기)", "일반(읽기)"].includes(formData.permission_gubun) ? (
                <div className="cmn_pop_ipt" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                  <span className="iptTit" style={{ width: '100px', marginBottom: '0', color: '#333', fontWeight: '500', fontSize: '13px' }}>고객명 <span style={{ color: '#ff5252' }}>*</span></span>
                  <Input
                    className="k-input k-input-solid"
                    value={formData.worker_name || ""}
                    onChange={(e) => handleChange("worker_name", e.value)}
                    disabled={loading}
                    style={{ flex: 1, height: '28px' }}
                  />
                </div>
              ) : (
                <div className="cmn_pop_ipt" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                  <span className="iptTit" style={{ width: '100px', marginBottom: '0', color: '#333', fontWeight: '500', fontSize: '13px' }}>작업자 <span style={{ color: '#ff5252' }}>*</span></span>
                  <DropDownList
                    data={filteredUsers}
                    textField="text"
                    dataItemKey="value"
                    filterable
                    onFilterChange={handleUserFilterChange}
                    onChange={(e) => {
                      const selected = e.value;
                      if (selected) {
                        handleChange("worker_name", selected.name);
                        setFormData((prev) => ({
                          ...prev,
                          worker_id: selected.value,          // 사용자 ID
                          worker_name: selected.name,         // 사용자 이름
                          worker_position: selected.position, // 부서/직책
                        }));
                      } else {
                        setFormData((prev) => ({
                          ...prev,
                          worker_id: "",
                          worker_name: "",
                          worker_position: "",
                        }));
                      }
                    }}
                    value={filteredUsers.find((u) => u.value === formData.worker_id) || null}
                    disabled={loading}
                    style={{ flex: 1, height: '28px' }}
                  />
                </div>
              )}

              {/* 고객/일반일 경우 추가 필드 */}
              {["고객(읽기)", "일반(읽기)"].includes(formData.permission_gubun) && (
                <>
                  <div className="cmn_pop_ipt" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                    <span className="iptTit" style={{ width: '100px', marginBottom: '0', color: '#333', fontWeight: '500', fontSize: '12px' }}>고객 이메일 <span style={{ color: '#ff5252' }}>*</span></span>
                    <Input
                      className="k-input k-input-solid"
                      value={formData.worker_id || ""}
                      onChange={(e) => handleChange("worker_id", e.value)}
                      disabled={loading}
                      style={{ flex: 1, height: '28px' }}
                    />
                  </div>
                  <div className="cmn_pop_ipt" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                    <span className="iptTit" style={{ width: '100px', marginBottom: '0', color: '#333', fontWeight: '500', fontSize: '12px' }}>고객 비밀번호 <span style={{ color: '#ff5252' }}>*</span></span>
                    <Input
                      type="password"
                      className="k-input k-input-solid"
                      value={formData.worker_password || ""}
                      onChange={(e) => handleChange("worker_password", e.value)}
                      disabled={loading}
                      style={{ flex: 1, height: '28px' }}
                    />
                  </div>
                </>
              )}

              <div className="cmn_pop_ipt" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                <span className="iptTit" style={{ width: '100px', marginBottom: '0', color: '#333', fontWeight: '500', fontSize: '12px' }}>만료일자 <span style={{ color: '#ff5252' }}>*</span></span>
                <DatePicker
                  className="custom-datepicker"
                  value={formData.worker_expired ? new Date(formData.worker_expired) : null}
                  format={"yyyy-MM-dd"}
                  min={new Date()} // 오늘 이후만 선택 가능
                  max={new Date(2200, 12, 31)}
                  required={false}
                  disabled={loading}
                  editable={false}
                  onChange={(e) => handleChange("worker_expired", e.value)}
                  style={{ flex: 1, width: '100%', height: '28px' }}
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

          {/* 권한 관리 목록 */}
          <ProPermissionGrid data={gridData} setData={setGridData} fetchData={fetchData} />
        </div>
      </article>
    </Fragment >
  );
};

export default ProPermission;