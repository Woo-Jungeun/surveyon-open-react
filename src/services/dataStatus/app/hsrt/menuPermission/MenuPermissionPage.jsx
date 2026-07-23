import { useState, useEffect, useMemo, useContext } from 'react';
import DataHeader from "@/services/dataStatus/components/DataHeader";
import { Search, UserPlus, Info } from "lucide-react";
import { useSelector } from "react-redux";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { process } from "@progress/kendo-data-query";
import { modalContext } from "@/components/common/Modal.jsx";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import GridDataCount from "@/components/common/grid/GridDataCount";
import { ProPermissionApi } from "@/services/aiOpenAnalysis/app/proPermission/ProPermissionApi.js";
import './MenuPermissionPage.css';

const ROLE_OPTIONS = [
    { text: "관리자 (관리, 읽기,쓰기)", value: "admin" },
    { text: "연구원(읽기, 쓰기)", value: "editor" },
    { text: "연구원(읽기)", value: "viewer" },
    { text: "H-SRT고객", value: "client" }
];

const getPermissionsArrayForRole = (role) => {
    if (role === 'viewer' || role === 'client') {
        return [
            "page.view.data",
            "page.view.variables_map",
            "page.analysis.frequency",
            "page.analysis.cross",
            "page.analysis.additional",
            "page.analysis.quota"
        ];
    }
    if (role === 'editor') {
        return [
            "page.view.data",
            "page.view.variables_map",
            "page.analysis.frequency",
            "page.analysis.cross",
            "page.analysis.additional",
            "page.analysis.quota",
            "page.setting.page",
            "page.setting.recoding",
            "page.setting.dp_request",
            "page.setting.add_question",
            "page.setting.weight"
        ];
    }
    if (role === 'admin') {
        return [
            "page.view.data",
            "page.view.variables_map",
            "page.analysis.frequency",
            "page.analysis.cross",
            "page.analysis.additional",
            "page.analysis.quota",
            "page.setting.page",
            "page.setting.recoding",
            "page.setting.dp_request",
            "page.setting.add_question",
            "page.setting.weight",
            "page.setting.members",
            "page.delete"
        ];
    }
    return [];
};

const getPermissionsText = (permissionsList) => {
    if (!permissionsList || !permissionsList.length) return "없음";
    const permissionMapping = {
        "page.analysis.frequency": "빈도분석",
        "page.analysis.cross": "교차분석",
        "page.analysis.additional": "추가분석",
        "page.analysis.quota": "쿼터현황/관리",
        "page.setting.page": "페이지 설정",
        "page.setting.recoding": "스터브 생성",
        "page.setting.dp_request": "DP 의뢰서 정의",
        "page.setting.add_question": "문항 추가",
        "page.setting.weight": "가중치 생성"
    };
    const translated = permissionsList
        .map(p => permissionMapping[p])
        .filter(Boolean);
    return translated.length === 0 ? "없음" : translated.join(", ");
};

/**
 * H-SRT 시스템 대시보드 권한 설정 페이지
 */
