import React, { useState, useEffect, useContext, forwardRef, useImperativeHandle } from 'react';
import { useSelector } from 'react-redux';
import { Settings, Layout } from 'lucide-react';
import { DpRequestPageApi } from '../DpRequestPageApi';
import AnalysisSettingTab from './AnalysisSettingTab';
import TableSettingTab from './TableSettingTab';
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import useUpdateHistory from '@/hooks/useUpdateHistory';
import { useRef } from 'react';

const DpRequestSettingStep = forwardRef(({ onUnsavedChange }, ref) => {
    const auth = useSelector((store) => store.auth);
    const { getTableRenderContext, getTableDetail, saveTableSettings, getBaseVariableList } = DpRequestPageApi();
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);

    // --- 히스토리 관리 (Undo/Redo) ---
    const history = useUpdateHistory('dp-setting');
    const isHistoryAction = useRef(false);

    // 부모 컴포넌트에서 호출할 수 있도록 기능 노출
    useImperativeHandle(ref, () => ({
        save: async () => {
            return await handleSave();
        }
    }));

    const [activeTab, setActiveTab] = useState(0); // 0: 분석, 1: 뷰 설정

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
    const fetchInitialData = async () => {
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId || !auth?.user?.userId) return;

        loadingSpinner.show();
        try {
            // 1. 설정 정보 조회
            const contextPromise = getTableRenderContext.mutateAsync({ pageid: pageId, user: auth.user.userId });
            const detailPromise = getTableDetail.mutateAsync({ pageid: pageId, user: auth.user.userId });
            // 2. 가중치 선택을 위한 기본 변수 목록 조회
            const variablesPromise = getBaseVariableList.mutateAsync({ pageid: pageId, user: auth.user.userId });
            const [renderContext, tableDetail, varList] = await Promise.all([contextPromise, detailPromise, variablesPromise]);

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

                const initDisplay = { 
                    ...settings.display, 
                    ...renderContext?.effective_display_policy,
                    ...actualTableDetail?.display_policy
                };
                
                if (ui.format_show_n !== undefined && ui.format_show_n !== null) initDisplay.show_n = ui.format_show_n;
                if (ui.format_show_percent !== undefined && ui.format_show_percent !== null) initDisplay.show_percent = ui.format_show_percent;
                if (ui.format_n_round !== undefined && ui.format_n_round !== null) initDisplay.n_digits = ui.format_n_round;
                if (ui.format_percent_round !== undefined && ui.format_percent_round !== null) initDisplay.percent_digits = ui.format_percent_round;
                if (ui.format_mean_round !== undefined && ui.format_mean_round !== null) initDisplay.mean_digits = ui.format_mean_round;
                if (ui.format_std_round !== undefined && ui.format_std_round !== null) initDisplay.std_digits = ui.format_std_round;
                if (ui.format_var_round !== undefined && ui.format_var_round !== null) initDisplay.var_digits = ui.format_var_round;
                if (ui.format_median_round !== undefined && ui.format_median_round !== null) initDisplay.median_digits = ui.format_median_round;
                if (ui.format_min_round !== undefined && ui.format_min_round !== null) initDisplay.min_digits = ui.format_min_round;
                if (ui.format_max_round !== undefined && ui.format_max_round !== null) initDisplay.max_digits = ui.format_max_round;

                let mergedRender = { ...settings.render, ...renderContext?.effective_render_settings, ...ui };

                nextSettings = {
                    weight_variable: actualTableDetail?.weight_variable || renderContext?.weight_variable || '없음',
                    confidence_level: actualTableDetail?.confidence_level || renderContext?.confidence_level || 95,
                    render: mergedRender,
                    display: initDisplay
                };

                setSettings(nextSettings);

                if (actualTableDetail?.scale_presets) {
                    nextScaleData = actualTableDetail.scale_presets.map(item => {
                        let top = '', mid = '', bot = '';
                        const options = item.options || {};
                        if (Array.isArray(options.bands)) {
                            options.bands.forEach(band => {
                                const lbl = (band.label || '').toLowerCase();
                                const vals = (band.values || []).join(',');
                                if (lbl.includes('top')) top = vals;
                                else if (lbl.includes('mid')) mid = vals;
                                else if (lbl.includes('bot')) bot = vals;
                            });
                        }
                        return {
                            id: item.id,
                            name: item.name || '',
                            type: item.type || 'scale',
                            min: options.min ?? '',
                            max: options.max ?? '',
                            recode: !!options.reverse,
                            top: top,
                            mid: mid,
                            bot: bot
                        };
                    });
                    setScaleData(nextScaleData);
                }
                if (actualTableDetail?.rank_presets) {
                    nextRankData = actualTableDetail.rank_presets.map(item => {
                        let selection = '';
                        if (Array.isArray(item.combinations) && item.combinations.length > 0) {
                            selection = item.combinations.join(', ');
                        } else if (Array.isArray(item.ranks)) {
                            selection = item.ranks.map(n => {
                                if (n === 1) return '1';
                                return Array.from({ length: n }, (_, i) => i + 1).join('+');
                            }).join(', ');
                        }
                        return {
                            id: item.id,
                            name: item.name || '',
                            selection: selection
                        };
                    });
                    setRankData(nextRankData);
                }
                if (actualTableDetail?.group_presets) {
                    nextGroupData = actualTableDetail.group_presets.map(item => {
                        let selection = '';
                        if (Array.isArray(item.groups)) {
                            selection = item.groups.map(g => `${g.label || ''}=${(g.values || []).join(',')}`).join(' | ');
                        }
                        return {
                            id: item.id,
                            name: item.name || '',
                            selection: selection
                        };
                    });
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

    useEffect(() => {
        fetchInitialData();
        const handlePageUpdate = () => fetchInitialData();
        window.addEventListener("pageSelected", handlePageUpdate);
        return () => window.removeEventListener("pageSelected", handlePageUpdate);
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
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId || !auth?.user?.userId) {
            modal.showAlert("알림", "저장할 수 없습니다. 다시 로그인하거나 페이지를 새로고침 해주세요.");
            return false;
        }

        loadingSpinner.show();
        try {
            const scaleDataPayload = scaleData.map(item => {
                const parseValues = (str) => {
                    if (!str) return [];
                    return String(str).split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
                };
                const bands = [];
                if (item.bot) bands.push({ label: 'bot', values: parseValues(item.bot), min: null, max: null, score: null });
                if (item.mid) bands.push({ label: 'mid', values: parseValues(item.mid), min: null, max: null, score: null });
                if (item.top) bands.push({ label: 'top', values: parseValues(item.top), min: null, max: null, score: null });

                return {
                    id: item.id || `preset_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    name: item.name,
                    type: item.type || 'scale',
                    options: {
                        enabled: true,
                        min: (item.min === 0 || item.min) ? Number(item.min) : null,
                        max: (item.max === 0 || item.max) ? Number(item.max) : null,
                        reverse: !!item.recode,
                        score_transform: null,
                        custom_value_map: [],
                        bands: bands
                    }
                };
            });

            for (let i = 0; i < rankData.length; i++) {
                const item = rankData[i];
                if (!item.selection || String(item.selection).trim() === '') {
                    modal.showAlert("알림", `[다중형 순위 설정] '${item.name}'의 조합 선언이 비어있습니다.`);
                    loadingSpinner.hide();
                    return false;
                }

                const combinations = [];
                const rawParts = String(item.selection).split(',');

                for (let j = 0; j < rawParts.length; j++) {
                    const rawPart = rawParts[j];
                    const part = rawPart.replace(/\s+/g, '');
                    if (!part) continue;

                    const nums = part.split('+');
                    const numSet = new Set();
                    let formatValid = true;

                    for (let k = 0; k < nums.length; k++) {
                        const strVal = nums[k];
                        if (!/^-?\d+$/.test(strVal)) {
                            formatValid = false;
                            break;
                        }
                        
                        const numVal = parseInt(strVal, 10);
                        if (numVal < 1) {
                            modal.showAlert("알림", `[다중형 순위 설정] '${item.name}'의 '${rawPart.trim()}'에 1 이상의 정수만 허용됩니다.`);
                            loadingSpinner.hide();
                            return false;
                        }
                        if (numSet.has(strVal)) {
                            modal.showAlert("알림", `[다중형 순위 설정] '${item.name}'의 '${rawPart.trim()}'에 중복된 숫자가 있습니다.`);
                            loadingSpinner.hide();
                            return false;
                        }
                        numSet.add(strVal);
                    }
                    
                    if (!formatValid) {
                        modal.showAlert("알림", `[다중형 순위 설정] '${item.name}'의 '${rawPart.trim()}' 형식이 올바르지 않습니다. 숫자와 '+' 조합만 허용됩니다.`);
                        loadingSpinner.hide();
                        return false;
                    }

                    const normalizedPart = nums.join('+');
                    if (combinations.includes(normalizedPart)) {
                        modal.showAlert("알림", `[다중형 순위 설정] '${item.name}'에 '${normalizedPart}' 조합이 중복 선언되었습니다.`);
                        loadingSpinner.hide();
                        return false;
                    }
                    combinations.push(normalizedPart);
                }

                if (combinations.length === 0) {
                    modal.showAlert("알림", `[다중형 순위 설정] '${item.name}'에 유효한 조합이 하나 이상 있어야 합니다.`);
                    loadingSpinner.hide();
                    return false;
                }

                item._processedCombinations = combinations;
            }

            const rankDataPayload = rankData.map(item => {
                return {
                    id: item.id || `preset_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    name: item.name,
                    type: 'multi',
                    combinations: item._processedCombinations,
                    ranks: []
                };
            });

            const groupDataPayload = groupData.map(item => {
                const groups = [];
                if (item.selection) {
                    String(item.selection).split('|').forEach(part => {
                        const splitted = part.split('=');
                        if (splitted.length >= 2) {
                            const label = splitted[0].trim();
                            const valStr = splitted.slice(1).join('=');
                            groups.push({
                                label: label,
                                values: valStr.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n))
                            });
                        }
                    });
                }
                return {
                    id: item.id || `preset_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    name: item.name,
                    groups: groups
                };
            });

            const payload = {
                user: auth.user.userId,
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
                    format_n_round: settings.display.n_digits !== "" && settings.display.n_digits !== null ? Number(settings.display.n_digits) : undefined,
                    format_percent_round: settings.display.percent_digits !== "" && settings.display.percent_digits !== null ? Number(settings.display.percent_digits) : undefined,
                    format_mean_round: settings.display.mean_digits !== "" && settings.display.mean_digits !== null ? Number(settings.display.mean_digits) : undefined,
                    format_std_round: settings.display.std_digits !== "" && settings.display.std_digits !== null ? Number(settings.display.std_digits) : undefined,
                    format_var_round: settings.display.var_digits !== "" && settings.display.var_digits !== null ? Number(settings.display.var_digits) : undefined,
                    format_median_round: settings.display.median_digits !== "" && settings.display.median_digits !== null ? Number(settings.display.median_digits) : undefined,
                    format_min_round: settings.display.min_digits !== "" && settings.display.min_digits !== null ? Number(settings.display.min_digits) : undefined,
                    format_max_round: settings.display.max_digits !== "" && settings.display.max_digits !== null ? Number(settings.display.max_digits) : undefined
                },
                scale_presets: scaleDataPayload,
                rank_presets: rankDataPayload,
                group_presets: groupDataPayload,
                stat_presets: []
            };

            const result = await saveTableSettings.mutateAsync(payload);
            if (result?.message || result?.status === 'success') {
                modal.showAlert("알림", "설정이 저장되었습니다.");
                if (onUnsavedChange) onUnsavedChange(false); // 저장 성공 시 더티 해제
                await fetchInitialData();
                return true;
            }
            return false;
        } catch (err) {
            console.error("Save failed:", err);
            modal.showAlert("오류", "저장에 실패했습니다.");
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
        <AnalysisSettingTab
            contextData={contextData}
            settings={settings}
            setSettings={setSettings}
            weightOptions={weightOptions}
            scaleData={scaleData}
            setScaleData={setScaleData}
            rankData={rankData}
            setRankData={setRankData}
            groupData={groupData}
            setGroupData={setGroupData}
            onUnsavedChange={onUnsavedChange}
        />
    );

    // 2. 표 설정 탭
    const renderTableSettingsTab = () => (
        <TableSettingTab
            settings={settings}
            setSettings={setSettings}
            onUnsavedChange={onUnsavedChange}
        />
    );

    return (
        <div className="dp-request-container" style={{ background: '#f8fafc', gap: 0, height: 'calc(100vh - 90px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', padding: '0 24px', background: '#FFFFFF', flexShrink: 0 }}>
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
                                    color: isActive ? '#3B82F6' : '#64748B',
                                    borderBottom: isActive ? '3px solid #3B82F6' : '3px solid transparent',
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
