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

    // 더미 스위치 데이터 컴포넌트 (우측 화면)
    const SettingRow = ({ label, readOn, writeOn }) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '14px', color: '#334155', fontWeight: 500 }}>{label}</span>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Eye size={16} color="#94a3b8" />
                    <span style={{ fontSize: '13px', color: '#64748b' }}>읽기</span>
                    {/* Toggle Switch Placeholder */}
                    <div style={{
                        width: '40px', height: '22px', borderRadius: '12px',
                        backgroundColor: readOn ? '#10b981' : '#cbd5e1',
                        position: 'relative', cursor: 'pointer', transition: 'all 0.2s',
                        marginLeft: '8px'
                    }}>
                        <div style={{
                            width: '18px', height: '18px', backgroundColor: '#fff', borderRadius: '50%',
                            position: 'absolute', top: '2px', left: readOn ? 'calc(100% - 20px)' : '2px',
                            transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}></div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Edit size={16} color="#94a3b8" />
                    <span style={{ fontSize: '13px', color: '#64748b' }}>쓰기</span>
                    {/* Toggle Switch Placeholder */}
                    <div style={{
                        width: '40px', height: '22px', borderRadius: '12px',
                        backgroundColor: writeOn ? '#3b82f6' : '#cbd5e1',
                        position: 'relative', cursor: 'pointer', transition: 'all 0.2s',
                        marginLeft: '8px'
                    }}>
                        <div style={{
                            width: '18px', height: '18px', backgroundColor: '#fff', borderRadius: '50%',
                            position: 'absolute', top: '2px', left: writeOn ? 'calc(100% - 20px)' : '2px',
                            transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}></div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="aggregation-page" data-theme="data-dashboard" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f8fafc' }}>
            {/* 상단 헤더 영역 */}
            <DataHeader title="메뉴 권한 설정" />

            {/* 메인 2-Column Split Layout */}
            <div className="menu-permission-container">

                {/* Left: 사용자 목록 */}
                <div className="user-list-panel">
                    <div className="user-list-header">
                        <div className="user-list-title">
                            <Users size={18} color="#3b82f6" />
                            <span>사용자 목록</span>
                        </div>
                        <div className="search-box">
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

                            return (
                                <div key={user.id || idx} className="perm-user-card">
                                    <div className={`perm-user-avatar ${roleClass.split(' ')[1]}`}>
                                        {initial}
                                    </div>
                                    <div className="perm-user-info">
                                        <div className="perm-user-name">{name}</div>
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

                {/* Right: 그룹별/메뉴별 권한 설정 */}
                <div className="permission-setting-panel">
                    <div className="permission-header">
                        <div className="permission-title">
                            <Shield size={18} color="#4f46e5" />
                            <span>그룹별 권한 설정</span>
                        </div>
                        <div className="role-tabs">
                            {['연구원', '제작자', '고객'].map(tab => (
                                <div
                                    key={tab}
                                    className={`role-tab ${activeRoleTab === tab ? 'active' : ''}`}
                                    onClick={() => setActiveRoleTab(tab)}
                                >
                                    {tab}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="permission-content">
                        {/* 데이터셋팅 섹션 */}
                        <div style={{ marginBottom: '32px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid #3b82f6', paddingLeft: '12px', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>데이터셋팅</h3>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <span style={{ fontSize: '12px', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Eye size={14} /> 전체 읽기 OFF
                                    </span>
                                    <span style={{ fontSize: '12px', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Edit size={14} /> 전체 쓰기 OFF
                                    </span>
                                </div>
                            </div>
                            <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 20px' }}>
                                <SettingRow label="전체 데이터(뷰어)" readOn={activeRoleTab !== '고객'} writeOn={activeRoleTab === '연구원' || activeRoleTab === '제작자'} />
                                <SettingRow label="변수 생성(관리)" readOn={true} writeOn={activeRoleTab === '제작자' || activeRoleTab === '연구원'} />
                                <SettingRow label="가중치 생성" readOn={true} writeOn={activeRoleTab === '연구원'} />
                                <SettingRow label="DP의뢰서 정의" readOn={activeRoleTab !== '고객'} writeOn={activeRoleTab === '제작자'} />
                            </div>
                        </div>

                        {/* 집계현황 섹션 */}
                        <div style={{ marginBottom: '32px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid #3b82f6', paddingLeft: '12px', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>집계현황</h3>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <span style={{ fontSize: '12px', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Eye size={14} /> 전체 읽기 OFF
                                    </span>
                                    <span style={{ fontSize: '12px', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Edit size={14} /> 전체 쓰기 OFF
                                    </span>
                                </div>
                            </div>
                            <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 20px' }}>
                                <SettingRow label="빈도분석" readOn={true} writeOn={activeRoleTab !== '고객'} />
                                <SettingRow label="교차분석" readOn={true} writeOn={activeRoleTab !== '고객'} />
                                <SettingRow label="추가분석" readOn={true} writeOn={activeRoleTab === '연구원'} />
                                <SettingRow label="쿼터현황/관리" readOn={true} writeOn={activeRoleTab === '제작자'} />
                            </div>
                        </div>

                    </div>
                    {/* 하단 저장 버튼 영역 */}
                    <div style={{ padding: '16px 24px', backgroundColor: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                        <button style={{
                            backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px',
                            padding: '10px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                            <Shield size={16} />
                            권한 설정 저장
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MenuPermissionPage;
