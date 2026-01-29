import React, { useState } from 'react';
import DataHeader from '../../components/DataHeader';
import { ChevronDown, ChevronUp, Monitor, Smartphone, Tablet, Phone, Users, FileText, Send } from 'lucide-react';
import './QuotaPage.css';

const QuotaPage = () => {
    // Default to 'table' view as per user's description of the previous screen being 'table'
    const [viewMode, setViewMode] = useState('table');
    const [expandedGroups, setExpandedGroups] = useState(['g0', 'g1', 'g3']);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedTab, setSelectedTab] = useState('g0'); // Default to first tab

    const toggleGroup = (id) => {
        if (expandedGroups.includes(id)) {
            setExpandedGroups(expandedGroups.filter(gId => gId !== id));
        } else {
            setExpandedGroups([...expandedGroups, id]);
        }
    };

    // Dashboard Summary Data
    const summaryCards = [
        {
            title: '참여현황',
            color: 'blue',
            icon: <Users size={20} />,
            items: [
                { label: '조사완료', value: '33명' },
                { label: '설문완료자', value: '182,154명' },
                { label: '상영확보', value: '54,558명' },
                { label: '해당없자', value: '87,219명' },
                { label: '중간값', value: '9,318명' }
            ]
        },
        {
            title: '응답현황',
            color: 'green',
            icon: <FileText size={20} />,
            items: [
                { label: '조사완료율', value: '11%' },
                { label: '성공응답률(분모)', value: '20분' },
                { label: '중단비율', value: '0.00%' },
                { label: 'IR', value: '0.02' },
                { label: '불완전율', value: '0명' }
            ]
        },
        {
            title: '발송현황',
            color: 'purple',
            icon: <Send size={20} />,
            items: [
                { label: '채팅 발송수', value: '551,450 / 77,652건' },
                { label: '문자 발송수', value: '0 / 0건' },
                { label: '카카오알림톡 발송수', value: '471,435 / 63,600건' },
                { label: 'Push 발송수', value: '0 / 0건' }
            ]
        }
    ];

    const deviceStats = [
        { label: 'PC', value: '24', icon: <Monitor size={24} />, color: '#3b82f6', bg: '#eff6ff' },
        { label: 'Mobile', value: '9', icon: <Smartphone size={24} />, color: '#10b981', bg: '#ecfdf5' },
        { label: 'Mobile+PC', value: '0', icon: <Tablet size={24} />, color: '#8b5cf6', bg: '#f5f3ff' },
        { label: '전화조사', value: '0', icon: <Phone size={24} />, color: '#f59e0b', bg: '#fffbeb' }
    ];

    // Data for Table View (Existing Data)
    const quotaGroups = [
        {
            id: 'g0',
            name: '마크로밀엠브레인',
            current: 150,
            target: 82,
            type: 'demographics',
            data: [
                { age: '30-34세', gender: '남성', target: 15, current: 8, rate: 53 },
                { age: '30-34세', gender: '여성', target: 15, current: 10, rate: 67 },
                { age: '35-39세', gender: '남성', target: 15, current: 17, rate: 113, isHighlight: true },
            ]
        },
        {
            id: 'g1',
            name: '한국리서치',
            current: 100,
            target: 63,
            type: 'demographics',
            data: [
                { age: '40-44세', gender: '남성', target: 15, current: 10, rate: 67 },
                { age: '40-44세', gender: '여성', target: 15, current: 14, rate: 93 },
                { age: '45-49세', gender: '여성', target: 15, current: 13, rate: 87 },
            ]
        },
        {
            id: 'g2',
            name: '코리아리서치',
            current: 75,
            target: 48,
            type: 'demographics',
            data: [
                { age: '50-54세', gender: '여성', target: 15, current: 8, rate: 53 },
                { age: '30-34세', gender: '남성', target: 10, current: 7, rate: 70 },
                { age: '30-34세', gender: '여성', target: 10, current: 9, rate: 90 },
            ]
        },
        {
            id: 'g3',
            name: '닐슨코리아',
            current: 80,
            target: 51,
            type: 'demographics',
            data: [
                { age: '35-39세', gender: '여성', target: 15, current: 9, rate: 60 },
                { age: '40-44세', gender: '여성', target: 15, current: 12, rate: 80 },
                { age: '45-49세', gender: '남성', target: 15, current: 10, rate: 67 },
            ]
        }
    ];

    const variableStats = [
        {
            id: 'have',
            name: 'have',
            items: [
                { label: '1-보유자 - LG', current: 17, target: 35 },
                { label: '2-보유자 - 삼성', current: 11, target: 30 },
                { label: '3-보유자 - 기타', current: 0, target: 0 },
                { label: '7-미보유자 - LG', current: 1, target: 5 },
                { label: '8-미보유자 - 삼성', current: 3, target: 5 },
                { label: '9-미보유자 - 기타', current: 1, target: 1, isHighlight: true },
            ],
            total: { current: 33, target: 76 }
        },
        {
            id: 'purchasePlan',
            name: 'purchasePlan',
            items: [
                { label: '1-6개월 이내 구입 의향자', current: 1, target: 999 },
                { label: '2-그 이후 구입의향자', current: 13, target: 999 },
                { label: '3-구입 계획 없음', current: 19, target: 999 },
            ],
            total: { current: 33, target: 2997 }
        }
    ];

    // Data for List View (Stateful)
    const [quotaList, setQuotaList] = useState([
        { id: 1, category: '연령', label: '4 번 30-34세*2 여성', quota: 15, response: 5, shortage: -10, status: 'ongoing' },
        { id: 2, category: '연령', label: '5 번 35-39세*2 여성', quota: 15, response: 11, shortage: -4, status: 'ongoing' },
        { id: 3, category: '연령', label: '6 번 40-44세*2 여성', quota: 15, response: 5, shortage: -10, status: 'ongoing' },
        { id: 4, category: '연령', label: '7 번 45-49세*2 여성', quota: 15, response: 4, shortage: -11, status: 'ongoing' },
        { id: 5, category: '연령', label: '8 번 50-54세*2 여성', quota: 15, response: 8, shortage: -7, status: 'ongoing' },
        { id: 6, category: 'have', label: '1-보유자 - LG', quota: 35, response: 17, shortage: -18, status: 'ongoing' },
        { id: 7, category: 'have', label: '2-보유자 - 삼성', quota: 30, response: 11, shortage: -19, status: 'ongoing' },
        { id: 8, category: 'have', label: '3-보유자 - 기타', quota: 0, response: 0, shortage: 0, status: 'completed' },
        { id: 9, category: 'have', label: '7-미보유자 - LG', quota: 5, response: 1, shortage: -4, status: 'ongoing' },
        { id: 10, category: 'have', label: '8-미보유자 - 삼성', quota: 5, response: 3, shortage: -2, status: 'ongoing' },
        { id: 11, category: 'have', label: '9-미보유자 - 기타', quota: 1, response: 1, shortage: 0, status: 'completed' },
        { id: 12, category: 'purchasePlan', label: '1-6개월 이내 구입 의향자', quota: 999, response: 1, shortage: -998, status: 'ongoing' },
    ]);

    const handleQuotaChange = (id, field, value) => {
        const newValue = parseInt(value) || 0;
        setQuotaList(quotaList.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: newValue };
                // Recalculate shortage
                updatedItem.shortage = updatedItem.response - updatedItem.quota;
                return updatedItem;
            }
            return item;
        }));
    };

    return (
        <div className="quota-page">
            <DataHeader title="쿼터 관리">
                <button
                    className="view-toggle-btn"
                    onClick={() => setViewMode(viewMode === 'list' ? 'table' : 'list')}
                >
                    {viewMode === 'list' ? '테이블현황' : '리스트현황'}
                </button>
            </DataHeader>

            <div className="quota-content">
                {/* Dashboard Summary */}
                {viewMode === 'table' && (
                    <div className="dashboard-summary">
                        <div className="status-cards-row">
                            {summaryCards.map((card, idx) => (
                                <div key={idx} className={`status-card ${card.color}`}>
                                    <div className="status-card-header">
                                        {card.icon}
                                        {card.title}
                                    </div>
                                    <div className="status-card-content">
                                        {card.items.map((item, i) => (
                                            <div key={i} className="status-row">
                                                <span className="label">{item.label}</span>
                                                <span className="val">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="section-container">
                            <div className="quota-groups-title" style={{ marginBottom: '16px' }}>
                                <div className="blue-dot"></div>
                                기기별 조사완료
                            </div>
                            <div className="device-stats-row">
                                {deviceStats.map((stat, idx) => (
                                    <div key={idx} className="device-card">
                                        <div className="device-icon-wrapper" style={{ backgroundColor: stat.bg, color: stat.color }}>
                                            {stat.icon}
                                        </div>
                                        <div className="device-info">
                                            <span className="device-label">{stat.label}</span>
                                            <span className="device-value">{stat.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Photo Quota Progress Section */}
                        <div className="section-container" style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', gap: '16px', fontSize: '14px', fontWeight: '600' }}>
                                    <div style={{ color: '#64748b' }}>목표인원 <span style={{ color: '#3b82f6', marginLeft: '4px' }}>33 명</span></div>
                                    <div style={{ color: '#64748b' }}>완료 <span style={{ color: '#0ea5e9', marginLeft: '4px' }}>11 명</span></div>
                                    <div style={{ color: '#64748b' }}>완료비율 <span style={{ color: '#3b82f6', marginLeft: '4px' }}>33 %</span></div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
                                    <div style={{ color: '#64748b' }}>목표인원 <span style={{ color: '#3b82f6', fontWeight: '600' }}>33 명</span> 조사</div>
                                    <span style={{ background: '#22c55e', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>진행중</span>
                                </div>
                            </div>

                            <div style={{ position: 'relative', height: '32px', background: '#f1f5f9', borderRadius: '16px', marginBottom: '12px' }}>
                                <div style={{
                                    width: '33%',
                                    height: '100%',
                                    background: '#1e293b',
                                    borderRadius: '16px 0 0 16px',
                                    position: 'relative'
                                }}></div>
                                <div style={{
                                    position: 'absolute',
                                    left: '33%',
                                    top: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    background: '#0ea5e9',
                                    color: '#fff',
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}>
                                    11명
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', padding: '0 4px' }}>
                                <span>0%</span>
                                <span>50%</span>
                                <span>100%</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                {viewMode === 'table' ? (
                    <div className="quota-table-view-container">
                        <div className="quota-groups-container">
                            <div className="quota-groups-header">
                                <div className="quota-groups-title">
                                    <div className="blue-dot"></div>
                                    업체별 쿼터 현황
                                </div>
                                <div className="quota-tabs">
                                    {quotaGroups.map(group => (
                                        <button
                                            key={group.id}
                                            className={`quota-tab-btn ${selectedTab === group.id ? 'active' : ''}`}
                                            onClick={() => setSelectedTab(group.id)}
                                        >
                                            {group.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="quota-tab-content">
                                {quotaGroups.filter(g => g.id === selectedTab).map(group => (
                                    <div key={group.id} className="quota-table-wrapper">
                                        <table className="quota-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '25%' }}>연령대</th>
                                                    <th style={{ width: '25%' }}>성별</th>
                                                    <th style={{ textAlign: 'center' }}>목표</th>
                                                    <th style={{ textAlign: 'center' }}>응답</th>
                                                    <th style={{ textAlign: 'center' }}>달성률</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.data.map((row, idx) => (
                                                    <tr key={idx} className={row.isHighlight ? 'highlight-row' : ''}>
                                                        <td>{row.age}</td>
                                                        <td>{row.gender}</td>
                                                        <td style={{ textAlign: 'center' }}>{row.target}</td>
                                                        <td style={{ textAlign: 'center' }}>{row.current}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span className={`rate-badge ${row.rate >= 100 ? 'success' : 'warning'}`}>
                                                                {row.rate}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="variable-stats-container">
                            {variableStats.map(variable => (
                                <div key={variable.id} className="variable-section">
                                    <div className="variable-name">{variable.name}</div>
                                    <div className="quota-table-wrapper">
                                        <table className="quota-table variable-table">
                                            <tbody>
                                                {variable.items.map((item, idx) => (
                                                    <tr key={idx} className={item.isHighlight ? 'highlight-row' : ''}>
                                                        <td>{item.label}</td>
                                                        <td style={{ textAlign: 'right' }}>{item.current}/{item.target}</td>
                                                    </tr>
                                                ))}
                                                <tr className="total-row">
                                                    <td>합계</td>
                                                    <td style={{ textAlign: 'right' }}>{variable.total.current}/{variable.total.target}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="quota-list-view-container">
                        <div className="section-container" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>쿼터 조합 리스트</h3>
                                <button
                                    style={{
                                        padding: '6px 16px',
                                        background: isEditing ? '#5c9aff' : '#fff',
                                        color: isEditing ? '#fff' : '#333',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        fontWeight: '600'
                                    }}
                                    onClick={() => setIsEditing(!isEditing)}
                                >
                                    {isEditing ? '저장' : '수정'}
                                </button>
                            </div>
                            <table className="quota-full-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '15%' }}>구분</th>
                                        <th style={{ width: '40%' }}>광역</th>
                                        <th style={{ textAlign: 'center' }}>쿼터</th>
                                        <th style={{ textAlign: 'center' }}>응답</th>
                                        <th style={{ textAlign: 'center' }}>부족</th>
                                        <th style={{ textAlign: 'center' }}>상태</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quotaList.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.category}</td>
                                            <td>{item.label}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={item.quota}
                                                        onChange={(e) => handleQuotaChange(item.id, 'quota', e.target.value)}
                                                        style={{ width: '60px', padding: '4px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '4px' }}
                                                    />
                                                ) : item.quota}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={item.response}
                                                        onChange={(e) => handleQuotaChange(item.id, 'response', e.target.value)}
                                                        style={{ width: '60px', padding: '4px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '4px' }}
                                                    />
                                                ) : item.response}
                                            </td>
                                            <td style={{ textAlign: 'center', color: item.shortage < 0 ? '#e03131' : '#047857' }}>{item.shortage}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className={`status-badge ${item.status}`}>
                                                    {item.status === 'ongoing' ? '진행중' : '완료'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default QuotaPage;
