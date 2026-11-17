import React, { useState, useContext, useEffect } from "react";
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
import { Trash2 } from 'lucide-react';
import AiDataHeader from "@/services/aiOpenAnalysis/components/AiDataHeader";
import GridHeaderBtnPrimary from "@/components/style/button/GridHeaderBtnPrimary.jsx";
import "./ProPermission.css";

const PERMISSION_OPTIONS = [
  "오픈팀(관리,읽기,쓰기)",
  "제작자(관리,읽기,쓰기)",
  "연구원(읽기,쓰기)",
  // "고객(읽기)",
  // "일반(읽기)",
];

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

  const [userOptions, setUserOptions] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [editingWorker, setEditingWorker] = useState(null);
  const [workerDropdownKey, setWorkerDropdownKey] = useState(0);

  const initForm = () => ({
    pof: projectpof || "",
    permission_gubun: "",
    worker_name: "",
    worker_id: "",
    worker_password: "",
    worker_position: "",
    worker_expired: moment().add(100, 'years').toDate(),
  });

  const [formData, setFormData] = useState(initForm);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const [gridData, setGridData] = useState([]);

  // 그리드 데이터 조회 (gb: "worker_list")
  const fetchData = async () => {
    try {
      const payload = {
        params: {
          gb: "worker_list",
          projectnum,
        }
      };
      const res = await proPermissionData.mutateAsync(payload);
      const list = res?.output ?? res?.resultjson ?? [];
      if (String(res?.success) === '777') {
        setGridData(Array.isArray(list) ? list : []);
      } else {
        modal.showErrorAlert("에러", res?.message || "권한 관리 목록을 불러오지 못했습니다.");
      }
    } catch (err) {
      modal.showErrorAlert("에러", "권한 관리 조회 중 오류가 발생했습니다.");
    }
  };

  /** 사용자 목록 조회 (gb: "worker_search") */
  const fetchUserList = async (searchText = "") => {
    try {
      const payload = {
        params: {
          gb: "worker_search",
          search: searchText || "",
        },
      };
      const res = await proPermissionData.mutateAsync(payload);
      const rawList = res?.output ?? res?.resultjson ?? [];
      if (String(res?.success) === '777' && Array.isArray(rawList)) {
        const list = rawList.map((u) => ({
          text: `${u.Name}(${u.Position})`,
          value: u.Id,
          position: u.Position,
          name: u.Name,
          email: u.Email || "",
        }));
        setUserOptions(list);
        setFilteredUsers(list);
      } else {
        setUserOptions([]);
        setFilteredUsers([]);
      }
    } catch (err) {
      modal.showErrorAlert("에러", "사용자 목록 조회 중 오류가 발생했습니다.");
    }
  };

  const handleUserFilterChange = (e) => {
    const filterValue = (e.filter?.value || "").trim();
    fetchUserList(filterValue);
  };

  useEffect(() => {
    fetchData();
    fetchUserList("");
  }, []);

  const handleSelectWorkerForEdit = (workerItem) => {
    if (!workerItem) return;
    setEditingWorker(workerItem);
    const expDate = workerItem.worker_expired
      ? moment(workerItem.worker_expired).toDate()
      : moment().add(100, 'years').toDate();
    setFormData({
      pof: projectpof || "",
      permission_gubun: workerItem.permission_gubun || "",
      worker_name: workerItem.worker_name || "",
      worker_id: workerItem.worker_id || "",
      worker_password: workerItem.worker_password || "",
      worker_position: workerItem.worker_position || "",
      worker_expired: expDate,
    });
  };

  const handleCancelEdit = () => {
    setEditingWorker(null);
    setFormData(initForm());
    setWorkerDropdownKey((prev) => prev + 1);
    fetchUserList("");
  };

  // 등록 / 수정 버튼
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const errs = [];
    if (!formData.permission_gubun) errs.push("작업권한을 선택해 주세요.");

    if (!editingWorker) {
      if (["고객(읽기)", "일반(읽기)"].includes(formData.permission_gubun)) {
        if (!formData.worker_name.trim()) errs.push("고객 이름을 입력해 주세요.");
        if (!formData.worker_id.trim()) errs.push("고객 이메일을 입력해 주세요.");
        if (!formData.worker_password.trim()) errs.push("고객 비밀번호를 입력해 주세요.");
        if (!formData.worker_expired) errs.push("만료일자를 선택해 주세요.");
      } else {
        if (!formData.worker_name.trim()) errs.push("작업자 이름을 입력해 주세요.");
      }
    }

    if (errs.length) {
      modal.showErrorAlert("알림", errs.join("\n"));
      return;
    }

    try {
      setLoading(true);
      let worker_position = "";
      if (formData.permission_gubun === "고객(읽기)") worker_position = "고객";
      else if (formData.permission_gubun === "일반(읽기)") worker_position = "일반";

      const expiredStr = formData.worker_expired
        ? moment(formData.worker_expired).format("YYYY-MM-DD")
        : "";

      if (editingWorker) {
        const payload = {
          params: {
            gb: "worker_update",
            user: auth?.user?.userId || "",
            projectnum,
            id: editingWorker.id,
            worker_id: editingWorker.worker_id || formData.worker_id,
            worker_position: formData.worker_position || editingWorker.worker_position || worker_position || "",
            permission_gubun: formData.permission_gubun,
            worker_expired: expiredStr,
          },
        };
        const res = await proPermissionData.mutateAsync(payload);
        if (String(res?.success) === '777') {
          const msg = res?.output?.message || res?.resultjson?.message || (res?.message !== "정상 접속" ? res?.message : "") || "권한이 수정되었습니다.";
          modal.showConfirm("알림", msg, {
            btns: [
              {
                title: "확인",
                click: async () => {
                  await fetchData();
                  handleCancelEdit();
                },
              },
            ],
          });
        } else {
          modal.showErrorAlert("에러", res?.message || "권한 수정 중 오류가 발생했습니다.");
        }
      } else {
        const payload = {
          params: {
            gb: "worker_enter",
            user: auth?.user?.userId || "",
            projectnum,
            pof: formData.pof || projectpof || "",
            projectname,
            worker_id: formData.worker_id,
            worker_name: formData.worker_name,
            worker_position: formData.worker_position || worker_position || "",
            permission_gubun: formData.permission_gubun,
            worker_expired: expiredStr,
            ...(formData.worker_password ? { worker_password: formData.worker_password } : {}),
          },
        };

        const res = await proPermissionData.mutateAsync(payload);
        if (String(res?.success) === '777') {
          const msg = res?.output?.message || res?.resultjson?.message || (res?.message !== "정상 접속" ? res?.message : "") || "프로젝트 권한이 등록되었습니다.";
          modal.showConfirm("알림", msg, {
            btns: [
              {
                title: "확인",
                click: async () => {
                  await fetchData();
                  setFormData(initForm());
                  setWorkerDropdownKey((prev) => prev + 1);
                  fetchUserList("");
                },
              },
            ],
          });
        } else if (String(res?.success) === '773') {
          modal.showErrorAlert("에러", res?.message || "이미 등록된 사용자입니다.");
        } else {
          modal.showErrorAlert("에러", res?.message || "등록 중 오류가 발생했습니다.");
        }
      }
    } catch (err) {
      modal.showErrorAlert("알림", "네트워크 오류로 처리에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 프로젝트 삭제 이벤트
  const handleDeleteProject = async () => {
    try {
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
                if (String(res?.success) === '777') {
                  modal.showConfirm("알림", "프로젝트가 삭제되었습니다.", {
                    btns: [
                      {
                        title: "확인",
                        click: async () => {
                          sessionStorage.setItem("projectnum", "");
                          sessionStorage.setItem("projectname", "");
                          sessionStorage.setItem("servername", "");
                          sessionStorage.setItem("projectpof", "");
                          sessionStorage.setItem("merge_pn", "");
                          sessionStorage.setItem("merge_pn_text", "");
                          navigate("/ai_open_analysis");
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
    <div className="ai-page-container">
      <AiDataHeader title="프로젝트 권한 관리">
        {/* <GridHeaderBtnPrimary
          onClick={handleDeleteProject}
          className="btn-delete-project"
        >
          <div className="btn-delete-project-inner">
            <Trash2 size={16} />
            <span>프로젝트 삭제</span>
            <span
              className="info-icon"
              data-tooltip={`프로젝트 삭제|삭제된 데이터는 복구할 수 없습니다.`}
            ></span>
          </div>
        </GridHeaderBtnPrimary> */}
      </AiDataHeader>

      <div className="ai-content-area">
        <div className="ai-split-layout">
          {/* Left: Registration / Edit Form */}
          <div className="ai-split-left">
            <div className="pro-permission-form-card">
              <div>
                <h3 className="form-section-title">{editingWorker ? "권한 수정" : "권한 등록"}</h3>
                <p className="form-desc">작업자별 접근 권한을 설정하고 관리합니다.</p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: '16px' }}>
                <div className="form-field">
                  <span className="form-label">프로젝트명</span>
                  <Input
                    className="k-input k-input-solid"
                    value={projectname || ""}
                    disabled
                    style={{ background: '#f8fafc', color: '#64748b' }}
                  />
                </div>

                <div className="form-field">
                  <span className="form-label">웹프로젝트번호</span>
                  <Input
                    className="k-input k-input-solid"
                    value={projectnum || ""}
                    disabled
                    style={{ background: '#f8fafc', color: '#64748b' }}
                  />
                </div>

                <div className="form-field">
                  <span className="form-label">POF</span>
                  <Input
                    className="k-input k-input-solid"
                    value={formData.pof}
                    onChange={(e) => handleChange("pof", e.value)}
                    disabled
                    style={{ background: '#f8fafc', color: '#64748b' }}
                  />
                </div>

                <div className="form-field">
                  <span className="form-label">작업 권한 <span>*</span></span>
                  <DropDownList
                    data={PERMISSION_OPTIONS}
                    value={formData.permission_gubun}
                    onChange={(e) => handleChange("permission_gubun", e.value)}
                    disabled={loading}
                  />
                </div>

                {!editingWorker && ["고객(읽기)", "일반(읽기)"].includes(formData.permission_gubun) ? (
                  <div className="form-field">
                    <span className="form-label">고객명 <span>*</span></span>
                    <Input
                      className="k-input k-input-solid"
                      value={formData.worker_name || ""}
                      onChange={(e) => handleChange("worker_name", e.value)}
                      disabled={loading}
                      placeholder="고객명을 입력해 주세요"
                    />
                  </div>
                ) : (
                  <div className="form-field">
                    <span className="form-label">작업자 선택 <span>*</span></span>
                    <DropDownList
                      key={workerDropdownKey}
                      data={filteredUsers}
                      textField="text"
                      dataItemKey="value"
                      filterable={!editingWorker}
                      onFilterChange={handleUserFilterChange}
                      onChange={(e) => {
                        const selected = e.value;
                        if (selected) {
                          setFormData((prev) => ({
                            ...prev,
                            worker_id: selected.value,
                            worker_name: selected.name,
                            worker_position: selected.position,
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
                      value={
                        editingWorker
                          ? {
                              text: `${editingWorker.worker_name || ""}(${editingWorker.worker_position || editingWorker.worker_id || ""})`,
                              value: editingWorker.worker_id,
                            }
                          : filteredUsers.find((u) => u.value === formData.worker_id) || null
                      }
                      disabled={loading || Boolean(editingWorker)}
                      placeholder="작업자를 선택해 주세요"
                    />
                  </div>
                )}

                {!editingWorker && ["고객(읽기)", "일반(읽기)"].includes(formData.permission_gubun) && (
                  <>
                    <div className="form-field">
                      <span className="form-label">고객 이메일 (ID) <span>*</span></span>
                      <Input
                        className="k-input k-input-solid"
                        value={formData.worker_id || ""}
                        onChange={(e) => handleChange("worker_id", e.value)}
                        disabled={loading}
                        placeholder="이메일을 입력해 주세요"
                      />
                    </div>
                    <div className="form-field">
                      <span className="form-label">고객 비밀번호 <span>*</span></span>
                      <Input
                        type="password"
                        className="k-input k-input-solid"
                        value={formData.worker_password || ""}
                        onChange={(e) => handleChange("worker_password", e.value)}
                        disabled={loading}
                        placeholder="비밀번호를 입력해 주세요"
                      />
                    </div>
                  </>
                )}

                <div className="form-field">
                  <span className="form-label">만료 일자 <span>*</span></span>
                  <DatePicker
                    className="custom-datepicker"
                    value={formData.worker_expired ? new Date(formData.worker_expired) : null}
                    format={"yyyy-MM-dd"}
                    min={new Date()}
                    max={new Date(2200, 12, 31)}
                    disabled={loading}
                    editable={false}
                    onChange={(e) => handleChange("worker_expired", e.value)}
                    button={(props) => (
                      <button
                        {...props}
                        type="button"
                        className="k-button k-input-button"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#ff8024"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                      </button>
                    )}
                  />
                </div>

                {editingWorker ? (
                  <div className="submit-btn-wrap" style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      type="submit"
                      className="btn-submit-premium"
                      disabled={loading}
                      style={{ flex: 2 }}
                    >
                      {loading ? "수정 중..." : "권한 수정"}
                    </Button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      style={{
                        flex: 1,
                        height: '42px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#64748b',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <div className="submit-btn-wrap">
                    <Button
                      type="submit"
                      className="btn-submit-premium"
                      disabled={loading}
                    >
                      권한 등록하기
                    </Button>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Right: Grid Area */}
          <div className="ai-split-right" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <ProPermissionGrid
              data={gridData}
              setData={setGridData}
              fetchData={fetchData}
              editingWorker={editingWorker}
              onEditWorker={handleSelectWorkerForEdit}
              onCancelEdit={handleCancelEdit}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProPermission;
