import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import './CrossOptionModal.css';
import { CHART_THEME_OPTIONS } from '../../constants/chartThemes';

const CrossOptionModal = ({ onClose, onApply }) => {
    const [options, setOptions] = useState({
        showRatio: true,
        ratioDecimal: 3,
        showFrequency: true,
        showMedian: false,
        medianDecimal: 2,
        showStdDev: false,
        stdDevDecimal: 2,
        border: '있음',
        theme: 'default',
        stub100: 'Show'
    });

    const handleApply = () => {
        if (onApply) onApply(options);
        onClose();
    };

    const tableData = [
        { label: '보통', freq: [221, 123, 98], ratio: [34.477, 39.297, 29.878] },
        { label: '만족', freq: [334, 156, 178], ratio: [52.106, 49.840, 54.268] },
        { label: '매우 만족', freq: [86, 34, 52], ratio: [13.417, 10.863, 15.854] }
    ];
    const totalFreq = [641, 313, 328];
    const medianData = [110.50, 123.00, 98.00];
    const stdDevData = [51.85, 51.53, 52.06];

    const getSubHeader = () => {
        if (options.showFrequency && options.showRatio) return '(N)%';
        if (options.showFrequency) return '(N)';
        if (options.showRatio) return '%';
        return '-';
    };

    const renderTotalCell = (freq, idx) => {
        if (options.showFrequency && options.showRatio) {
            return (
                <td>
                    <div className="val">{freq}</div>
                    <div className="pct">({Number(100).toFixed(options.ratioDecimal)}%)</div>
                </td>
            );
        } else if (options.showFrequency) {
            return (
                <td>
                    <div className="val">{freq}</div>
                </td>
            );
        } else if (options.showRatio) {
            return (
                <td>
                    <div className="pct">{Number(100).toFixed(options.ratioDecimal)}%</div>
                </td>
            );
        }
        return <td>-</td>;
    };

    const renderDataCell = (freq, ratio) => {
        if (options.showFrequency && options.showRatio) {
            return <td className="data-cell">{freq} <span className="pct-inline">({Number(ratio).toFixed(options.ratioDecimal)})</span></td>;
        } else if (options.showFrequency) {
            return <td className="data-cell">{freq}</td>;
        } else if (options.showRatio) {
            return <td className="data-cell" style={{ color: '#475569', fontWeight: 500 }}>{Number(ratio).toFixed(options.ratioDecimal)}</td>;
        }
        return <td className="data-cell">-</td>;
    };

    return (
        <div className="cross-modal-overlay">
            <div className="cross-modal-container">
                {/* Header */}
                <div className="cross-modal-header">
                    <div className="cross-modal-title">
                        <span>교차표 옵션</span>
                    </div>
                    <button onClick={onClose} className="cross-modal-close-btn">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="cross-modal-body">
                    {/* Left Settings Panel */}
                    <div className="cross-modal-settings">
                        
                        <div className="settings-section-title">표시 옵션</div>
                        
                        <div className={`option-row ${options.showRatio ? 'active' : ''}`}>
                            <label className="checkbox-label">
                                <input type="checkbox" checked={options.showRatio} onChange={(e) => setOptions({...options, showRatio: e.target.checked})} />
                                <div className="checkbox-custom">{options.showRatio && <Check size={14} color="white" />}</div>
                                <span>비율 표시</span>
                            </label>
                            {options.showRatio && (
                                <div className="option-extra">
                                    <span>소수점:</span>
                                    <input type="number" value={options.ratioDecimal} onChange={(e) => { let val = Number(e.target.value); if (val > 13) val = 13; setOptions({...options, ratioDecimal: val}); }} min="0" max="13" />
                                    <span>자리</span>
                                </div>
                            )}
                        </div>

                        <div className={`option-row ${options.showFrequency ? 'active' : ''}`}>
                            <label className="checkbox-label">
                                <input type="checkbox" checked={options.showFrequency} onChange={(e) => setOptions({...options, showFrequency: e.target.checked})} />
                                <div className="checkbox-custom">{options.showFrequency && <Check size={14} color="white" />}</div>
                                <span>빈도 표시</span>
                            </label>
                        </div>

                        <div className={`option-row ${options.showMedian ? 'active' : ''}`}>
                            <label className="checkbox-label">
                                <input type="checkbox" checked={options.showMedian} onChange={(e) => setOptions({...options, showMedian: e.target.checked})} />
                                <div className="checkbox-custom">{options.showMedian && <Check size={14} color="white" />}</div>
                                <span>중앙값 표시</span>
                            </label>
                            {options.showMedian && (
                                <div className="option-extra">
                                    <span>소수점:</span>
                                    <input type="number" value={options.medianDecimal} onChange={(e) => { let val = Number(e.target.value); if (val > 13) val = 13; setOptions({...options, medianDecimal: val}); }} min="0" max="13" />
                                    <span>자리</span>
                                </div>
                            )}
                        </div>

                        <div className={`option-row ${options.showStdDev ? 'active' : ''}`}>
                            <label className="checkbox-label">
                                <input type="checkbox" checked={options.showStdDev} onChange={(e) => setOptions({...options, showStdDev: e.target.checked})} />
                                <div className="checkbox-custom">{options.showStdDev && <Check size={14} color="white" />}</div>
                                <span>표준편차 표시</span>
                            </label>
                            {options.showStdDev && (
                                <div className="option-extra">
                                    <span>소수점:</span>
                                    <input type="number" value={options.stdDevDecimal} onChange={(e) => { let val = Number(e.target.value); if (val > 13) val = 13; setOptions({...options, stdDevDecimal: val}); }} min="0" max="13" />
                                    <span>자리</span>
                                </div>
                            )}
                        </div>

                        <div className="settings-section-title" style={{ marginTop: '24px' }}>스타일 옵션</div>

                        <div className="style-option-row">
                            <span className="style-label">표 양쪽 테두리</span>
                            <div 
                                className={`toggle-button ${options.border === '있음' ? 'active' : ''}`}
                                onClick={() => setOptions({...options, border: options.border === '있음' ? '없음' : '있음'})}
                            >
                                {options.border}
                            </div>
                        </div>

                        <div className="style-option-row">
                            <span className="style-label">차트 테마</span>
                            <select className="option-select" value={options.theme} onChange={(e) => setOptions({...options, theme: e.target.value})}>
                                {CHART_THEME_OPTIONS.map(theme => (
                                    <option key={theme.id} value={theme.id}>{theme.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="style-option-row">
                            <span className="style-label">Stub 전체 100%</span>
                            <div 
                                className={`toggle-button ${options.stub100 === 'Show' ? 'active' : ''}`}
                                onClick={() => setOptions({...options, stub100: options.stub100 === 'Show' ? 'Hide' : 'Show'})}
                            >
                                {options.stub100}
                            </div>
                        </div>
                    </div>

                    {/* Right Preview Panel */}
                    <div className="cross-modal-preview">
                        <div className="preview-header">
                            <span>미리보기</span>
                        </div>
                        <div className="preview-content">
                            <table className={`preview-table ${options.border === '없음' ? 'no-outer-border' : ''}`}>
                                <thead>
                                    <tr>
                                        <th>Q1. 제품 만족도</th>
                                        {options.stub100 !== 'Hide' && <th>전체</th>}
                                        <th>남성</th>
                                        <th>여성</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="total-row">
                                        <td>전체</td>
                                        {totalFreq.map((freq, idx) => (options.stub100 === 'Hide' && idx === 0) ? null : <React.Fragment key={idx}>{renderTotalCell(freq, idx)}</React.Fragment>)}
                                    </tr>
                                    <tr className="sub-header-row">
                                        <td></td>
                                        {options.stub100 !== 'Hide' && <td>{getSubHeader()}</td>}
                                        <td>{getSubHeader()}</td>
                                        <td>{getSubHeader()}</td>
                                    </tr>
                                    {tableData.map((row, i) => (
                                        <tr key={i}>
                                            <td>{row.label}</td>
                                            {row.freq.map((f, j) => (options.stub100 === 'Hide' && j === 0) ? null : <React.Fragment key={j}>{renderDataCell(f, row.ratio[j])}</React.Fragment>)}
                                        </tr>
                                    ))}
                                    {options.showMedian && (
                                        <tr>
                                            <td className="data-cell" style={{ fontWeight: 700, color: '#1e293b' }}>중앙값</td>
                                            {medianData.map((val, idx) => (options.stub100 === 'Hide' && idx === 0) ? null : (
                                                <td key={idx} className="data-cell">{Number(val).toFixed(options.medianDecimal)}</td>
                                            ))}
                                        </tr>
                                    )}
                                    {options.showStdDev && (
                                        <tr>
                                            <td className="data-cell" style={{ fontWeight: 700, color: '#1e293b' }}>표준편차</td>
                                            {stdDevData.map((val, idx) => (options.stub100 === 'Hide' && idx === 0) ? null : (
                                                <td key={idx} className="data-cell">{Number(val).toFixed(options.stdDevDecimal)}</td>
                                            ))}
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="cross-modal-footer">
                    <button className="btn-cancel" onClick={onClose}>취소</button>
                    <button className="btn-apply" onClick={handleApply}>
                        저장
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CrossOptionModal;
