import React, { useState } from 'react';
import DataHeader from '../../components/DataHeader';
import SideBar from '../../components/SideBar';
import { Play, Plus, Trash2 } from 'lucide-react';

const RecodingPage = () => {
    // Mock Data
    const [variables, setVariables] = useState([
        { id: 'weight_demo', name: 'weight_demo', label: 'Weight Demo' },
        { id: 'gender_grp', name: 'gender_grp', label: 'Gender Group' },
        { id: 'age_band', name: 'age_band', label: 'Age Band' },
        { id: 'region_group', name: 'region_group', label: 'Region Group' },
        { id: 'q1_positive', name: 'q1_positive', label: 'Q1 Positive' },
        { id: 'heavy_user', name: 'heavy_user', label: 'Usage Segment' },
        { id: 'age_group_6', name: 'age_group_6', label: 'Age Group 6' },
        { id: 'banner_group', name: 'banner_group', label: 'Banner Group' },
    ]);

    const [selectedVar, setSelectedVar] = useState(variables[0]);

    // Mock Categories for the selected variable
    const [categories, setCategories] = useState([
        { id: 0, realVal: '0', category: '__CONFIG__{"rowVars":["q1"],"colVars":["banr', val: '', logic: '1==0' },
        { id: 1, realVal: '1', category: 'Low Weight', val: '0.8', logic: 'q1 == 1' },
        { id: 2, realVal: '2', category: 'Mid Weight', val: '1', logic: 'q1 == 2' },
        { id: 3, realVal: '3', category: 'High Weight', val: '1.2', logic: 'q1 == 3' },
        { id: 4, realVal: '4', category: 'Very High Weight', val: '1.4', logic: 'q1 == 4' },
        { id: 5, realVal: '5', category: 'Extreme Weight', val: '1.6', logic: 'q1 == 5' },
    ]);

    const [checkedLogics, setCheckedLogics] = useState({});
    const [evaluationResult, setEvaluationResult] = useState(null);

    const handleLogicCheck = () => {
        // Check all logics at once
        const newChecks = {};
        categories.forEach(cat => {
            newChecks[cat.id] = `${Math.floor(Math.random() * 50) + 10} / ${(Math.random() * 30 + 10).toFixed(1)}%`;
        });
        setCheckedLogics(newChecks);

        // Set mock evaluation result
        setEvaluationResult({
            n: 165,
            mean: 0.8484848484848485,
            stdDev: 0.334075474032776,
            min: 0.8,
            max: 1.6
        });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f5f5f5' }} data-theme="data-dashboard">
            {/* Header */}
            <DataHeader
                title="문항 가공"
                addButtonLabel="문항 추가"
                onAdd={() => alert('문항 추가 클릭')}
                saveButtonLabel="변경사항 저장"
                onSave={() => alert('변경사항 저장 클릭')}
            />

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Sidebar */}
                <SideBar
                    items={variables}
                    selectedId={selectedVar?.id}
                    onItemClick={setSelectedVar}
                    onSearch={(val) => console.log(val)}
                />

                {/* Content Area */}
                <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                    <div style={{
                        background: '#fff',
                        borderRadius: '8px',
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        minHeight: '100%', // Fill height
                        display: 'flex',
                        flexDirection: 'column',
                        boxSizing: 'border-box'
                    }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: '#333' }}>문항 수정</h3>

                        {/* Variable Info Inputs */}
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#555' }}>문항 ID</label>
                            <input
                                type="text"
                                value={selectedVar?.name || ''}
                                readOnly
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', background: '#f9f9f9', marginBottom: '16px' }}
                            />

                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#555' }}>문항 라벨</label>
                            <input
                                type="text"
                                value={selectedVar?.label || ''}
                                onChange={(e) => setSelectedVar({ ...selectedVar, label: e.target.value })}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                            />
                        </div>

                        {/* Evaluation Result Section */}
                        {evaluationResult && (
                            <div style={{
                                marginBottom: '24px',
                                padding: '20px',
                                background: '#f8f9fa',
                                borderRadius: '8px',
                                border: '1px solid #eee',
                                animation: 'fadeIn 0.3s ease-in-out'
                            }}>
                                <h4 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 16px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: '4px', height: '16px', background: 'var(--primary-color)', borderRadius: '2px' }}></span>
                                    평가 결과
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '13px', color: '#666', fontWeight: '600', width: '80px' }}>전체 N:</span>
                                            <span style={{ fontSize: '14px', color: '#111', fontWeight: '700' }}>{evaluationResult.n}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '13px', color: '#666', fontWeight: '600', width: '80px' }}>표준편차:</span>
                                            <span style={{ fontSize: '14px', color: '#111', fontWeight: '700' }}>{evaluationResult.stdDev}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '13px', color: '#666', fontWeight: '600', width: '80px' }}>평균:</span>
                                            <span style={{ fontSize: '14px', color: '#111', fontWeight: '700' }}>{evaluationResult.mean}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '13px', color: '#666', fontWeight: '600', width: '80px' }}>최대:</span>
                                            <span style={{ fontSize: '14px', color: '#111', fontWeight: '700' }}>{evaluationResult.max}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '13px', color: '#666', fontWeight: '600', width: '80px' }}>최소:</span>
                                            <span style={{ fontSize: '14px', color: '#111', fontWeight: '700' }}>{evaluationResult.min}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Categories Table Section */}
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: '#333' }}>보기</h4>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', fontSize: '12px', cursor: 'pointer' }}>
                                        <Plus size={12} /> 보기 추가
                                    </button>
                                </div>
                            </div>

                            {/* Table Header */}
                            <div style={{ display: 'flex', gap: '10px', padding: '12px 0', borderBottom: '1px solid #eee', fontSize: '13px', color: '#555', fontWeight: '700', background: '#f9f9f9', alignItems: 'center' }}>
                                <div style={{ width: '60px', textAlign: 'center' }}>코드</div>
                                <div style={{ flex: 2, paddingLeft: '8px' }}>보기</div>
                                <div style={{ width: '80px', textAlign: 'center' }}>가공값</div>
                                <div style={{ flex: 3, paddingLeft: '8px' }}>로직</div>
                                <div style={{ width: '120px', textAlign: 'center' }}>
                                    <button
                                        onClick={handleLogicCheck}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '4px',
                                            border: '1px solid var(--primary-color)',
                                            background: 'var(--primary-bg-light)',
                                            color: 'var(--primary-color)',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-bg-medium)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary-bg-light)'}
                                    >
                                        로직체크
                                    </button>
                                </div>
                                <div style={{ width: '40px' }}></div>
                            </div>

                            {/* Table Rows */}
                            {categories.map((cat, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '10px', padding: '10px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
                                    <div style={{ width: '60px', textAlign: 'center', fontSize: '13px', color: '#888' }}>{cat.realVal}</div>
                                    <div style={{ flex: 2 }}>
                                        <input type="text" defaultValue={cat.category} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #eee' }} />
                                    </div>
                                    <div style={{ width: '80px' }}>
                                        <input type="text" defaultValue={cat.val} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #eee' }} />
                                    </div>
                                    <div style={{ flex: 3 }}>
                                        <input type="text" defaultValue={cat.logic} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #eee' }} />
                                    </div>
                                    <div style={{ width: '120px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        {checkedLogics[cat.id] && (
                                            <span style={{ fontSize: '13px', fontWeight: '600' }}>
                                                {checkedLogics[cat.id]}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
                                        <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ccc' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecodingPage;