const MenuPermissionPage = () => {
    const auth = useSelector(state => state.auth);
    const modal = useContext(modalContext);
    const { proPermissionData, pagesMembersSet, pagesMembersList, pagesMembersDelete } = ProPermissionApi();

    const [userList, setUserList] = useState([]); // Project workers
    const [userOptions, setUserOptions] = useState([]); // Search worker options for dropdown
    const [pageMembers, setPageMembers] = useState([]); // Page members
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedRole, setSelectedRole] = useState("");

    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);

    // Kendo Grid state
    const [sort, setSort] = useState([]);
    const [filter, setFilter] = useState(null);

    const [pageId, setPageId] = useState(sessionStorage.getItem("pageId"));
    const [projectName, setProjectName] = useState(sessionStorage.getItem("projectname") || "");
    const [pageTitle, setPageTitle] = useState(sessionStorage.getItem("pagetitle") || "");

    // pageSelected 이벤트 감지하여 pageId 및 세션 정보 갱신
    useEffect(() => {
        const handlePageSelected = () => {
            setPageId(sessionStorage.getItem("pageId"));
            setProjectName(sessionStorage.getItem("projectname") || "");
            setPageTitle(sessionStorage.getItem("pagetitle") || "");
        };
        window.addEventListener("pageSelected", handlePageSelected);
        return () => window.removeEventListener("pageSelected", handlePageSelected);
    }, []);

    useEffect(() => {
        setProjectName(sessionStorage.getItem("projectname") || "");
        setPageTitle(sessionStorage.getItem("pagetitle") || "");
    }, [pageId]);

    // Load workers of the project
    const fetchProjectWorkers = async () => {
        const projectnum = sessionStorage.getItem("projectnum");
        const user = auth?.user?.userId;
        if (!projectnum || !user) return;
        try {
            const payload = {
                params: {
                    gb: "worker_list",
                    projectnum,
                    user
                }
            };
            const res = await proPermissionData.mutateAsync(payload);
            if (res?.success == "777" && res?.resultjson) {
                setUserList(res.resultjson);
            }
        } catch (e) {
            console.error("fetchProjectWorkers error", e);
        }
    };

    // Load members of the active dashboard page
    const fetchPageMembers = async () => {
        const user = auth?.user?.userId;
        if (!pageId || !user) return;
        try {
            setLoading(true);
            const payload = {
                params: {
                    pageid: pageId,
                    user: user
                }
            };
            const res = await pagesMembersList.mutateAsync(payload);
            if (res?.success == "777" && res?.resultjson) {
                setPageMembers(res.resultjson);
            }
        } catch (e) {
            console.error("fetchPageMembers error", e);
        } finally {
            setLoading(false);
        }
    };

    // Search workers from all users database
    const fetchUserSearch = async (searchText = "") => {
        const user = auth?.user?.userId;
        if (!user) return;
        try {
            const payload = {
                params: {
                    gb: "worker_search",
                    user,
                    worker_name: searchText
                }
            };
            const res = await proPermissionData.mutateAsync(payload);
            if (res?.success == "777" && res?.resultjson) {
                const list = res.resultjson.map((u) => ({
                    text: `${u.Name}(${u.Position})`,
                    value: u.Id,
                    position: u.Position,
                    name: u.Name
                }));
                setUserOptions(list);
            } else {
                setUserOptions([]);
            }
        } catch (e) {
            console.error("fetchUserSearch error", e);
            setUserOptions([]);
        }
    };

    useEffect(() => {
        setSelectedUser(null);
        setSelectedRole("");
        fetchProjectWorkers();
        fetchPageMembers();
        fetchUserSearch(""); // Initial load
    }, [auth?.user?.userId, pageId]);

    // Lookup name from worker_list or userOptions
    const getWorkerName = (userId) => {
        const worker = userList.find(w => w.worker_id === userId);
        if (worker) return worker.worker_name;
        const option = userOptions.find(o => o.value === userId);
        if (option) return option.name;
        return userId;
    };

    // Lookup position from userOptions or fallback to userId (avoids using project role like "제작자(관리,읽기,쓰기)")
    const getWorkerPosition = (userId) => {
        const option = userOptions.find(o => o.value === userId);
        if (option) return option.position;
        return userId;
    };

    // Check if the current form selection is in Edit mode (already registered member)
    const isEditMode = useMemo(() => {
        if (!selectedUser) return false;
        const userId = selectedUser.worker_id || selectedUser.user_id;
        return pageMembers.some(m => m.user_id === userId);
    }, [selectedUser, pageMembers]);

    // Handle dropdown user selection
    const handleDropdownChange = (e) => {
        const val = e.value;
        if (val) {
            setSelectedUser({
                worker_id: val.value,
                worker_name: val.name,
                position: val.position
            });
        } else {
            setSelectedUser(null);
        }
    };

    // Save dashboard permissions
    const handleSave = async () => {
        const authUserId = auth?.user?.userId;

        if (!pageId) {
            modal.showAlert("알림", "대시보드가 선택되지 않았습니다.");
            return;
        }
        if (!selectedUser) {
            modal.showAlert("알림", "사용자를 선택해 주세요.");
            return;
        }
        if (!selectedRole) {
            modal.showAlert("알림", "권한을 선택해 주세요.");
            return;
        }

        const userId = selectedUser.worker_id || selectedUser.user_id;

        try {
            setLoading(true);
            const res = await pagesMembersSet.mutateAsync({
                params: {
                    pageid: pageId,
                    user: authUserId || "",
                    user_id: userId,
                    role: selectedRole,
                    permissions: getPermissionsArrayForRole(selectedRole)
                }
            });
            if (res?.success == "777") {
                modal.showAlert("알림", `${getWorkerName(userId)}님의 대시보드 권한이 설정되었습니다.`);
                setSelectedUser(null);
                setSelectedRole("");
                await fetchPageMembers();
            } else {
                modal.showErrorAlert("에러", res?.message || "권한 설정에 실패했습니다.");
            }
        } catch (err) {
            modal.showErrorAlert("오류", "권한 설정 중 네트워크 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    // Delete page member role
    const handleDeleteMember = (userId) => {
        if (!pageId) return;

        modal.showConfirm("알림", "선택한 사용자의 대시보드 권한을 삭제하시겠습니까?", {
            btns: [
                { title: "취소" },
                {
                    title: "삭제",
                    click: async () => {
                        try {
                            setLoading(true);
                            const res = await pagesMembersDelete.mutateAsync({
                                params: {
                                    pageid: pageId,
                                    user_id: userId,
                                    user: auth?.user?.userId || ""
                                }
                            });
                            if (res?.success == "777") {
                                modal.showAlert("알림", "대시보드 권한이 삭제되었습니다.");
                                if (selectedUser && (selectedUser.worker_id === userId || selectedUser.user_id === userId)) {
                                    setSelectedUser(null);
                                    setSelectedRole("");
                                }
                                await fetchPageMembers();
                            } else {
                                modal.showErrorAlert("에러", res?.message || "삭제 중 오류가 발생했습니다.");
                            }
                        } catch (err) {
                            modal.showErrorAlert("오류", "삭제 요청 중 네트워크 오류가 발생했습니다.");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        });
    };

    // Process data for Kendo Grid
    const numberedData = useMemo(() => {
        return pageMembers.map((item, idx) => ({
            ...item,
            no: idx + 1,
            selected: selectedUser?.user_id === item.user_id || selectedUser?.worker_id === item.user_id,
            worker_name: getWorkerName(item.user_id),
            roleText: item.role === "admin" ? "관리자 (관리, 읽기,쓰기)" : item.role === "editor" ? "연구원(읽기, 쓰기)" : item.role === "client" ? "H-SRT고객" : "연구원(읽기)",
            allowedMenusText: getPermissionsText(item.permissions)
        }));
    }, [pageMembers, userList, selectedUser]);

    const processedData = useMemo(() => {
        let items = numberedData;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            items = items.filter(u =>
                (u.worker_name && u.worker_name.toLowerCase().includes(query)) ||
                (u.user_id && u.user_id.toLowerCase().includes(query)) ||
                (u.roleText && u.roleText.toLowerCase().includes(query)) ||
                (u.allowedMenusText && u.allowedMenusText.toLowerCase().includes(query))
            );
        }
        return process(items, { sort, filter });
    }, [numberedData, searchQuery, sort, filter]);

    if (!pageId) {
        return (
            <div className="menu-permission-page">
                <DataHeader
                    title="대시보드 권한 설정"
                    saveButtonLabel="권한 설정 저장"
                    onSave={null}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#64748b', gap: '12px', padding: '40px' }}>
                    <Info size={32} color="#3b82f6" />
                    <span style={{ fontSize: '15px', fontWeight: 600 }}>대시보드를 먼저 선택해 주세요.</span>
                </div>
            </div>
        );
    }

    return (
        <div className="menu-permission-page">
            {/* 상단 헤더 영역 */}
            <DataHeader
                title="대시보드 권한 설정"
                saveButtonLabel="권한 설정 저장"
                onSave={handleSave}
            />

            {/* 메인 2-Column Split Layout */}
            <div className="menu-permission-container">

                {/* Left: Form */}
                <div className="mp-form-panel">
                    <div className="mp-form-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3b82f6', marginBottom: '4px' }}>
                            <UserPlus size={16} />
                            <h3 className="mp-form-title">{isEditMode ? "권한 수정" : "권한 등록"}</h3>
                        </div>
                        <p className="mp-form-desc">작업자별 대시보드 메뉴 권한을 설정합니다.</p>
                    </div>

                    <div className="mp-form">
                        <div className="mp-form-field">
                            <label className="mp-form-label">프로젝트명</label>
                            <input 
                                type="text" 
                                className="mp-input-disabled" 
                                value={projectName} 
                                disabled 
                            />
                        </div>

                        <div className="mp-form-field">
                            <label className="mp-form-label">대시보드명</label>
                            <input 
                                type="text" 
                                className="mp-input-disabled" 
                                value={pageTitle} 
                                disabled 
                            />
                        </div>

                        <div className="mp-form-field">
                            <label className="mp-form-label">작업자 권한 선택 <span className="mp-required">*</span></label>
                            <DropDownList
                                data={ROLE_OPTIONS}
                                textField="text"
                                dataItemKey="value"
                                onChange={(e) => {
                                    setSelectedRole(e.value?.value || "");
                                    if (!isEditMode) {
                                        setSelectedUser(null); // Reset user in register mode to enforce order
                                    }
                                }}
                                value={ROLE_OPTIONS.find(r => r.value === selectedRole) || null}
                                popupSettings={{ className: "mp-dropdown-popup" }}
                                placeholder="권한을 선택해 주세요"
                            />
                        </div>

                        <div className="mp-form-field">
                            <label className="mp-form-label">작업자 선택 <span className="mp-required">*</span></label>
                            <DropDownList
                                data={userOptions}
                                textField="text"
                                dataItemKey="value"
                                filterable
                                onFilterChange={(e) => fetchUserSearch(e.filter?.value || "")}
                                onChange={handleDropdownChange}
                                value={selectedUser ? {
                                    text: `${selectedUser.worker_name || getWorkerName(selectedUser.worker_id || selectedUser.user_id)}(${selectedUser.position || getWorkerPosition(selectedUser.worker_id || selectedUser.user_id) || selectedUser.worker_id || selectedUser.user_id})`,
                                    value: selectedUser.worker_id || selectedUser.user_id
                                } : null}
                                disabled={!selectedRole}
                                popupSettings={{ className: "mp-dropdown-popup" }}
                                placeholder="작업자를 선택해 주세요"
                            />
                        </div>

                        {isEditMode ? (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                <button 
                                    type="button" 
                                    className="mp-btn-submit" 
                                    onClick={handleSave} 
                                    disabled={loading || !selectedUser || !selectedRole}
                                    style={{ flex: 2, margin: 0 }}
                                >
                                    {loading ? "수정 중..." : "대시보드 권한 수정"}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setSelectedUser(null);
                                        setSelectedRole("");
                                    }}
                                    style={{ 
                                        flex: 1, 
                                        padding: '10px', 
                                        borderRadius: '8px', 
                                        border: '1px solid #cbd5e1', 
                                        background: '#fff', 
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
                            <button 
                                type="button" 
                                className="mp-btn-submit" 
                                onClick={handleSave} 
                                disabled={loading || !selectedUser || !selectedRole}
                                style={{ marginTop: '10px' }}
                            >
                                {loading ? "저장 중..." : "대시보드 권한 저장"}
                            </button>
                        )}
                    </div>
                </div>

                {/* Right: Grid */}
                <div className="mp-grid-panel">
                    <div className="mp-grid-header">
                        <GridDataCount total={processedData.total} />
                        <div style={{ position: "relative", width: "200px" }}>
                            <Search 
                                size={14} 
                                style={{ 
                                    position: "absolute", 
                                    left: "10px", 
                                    top: "50%", 
                                    transform: "translateY(-50%)", 
                                    color: "#94a3b8",
                                    pointerEvents: "none"
                                }} 
                            />
                            <input
                                type="text"
                                placeholder="이름, ID, 권한 검색"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{
                                    width: "100%",
                                    height: "32px",
                                    padding: "6px 10px 6px 30px",
                                    borderRadius: "4px",
                                    border: "1px solid #cbd5e1",
                                    fontSize: "12px",
                                    outline: "none",
                                    background: "#fff",
                                    boxSizing: "border-box"
                                }}
                            />
                        </div>
                    </div>

                    <div className="mp-grid-wrap">
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
                                onRowClick: (e) => {
                                    const member = e.dataItem;
                                    setSelectedUser({
                                        worker_id: member.user_id,
                                        worker_name: member.worker_name,
                                        position: getWorkerPosition(member.user_id)
                                    });
                                    setSelectedRole(member.role);
                                },
                                style: { height: "100%" }
                            }}
                        >
                            <Column field="no" title="No" width="60px" filterable={false} />
                            <Column field="worker_name" title="이름" width="120px" />
                            <Column field="user_id" title="ID" width="130px" />
                            <Column field="roleText" title="권한 구분" width="180px" />
                            <Column field="allowedMenusText" title="허용 메뉴" />
                            <Column
                                title="삭제"
                                width="80px"
                                filterable={false}
                                cell={(props) => {
                                    return (
                                        <td style={{ textAlign: "center" }}>
                                            <button 
                                                type="button"
                                                className="mp-del-btn" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteMember(props.dataItem.user_id);
                                                }}
                                            >
                                                삭제
                                            </button>
                                        </td>
                                    );
                                }}
                            />
                        </KendoGrid>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MenuPermissionPage;
