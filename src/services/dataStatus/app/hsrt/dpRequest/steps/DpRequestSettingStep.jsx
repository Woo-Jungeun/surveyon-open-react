import React, { useState, useEffect, useContext } from 'react';
import { useSelector } from 'react-redux';
import {
    AlertCircle,
    Settings,
    Palette,
    Layers,
    ChevronDown,
    Plus,
    Trash2,
    Type,
    Layout,
    Save
} from 'lucide-react';
import { DpRequestPageApi } from '../DpRequestPageApi';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

const DpRequestSettingStep = () => {
    const auth = useSelector((store) => store.auth);
    const { getTableRenderContext, saveTableSettings, getBaseVariableList } = DpRequestPageApi();
    const loadingSpinner = useContext(loadingSpinnerContext);

    const [activeTab, setActiveTab] = useState(0); // 0: 분석, 1: 응답 묶기, 2: 디자인

    // --- 상태 관리 ---
    const [settings, setSettings] = useState({
        weight_variable: '없음',
        confidence_level: 95,
        render: {
            font_family: 'Arial, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
            font_size: 14,
            theme_primary: '#2F5597',
            theme_primary_fg: '#FFFFFF',
            theme_bg: '#FFFFFF',
            theme_text: '#1F2937',
            theme_border_color: '#CBD5E1'
        },
        display: {
            show_n: true,
            show_percent: true,
            percent_digits: 1,
            mean_digits: 2,
            std_digits: 2,
            var_digits: 2,
            median_digits: 2,
            min_digits: 0,
            max_digits: 0
        }
    });

    const [weightOptions, setWeightOptions] = useState(['없음']);
    const [scaleData, setScaleData] = useState([
        { name: '5점척도 Top2 / Mid / Bot2', type: 'scale', min: 1, max: 5, recode: true, top: '4,5', mid: '3', bot: '1,2' },
        { name: '7점척도 Top3 / Mid / Bot3', type: 'scale', min: 1, max: 7, recode: true, top: '5,6,7', mid: '4', bot: '1,2,3' },
        { name: '10점척도 Top3 / Mid4 / Bot3', type: 'scale', min: 1, max: 10, recode: true, top: '8,9,10', mid: '4,5,6,7', bot: '1,2,3' },
    ]);
    const [rankData, setRankData] = useState([]);
    const [groupData, setGroupData] = useState([]);

    // --- 데이터 fetch 로직 ---
    useEffect(() => {
        const fetchInitialData = async () => {
            const pageId = sessionStorage.getItem('pageId');
            if (!pageId || !auth?.user?.userId) return;

            loadingSpinner.show();
            try {
                // 1. 설정 정보 조회
                const contextPromise = getTableRenderContext.mutateAsync({ pageid: pageId, user: auth.user?.userId });
                // 2. 가중치 선택을 위한 기본 변수 목록 조회
                const variablesPromise = getBaseVariableList.mutateAsync({ pageid: pageId, user: auth.user?.userId });

                const [result, varList] = await Promise.all([contextPromise, variablesPromise]);

                if (result?.id) {
                    setSettings({
                        weight_variable: result.weight_variable || '없음',
                        confidence_level: result.confidence_level || 95,
                        render: { ...settings.render, ...result.effective_render_settings },
                        display: { ...settings.display, ...result.effective_display_policy }
                    });
                }

                if (Array.isArray(varList)) {
                    setWeightOptions(['없음', ...varList.map(v => v.name || v.label)]);
                }
            } catch (err) {
                console.error("Failed to fetch initial setting data:", err);
            } finally {
                loadingSpinner.hide();
            }
        };

        fetchInitialData();
    }, [auth?.user?.userId]);

    // --- 저장 로직 ---
    const handleSave = async () => {
        const pageId = sessionStorage.getItem('pageId');
        loadingSpinner.show();
        try {
            const payload = {
                user: auth.user?.userId,
                pageid: pageId,
                weight_variable: settings.weight_variable !== '없음' ? settings.weight_variable : null,
                confidence_level: settings.confidence_level,
                ui_settings: {
                    font_family: settings.render.font_family,
                    font_size: settings.render.font_size,
                    theme_primary: settings.render.theme_primary,
                    theme_primary_fg: settings.render.theme_primary_fg,
                    theme_bg: settings.render.theme_bg,
                    theme_text: settings.render.theme_text,
                    theme_border_color: settings.render.theme_border_color,
                    format_show_n: settings.display.show_n,
                    format_show_percent: settings.display.show_percent,
                    format_percent_round: settings.display.percent_digits,
                    format_mean_round: settings.display.mean_digits,
                    format_std_round: settings.display.std_digits,
                    format_var_round: settings.display.var_digits,
                    format_median_round: settings.display.median_digits,
                    format_min_round: settings.display.min_digits,
                    format_max_round: settings.display.max_digits
                },
                scale_presets: scaleData,
                rank_presets: rankData,
                group_presets: groupData,
                stat_presets: []
            };

            const result = await saveTableSettings.mutateAsync(payload);
            if (result?.message || result?.status === 'success') {
                alert("설정이 저장되었습니다.");
            }
        } catch (err) {
            console.error("Save failed:", err);
            alert("저장에 실패했습니다.");
        } finally {
            loadingSpinner.hide();
        }
    };

    const tabs = [
        { label: '분석 설정', icon: <Settings size={18} /> },
        { label: '추가설정 (응답 묶기)', icon: <Layers size={18} /> },
        { label: '디자인 설정', icon: <Palette size={18} /> },
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 0: return renderAnalysisTab();
            case 1: return renderGroupingTab();
            case 2: return renderDesignTab();
            default: return null;
        }
    };

    // 1. 분석 설정 탭
    const renderAnalysisTab = () => (
        <div className="dp-setting-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>기본 weight 변수</span>
                    <span style={{
                        backgroundColor: settings.weight_variable === '없음' ? '#ef4444' : '#10b981',
                        color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600
                    }}>
                        {settings.weight_variable === '없음' ? '설정 안됨' : '설정됨'}
                    </span>
                </div>
                <button className="dp-btn-outline" style={{ fontSize: '12px', padding: '4px 10px' }}>
                    <Plus size={14} style={{ marginRight: '4px' }} /> 새 가중치 변수 생성
                </button>
            </div>

            <div className="dp-form-group" style={{ marginBottom: '12px' }}>
                <select
                    className="dp-select"
                    style={{ width: '100%', maxWidth: 'none', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b' }}
                    value={settings.weight_variable}
                    onChange={(e) => setSettings({ ...settings, weight_variable: e.target.value })}
                >
                    {weightOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            </div>

            {settings.weight_variable === '없음' && (
                <div className="dp-alert-card">
                    <AlertCircle size={20} />
                    <span>가중치 변수가 지정되지 않았습니다. 분석 결과의 올바른 보정을 위해 새 가중치 변수 생성 버튼을 눌러 지정해주세요.</span>
                </div>
            )}

            <div className="dp-setting-card">
                <div className="dp-setting-card-header">
                    <Layout size={16} /> 테이블 표시 정책 재정의 (Overrides)
                </div>
                <div className="dp-setting-card-body" style={{ background: '#f8fafc' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                        서버 기본 표시 정책을 재정의합니다. 하단의 "자동" 상태인 항목들은 백엔드의 render-context 정책에 따릅니다.
                    </div>
                    <div className="dp-setting-grid">
                        <div className="dp-form-group">
                            <label>A. 기본 표시 여부</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 400, fontSize: '13px' }}>
                                    <input
                                        type="checkbox"
                                        checked={settings.display.show_n}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            display: { ...settings.display, show_n: e.target.checked }
                                        })}
                                    /> 빈도(N) 기본 표시 (show_n)
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 400, fontSize: '13px' }}>
                                    <input
                                        type="checkbox"
                                        checked={settings.display.show_percent}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            display: { ...settings.display, show_percent: e.target.checked }
                                        })}
                                    /> 비율(%) 기본 표시 (show_percent)
                                </label>
                            </div>
                        </div>
                        <div className="dp-form-group">
                            <label>B. 소수점 자릿수 재정의</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '4px' }}>
                                <div className="dp-form-group">
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>비율 (%)</span>
                                    <input
                                        type="number"
                                        value={settings.display.percent_digits}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            display: { ...settings.display, percent_digits: parseInt(e.target.value) || 0 }
                                        })}
                                    />
                                </div>
                                <div className="dp-form-group">
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>평균 (Mean)</span>
                                    <input
                                        type="number"
                                        value={settings.display.mean_digits}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            display: { ...settings.display, mean_digits: parseInt(e.target.value) || 0 }
                                        })}
                                    />
                                </div>
                                <div className="dp-form-group">
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>표준편차 (Std)</span>
                                    <input
                                        type="number"
                                        value={settings.display.std_digits}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            display: { ...settings.display, std_digits: parseInt(e.target.value) || 0 }
                                        })}
                                    />
                                </div>
                                <div className="dp-form-group">
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>변량 (Var)</span>
                                    <input
                                        type="number"
                                        value={settings.display.var_digits}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            display: { ...settings.display, var_digits: parseInt(e.target.value) || 0 }
                                        })}
                                    />
                                </div>
                                <div className="dp-form-group">
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>중앙값 (Median)</span>
                                    <input
                                        type="number"
                                        value={settings.display.median_digits}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            display: { ...settings.display, median_digits: parseInt(e.target.value) || 0 }
                                        })}
                                    />
                                </div>
                                <div className="dp-form-group">
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>최소/최대 (Min/Max)</span>
                                    <input
                                        type="number"
                                        value={settings.display.min_digits}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            display: { ...settings.display, min_digits: parseInt(e.target.value) || 0 }
                                        })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );


    // 2. 디자인 설정 탭
    const renderDesignTab = () => (
        <div className="dp-setting-section">
            <div className="dp-setting-card">
                <div className="dp-setting-card-header">
                    <Type size={16} /> 표 서식 및 렌더링 설정 (미리보기)
                </div>
                <div className="dp-setting-card-body">
                    <div className="dp-setting-grid">
                        <div className="dp-form-group">
                            <label>글꼴 (Font-Family)</label>
                            <input
                                type="text"
                                value={settings.render.font_family}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    render: { ...settings.render, font_family: e.target.value }
                                })}
                            />
                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                <button className="dp-tag-btn" onClick={() => setSettings({
                                    ...settings, render: { ...settings.render, font_family: 'Arial' }
                                })}>기본 (Arial)</button>
                                <button className="dp-tag-btn" onClick={() => setSettings({
                                    ...settings, render: { ...settings.render, font_family: 'Noto Sans KR' }
                                })}>본고딕 (Noto)</button>
                            </div>
                        </div>
                        <div className="dp-form-group">
                            <label>표 기본 글자 크기 (px)</label>
                            <input
                                type="number"
                                value={settings.render.font_size}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    render: { ...settings.render, font_size: parseInt(e.target.value) || 0 }
                                })}
                            />
                        </div>
                    </div>
                    {/* ... (테두리 설정 미리보기 부분 - 생략 또는 유지) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 200px', gap: '20px', marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '12px' }}>
                                1. 변경할 테두리 영역을 선택하세요: <span style={{ background: '#2563eb', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '12px' }}>현재 선택됨: 상단 바깥선 (Top)</span>
                            </label>
                            <div style={{ border: '1px solid #cbd5e1', padding: '20px', background: '#f8fafc', borderRadius: '4px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', fontSize: '13px' }}>
                                    <thead>
                                        <tr><th style={{ borderTop: `2px solid ${settings.render.theme_primary}`, borderBottom: '1px solid #cbd5e1', padding: '12px', textAlign: 'center', backgroundColor: settings.render.theme_primary, color: 'white', fontWeight: 500 }}>Stub Label</th><th style={{ borderTop: `2px solid ${settings.render.theme_primary}`, borderBottom: '1px solid #cbd5e1', padding: '12px', textAlign: 'center', backgroundColor: settings.render.theme_primary, color: 'white', fontWeight: 500 }}>Total | Base</th></tr>
                                    </thead>
                                    <tbody>
                                        <tr><td style={{ borderBottom: '1px solid #cbd5e1', padding: '12px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>Category 1</td><td style={{ borderBottom: '1px solid #cbd5e1', padding: '12px', textAlign: 'center', color: '#65a30d' }}>54% | 23%</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '12px', display: 'block' }}>
                                2. 선택된 면에 적용할 선 스타일:
                            </label>
                            <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '13px', color: '#64748b' }}>선 없음 (None)</div>
                                <div style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '13px', color: '#1e293b' }}>실선 (Solid)</div>
                                <div style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '13px', color: '#1e293b', fontWeight: 600 }}>굵은선 (Bold)</div>
                                <div style={{ padding: '12px', cursor: 'pointer', fontSize: '13px', backgroundColor: settings.render.theme_primary, color: 'white', fontWeight: 600 }}>이중선 (Double)</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="dp-setting-card">
                <div className="dp-setting-card-header">전체 테마 색상 (커스텀/프리셋)</div>
                <div className="dp-setting-card-body">
                    <div className="dp-setting-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        {/* Column 1 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <h4 style={{ fontSize: '13px', margin: '0 0 12px 0', color: '#1e293b' }}>1. Primary (주 색상)</h4>
                                <div className="dp-form-group">
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>Primary (테마색/강조)</span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <div className="dp-color-preview" style={{ background: settings.render.theme_primary, width: '32px', height: '32px', borderRadius: '4px' }}></div>
                                        <input
                                            type="text"
                                            value={settings.render.theme_primary}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                render: { ...settings.render, theme_primary: e.target.value }
                                            })}
                                        />
                                    </div>
                                </div>
                                <div className="dp-form-group" style={{ marginTop: '12px' }}>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>Primary 영문자 색상 (헤더 텍스트)</span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <div className="dp-color-preview" style={{ background: settings.render.theme_primary_fg, width: '32px', height: '32px', borderRadius: '4px', border: '1px solid #e2e8f0' }}></div>
                                        <input
                                            type="text"
                                            value={settings.render.theme_primary_fg}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                render: { ...settings.render, theme_primary_fg: e.target.value }
                                            })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* ... (나머지 컬러 필드들도 유사하게 바인딩) */}
                        {/* Column 2 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <h4 style={{ fontSize: '13px', margin: '0 0 12px 0', color: '#1e293b' }}>2. Secondary (보조 색상)</h4>
                                <div className="dp-form-group">
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>Secondary 1 (서브/버튼)</span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <div className="dp-color-preview" style={{ background: settings.render.theme_primary, width: '32px', height: '32px', opacity: 0.3, borderRadius: '4px' }}></div>
                                        <input type="text" value={settings.render.theme_primary} readOnly />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Column 3 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h4 style={{ fontSize: '13px', margin: '0 0 12px 0', color: '#1e293b' }}>3. Background (배경)</h4>
                            <div className="dp-form-group">
                                <span style={{ fontSize: '12px', color: '#64748b' }}>Background 1 (기본 배경)</span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div className="dp-color-preview" style={{ background: settings.render.theme_bg, width: '32px', height: '32px', borderRadius: '4px', border: '1px solid #e2e8f0' }}></div>
                                    <input
                                        type="text"
                                        value={settings.render.theme_bg}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            render: { ...settings.render, theme_bg: e.target.value }
                                        })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );


    // 3. 응답 묶기 설정 탭
    const renderGroupingTab = () => (
        <div className="dp-setting-section">
            <div className="dp-setting-card">
                <div className="dp-setting-card-header">단일형 척도 설정</div>
                <div style={{ height: '300px' }}>
                    <KendoGridV2
                        data={scaleData}
                        reorderable
                        addable
                        deletable
                        showNo
                        onDataChange={(newData) => setScaleData(newData)}
                    >
                        <Column field="name" title="이름" width="300px" />
                        <Column field="type" title="응답" width="120px" />
                        <Column field="min" title="최소" width="80px" />
                        <Column field="max" title="최대" width="80px" />
                        <Column field="top" title="Top" width="100px" />
                        <Column field="mid" title="Mid" width="100px" />
                        <Column field="bot" title="Bottom" width="100px" />
                    </KendoGridV2>
                </div>
            </div>

            <div className="dp-setting-card">
                <div className="dp-setting-card-header">다중형 순위 설정</div>
                <div style={{ height: '200px' }}>
                    <KendoGridV2 data={[]} addable deletable showNo>
                        <Column field="name" title="이름" width="400px" />
                        <Column field="selection" title="조합 선언 (예: 1, 1+2, 1+2+3)" />
                    </KendoGridV2>
                </div>
            </div>

            <div className="dp-setting-card">
                <div className="dp-setting-card-header">그룹(값 묶기) 설정</div>
                <div style={{ height: '200px' }}>
                    <KendoGridV2 data={[]} addable deletable showNo>
                        <Column field="name" title="이름" width="400px" />
                        <Column field="selection" title="그룹 선언 (예: 브랜드A=1,2 | 브랜드B=3)" />
                    </KendoGridV2>
                </div>
            </div>
        </div>
    );

    return (
        <div className="dp-request-container" style={{ background: '#f8fafc' }}>
            <div className="dp-step-tabs">
                <div style={{ display: 'flex', flex: 1, gap: '8px' }}>
                    {tabs.map((tab, idx) => (
                        <div
                            key={idx}
                            className={`dp-tab-item ${activeTab === idx ? 'active' : ''}`}
                            onClick={() => setActiveTab(idx)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {tab.icon}
                                <span>{tab.label}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="dp-tab-actions">
                    <button className="dp-primary-btn" onClick={handleSave}>
                        <Save size={16} />
                        <span>저장</span>
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {renderTabContent()}
            </div>
        </div>
    );
};

export default DpRequestSettingStep;
