import React, { useState, useEffect, useContext, forwardRef, useImperativeHandle } from 'react';
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
    Save,
    Info,
    CheckCircle2,
    AlertTriangle
} from 'lucide-react';
import { DpRequestPageApi } from '../DpRequestPageApi';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import useUpdateHistory from '@/hooks/useUpdateHistory';
import { useRef } from 'react';

const DpRequestSettingStep = forwardRef(({ onUnsavedChange }, ref) => {
    const auth = useSelector((store) => store.auth);
    const { getTableRenderContext, getTableDetail, saveTableSettings, getBaseVariableList } = DpRequestPageApi();
    const loadingSpinner = useContext(loadingSpinnerContext);

    // --- 히스토리 관리 (Undo/Redo) ---
    const history = useUpdateHistory('dp-setting');
    const isHistoryAction = useRef(false);

    // 부모 컴포넌트에서 호출할 수 있도록 기능 노출
    useImperativeHandle(ref, () => ({
        save: async () => {
            return await handleSave();
        }
    }));

    const [activeTab, setActiveTab] = useState(0); // 0: 분석, 1: 응답 묶기, 2: 디자인
    const [activeBorderTarget, setActiveBorderTarget] = useState('top');

    // --- 상태 관리 ---
    const [settings, setSettings] = useState({
        weight_variable: '없음',
        confidence_level: 95,
        render: {
            font_family: 'Arial, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
            font_size: 14,
            theme_primary: '#D3D3D3',
            theme_primary_fg: '#1E293B',
            theme_secondary: '#F1F5F9',
            theme_secondary_alt: '#E2E8F0',
            theme_bg: '#FFFFFF',
            theme_bg_alt: '#F8FAFC',
            theme_stripe: '#F5F7FB',
            theme_text: '#1F2937',
            theme_text_muted: '#64748B',
            theme_highlight: '#E74C3C',
            theme_destructive: '#EF4444',
            theme_warning: '#F59E0B',
            theme_success: '#10B981',
            theme_info: '#475569',
            theme_sidebar_hover: '',
            theme_border_color: '#CBD5E1',
            theme_border_outer_top: 'solid',
            theme_border_outer_bottom: 'solid',
            theme_border_outer_left: 'solid',
            theme_border_outer_right: 'solid',
            theme_border_stub: 'solid',
            theme_border_header: 'solid'
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
    const [contextData, setContextData] = useState(null);

    // --- 데이터 fetch 로직 ---
    useEffect(() => {
        const fetchInitialData = async () => {
            // const pageId = sessionStorage.getItem('pageId');
            // if (!pageId || !auth?.user?.userId) return;
            const pageId = "446bd14c-d053-47c8-bf01-59384cb37746";
            const userId = "sbbok";

            loadingSpinner.show();
            try {
                // 1. 설정 정보 조회
                const contextPromise = getTableRenderContext.mutateAsync({ pageid: pageId, user: userId });
                const detailPromise = getTableDetail.mutateAsync({ pageid: pageId, user: userId });
                // 2. 가중치 선택을 위한 기본 변수 목록 조회
                const variablesPromise = getBaseVariableList.mutateAsync({ pageid: pageId, user: userId });
                const [renderContext, tableDetail, varList] = await Promise.all([contextPromise, detailPromise, variablesPromise]);
                console.log(tableDetail)
                if (renderContext) {
                    setContextData(renderContext);
                }

                let nextSettings = { ...settings };
                let nextScaleData = scaleData;
                let nextRankData = rankData;
                let nextGroupData = groupData;

                let actualTableDetail = tableDetail?.resultjson || tableDetail;

                if (actualTableDetail?.id || renderContext?.id) {
                    const ui = actualTableDetail?.ui_settings || {};

                    const initDisplay = { ...settings.display, ...renderContext?.effective_display_policy };
                    if (ui.format_show_n !== undefined) initDisplay.show_n = ui.format_show_n;
                    if (ui.format_show_percent !== undefined) initDisplay.show_percent = ui.format_show_percent;
                    if (ui.format_percent_round !== undefined) initDisplay.percent_digits = ui.format_percent_round;
                    if (ui.format_mean_round !== undefined) initDisplay.mean_digits = ui.format_mean_round;
                    if (ui.format_std_round !== undefined) initDisplay.std_digits = ui.format_std_round;
                    if (ui.format_var_round !== undefined) initDisplay.var_digits = ui.format_var_round;
                    if (ui.format_median_round !== undefined) initDisplay.median_digits = ui.format_median_round;
                    if (ui.format_min_round !== undefined) initDisplay.min_digits = ui.format_min_round;
                    if (ui.format_max_round !== undefined) initDisplay.max_digits = ui.format_max_round;

                    let mergedRender = { ...settings.render, ...renderContext?.effective_render_settings, ...ui };
                    // Replace legacy Navy blue with the modern Tailwind Blue theme for consistency
                    if (mergedRender.theme_primary === '#2F5597' || mergedRender.theme_primary === '#2563EB' || mergedRender.theme_primary === '#475569') {
                        mergedRender.theme_primary = '#D3D3D3';
                        mergedRender.theme_primary_fg = '#1E293B';
                        mergedRender.theme_secondary = '#F1F5F9';
                        mergedRender.theme_secondary_alt = '#E2E8F0';
                    }

                    nextSettings = {
                        weight_variable: actualTableDetail?.weight_variable || renderContext?.weight_variable || '없음',
                        confidence_level: actualTableDetail?.confidence_level || renderContext?.confidence_level || 95,
                        render: mergedRender,
                        display: initDisplay
                    };

                    setSettings(nextSettings);

                    if (actualTableDetail?.scale_presets) {
                        nextScaleData = actualTableDetail.scale_presets;
                        setScaleData(nextScaleData);
                    }
                    if (actualTableDetail?.rank_presets) {
                        nextRankData = actualTableDetail.rank_presets;
                        setRankData(nextRankData);
                    }
                    if (actualTableDetail?.group_presets) {
                        nextGroupData = actualTableDetail.group_presets;
                        setGroupData(nextGroupData);
                    }
                }

                if (Array.isArray(varList)) {
                    const weightOpt = ['없음', ...varList.map(v => v.name || v.label)];
                    setWeightOptions(weightOpt);

                    // 초기 히스토리 기준점 설정 (서버 데이터)
                    history.reset({
                        settings: nextSettings,
                        scaleData: nextScaleData,
                        rankData: nextRankData,
                        groupData: nextGroupData
                    });
                }
            } catch (err) {
                console.error("Failed to fetch initial setting data:", err);
            } finally {
                loadingSpinner.hide();
            }
        };

        fetchInitialData();
    }, [auth?.user?.userId]);

    // 키보드 이벤트 (Undo/Redo)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key.toLowerCase() === 'z') {
                    if (e.shiftKey) { // Redo (Ctrl+Shift+Z)
                        const redoData = history.redo();
                        if (redoData) {
                            isHistoryAction.current = true;
                            if (redoData.settings) setSettings(redoData.settings);
                            if (redoData.scaleData) setScaleData(redoData.scaleData);
                            if (redoData.rankData) setRankData(redoData.rankData);
                            if (redoData.groupData) setGroupData(redoData.groupData);
                        }
                    } else { // Undo (Ctrl+Z)
                        const undoData = history.undo();
                        if (undoData) {
                            isHistoryAction.current = true;
                            if (undoData.settings) setSettings(undoData.settings);
                            if (undoData.scaleData) setScaleData(undoData.scaleData);
                            if (undoData.rankData) setRankData(undoData.rankData);
                            if (undoData.groupData) setGroupData(undoData.groupData);
                        }
                    }
                } else if (e.key.toLowerCase() === 'y') { // Redo (Ctrl+Y)
                    const redoData = history.redo();
                    if (redoData) {
                        isHistoryAction.current = true;
                        if (redoData.settings) setSettings(redoData.settings);
                        if (redoData.scaleData) setScaleData(redoData.scaleData);
                        if (redoData.rankData) setRankData(redoData.rankData);
                        if (redoData.groupData) setGroupData(redoData.groupData);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [history]);

    // 데이터 변경 감지 및 히스토리 커밋
    useEffect(() => {
        if (isHistoryAction.current) {
            isHistoryAction.current = false;
            return;
        }
        history.commit({ settings, scaleData, rankData, groupData });
    }, [settings, scaleData, rankData, groupData, history]);

    // --- 저장 로직 ---
    const handleSave = async () => {
        // const pageId = sessionStorage.getItem('pageId');
        const pageId = "446bd14c-d053-47c8-bf01-59384cb37746";
        const userId = "sbbok";
        loadingSpinner.show();
        try {
            const payload = {
                // user: auth.user?.userId,
                user: userId,
                pageid: pageId,
                weight_variable: settings.weight_variable !== '없음' ? settings.weight_variable : null,
                confidence_level: settings.confidence_level,
                ui_settings: {
                    font_family: settings.render.font_family,
                    font_size: settings.render.font_size,
                    theme_primary: settings.render.theme_primary?.toUpperCase(),
                    theme_primary_fg: settings.render.theme_primary_fg?.toUpperCase(),
                    theme_secondary: settings.render.theme_secondary?.toUpperCase(),
                    theme_secondary_alt: settings.render.theme_secondary_alt?.toUpperCase(),
                    theme_bg: settings.render.theme_bg?.toUpperCase(),
                    theme_bg_alt: settings.render.theme_bg_alt?.toUpperCase(),
                    theme_stripe: settings.render.theme_stripe?.toUpperCase(),
                    theme_text: settings.render.theme_text?.toUpperCase(),
                    theme_text_muted: settings.render.theme_text_muted?.toUpperCase(),
                    theme_highlight: settings.render.theme_highlight?.toUpperCase(),
                    theme_destructive: settings.render.theme_destructive?.toUpperCase(),
                    theme_warning: settings.render.theme_warning?.toUpperCase(),
                    theme_success: settings.render.theme_success?.toUpperCase(),
                    theme_info: settings.render.theme_info?.toUpperCase(),
                    theme_sidebar_hover: settings.render.theme_sidebar_hover,
                    theme_border_outer_top: settings.render.theme_border_outer_top,
                    theme_border_outer_bottom: settings.render.theme_border_outer_bottom,
                    theme_border_outer_left: settings.render.theme_border_outer_left,
                    theme_border_outer_right: settings.render.theme_border_outer_right,
                    theme_border_stub: settings.render.theme_border_stub,
                    theme_border_header: settings.render.theme_border_header,
                    theme_border_color: settings.render.theme_border_color || undefined,
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
                if (onUnsavedChange) onUnsavedChange(false); // 저장 성공 시 더티 해제
                return true;
            }
            return false;
        } catch (err) {
            console.error("Save failed:", err);
            alert("저장에 실패했습니다.");
            return false;
        } finally {
            loadingSpinner.hide();
        }
    };

    const tabs = [
        { label: '분석 설정', icon: <Settings size={18} /> },
        { label: '표 설정', icon: <Layout size={18} /> },
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 0: return renderAnalysisTab();
            case 1: return renderTableSettingsTab();
            default: return null;
        }
    };

    // 1. 분석 설정 탭
    const renderAnalysisTab = () => (
        <div className="dp-setting-section" style={{ padding: '20px 24px', background: '#F1F5F9' }}>
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
                    <Layers size={16} color="#F59E0B" /> 고급 분석 설정 (응답 묶기 및 재정의)
                </div>
                <div className="dp-setting-card-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* 단일형 척도 */}
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#1E293B', marginBottom: '8px' }}>단일형 척도 생성</div>
                        <div style={{ height: '300px', border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden', background: '#FFFFFF' }}>
                            <KendoGridV2
                                data={scaleData}
                                reorderable
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


    // 2. 표 설정 탭
    const renderTableSettingsTab = () => (
        <div className="dp-setting-section" style={{ padding: '20px 24px', background: '#F1F5F9' }}>
            <div className="dp-setting-card" style={{ marginBottom: '24px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div className="dp-setting-card-header" style={{ padding: '12px 20px', borderBottom: '1px solid #E2E8F0', fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <Layout size={16} color="#475569" /> 테이블 표시 정책 재정의 (Overrides)
                </div>
                <div className="dp-setting-card-body" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
                        {/* A. 기본 표시 여부 */}
                        {/* A. 기본 표시 여부 */}
                        <div style={{ flex: '0 0 340px' }}>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: '#1E293B', paddingBottom: '8px', marginBottom: '16px', borderBottom: '1px solid #CBD5E1' }}>A. 기본 표시 여부</div>
                            <div
                                onClick={() => { setSettings({ ...settings, display: { ...settings.display, show_n: !settings.display.show_n } }); if (onUnsavedChange) onUnsavedChange(true); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '12px', color: '#334155', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ width: '16px', height: '16px', flexShrink: 0, borderRadius: '3px', background: settings.display.show_n ? '#3B82F6' : '#fff', border: settings.display.show_n ? '1px solid #3B82F6' : '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {settings.display.show_n && <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                </div>
                                <span style={{ fontWeight: 500 }}>빈도(N) 기본 표시</span>
                            </div>
                            <div
                                onClick={() => { setSettings({ ...settings, display: { ...settings.display, show_percent: !settings.display.show_percent } }); if (onUnsavedChange) onUnsavedChange(true); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ width: '16px', height: '16px', flexShrink: 0, borderRadius: '3px', background: settings.display.show_percent ? '#3B82F6' : '#fff', border: settings.display.show_percent ? '1px solid #3B82F6' : '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {settings.display.show_percent && <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                </div>
                                <span style={{ fontWeight: 500 }}>비율(%) 기본 표시</span>
                            </div>
                        </div>

                        {/* B. 소수점 자릿수 재정의 */}
                        <div style={{ flex: 1, borderLeft: '1px solid #E2E8F0', paddingLeft: '32px' }}>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: '#1E293B', paddingBottom: '8px', marginBottom: '16px', borderBottom: '1px solid #CBD5E1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                B. 소수점 자릿수 재정의
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                                {[
                                    { label: '비율 (%)', field: 'percent_digits' },
                                    { label: '평균 (Mean)', field: 'mean_digits' },
                                    { label: '표준편차 (Std)', field: 'std_digits' },
                                    { label: '변량 (Var)', field: 'var_digits' },
                                    { label: '중앙값 (Median)', field: 'median_digits' },
                                    { label: '최대 (Max)', field: 'max_digits' },
                                    { label: '최소 (Min)', field: 'min_digits' }
                                ].map((item) => (
                                    <div key={item.field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                                        <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>{item.label}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '4px', border: '1px solid #CBD5E1', overflow: 'hidden', width: '40px' }}>
                                            <input
                                                type="number"
                                                value={settings.display[item.field]}
                                                onChange={(e) => { setSettings({ ...settings, display: { ...settings.display, [item.field]: parseInt(e.target.value) || 0 } }); if (onUnsavedChange) onUnsavedChange(true); }}
                                                style={{ width: '100%', padding: '4px 0', fontSize: '12px', textAlign: 'center', border: 'none', outline: 'none', fontWeight: 600, color: '#0F172A' }}
                                                min={0} max={10}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="dp-setting-card" style={{ marginBottom: '24px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div className="dp-setting-card-header" style={{ padding: '12px 20px', borderBottom: '1px solid #E2E8F0', fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <Type size={16} color="#8B5CF6" /> 표 서식 및 렌더링 설정 (미리보기)
                </div>
                <div className="dp-setting-card-body" style={{ padding: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'stretch' }}>

                    {/* Left: Main Workspace (Typography & Preview) */}
                    <div style={{ flex: '1 1 600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Typography */}
                        <div style={{ background: '#F8FAFC', padding: '12px 20px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '24px', justifyContent: 'flex-start' }}>
                            {/* 폰트 종류 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 auto', minWidth: '350px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>글꼴 (Font-Family)</label>
                                <input
                                    type="text"
                                    style={{ flex: 1, minWidth: '150px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                                    value={settings.render.font_family}
                                    onChange={(e) => setSettings({ ...settings, render: { ...settings.render, font_family: e.target.value } })}
                                    placeholder="폰트를 입력하세요"
                                />
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button className="dp-tag-btn" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#475569', fontSize: '11px', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => setSettings({ ...settings, render: { ...settings.render, font_family: "'Spoqa Han Sans Neo', 'SpoqaHanSansNeo', sans-serif" } })}>Spoqa</button>
                                    <button className="dp-tag-btn" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#475569', fontSize: '11px', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => setSettings({ ...settings, render: { ...settings.render, font_family: "'Noto Sans KR', sans-serif" } })}>Noto</button>
                                    <button className="dp-tag-btn" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#475569', fontSize: '11px', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => setSettings({ ...settings, render: { ...settings.render, font_family: "'Apple SD Gothic Neo', sans-serif" } })}>Apple SD</button>
                                    <button className="dp-tag-btn" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#475569', fontSize: '11px', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => setSettings({ ...settings, render: { ...settings.render, font_family: "Arial, sans-serif" } })}>Arial</button>
                                </div>
                            </div>
                            {/* 구분선 */}
                            <div style={{ width: '1px', height: '24px', background: '#CBD5E1' }}></div>
                            {/* 폰트 크기 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '0 0 auto' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>크기</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '4px 12px' }}>
                                    <input
                                        type="number"
                                        style={{ width: '60px', padding: '4px 0', border: 'none', fontSize: '14px', outline: 'none', textAlign: 'center', fontWeight: 500 }}
                                        value={settings.render.font_size}
                                        onChange={(e) => setSettings({ ...settings, render: { ...settings.render, font_size: parseInt(e.target.value) || 0 } })}
                                    />
                                    <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>px</span>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Preview Container */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFC', padding: '16px 20px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                                    변경할 테두리 영역 선택
                                </label>
                                {activeBorderTarget && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#3B82F6', fontWeight: 600, background: '#EFF6FF', padding: '4px 10px', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3B82F6' }} />
                                        현재 대상: {
                                            activeBorderTarget === 'top' ? '외곽 상단 (Top)' :
                                                activeBorderTarget === 'bottom' ? '외곽 하단 (Bottom)' :
                                                    activeBorderTarget === 'left' ? '외곽 좌측 (Left)' :
                                                        activeBorderTarget === 'right' ? '외곽 우측 (Right)' :
                                                            activeBorderTarget === 'header' ? '헤더 하단 (Header)' :
                                                                activeBorderTarget === 'stub' ? '스터브 우측 (Stub)' : activeBorderTarget.toUpperCase()
                                        }
                                    </div>
                                )}
                            </div>

                            <div style={{
                                position: 'relative', width: '100%', maxWidth: '460px', height: '240px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto',
                                border: '1px solid #E2E8F0', backgroundColor: settings.render.theme_bg, borderRadius: '8px',
                                padding: '16px', boxSizing: 'border-box'
                            }}>
                                <div style={{
                                    position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                                    color: settings.render.theme_text, fontFamily: settings.render.font_family,
                                    fontSize: `${settings.render.font_size}px`
                                }}>
                                    {/* Header Row */}
                                    <div style={{ display: 'flex', height: '48px', textAlign: 'center', fontWeight: 'bold', backgroundColor: settings.render.theme_primary, color: settings.render.theme_primary_fg }}>
                                        <div style={{ width: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: settings.render.font_family, fontSize: `${settings.render.font_size}px` }}>Stub Label</div>
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: settings.render.font_family, fontSize: `${settings.render.font_size}px` }}>Total / Header</div>
                                    </div>
                                    {/* Data Row 1 */}
                                    <div style={{ display: 'flex', flex: 1, backgroundColor: settings.render.theme_bg }}>
                                        <div style={{ width: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: settings.render.theme_bg_alt, fontFamily: settings.render.font_family, fontSize: `${settings.render.font_size}px` }}>Category 1</div>
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: settings.render.theme_text_muted, fontFamily: settings.render.font_family, fontSize: `${settings.render.font_size}px` }}>54% | 23%</div>
                                    </div>
                                    {/* Data Row 2 */}
                                    <div style={{ display: 'flex', flex: 1, backgroundColor: settings.render.theme_stripe }}>
                                        <div style={{ width: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: settings.render.theme_bg_alt, fontFamily: settings.render.font_family, fontSize: `${settings.render.font_size}px` }}>Category 2</div>
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: settings.render.theme_text_muted, fontFamily: settings.render.font_family, fontSize: `${settings.render.font_size}px` }}>46% | 77%</div>
                                    </div>

                                    {/* Clickable Overlays */}
                                    <div onClick={() => setActiveBorderTarget('top')} style={{ position: 'absolute', top: '-16px', left: 0, right: 0, height: '32px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', background: activeBorderTarget === 'top' ? 'rgba(59,130,246,0.15)' : 'transparent', border: activeBorderTarget === 'top' ? '1px dashed #3B82F6' : 'none' }}>
                                        <div style={{ width: '100%', borderTopStyle: settings.render.theme_border_outer_top === 'none' ? 'none' : settings.render.theme_border_outer_top === 'double' ? 'double' : 'solid', borderTopWidth: settings.render.theme_border_outer_top === 'thick' ? '3px' : settings.render.theme_border_outer_top === 'double' ? '4px' : settings.render.theme_border_outer_top === 'none' ? '0' : '1px', borderTopColor: settings.render.theme_border_color || '#1e293b' }} />
                                    </div>
                                    <div onClick={() => setActiveBorderTarget('bottom')} style={{ position: 'absolute', bottom: '-16px', left: 0, right: 0, height: '32px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', background: activeBorderTarget === 'bottom' ? 'rgba(59,130,246,0.15)' : 'transparent', border: activeBorderTarget === 'bottom' ? '1px dashed #3B82F6' : 'none' }}>
                                        <div style={{ width: '100%', borderBottomStyle: settings.render.theme_border_outer_bottom === 'none' ? 'none' : settings.render.theme_border_outer_bottom === 'double' ? 'double' : 'solid', borderBottomWidth: settings.render.theme_border_outer_bottom === 'thick' ? '3px' : settings.render.theme_border_outer_bottom === 'double' ? '4px' : settings.render.theme_border_outer_bottom === 'none' ? '0' : '1px', borderBottomColor: settings.render.theme_border_color || '#1e293b' }} />
                                    </div>
                                    <div onClick={() => setActiveBorderTarget('left')} style={{ position: 'absolute', top: 0, bottom: 0, left: '-16px', width: '32px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: activeBorderTarget === 'left' ? 'rgba(59,130,246,0.15)' : 'transparent', border: activeBorderTarget === 'left' ? '1px dashed #3B82F6' : 'none' }}>
                                        <div style={{ height: '100%', borderLeftStyle: settings.render.theme_border_outer_left === 'none' ? 'none' : settings.render.theme_border_outer_left === 'double' ? 'double' : 'solid', borderLeftWidth: settings.render.theme_border_outer_left === 'thick' ? '3px' : settings.render.theme_border_outer_left === 'double' ? '4px' : settings.render.theme_border_outer_left === 'none' ? '0' : '1px', borderLeftColor: settings.render.theme_border_color || '#1e293b' }} />
                                    </div>
                                    <div onClick={() => setActiveBorderTarget('right')} style={{ position: 'absolute', top: 0, bottom: 0, right: '-16px', width: '32px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: activeBorderTarget === 'right' ? 'rgba(59,130,246,0.15)' : 'transparent', border: activeBorderTarget === 'right' ? '1px dashed #3B82F6' : 'none' }}>
                                        <div style={{ height: '100%', borderRightStyle: settings.render.theme_border_outer_right === 'none' ? 'none' : settings.render.theme_border_outer_right === 'double' ? 'double' : 'solid', borderRightWidth: settings.render.theme_border_outer_right === 'thick' ? '3px' : settings.render.theme_border_outer_right === 'double' ? '4px' : settings.render.theme_border_outer_right === 'none' ? '0' : '1px', borderRightColor: settings.render.theme_border_color || '#1e293b' }} />
                                    </div>
                                    <div onClick={() => setActiveBorderTarget('header')} style={{ position: 'absolute', top: '32px', left: 0, right: 0, height: '32px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', background: activeBorderTarget === 'header' ? 'rgba(59,130,246,0.15)' : 'transparent', border: activeBorderTarget === 'header' ? '1px dashed #3B82F6' : 'none' }}>
                                        <div style={{ width: '100%', borderTopStyle: settings.render.theme_border_header === 'none' ? 'none' : settings.render.theme_border_header === 'double' ? 'double' : 'solid', borderTopWidth: settings.render.theme_border_header === 'thick' ? '3px' : settings.render.theme_border_header === 'double' ? '4px' : settings.render.theme_border_header === 'none' ? '0' : '1px', borderTopColor: settings.render.theme_border_color || '#1e293b' }} />
                                    </div>
                                    <div onClick={() => setActiveBorderTarget('stub')} style={{ position: 'absolute', top: 0, bottom: 0, left: '84px', width: '32px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: activeBorderTarget === 'stub' ? 'rgba(59,130,246,0.15)' : 'transparent', border: activeBorderTarget === 'stub' ? '1px dashed #3B82F6' : 'none' }}>
                                        <div style={{ height: '100%', borderLeftStyle: settings.render.theme_border_stub === 'none' ? 'none' : settings.render.theme_border_stub === 'double' ? 'double' : 'solid', borderLeftWidth: settings.render.theme_border_stub === 'thick' ? '3px' : settings.render.theme_border_stub === 'double' ? '4px' : settings.render.theme_border_stub === 'none' ? '0' : '1px', borderLeftColor: settings.render.theme_border_color || '#1e293b' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Inspector Sidebar (Styles & Colors) */}
                    <div style={{ flex: '0 0 280px', background: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        <div style={{ paddingBottom: '12px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#1E293B' }}>표 테두리 상세 설정</span>
                        </div>

                        {/* 2. Style Picker */}
                        <div style={{ opacity: activeBorderTarget ? 1 : 0.5, pointerEvents: activeBorderTarget ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                1. 적용할 선 스타일
                                {!activeBorderTarget && <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 500 }}>영역을 먼저 선택하세요</span>}
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {['none', 'solid', 'thick', 'double'].map(styleStr => {
                                    const labels = { none: '선 없음 (None)', solid: '일반선 (Solid)', thick: '굵은선 (Bold)', double: '이중선 (Double)' };
                                    const currentStyle = activeBorderTarget && settings.render[`theme_border_${activeBorderTarget === 'header' || activeBorderTarget === 'stub' ? '' : 'outer_'}${activeBorderTarget}`] === styleStr;
                                    return (
                                        <div key={styleStr}
                                            onClick={() => {
                                                if (!activeBorderTarget) return;
                                                const fieldName = `theme_border_${activeBorderTarget === 'header' || activeBorderTarget === 'stub' ? '' : 'outer_'}${activeBorderTarget}`;
                                                setSettings({
                                                    ...settings,
                                                    render: { ...settings.render, [fieldName]: styleStr }
                                                });
                                            }}
                                            style={{
                                                padding: '8px 12px', cursor: 'pointer', borderRadius: '6px',
                                                backgroundColor: currentStyle ? '#EFF6FF' : '#FFFFFF',
                                                border: currentStyle ? '1px solid #3B82F6' : '1px solid #E2E8F0',
                                                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {/* Visual Preview Box */}
                                                <div style={{
                                                    width: '28px', height: '20px', flexShrink: 0,
                                                    backgroundColor: currentStyle ? '#FFFFFF' : '#F8FAFC',
                                                    border: currentStyle ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                                                    borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    padding: '0 4px', boxSizing: 'border-box'
                                                }}>
                                                    {styleStr !== 'none' ? (
                                                        <div style={{
                                                            width: '100%',
                                                            borderTopStyle: styleStr === 'double' ? 'double' : 'solid',
                                                            borderTopWidth: styleStr === 'thick' ? '3px' : styleStr === 'double' ? '3px' : '1px',
                                                            borderTopColor: currentStyle ? '#3B82F6' : '#64748B'
                                                        }} />
                                                    ) : (
                                                        <div style={{ width: '100%', borderTop: '1px dashed', borderColor: currentStyle ? '#93C5FD' : '#CBD5E1' }} />
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '13px', color: currentStyle ? '#3B82F6' : '#334155', fontWeight: currentStyle ? 600 : 400 }}>
                                                    {labels[styleStr]}
                                                </div>
                                            </div>
                                            {currentStyle && <CheckCircle2 size={16} color="#3B82F6" />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 3. Border Color Picker */}
                        <div style={{ transition: 'opacity 0.2s' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>
                                2. 일괄 테두리 색상
                            </label>
                            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#FFFFFF', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                                    <input
                                        type="color"
                                        value={settings.render.theme_border_color || '#000000'}
                                        onChange={(e) => setSettings({ ...settings, render: { ...settings.render, theme_border_color: e.target.value } })}
                                        style={{ width: '36px', height: '24px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                                    />
                                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#1E293B' }}>{settings.render.theme_border_color?.toUpperCase() || '#000000'}</span>
                                </div>
                                <button
                                    onClick={() => setSettings({ ...settings, render: { ...settings.render, theme_border_color: '#000000' } })}
                                    style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '8px 16px', borderRadius: '6px', width: '100%', transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => { e.target.style.backgroundColor = '#F1F5F9'; e.target.style.borderColor = '#94A3B8' }}
                                    onMouseLeave={(e) => { e.target.style.backgroundColor = '#FFFFFF'; e.target.style.borderColor = '#CBD5E1' }}
                                >
                                    초기화 (기본색상)
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            <div className="dp-setting-card" style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div className="dp-setting-card-header" style={{ padding: '12px 20px', borderBottom: '1px solid #E2E8F0', fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <Palette size={16} color="#10B981" /> 전체 테마 색상 (커스텀/프리셋)
                </div>
                <div className="dp-setting-card-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Presets */}
                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>빠른 프리셋 색상 적용</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', lineHeight: '24px' }}>LIGHT:</span>
                                <button className="dp-tag-btn" style={{ background: '#D3D3D3', color: '#1E293B', borderColor: '#D3D3D3', padding: '2px 8px' }} onClick={() => setSettings({ ...settings, render: { ...settings.render, theme_primary: "#D3D3D3", theme_primary_fg: "#1E293B", theme_secondary: "#F1F5F9", theme_secondary_alt: "#E2E8F0", theme_bg: "#FFFFFF", theme_bg_alt: "#F8FAFC", theme_stripe: "#F5F7FB", theme_text: "#1F2937", theme_text_muted: "#64748B", theme_highlight: "#E74C3C", theme_destructive: "#EF4444", theme_warning: "#F59E0B", theme_success: "#10B981", theme_info: "#D3D3D3", theme_border_color: "#CBD5E1" } })}>모던 그레이 (기본)</button>
                                <button className="dp-tag-btn" style={{ background: '#FAFAFA', color: '#18181B', borderColor: '#E4E4E7', padding: '2px 8px' }} onClick={() => setSettings({ ...settings, render: { ...settings.render, theme_primary: "#3F3F46", theme_primary_fg: "#FFFFFF", theme_secondary: "#E4E4E7", theme_secondary_alt: "#F4F4F5", theme_bg: "#FFFFFF", theme_bg_alt: "#FAFAFA", theme_stripe: "#F7F7F8", theme_text: "#18181B", theme_text_muted: "#A1A1AA", theme_highlight: "#18181B", theme_destructive: "#EF4444", theme_warning: "#F59E0B", theme_success: "#10B981", theme_info: "#475569", theme_border_color: "#E4E4E7" } })}>플래티넘 실버</button>
                                <button className="dp-tag-btn" style={{ background: '#064E3B', color: 'white', borderColor: '#064E3B', padding: '2px 8px' }} onClick={() => setSettings({ ...settings, render: { ...settings.render, theme_primary: "#064E3B", theme_primary_fg: "#FFFFFF", theme_secondary: "#D1FAE5", theme_secondary_alt: "#ECFDF5", theme_bg: "#FFFFFF", theme_bg_alt: "#FAFAF9", theme_stripe: "#F5F5F4", theme_text: "#1C1917", theme_text_muted: "#78716C", theme_highlight: "#D97706", theme_destructive: "#EF4444", theme_warning: "#F59E0B", theme_success: "#10B981", theme_info: "#475569", theme_border_color: "#D6D3D1" } })}>에메랄드 포레스트</button>
                            </div>
                            <div style={{ width: '1px', height: '16px', background: '#cbd5e1' }} />
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', lineHeight: '24px' }}>DARK:</span>
                                <button className="dp-tag-btn" style={{ background: '#0F172A', color: '#F8FAFC', borderColor: '#1E293B', padding: '2px 8px' }} onClick={() => setSettings({ ...settings, render: { ...settings.render, theme_primary: "#475569", theme_primary_fg: "#FFFFFF", theme_secondary: "#1E293B", theme_secondary_alt: "#334155", theme_bg: "#0F172A", theme_bg_alt: "#1E293B", theme_stripe: "#172033", theme_text: "#F8FAFC", theme_text_muted: "#94A3B8", theme_highlight: "#FCD34D", theme_destructive: "#F87171", theme_warning: "#FBBF24", theme_success: "#34D399", theme_info: "#60A5FA", theme_border_color: "#334155" } })}>슬레이트 다크</button>
                                <button className="dp-tag-btn" style={{ background: '#36393F', color: 'white', borderColor: '#36393F', padding: '2px 8px' }} onClick={() => setSettings({ ...settings, render: { ...settings.render, theme_primary: "#4752C4", theme_primary_fg: "#FFFFFF", theme_secondary: "#4F545C", theme_secondary_alt: "#40444B", theme_bg: "#36393F", theme_bg_alt: "#2F3136", theme_stripe: "#32353B", theme_text: "#DCDDDE", theme_text_muted: "#B9BBBE", theme_highlight: "#ED4245", theme_destructive: "#ED4245", theme_warning: "#FEE75C", theme_success: "#3BA55C", theme_info: "#4752C4", theme_border_color: "#202225" } })}>Discord (Dark)</button>
                            </div>
                        </div>
                    </div>

                    {/* Colors Editor */}
                    <div>
                        <h4 style={{ fontSize: '13px', margin: '0 0 12px 0', color: '#1E293B', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>상세 색상 팔레트</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                            {[
                                { group: 'Primary', label: '메인 테마색', field: 'theme_primary' },
                                { group: 'Primary', label: '메인 텍스트', field: 'theme_primary_fg' },
                                { group: 'Secondary', label: '서브/버튼', field: 'theme_secondary' },
                                { group: 'Secondary', label: '서브 보완', field: 'theme_secondary_alt' },
                                { group: 'Text', label: '기본 텍스트', field: 'theme_text' },
                                { group: 'Text', label: '보조 텍스트', field: 'theme_text_muted' },
                                { group: 'Background', label: '기본 배경', field: 'theme_bg' },
                                { group: 'Background', label: '카드 배경', field: 'theme_bg_alt' },
                                { group: 'Background', label: '교차/Stripe', field: 'theme_stripe' },
                                { group: 'Border', label: '테두리 색상', field: 'theme_border_color' },
                                { group: 'Status', label: 'Success', field: 'theme_success' },
                                { group: 'Status', label: 'Warning', field: 'theme_warning' },
                                { group: 'Status', label: 'Error', field: 'theme_destructive' },
                                { group: 'Status', label: 'Info', field: 'theme_info' },
                                { group: 'Status', label: 'Accent', field: 'theme_highlight' },
                            ].map(item => (
                                <div key={item.field} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', border: '1px solid #CBD5E1', borderRadius: '4px', background: '#fff' }}>
                                    <input
                                        type="color"
                                        value={(settings.render[item.field] || '#ffffff').slice(0, 7)}
                                        onChange={(e) => {
                                            setSettings({ ...settings, render: { ...settings.render, [item.field]: e.target.value.toUpperCase() } });
                                            if (onUnsavedChange) onUnsavedChange(true);
                                        }}
                                        style={{ width: '28px', height: '28px', padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                        <span style={{ fontSize: '10px', color: '#64748B', lineHeight: '1.2' }}>{item.group}</span>
                                        <span style={{ fontSize: '13px', color: '#1E293B', fontWeight: 600, lineHeight: '1.2' }}>{item.label}</span>
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#94A3B8', width: '50px', textAlign: 'right' }}>{settings.render[item.field]?.slice(0, 7) || ''}</span>
                                </div>
                            ))}
                            {/* Special case for hover color since it uses rgba */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', border: '1px dashed #CBD5E1', borderRadius: '4px', background: '#F8FAFC', gridColumn: '1 / -1' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', width: '150px' }}>
                                    <span style={{ fontSize: '10px', color: '#64748B' }}>Hover</span>
                                    <span style={{ fontSize: '13px', color: '#1E293B', fontWeight: 600 }}>Sidebar 호버 색상</span>
                                </div>
                                <input
                                    type="text"
                                    value={settings.render.theme_sidebar_hover || ''}
                                    placeholder="rgba(0,0,0,0.1) 또는 비워두기"
                                    onChange={(e) => {
                                        setSettings({ ...settings, render: { ...settings.render, theme_sidebar_hover: e.target.value } });
                                        if (onUnsavedChange) onUnsavedChange(true);
                                    }}
                                    style={{ flex: 1, padding: '4px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="dp-request-container" style={{ background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', padding: '0 24px', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {tabs.map((tab, idx) => {
                        const isActive = activeTab === idx;
                        return (
                            <div
                                key={idx}
                                onClick={() => setActiveTab(idx)}
                                style={{
                                    padding: '16px 20px',
                                    cursor: 'pointer',
                                    fontWeight: isActive ? 600 : 500,
                                    fontSize: '15px',
                                    color: isActive ? '#475569' : '#64748B',
                                    borderBottom: isActive ? '3px solid #475569' : '3px solid transparent',
                                    marginBottom: '-1px', // Overlay parent border
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {tab.label}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {renderTabContent()}
            </div>
        </div>
    );
});

export default DpRequestSettingStep;
