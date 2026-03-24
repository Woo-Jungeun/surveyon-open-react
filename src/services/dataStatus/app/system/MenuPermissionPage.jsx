import React, { useState, useEffect } from 'react';
import DataHeader from "@/services/dataStatus/components/DataHeader";
import { Search, Users, Shield, Eye, Edit } from "lucide-react";
import { useSelector } from "react-redux";
import { ProPermissionApi } from "@/services/aiOpenAnalysis/app/proPermission/ProPermissionApi.js";
import './MenuPermissionPage.css';

/**
 * H-SRT 시스템 메뉴 권한 설정 페이지
 */
const MenuPermissionPage = () => {
    const auth = useSelector(state => state.auth);
    const { proPermissionData } = ProPermissionApi();

    const [userList, setUserList] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeRoleTab, setActiveRoleTab] = useState("연구원");
    const [loading, setLoading] = useState(false);

    // 사용자 목록 필터링
    const filteredUsers = userList.filter(u => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            (u.worker_name && u.worker_name.toLowerCase().includes(query)) ||
            (u.worker_id && u.worker_id.toLowerCase().includes(query)) ||
            (u.permission_gubun && u.permission_gubun.toLowerCase().includes(query))
        );
    });

    // API 연동하여 데이터 가져오기
    useEffect(() => {
        const fetchUsers = async () => {
            const projectnum = sessionStorage.getItem("projectnum");
            const user = auth?.user?.userId;

            if (!projectnum || !user) return;

            try {
                setLoading(true);
                const payload = {
                    params: {
                        gb: "worker_list",
                        projectnum,
                        user
                    }
                };
                const res = await proPermissionData.mutateAsync(payload);
                if (res?.success === "777" && res?.resultjson) {
                    setUserList(res.resultjson);
                    if (res.resultjson.length > 0) {
                        setSelectedUser(res.resultjson[0]);
                    }
                }
            } catch (err) {
                console.error("fetchUsers error", err);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [auth?.user?.userId]);

    // Role 구분에 따른 뱃지/아바타 색상 헬퍼 함수
    const getRoleClass = (gubun) => {
        if (!gubun) return "default";
        if (gubun.includes("연구원") || gubun.includes("관리")) return "researcher avatar-bg-0";
        if (gubun.includes("제작자")) return "creator avatar-bg-1";
        if (gubun.includes("고객") || gubun.includes("일반")) return "client avatar-bg-2";
        return "default avatar-bg-3";
    };

    const getShortRole = (gubun) => {
        if (!gubun) return "일반";
        if (gubun.includes("연구원") || gubun.includes("관리")) return "연구원";
        if (gubun.includes("제작자")) return "제작자";
        if (gubun.includes("고객") || gubun.includes("일반")) return "고객";
        return "일반";
    };

    const [permissions, setPermissions] = useState({
        status_freq: true,
        status_cross: true,
        status_add: true,
        status_quota: true,
        ai_analysis: true,
        ai_report: true,
        data_var: true,
        data_dp: true,
        data_weight: true,
    });

    const handleToggle = (key) => setPermissions(prev => ({ ...prev, [key]: !prev[key] }));

    const handleToggleSection = (keys) => {
        const allOff = keys.every(k => !permissions[k]);
        const newState = allOff ? true : false; // 다 꺼져있으면 키고, 아니면 끔
        setPermissions(prev => {
            const next = { ...prev };
            keys.forEach(k => next[k] = newState);
            return next;
        });
    };

    // 단위 컴포넌트: 심플한 토글 스위치 형태
    const SettingRow = ({ label, isVisible, onToggle, isLast }) => (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0',
            borderBottom: isLast ? 'none' : '1px solid #f1f5f9'
        }}>
            <span style={{ fontSize: '14px', color: isVisible ? '#1e293b' : '#94a3b8', fontWeight: isVisible ? 600 : 400, transition: 'color 0.2s' }}>
                {label}
            </span>
            <div
                onClick={onToggle}
                style={{
                    width: '36px', height: '20px', borderRadius: '12px',
                    backgroundColor: isVisible ? '#3b82f6' : '#cbd5e1',
                    position: 'relative', cursor: 'pointer', transition: 'all 0.2s'
                }}
            >
                <div style={{
                    width: '16px', height: '16px', backgroundColor: '#fff', borderRadius: '50%',
                    position: 'absolute', top: '2px', left: isVisible ? 'calc(100% - 18px)' : '2px',
                    transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
                }}></div>
            </div>
        </div>
    );

    const [selectedUser, setSelectedUser] = useState(null);

    const statusKeys = ['status_freq', 'status_cross', 'status_add', 'status_quota'];
    const isStatusAllOff = statusKeys.every(k => !permissions[k]);

    const aiKeys = ['ai_analysis', 'ai_report'];
    const isAiAllOff = aiKeys.every(k => !permissions[k]);

    const dataKeys = ['data_var', 'data_dp', 'data_weight'];
    const isDataAllOff = dataKeys.every(k => !permissions[k]);

    return (
        <div className="aggregation-page" data-theme="data-dashboard" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f8fafc' }}>
            {/* 상단 헤더 영역 */}
            <DataHeader
                title="메뉴 권한 설정"
                saveButtonLabel="권한 설정 저장"
                onSave={() => alert("저장 기능 준비 중")}
            />

            {/* 메인 2-Column Split Layout */}
            <div className="menu-permission-container">

                {/* Left: 사용자 목록 */}
                <div className="user-list-panel">
                    <div className="user-list-header">
                        <div className="user-list-title">
                            <Users size={18} color="#3b82f6" />
                            <span>사용자 목록</span>
                        </div>
                        <div className="perm-search-box">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="사용자 검색 (이름, ID, 권한 등)"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="user-list-content">
                        {loading && <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>데이터 불러오는 중...</div>}
                        {!loading && filteredUsers.length === 0 && (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>사용자가 없습니다.</div>
                        )}
                        {!loading && filteredUsers.map((user, idx) => {
                            const name = user.worker_name || "알수없음";
                            const initial = name.charAt(0);
                            const roleClass = getRoleClass(user.permission_gubun);
                            const shortRole = getShortRole(user.permission_gubun);
                            const isActive = selectedUser?.id === user.id;

                            return (
                                <div
                                    key={user.id || idx}
                                    className="perm-user-card"
                                    style={{ borderColor: isActive ? '#3b82f6' : '#f1f5f9', backgroundColor: isActive ? '#f0f9ff' : '#fff' }}
                                    onClick={() => setSelectedUser(user)}
                                >
                                    <div className="perm-user-info">
                                        <div className="perm-user-name" style={{ color: isActive ? '#2563eb' : '#0f172a' }}>{name}</div>
                                        <div className="perm-user-email">{user.worker_id || "-"}</div>
                                    </div>
                                    <div className={`role-badge ${roleClass.split(' ')[0]}`}>
                                        {shortRole}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: 메뉴별 권한 설정 */}
                <div className="permission-setting-panel">

                    <div className="permission-content">
                        {selectedUser ? (
                            <>
                                {/* 집계 현황 섹션 */}
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid #3b82f6', paddingLeft: '12px', paddingRight: '20px', marginBottom: '12px' }}>
                                        <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>집계 현황</h3>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <span
                                                onClick={() => handleToggleSection(statusKeys)}
                                                style={{
                                                    fontSize: '12px', color: isStatusAllOff ? '#64748b' : '#3b82f6',
                                                    backgroundColor: isStatusAllOff ? '#f1f5f9' : '#eff6ff',
                                                    padding: '6px 14px', borderRadius: '16px',
                                                    cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s'
                                                }}
                                            >
                                                {isStatusAllOff ? '전체 켜기' : '전체 끄기'}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px 20px' }}>
                                        <SettingRow label="빈도분석" isVisible={permissions.status_freq} onToggle={() => handleToggle('status_freq')} />
                                        <SettingRow label="교차분석" isVisible={permissions.status_cross} onToggle={() => handleToggle('status_cross')} />
                                        <SettingRow label="추가분석" isVisible={permissions.status_add} onToggle={() => handleToggle('status_add')} />
                                        <SettingRow label="쿼터현황/관리" isVisible={permissions.status_quota} onToggle={() => handleToggle('status_quota')} isLast />
                                    </div>
                                </div>

                                {/* AI요약 섹션 */}
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid #3b82f6', paddingLeft: '12px', paddingRight: '20px', marginBottom: '12px' }}>
                                        <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>AI요약</h3>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <span
                                                onClick={() => handleToggleSection(aiKeys)}
                                                style={{
                                                    fontSize: '12px', color: isAiAllOff ? '#64748b' : '#3b82f6',
                                                    backgroundColor: isAiAllOff ? '#f1f5f9' : '#eff6ff',
                                                    padding: '6px 14px', borderRadius: '16px',
                                                    cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s'
                                                }}
                                            >
                                                {isAiAllOff ? '전체 켜기' : '전체 끄기'}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px 20px' }}>
                                        <SettingRow label="AI분석" isVisible={permissions.ai_analysis} onToggle={() => handleToggle('ai_analysis')} />
                                        <SettingRow label="AI리포트" isVisible={permissions.ai_report} onToggle={() => handleToggle('ai_report')} isLast />
                                    </div>
                                </div>

                                {/* 데이터설정 섹션 */}
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid #3b82f6', paddingLeft: '12px', paddingRight: '20px', marginBottom: '12px' }}>
                                        <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>데이터설정</h3>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <span
                                                onClick={() => handleToggleSection(dataKeys)}
                                                style={{
                                                    fontSize: '12px', color: isDataAllOff ? '#64748b' : '#3b82f6',
                                                    backgroundColor: isDataAllOff ? '#f1f5f9' : '#eff6ff',
                                                    padding: '6px 14px', borderRadius: '16px',
                                                    cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s'
                                                }}
                                            >
                                                {isDataAllOff ? '전체 켜기' : '전체 끄기'}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px 20px' }}>
                                        <SettingRow label="변수 생성" isVisible={permissions.data_var} onToggle={() => handleToggle('data_var')} />
                                        <SettingRow label="DP 의뢰서 정의" isVisible={permissions.data_dp} onToggle={() => handleToggle('data_dp')} />
                                        <SettingRow label="가중치 생성" isVisible={permissions.data_weight} onToggle={() => handleToggle('data_weight')} isLast />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                                권한을 설정할 사용자를 좌측에서 선택해 주세요.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MenuPermissionPage;
