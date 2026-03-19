import React, { useState, useContext, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { X, Trash2, ShieldCheck, UserPlus, Info } from "lucide-react";
import { Input } from "@progress/kendo-react-inputs";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import { DatePicker } from "@progress/kendo-react-dateinputs";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { process } from "@progress/kendo-data-query";
import { modalContext } from "@/components/common/Modal.jsx";
import { useSelector } from "react-redux";
import { ProPermissionApi } from "@/services/aiOpenAnalysis/app/proPermission/ProPermissionApi";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import GridDataCount from "@/components/common/grid/GridDataCount";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import "./ProPermissionModal.css";

const ProPermissionModal = ({ open, onClose }) => {
    const modal = useContext(modalContext);
    const auth = useSelector((store) => store.auth);
    const navigate = useNavigate();
    const { proPermissionData, pagesMembersSet } = ProPermissionApi();

    const projectnum = sessionStorage.getItem("projectnum");
    const projectname = sessionStorage.getItem("projectname");
    const projectpof = sessionStorage.getItem("projectpof");

    const [loading, setLoading] = useState(false);
    const [gridData, setGridData] = useState([]);
    const [userOptions, setUserOptions] = useState([]);
    const [sort, setSort] = useState([]);
    const [filter, setFilter] = useState(null);

    const initForm = () => ({
        pof: sessionStorage.getItem("projectpof") || "",
        permission_gubun: "",
        worker_name: "",
        worker_id: "",
        worker_password: "",
        worker_position: "",
        worker_expired: moment().add(100, "years").toDate(),
    });

    const [formData, setFormData] = useState(initForm);
    const handleChange = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

    const fetchData = async () => {
        try {
            const res = await proPermissionData.mutateAsync({
                params: { gb: "worker_list", projectnum, user: auth?.user?.userId || "" }
            });
            if (res?.success === "777") setGridData(res?.resultjson || []);
        } catch { }
    };

    const fetchUserList = async (searchText = "") => {
        try {
            const res = await proPermissionData.mutateAsync({
                params: { gb: "worker_search", user: auth?.user?.userId || "", worker_name: searchText }
            });
            if (res?.success === "777") {
                const list = res.resultjson.map((u) => ({
                    text: `${u.Name}(${u.Position})`, value: u.Id, position: u.Position, name: u.Name,
                }));
                setUserOptions(list);
            } else {
                setUserOptions([]);
            }
        } catch {
            setUserOptions([]);
        }
    };

    useEffect(() => {
        if (open) { fetchData(); fetchUserList(); setFormData(initForm()); }
    }, [open]);

    const handleUserFilterChange = (e) => {
        const v = e.filter?.value || "";
        fetchUserList(v);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        const errs = [];
        if (!formData.permission_gubun) errs.push("작업권한을 선택해 주세요.");
        if (["고객(읽기)", "일반(읽기)"].includes(formData.permission_gubun)) {
            if (!formData.worker_name.trim()) errs.push("고객 이름을 입력해 주세요.");
            if (!formData.worker_id.trim()) errs.push("고객 이메일을 입력해 주세요.");
            if (!formData.worker_password.trim()) errs.push("고객 비밀번호를 입력해 주세요.");
        } else if (formData.permission_gubun !== "H-SRT고객") {
            if (!formData.worker_name.trim()) errs.push("작업자 이름을 입력해 주세요.");
        }
        if (errs.length) { modal.showErrorAlert("알림", errs.join("\n"), { themeClass: "purple-theme" }); return; }

        try {
            setLoading(true);
            let worker_position = "";
            let worker_name_override = formData.worker_name;
            let page_id = "";
            if (formData.permission_gubun === "고객(읽기)") worker_position = "고객";
            else if (formData.permission_gubun === "일반(읽기)") worker_position = "일반";
            else if (formData.permission_gubun === "H-SRT고객") {
                worker_position = "H-SRT고객";
                worker_name_override = "H-SRT고객";
                page_id = sessionStorage.getItem("pageId") || "";
                page_title = sessionStorage.getItem("pagetitle") || "";
            }

            const reqParams = {
                gb: "worker_enter", projectname, projectnum, ...formData,
                worker_name: worker_name_override,
                worker_position: formData.worker_position || worker_position || "",
                worker_expired: formData.worker_expired
                    ? moment(formData.worker_expired).set({ hour: 23, minute: 59, second: 59 }).format("YYYY-MM-DD HH:mm:ss")
                    : "",
                user: auth?.user?.userId || "",
            };

            if (formData.permission_gubun === "H-SRT고객") {
                reqParams.page_id = page_id;
                reqParams.page_title = page_title;
            }

            const res = await proPermissionData.mutateAsync({
                params: reqParams,
            });
            if (res?.success === "777") {
                modal.showConfirm("알림", "프로젝트 권한이 등록되었습니다.", {
                    themeClass: "purple-theme",
                    btns: [
                        {
                            title: "확인",
                            click: async () => {
                                const pageId = sessionStorage.getItem("pageId");
                                if (pageId) {
                                    let targetUserId = formData.worker_id;

                                    // [TODO: 차후 API 적용 시 아래 주석 해제하여 사용]

                                    // H-SRT고객의 경우 서버에서 생성해서 내려준 workerid를 사용
                                    if (formData.permission_gubun === "H-SRT고객" && res.resultjson && res.resultjson.length > 0) {
                                        targetUserId = res.resultjson[0].workerid;
                                    }


                                    // (임시 조치) API 미운영 상태이므로 일단 리스트를 다시 조회해서 가장 마지막 항목의 worker_id를 가져옴
                                    // if (formData.permission_gubun === "H-SRT고객") {
                                    //     try {
                                    //         const listRes = await proPermissionData.mutateAsync({
                                    //             params: { gb: "worker_list", projectnum, user: auth?.user?.userId || "" }
                                    //         });
                                    //         if (listRes?.success === "777" && listRes.resultjson && listRes.resultjson.length > 0) {
                                    //             const listData = listRes.resultjson;
                                    //             targetUserId = listData[listData.length - 1].worker_id || listData[listData.length - 1].id;
                                    //         }
                                    //     } catch (e) {
                                    //         console.error("임시 목록 조회 실패: ", e);
                                    //     }
                                    // }

                                    console.log("pageId", pageId, targetUserId)
                                    try {
                                        await pagesMembersSet.mutateAsync({
                                            params: {
                                                pageid: pageId,
                                                user_id: targetUserId,
                                                role: "admin",
                                                user: auth?.user?.userId || ""
                                            }
                                        });
                                    } catch (e) {
                                        console.error("pagesMembersSet API 호출 실패: ", e);
                                    }
                                }
                                await fetchData();
                                setFormData(initForm());
                            }
                        }
                    ],
                });
            } else if (res?.success === "773") {
                modal.showErrorAlert("에러", res?.message, { themeClass: "purple-theme" });
            } else {
                modal.showErrorAlert("에러", res?.message || "등록 중 오류가 발생했습니다.", { themeClass: "purple-theme" });
            }
        } catch { modal.showErrorAlert("알림", "네트워크 오류로 등록에 실패했습니다.", { themeClass: "purple-theme" }); }
        finally { setLoading(false); }
    };

    const handleDeleteProject = () => {
        modal.showConfirm("알림", "프로젝트를 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.", {
            themeClass: "purple-theme",
            btns: [
                { title: "취소" },
                {
                    title: "삭제",
                    click: async () => {
                        try {
                            const res = await proPermissionData.mutateAsync({
                                params: { gb: "project_del", projectnum, user: auth?.user?.userId || "" }
                            });
                            if (res?.success === "777") {
                                modal.showConfirm("알림", "프로젝트가 삭제되었습니다.", {
                                    themeClass: "purple-theme",
                                    btns: [{
                                        title: "확인", click: () => {
                                            ["projectnum", "projectname", "servername", "projectpof", "merge_pn", "merge_pn_text"]
                                                .forEach(k => sessionStorage.setItem(k, ""));
                                            onClose();
                                            navigate("/ai_open_analysis");
                                        }
                                    }]
                                });
                            } else { modal.showErrorAlert("에러", res?.message || "삭제 중 오류가 발생했습니다.", { themeClass: "purple-theme" }); }
                        } catch { modal.showErrorAlert("오류", "삭제 요청 중 네트워크 오류가 발생했습니다.", { themeClass: "purple-theme" }); }
                    }
                }
            ]
        });
    };

    const handleDeleteWorker = (id) => {
        modal.showConfirm("알림", "선택한 사용자를 삭제하시겠습니까?", {
            themeClass: "purple-theme",
            btns: [
                { title: "취소" },
                {
                    title: "삭제",
                    click: async () => {
                        try {
                            const res = await proPermissionData.mutateAsync({
                                params: { gb: "worker_del", user: auth?.user?.userId || "", projectnum, id }
                            });
                            if (res?.success === "777") { modal.showAlert("알림", "사용자가 삭제되었습니다.", { themeClass: "purple-theme" }); await fetchData(); }
                            else { modal.showErrorAlert("에러", res?.message || "삭제 중 오류가 발생했습니다.", { themeClass: "purple-theme" }); }
                        } catch { modal.showErrorAlert("오류", "삭제 요청 중 네트워크 오류가 발생했습니다.", { themeClass: "purple-theme" }); }
                    }
                }
            ]
        });
    };

    const numberedData = useMemo(() => gridData.map((item, idx) => ({ ...item, no: idx + 1 })), [gridData]);
    const processedData = useMemo(() => process(numberedData, { sort, filter }), [numberedData, sort, filter]);

    if (!open) return null;

    return ReactDOM.createPortal(
        <div className="pp-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="pp-modal-container">
                {/* Header */}
                <div className="pp-modal-header">
                    <div className="pp-modal-header-left">
                        <ShieldCheck size={20} className="pp-modal-header-icon" />
                        <span className="pp-modal-title">프로젝트 권한 관리</span>
                        {projectname && <span className="pp-modal-subtitle">— {projectname}</span>}
                    </div>
                    <div className="pp-modal-header-right">
                        <div className="pp-delete-project-wrapper">
                            <button className="pp-btn-delete-project" onClick={handleDeleteProject}>
                                <Trash2 size={14} />
                                <span>프로젝트 삭제</span>
                                <Info size={14} className="pp-info-icon" />
                            </button>
                            <div className="pp-delete-tooltip">
                                <div className="pp-tooltip-header">
                                    <Info size={14} />
                                    <span>프로젝트 삭제</span>
                                </div>
                                <div className="pp-tooltip-body">
                                    삭제된 데이터는 복구할 수 없습니다.
                                </div>
                            </div>
                        </div>
                        <button className="pp-modal-close" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="pp-modal-body">
                    {/* Left: Form */}
                    <div className="pp-modal-left">
                        <div className="pp-form-section-title">
                            <UserPlus size={14} />
                            권한 등록
                        </div>

                        <form onSubmit={handleSubmit} className="pp-form">
                            <div className="pp-form-field">
                                <label className="pp-form-label">프로젝트명</label>
                                <Input className="k-input k-input-solid" value={projectname || ""} disabled style={{ background: "#f8fafc", color: "#64748b" }} />
                            </div>

                            <div className="pp-form-field">
                                <label className="pp-form-label">작업 권한 <span className="pp-required">*</span></label>
                                <DropDownList
                                    data={["오픈팀(관리,읽기,쓰기)", "제작자(관리,읽기,쓰기)", "연구원(읽기,쓰기)", "H-SRT고객"]}
                                    value={formData.permission_gubun}
                                    onChange={(e) => handleChange("permission_gubun", e.value)}
                                    disabled={loading}
                                    defaultItem="권한을 선택하세요"
                                />
                            </div>

                            {["고객(읽기)", "일반(읽기)"].includes(formData.permission_gubun) ? (
                                <div className="pp-form-field">
                                    <label className="pp-form-label">고객명 <span className="pp-required">*</span></label>
                                    <Input className="k-input k-input-solid" value={formData.worker_name || ""} onChange={(e) => handleChange("worker_name", e.value)} disabled={loading} placeholder="고객명을 입력해 주세요" />
                                </div>
                            ) : formData.permission_gubun === "H-SRT고객" ? null : (
                                <div className="pp-form-field">
                                    <label className="pp-form-label">작업자 선택 <span className="pp-required">*</span></label>
                                    <DropDownList
                                        data={userOptions}
                                        textField="text"
                                        dataItemKey="value"
                                        filterable
                                        onFilterChange={handleUserFilterChange}
                                        onChange={(e) => {
                                            const s = e.value;
                                            if (s) setFormData((prev) => ({ ...prev, worker_id: s.value, worker_name: s.name, worker_position: s.position }));
                                            else setFormData((prev) => ({ ...prev, worker_id: "", worker_name: "", worker_position: "" }));
                                        }}
                                        value={userOptions.find((u) => u.value === formData.worker_id) || null}
                                        disabled={loading}
                                        placeholder="작업자를 선택해 주세요"
                                    />
                                </div>
                            )}

                            {["고객(읽기)", "일반(읽기)"].includes(formData.permission_gubun) && (
                                <>
                                    <div className="pp-form-field">
                                        <label className="pp-form-label">고객 이메일 (ID) <span className="pp-required">*</span></label>
                                        <Input className="k-input k-input-solid" value={formData.worker_id || ""} onChange={(e) => handleChange("worker_id", e.value)} disabled={loading} placeholder="이메일을 입력해 주세요" />
                                    </div>
                                    <div className="pp-form-field">
                                        <label className="pp-form-label">고객 비밀번호 <span className="pp-required">*</span></label>
                                        <Input type="password" className="k-input k-input-solid" value={formData.worker_password || ""} onChange={(e) => handleChange("worker_password", e.value)} disabled={loading} placeholder="비밀번호를 입력해 주세요" />
                                    </div>
                                </>
                            )}

                            <div className="pp-form-field">
                                <label className="pp-form-label">만료 일자 <span className="pp-required">*</span></label>
                                <DatePicker
                                    value={formData.worker_expired ? new Date(formData.worker_expired) : null}
                                    format={"yyyy-MM-dd"}
                                    min={new Date()}
                                    max={new Date(2200, 12, 31)}
                                    disabled={loading}
                                    editable={false}
                                    onChange={(e) => handleChange("worker_expired", e.value)}
                                />
                            </div>

                            <button type="submit" className="pp-btn-submit" disabled={loading}>
                                {loading ? "등록 중..." : "권한 등록하기"}
                            </button>
                        </form>
                    </div>

                    {/* Right: Grid */}
                    <div className="pp-modal-right">
                        <div className="pp-grid-header">
                            <GridDataCount total={processedData.total} />
                        </div>
                        <div className="pp-grid-wrap">
                            <KendoGrid
                                parentProps={{
                                    data: processedData.data,
                                    total: processedData.total,
                                    dataItemKey: "no",
                                    sortable: { mode: "multiple", allowUnsort: true },
                                    filterable: true,
                                    sortChange: ({ sort }) => setSort(sort ?? []),
                                    filterChange: ({ filter }) => setFilter(filter ?? undefined),
                                    sort,
                                    filter,
                                    style: { height: "100%" }
                                }}
                            >
                                <Column field="no" title="No" width="60px" filterable={false} />
                                <Column field="worker_name" title="이름" />
                                <Column field="permission_gubun" title="권한" width="180px" />
                                <Column field="worker_id" title="ID" />
                                <Column
                                    field="register_date"
                                    title="등록일"
                                    width="105px"
                                    cell={(props) => {
                                        const val = props.dataItem.register_date || "";
                                        const parts = val.split(" ");
                                        return (
                                            <td className={props.className} style={{ textAlign: "center" }}>
                                                <div style={{ fontSize: "13px", lineHeight: "1.4" }}>
                                                    {parts[0]}
                                                    {parts[1] && <><br />{parts[1]}</>}
                                                </div>
                                            </td>
                                        );
                                    }}
                                />
                                <Column
                                    field="worker_expired"
                                    title="만료일"
                                    width="105px"
                                    cell={(props) => {
                                        const val = props.dataItem.worker_expired || "";
                                        const parts = val.split(" ");
                                        return (
                                            <td className={props.className} style={{ textAlign: "center" }}>
                                                <div style={{ fontSize: "13px", lineHeight: "1.4" }}>
                                                    {parts[0]}
                                                    {parts[1] && <><br />{parts[1]}</>}
                                                </div>
                                            </td>
                                        );
                                    }}
                                />
                                <Column
                                    title="삭제"
                                    width="80px"
                                    filterable={false}
                                    cell={(props) => {
                                        if (props.dataItem.no === 1) return <td />;
                                        return (
                                            <td style={{ textAlign: "center" }}>
                                                <button className="pp-del-btn" onClick={() => handleDeleteWorker(props.dataItem.id)}>삭제</button>
                                            </td>
                                        );
                                    }}
                                />
                            </KendoGrid>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ProPermissionModal;
