import { useState, useContext, useEffect, useMemo, cloneElement } from "react";
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
import { useLocation } from "react-router-dom";
import "./ProPermissionModal.css";

const PERMISSION_OPTIONS = [
    "오픈팀(관리,읽기,쓰기)",
    "제작자(관리,읽기,쓰기)",
    "연구원(읽기,쓰기)",
    "고객(읽기)",
    "일반(읽기)",
];

const ProPermissionModal = ({ open, onClose }) => {
    const modal = useContext(modalContext);
    const auth = useSelector((store) => store.auth);
    const location = useLocation();
    const { proPermissionData } = ProPermissionApi();

    const projectnum = sessionStorage.getItem("projectnum");
    const projectname = sessionStorage.getItem("projectname");

    const [loading, setLoading] = useState(false);
    const [gridData, setGridData] = useState([]);
    const [userOptions, setUserOptions] = useState([]);
    const [sort, setSort] = useState([]);
    const [filter, setFilter] = useState(null);
    const [editingWorker, setEditingWorker] = useState(null);
    const [workerDropdownKey, setWorkerDropdownKey] = useState(0);

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
                params: { gb: "worker_list", projectnum }
            });
            const list = res?.output ?? res?.resultjson ?? [];
            if (String(res?.success) === '777') {
                setGridData(Array.isArray(list) ? list : []);
            }
        } catch (err) {
            console.error("fetchData error", err);
        }
    };

    const fetchUserList = async (searchText = "") => {
        try {
            const res = await proPermissionData.mutateAsync({
                params: { gb: "worker_search", search: searchText || "" }
            });
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
            } else {
                setUserOptions([]);
            }
        } catch (err) {
            console.error("fetchUserList error", err);
            setUserOptions([]);
        }
    };

    useEffect(() => {
        if (open) {
            fetchData();
            fetchUserList("");
            setEditingWorker(null);
            setFormData(initForm());
        }
    }, [open]);

    const handleUserFilterChange = (e) => {
        const v = e.filter?.value || "";
        fetchUserList(v);
    };

    const handleSelectWorkerForEdit = (workerItem) => {
        if (!workerItem) return;
        setEditingWorker(workerItem);
        const expDate = workerItem.worker_expired
            ? moment(workerItem.worker_expired).toDate()
            : moment().add(100, "years").toDate();
        setFormData({
            pof: sessionStorage.getItem("projectpof") || "",
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
            } else {
                if (!formData.worker_name.trim()) errs.push("작업자 이름을 입력해 주세요.");
            }
        }

        if (errs.length) {
            modal.showErrorAlert("알림", errs.join("\n"), { themeClass: "purple-theme" });
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
                // 프로젝트 권한 수정 API (gb: "worker_update")
                const reqParams = {
                    gb: "worker_update",
                    user: auth?.user?.userId || "",
                    projectnum,
                    id: editingWorker.id,
                    worker_id: editingWorker.worker_id || formData.worker_id,
                    worker_position: formData.worker_position || editingWorker.worker_position || worker_position || "",
                    permission_gubun: formData.permission_gubun,
                    worker_expired: expiredStr,
                };

                const res = await proPermissionData.mutateAsync({ params: reqParams });
                if (String(res?.success) === '777') {
                    const msg = res?.output?.message || res?.resultjson?.message || (res?.message !== "정상 접속" ? res?.message : "") || "권한이 수정되었습니다.";
                    modal.showConfirm("알림", msg, {
                        themeClass: "purple-theme",
                        btns: [
                            {
                                title: "확인",
                                click: async () => {
                                    await fetchData();
                                    setEditingWorker(null);
                                    setFormData(initForm());
                                    setWorkerDropdownKey((prev) => prev + 1);
                                    fetchUserList("");
                                }
                            }
                        ],
                    });
                } else {
                    modal.showErrorAlert("에러", res?.message || "권한 수정 중 오류가 발생했습니다.", { themeClass: "purple-theme" });
                }
            } else {
                // 프로젝트 권한 신규 등록 API (gb: "worker_enter")
                const reqParams = {
                    gb: "worker_enter",
                    user: auth?.user?.userId || "",
                    projectnum,
                    pof: formData.pof || sessionStorage.getItem("projectpof") || "",
                    projectname,
                    worker_id: formData.worker_id,
                    worker_name: formData.worker_name,
                    worker_position: formData.worker_position || worker_position || "",
                    permission_gubun: formData.permission_gubun,
                    worker_expired: expiredStr,
                    ...(formData.worker_password ? { worker_password: formData.worker_password } : {}),
                };

                const res = await proPermissionData.mutateAsync({ params: reqParams });
                if (String(res?.success) === '777') {
                    const msg = res?.output?.message || res?.resultjson?.message || (res?.message !== "정상 접속" ? res?.message : "") || "프로젝트 권한이 등록되었습니다.";
                    modal.showConfirm("알림", msg, {
                        themeClass: "purple-theme",
                        btns: [
                            {
                                title: "확인",
                                click: async () => {
                                    await fetchData();
                                    setFormData(initForm());
                                    setWorkerDropdownKey((prev) => prev + 1);
                                    fetchUserList("");
                                }
                            }
                        ],
                    });
                } else if (String(res?.success) === '773') {
                    modal.showErrorAlert("에러", res?.message || "이미 등록된 사용자입니다.", { themeClass: "purple-theme" });
                } else {
                    modal.showErrorAlert("에러", res?.message || "등록 중 오류가 발생했습니다.", { themeClass: "purple-theme" });
                }
            }
        } catch (err) {
            console.error("handleSubmit error", err);
            modal.showErrorAlert("알림", "네트워크 오류로 처리에 실패했습니다.", { themeClass: "purple-theme" });
        } finally {
            setLoading(false);
        }
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
                            if (String(res?.success) === '777') {
                                modal.showConfirm("알림", "프로젝트가 삭제되었습니다.", {
                                    themeClass: "purple-theme",
                                    btns: [{
                                        title: "확인", click: () => {
                                            ["projectnum", "projectname", "servername", "projectpof", "merge_pn", "merge_pn_text"]
                                                .forEach(k => sessionStorage.setItem(k, ""));
                                            onClose();
                                            const baseModule = location.pathname.split('/')[1] || "";
                                            window.location.href = baseModule ? `/${baseModule}` : "/";
                                        }
                                    }]
                                });
                            } else {
                                modal.showErrorAlert("에러", res?.message || "삭제 중 오류가 발생했습니다.", { themeClass: "purple-theme" });
                            }
                        } catch (err) {
                            console.error("handleDeleteProject error", err);
                            modal.showErrorAlert("오류", "삭제 요청 중 네트워크 오류가 발생했습니다.", { themeClass: "purple-theme" });
                        }
                    }
                }
            ]
        });
    };

    const handleDeleteWorker = (workerItem) => {
        if (!workerItem) return;
        modal.showConfirm("알림", "선택한 사용자의 권한을 삭제하시겠습니까?", {
            themeClass: "purple-theme",
            btns: [
                { title: "취소" },
                {
                    title: "삭제",
                    click: async () => {
                        try {
                            const res = await proPermissionData.mutateAsync({
                                params: {
                                    gb: "worker_del",
                                    user: auth?.user?.userId || "",
                                    projectnum,
                                    id: workerItem.id,
                                    worker_id: workerItem.worker_id,
                                }
                            });
                            if (String(res?.success) === '777') {
                                const msg = res?.output?.message || res?.resultjson?.message || (res?.message !== "정상 접속" ? res?.message : "") || "권한이 성공적으로 삭제되었습니다.";
                                modal.showAlert("알림", msg, { themeClass: "purple-theme" });
                                if (editingWorker?.id === workerItem.id) {
                                    handleCancelEdit();
                                }
                                await fetchData();
                            } else {
                                modal.showErrorAlert("에러", res?.message || "삭제 중 오류가 발생했습니다.", { themeClass: "purple-theme" });
                            }
                        } catch (err) {
                            console.error("handleDeleteWorker error", err);
                            modal.showErrorAlert("오류", "삭제 요청 중 네트워크 오류가 발생했습니다.", { themeClass: "purple-theme" });
                        }
                    }
                }
            ]
        });
    };

    const numberedData = useMemo(() => {
        const filtered = gridData.filter(
            (item) => item.permission_gubun !== "H-SRT고객" && item.worker_name !== "H-SRT고객"
        );
        return filtered.map((item, idx) => ({
            ...item,
            no: idx + 1,
            selected: editingWorker ? editingWorker.id === item.id : false,
        }));
    }, [gridData, editingWorker]);

    const processedData = useMemo(() => process(numberedData, { sort, filter }), [numberedData, sort, filter]);

    const rowRender = (trElement, props) => {
        const isSelected = props.dataItem.selected;
        const trProps = {
            ...trElement.props,
            className: `${trElement.props.className || ""} ${isSelected ? "k-selected" : ""}`.trim(),
            style: {
                ...(trElement.props.style || {}),
                cursor: "pointer",
            },
        };
        return cloneElement(trElement, trProps, trElement.props.children);
    };

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
                        {/* <div className="pp-delete-project-wrapper">
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
                        </div> */}
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
                            {editingWorker ? "권한 수정" : "권한 등록"}
                        </div>

                        <form onSubmit={handleSubmit} className="pp-form">
                            <div className="pp-form-field">
                                <label className="pp-form-label">프로젝트명</label>
                                <Input className="k-input k-input-solid" value={projectname || ""} disabled style={{ background: "#f8fafc", color: "#64748b" }} />
                            </div>

                            <div className="pp-form-field">
                                <label className="pp-form-label">작업 권한 <span className="pp-required">*</span></label>
                                <DropDownList
                                    className={!formData.permission_gubun ? "pp-dropdown-placeholder" : ""}
                                    data={PERMISSION_OPTIONS}
                                    value={formData.permission_gubun}
                                    onChange={(e) => handleChange("permission_gubun", e.value)}
                                    disabled={loading}
                                />
                            </div>

                            {!editingWorker && ["고객(읽기)", "일반(읽기)"].includes(formData.permission_gubun) ? (
                                <div className="pp-form-field">
                                    <label className="pp-form-label">고객명 <span className="pp-required">*</span></label>
                                    <Input className="k-input k-input-solid" value={formData.worker_name || ""} onChange={(e) => handleChange("worker_name", e.value)} disabled={loading} placeholder="고객명을 입력해 주세요" />
                                </div>
                            ) : (
                                <div className="pp-form-field">
                                    <label className="pp-form-label">작업자 선택 <span className="pp-required">*</span></label>
                                    <DropDownList
                                        key={workerDropdownKey}
                                        data={userOptions}
                                        textField="text"
                                        dataItemKey="value"
                                        filterable={!editingWorker}
                                        onFilterChange={handleUserFilterChange}
                                        onChange={(e) => {
                                            const s = e.value;
                                            if (s) setFormData((prev) => ({ ...prev, worker_id: s.value, worker_name: s.name, worker_position: s.position }));
                                            else setFormData((prev) => ({ ...prev, worker_id: "", worker_name: "", worker_position: "" }));
                                        }}
                                        value={
                                            editingWorker
                                                ? {
                                                    text: `${editingWorker.worker_name || ""}(${editingWorker.worker_position || editingWorker.worker_id || ""})`,
                                                    value: editingWorker.worker_id,
                                                }
                                                : userOptions.find((u) => u.value === formData.worker_id) || null
                                        }
                                        disabled={loading || Boolean(editingWorker)}
                                        placeholder="작업자를 선택해 주세요"
                                    />
                                </div>
                            )}

                            {!editingWorker && ["고객(읽기)", "일반(읽기)"].includes(formData.permission_gubun) && (
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

                            {editingWorker ? (
                                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                                    <button type="submit" className="pp-btn-submit" disabled={loading} style={{ flex: 2, margin: 0 }}>
                                        {loading ? "수정 중..." : "권한 수정"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        style={{
                                            flex: 1,
                                            height: "40px",
                                            borderRadius: "8px",
                                            border: "1px solid #cbd5e1",
                                            background: "#ffffff",
                                            color: "#64748b",
                                            fontSize: "13.5px",
                                            fontWeight: 600,
                                            cursor: "pointer"
                                        }}
                                    >
                                        취소
                                    </button>
                                </div>
                            ) : (
                                <button type="submit" className="pp-btn-submit" disabled={loading}>
                                    {loading ? "등록 중..." : "권한 등록하기"}
                                </button>
                            )}
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
                                    reorderable: true,
                                    rowRender: rowRender,
                                    sortable: { mode: "multiple", allowUnsort: true },
                                    filterable: true,
                                    sortChange: ({ sort }) => setSort(sort ?? []),
                                    filterChange: ({ filter }) => setFilter(filter ?? undefined),
                                    sort,
                                    filter,
                                    style: { height: "100%" },
                                    onRowClick: (e) => {
                                        const target = e?.syntheticEvent?.target || e?.nativeEvent?.target;
                                        if (target && target.closest && target.closest("button")) return;
                                        handleSelectWorkerForEdit(e.dataItem);
                                    },
                                }}
                            >
                                <Column field="no" title="No" width="60px" filterable={false} />
                                <Column field="worker_name" title="이름" width="100px" />
                                <Column field="permission_gubun" title="권한" width="160px" />
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
                                    cell={(props) => (
                                        <td style={{ textAlign: "center" }}>
                                            <button
                                                type="button"
                                                className="pp-del-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteWorker(props.dataItem);
                                                }}
                                            >
                                                삭제
                                            </button>
                                        </td>
                                    )}
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
