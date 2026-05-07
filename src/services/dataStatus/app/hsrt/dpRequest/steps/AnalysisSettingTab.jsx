import React from 'react';
import { AlertCircle, Layout, Plus, Layers } from 'lucide-react';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { DropDownList } from '@progress/kendo-react-dropdowns';

const AnalysisSettingTab = ({
    contextData,
    settings,
    setSettings,
    weightOptions,
    scaleData,
    setScaleData,
    rankData,
    setRankData,
    groupData,
    setGroupData,
    onUnsavedChange
}) => {
    return (
        <div className="dp-setting-section" style={{ padding: '20px 24px', background: '#F1F5F9', boxSizing: 'border-box', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
            {contextData?.issues?.length > 0 && (
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E293B', fontWeight: 600, marginBottom: '8px' }}>
                        <AlertCircle size={16} /> 설정 경고 (Issues)
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '24px', color: '#475569', fontSize: '13px' }}>
                        {contextData.issues.map((issue, idx) => <li key={idx}>{issue}</li>)}
                    </ul>
                </div>
            )}

            <div className="dp-setting-card" style={{ marginBottom: '24px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#1E293B', fontSize: '14px' }}>
                        <Layout size={16} /> 기본 Weight(가중치) 변수
                    </div>
                    <select
                        className="dp-select"
                        style={{ width: '220px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#1E293B', padding: '6px 10px', borderRadius: '6px', fontSize: '13px' }}
                        value={settings.weight_variable}
                        onChange={(e) => {
                            setSettings({ ...settings, weight_variable: e.target.value });
                            if (onUnsavedChange) onUnsavedChange(true);
                        }}
                    >
                        {weightOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    {settings.weight_variable === '없음' && (
                        <span style={{ color: '#DC2626', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                            <AlertCircle size={14} /> 가중치 변수가 지정되지 않았습니다. 분석 결과의 올바른 보정을 위해 새 가중치 변수 생성 버튼을 눌러 지정해주세요.
                        </span>
                    )}
                </div>
                <button style={{
                    border: 'none', background: '#E2E8F0', padding: '6px 12px',
                    borderRadius: '4px', fontSize: '12px', fontWeight: 600, color: '#334155', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                    <Plus size={14} /> 가중치 변수 생성
                </button>
            </div>

            <div className="dp-setting-card" style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div className="dp-setting-card-header" style={{ padding: '12px 20px', borderBottom: '1px solid #E2E8F0', fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <Layers size={16} /> 고급 분석 설정 (응답 묶기 및 재정의)
                </div>
                <div className="dp-setting-card-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* 단일형 척도 */}
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#1E293B', marginBottom: '8px' }}>단일형 척도 생성</div>
                        <div style={{ height: '300px', border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden', background: '#FFFFFF' }}>
                            <KendoGridV2
                                data={scaleData}
                                addable
                                deletable
                                showNo
                                onRowClick={(e) => {
                                    const newData = scaleData.map(item => ({
                                        ...item,
                                        inEdit: item === e.dataItem
                                    }));
                                    setScaleData(newData);
                                }}
                                onDataChange={(newData) => {
                                    setScaleData(newData);
                                    if (onUnsavedChange) onUnsavedChange(true);
                                }}
                            >
                                <Column field="name" title="이름" width="300px" />
                                <Column field="type" title="유형" width="120px" cell={(props) => (
                                    <td style={{ padding: '2px 4px' }}>
                                        <DropDownList
                                            className="k-dropdown-solid dp-mini-dropdown"
                                            popupSettings={{ className: "dp-mini-dropdown-popup" }}
                                            data={['single', 'multi', 'rank', 'minrank', 'maxrank', 'scale', 'dummy', 'custom', 'open(문자)', 'open(숫자)']}
                                            value={props.dataItem[props.field] || ''}
                                            onChange={(e) => {
                                                const newData = scaleData.map(item =>
                                                    item === props.dataItem ? { ...item, [props.field]: e.value } : item
                                                );
                                                setScaleData(newData);
                                                if (onUnsavedChange) onUnsavedChange(true);
                                            }}
                                            style={{ width: '100%', height: '22px', fontSize: '13px' }}
                                        />
                                    </td>
                                )} />
                                <Column field="min" title="최소" width="80px" />
                                <Column field="max" title="최대" width="80px" />
                                <Column field="recode" title="역코딩" width="80px" cell={(props) => (
                                    <td style={{ textAlign: 'center', padding: '0' }}>
                                        <label className="dp-checkbox-label" style={{ margin: 'auto' }}>
                                            <input
                                                type="checkbox"
                                                className="dp-checkbox-input"
                                                checked={!!props.dataItem[props.field]}
                                                onChange={(e) => {
                                                    const newData = scaleData.map(item =>
                                                        item === props.dataItem ? { ...item, [props.field]: e.target.checked } : item
                                                    );
                                                    setScaleData(newData);
                                                    if (onUnsavedChange) onUnsavedChange(true);
                                                }}
                                            />
                                            <span className="dp-checkbox-box" />
                                        </label>
                                    </td>
                                )} />
                                <Column field="top" title="Top" width="100px" />
                                <Column field="mid" title="Mid" width="100px" />
                                <Column field="bot" title="Bottom" width="100px" />
                            </KendoGridV2>
                        </div>
                    </div>

                    {/* 다중형 순위 */}
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#1E293B', marginBottom: '8px' }}>다중형 순위 설정</div>
                        <div style={{ height: '200px', border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden', background: '#FFFFFF' }}>
                            <KendoGridV2
                                data={rankData}
                                addable
                                deletable
                                showNo
                                onRowClick={(e) => {
                                    const newData = rankData.map(item => ({
                                        ...item,
                                        inEdit: item === e.dataItem
                                    }));
                                    setRankData(newData);
                                }}
                                onDataChange={(newData) => {
                                    setRankData(newData);
                                    if (onUnsavedChange) onUnsavedChange(true);
                                }}
                            >
                                <Column field="name" title="이름" width="400px" />
                                <Column field="selection" title="조합 선언 (예: 1, 1+2, 1+2+3)" />
                            </KendoGridV2>
                        </div>
                    </div>

                    {/* 그룹화 */}
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#1E293B', marginBottom: '8px' }}>그룹(값 묶기) 설정</div>
                        <div style={{ height: '200px', border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden', background: '#FFFFFF' }}>
                            <KendoGridV2
                                data={groupData}
                                addable
                                deletable
                                showNo
                                onRowClick={(e) => {
                                    const newData = groupData.map(item => ({
                                        ...item,
                                        inEdit: item === e.dataItem
                                    }));
                                    setGroupData(newData);
                                }}
                                onDataChange={(newData) => {
                                    setGroupData(newData);
                                    if (onUnsavedChange) onUnsavedChange(true);
                                }}
                            >
                                <Column field="name" title="이름" width="400px" />
                                <Column field="selection" title="그룹 선언 (예: 브랜드A=1,2 | 브랜드B=3)" />
                            </KendoGridV2>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AnalysisSettingTab;
