import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DpRequestPageApi } from '../dpRequest/DpRequestPageApi';
import { AiReportPageApi } from './AiReportPageApi';

export default function SingleCrosstabViewerPage() {
    const [searchParams] = useSearchParams();

    let storedParams = {};
    try {
        const storedStr = sessionStorage.getItem('singleCrosstabParams');
        if (storedStr) {
            storedParams = JSON.parse(storedStr) || {};
        }
    } catch (e) {
        console.error("Failed to parse singleCrosstabParams from sessionStorage:", e);
    }

    const stubParam = searchParams.get('stub') || storedParams.stubId || storedParams.stub || '';
    const titleParam = searchParams.get('title') || storedParams.windowTitle || '핵심 교차표';
    const pageIdParam = searchParams.get('pageId') || storedParams.pageId || sessionStorage.getItem('pageId') || "3fa85f64-5717-4562-b3fc-2c963f66afa6";
    const userParam = searchParams.get('user') || storedParams.user || "";

    const bannerParamRaw = searchParams.get('banner') || (storedParams.bannerList ? JSON.stringify(storedParams.bannerList) : null);
    const weightVarParam = searchParams.get('weightVar') || storedParams.weightVar || '';
    const filterExprParam = searchParams.get('filterExpr') || storedParams.filterExpr || '';

    const { getOverviewContext } = DpRequestPageApi();
    const { getOverviewSingleStyled } = AiReportPageApi();

    const [loading, setLoading] = useState(true);
    const [tableHtml, setTableHtml] = useState('');
    const [tableCss, setTableCss] = useState('');
    const [displayTitle, setDisplayTitle] = useState(titleParam);
    const [errorMsg, setErrorMsg] = useState('');
    const [uiSettings, setUiSettings] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            if (!stubParam) {
                setErrorMsg('유효하지 않은 스터브 코드입니다.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setErrorMsg('');

            // 1. Context 설정 정보 조회
            let contextUiSettings = null;
            try {
                const contextRes = await getOverviewContext.mutateAsync({ pageid: pageIdParam, user: userParam });
                const ctxPayload = contextRes?.resultjson || contextRes || {};
                if (ctxPayload.ui_settings && typeof ctxPayload.ui_settings === 'object') {
                    contextUiSettings = ctxPayload.ui_settings;
                } else if (ctxPayload.effective_render_settings && typeof ctxPayload.effective_render_settings === 'object') {
                    contextUiSettings = ctxPayload.effective_render_settings;
                }
            } catch (ctxErr) {
                console.error("Viewer: Failed to load context for single-styled:", ctxErr);
            }

            if (!contextUiSettings) {
                contextUiSettings = {
                    font_family: "Pretendard",
                    font_size: 13,
                    format_show_n: true,
                    format_show_percent: true,
                    format_percent_as_column: true,
                    format_n_round: 0,
                    format_percent_round: 1,
                    format_percent_symbol: true,
                    format_base_prefix: "(",
                    format_base_postfix: ")",
                    sig_diff_fin_mode: "t-test",
                    sig_diff_test_mode: true,
                    sig_level: 95,
                    theme_primary: "#2F5597",
                    theme_primary_fg: "#FFFFFF",
                    theme_base_bg: "#fef08a",
                    theme_base_fg: "#0F172A",
                    stub_group_layout: "merge",
                    zero_display: "-",
                    empty_display: ""
                };
            }

            setUiSettings(contextUiSettings);

            // 2. stubs Payload 구성
            let stubsPayload = [];
            const trimmed = stubParam.trim();
            if (trimmed.endsWith('_stub')) {
                const baseCode = trimmed.replace(/_stub$/, '');
                stubsPayload = [baseCode, trimmed];
            } else {
                stubsPayload = [trimmed, `${trimmed}_stub`];
            }

            // 3. banner 구성
            let bannerList = [];
            if (bannerParamRaw) {
                try {
                    bannerList = JSON.parse(bannerParamRaw);
                } catch (e) {
                    bannerList = [bannerParamRaw];
                }
            }

            const weightVar = weightVarParam || contextUiSettings?.weight_variable || contextUiSettings?.weight_col || "";
            const filterExpr = filterExprParam || contextUiSettings?.filter_expression || "";

            const payload = {
                pageid: pageIdParam,
                user: userParam,
                stubs: stubsPayload,
                banner: Array.isArray(bannerList) ? bannerList : [],
                banner_mode: "stub",
                weight_variable: weightVar,
                weight_mode: "default",
                filter_expression: filterExpr,
                ui_settings: contextUiSettings,
                include_stats: ["show_n", "show_percent", "percent_digits", "base_bracket", "t-test"],
                include_tests: ["t-test"]
            };

            try {
                const res = await getOverviewSingleStyled.mutateAsync(payload);
                if (!isMounted) return;
                const data = res?.resultjson || res || {};
                let rawHtml = data.tables?.[0]?.html || data.html || data.results?.[0]?.html || "";
                let rawCss = data.style_css || "";
                const titleFromRes = data.tables?.[0]?.title;

                if (titleFromRes) {
                    setDisplayTitle(titleFromRes);
                }

                if (rawHtml) {
                    // 백엔드 반환 CSS/HTML 내 max-height: 420px 완벽 제거 및 무력화
                    rawCss = rawCss.replace(/max-height\s*:\s*[^;}]+;?/gi, 'max-height: calc(100vh - 100px) !important;');
                    rawHtml = rawHtml.replace(/max-height\s*:\s*[^;"}]+;?/gi, 'max-height: calc(100vh - 100px) !important;');

                    setTableHtml(rawHtml);
                    setTableCss(rawCss);
                } else {
                    setErrorMsg('해당 문항의 교차표 데이터를 찾을 수 없습니다.');
                }
            } catch (err) {
                console.error("Viewer: Failed to fetch single-styled crosstab:", err);
                if (isMounted) {
                    setErrorMsg('서버 통신 오류로 교차표를 불러오지 못했습니다.');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [stubParam, pageIdParam, userParam, bannerParamRaw, weightVarParam, filterExprParam]);

    const primaryColor = uiSettings?.theme_primary || '#2F5597';
    const primaryFgColor = uiSettings?.theme_primary_fg || '#FFFFFF';
    const baseBgColor = uiSettings?.theme_base_bg || '#fef08a';
    const baseFgColor = uiSettings?.theme_base_fg || '#0F172A';

    return (
        <div style={{
            fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif",
            margin: 0,
            padding: '20px 24px',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            height: '100vh',
            maxHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            WebkitFontSmoothing: 'antialiased',
            boxSizing: 'border-box'
        }}>
            <style>{`
                html, body {
                    margin: 0;
                    padding: 0;
                    overflow: hidden;
                    height: 100%;
                }
                .crosstab-header-clean {
                    border-bottom: 2px solid #1e293b;
                    padding-bottom: 12px;
                    margin-bottom: 16px;
                    flex-shrink: 0;
                    background: #ffffff;
                    position: relative;
                    z-index: 500;
                }
                .header-section-title {
                    font-size: 21px;
                    font-weight: 800;
                    color: #0f172a;
                    margin-bottom: 8px;
                    letter-spacing: -0.02em;
                }
                .header-question-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-wrap: wrap;
                }
                .question-text {
                    font-size: 14px;
                    font-weight: 600;
                    color: #475569;
                    margin: 0;
                    letter-spacing: -0.01em;
                }
                .stub-tag {
                    background: #f1f5f9;
                    color: #475569;
                    border: 1px solid #cbd5e1;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 600;
                }
                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    flex: 1;
                    gap: 16px;
                    color: #475569;
                }
                .spinner {
                    width: 38px;
                    height: 38px;
                    border: 3.5px solid #e2e8f0;
                    border-top-color: #2563eb;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* 단일 독립 스크롤 컨테이너 */
                .single-styled-table-container {
                    flex: 1;
                    width: 100%;
                    height: 100%;
                    overflow: auto !important;
                    position: relative;
                    background: #ffffff;
                    box-sizing: border-box;
                }
                /* 백엔드 HTML 내 중복 래퍼 스크롤 해제 */
                .single-styled-table-container > div,
                .single-styled-table-container .hsrt-styled-table-container,
                .single-styled-table-container .proof-table-container {
                    max-height: none !important;
                    height: auto !important;
                    overflow: visible !important;
                    position: static !important;
                }
                .single-styled-table-container table {
                    width: max-content !important;
                    min-width: 100% !important;
                    border-collapse: separate !important;
                    border-spacing: 0 !important;
                    margin: 0 !important;
                }
                .single-styled-table-container td,
                .single-styled-table-container th {
                    padding: 8px 12px !important;
                    font-size: 13px !important;
                    line-height: 1.45 !important;
                    box-sizing: border-box !important;
                }

                ${tableCss}

                /* 상하(수직) 스티키 헤더 고정 및 배경 불투명 보장 (ui_settings theme_primary 반영) */
                .single-styled-table-container table thead tr th,
                .single-styled-table-container table thead th {
                    position: sticky !important;
                    top: 0 !important;
                    z-index: 100 !important;
                    background-color: ${primaryColor} !important;
                    color: ${primaryFgColor} !important;
                }

                /* 좌우(가로) 스티키 1열 고정 및 배경 불투명 보장 */
                .single-styled-table-container table tbody tr td:first-child,
                .single-styled-table-container table tbody tr td.stub-cell,
                .single-styled-table-container table tbody tr td.stub {
                    position: sticky !important;
                    left: 0 !important;
                    z-index: 90 !important;
                    background-color: #ffffff !important;
                    box-shadow: 2px 0 4px rgba(15, 23, 42, 0.08) !important;
                }
                .single-styled-table-container table tbody tr:nth-child(even) td:first-child {
                    background-color: #fafafa !important;
                }
                .single-styled-table-container table tr.base-row td,
                .single-styled-table-container table tr[class*="base"] td {
                    background-color: ${baseBgColor} !important;
                    color: ${baseFgColor} !important;
                }
                .single-styled-table-container table tr.base-row td:first-child,
                .single-styled-table-container table tr[class*="base"] td:first-child {
                    background-color: ${baseBgColor} !important;
                    color: ${baseFgColor} !important;
                    z-index: 95 !important;
                    box-shadow: 2px 0 4px rgba(15, 23, 42, 0.08) !important;
                }

                /* 최상단 1행 1열 '구분' 교차 헤더 셀 (최고 z-index, ui_settings theme_primary 반영) */
                .single-styled-table-container table thead tr:first-child th:first-child,
                .single-styled-table-container table thead tr:first-child td:first-child,
                .single-styled-table-container table thead th.stub-header {
                    position: sticky !important;
                    top: 0 !important;
                    left: 0 !important;
                    z-index: 200 !important;
                    background-color: ${primaryColor} !important;
                    color: ${primaryFgColor} !important;
                    box-shadow: 2px 2px 5px rgba(15, 23, 42, 0.1) !important;
                }
            `}</style>

            <div className="crosstab-header-clean">
                <div className="header-section-title">
                    핵심 교차표
                </div>
                {!loading && (
                    <div className="header-question-row">
                        <h2 className="question-text">{displayTitle}</h2>
                        {stubParam && <span className="stub-tag">{stubParam}</span>}
                    </div>
                )}
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <div style={{ fontSize: '15px', fontWeight: 600 }}>핵심 교차표 데이터를 불러오는 중입니다...</div>
                </div>
            ) : errorMsg ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#ef4444', fontSize: '15px', fontWeight: 600 }}>
                    {errorMsg}
                </div>
            ) : (
                <div 
                    className="single-styled-table-container hsrt-styled-table-container"
                    dangerouslySetInnerHTML={{ __html: tableHtml }}
                />
            )}
        </div>
    );
}
