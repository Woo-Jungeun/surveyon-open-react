
import { Paperclip, X, Loader2, Play, Check } from 'lucide-react';

const AiReportOverviewStep = ({
    fileInputRef,
    handleFileChange,
    fileAttached,
    fileName,
    setFileAttached,
    setFileName,
    setSelectedFile,
    setPollingInfo,
    pollingIntervalId,
    handleReset,
    handleStartAnalysisFile,
    isAnalyzing,
    analysisProgress,
    pollingInfo,
    overviewData,
    setOverviewData
}) => {
    return (
        <div className="ai-step-content-container">
            {/* STEP 1: 원본 워드 설문지 첨부 */}
            <div className="ai-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                        <div className="ai-step-badge-tag blue">STEP 1</div>
                        <span className="ai-step-badge-title">원본 워드 설문지 첨부</span>
                        <span className="ai-step-badge-desc">.docx / 최대 20MB · 분석 후 자동 폐기</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontWeight: 500 }}>
                        <span style={{ fontSize: '12px' }}>💡 파일 첨부 후 병합을 실행하면 아래 프로젝트 정보가 자동 추출됩니다.</span>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, marginRight: '16px' }}>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".docx,.doc"
                            style={{ display: 'none' }}
                        />
                        <button className="ai-upload-btn" onClick={() => fileInputRef.current?.click()} style={{ padding: '6px 12px', fontSize: '12.5px', height: '32px' }}>
                            <Paperclip size={13} />
                            <span>설문지 첨부</span>
                        </button>

                        {fileAttached ? (
                            <div className="ai-attached-file-chip" style={{ padding: '3px 8px', borderRadius: '4px', gap: '6px', height: '32px' }}>
                                <span className="ai-attached-file-name" style={{ fontSize: '12.5px' }}>{fileName}</span>
                                <button className="ai-file-delete-btn" onClick={() => {
                                    setFileAttached(false);
                                    setFileName("");
                                    setSelectedFile(null);
                                    setPollingInfo(null);
                                    if (pollingIntervalId) clearInterval(pollingIntervalId);
                                    if (fileInputRef.current) fileInputRef.current.value = "";
                                }}>
                                    <X size={10} />
                                </button>
                            </div>
                        ) : (
                            <span className="ai-no-file-text" style={{ fontSize: '12.5px' }}>첨부된 파일이 없습니다. 설문지 파일을 첨부해 주세요.</span>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button className="ai-info-reset-btn" onClick={handleReset} style={{ padding: '6px 12px', fontSize: '12.5px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>초기화</button>
                        <button className="ai-info-start-btn" onClick={handleStartAnalysisFile} disabled={isAnalyzing} style={{ padding: '6px 12px', fontSize: '12.5px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="animate-spin" size={13} />
                                    <span>분석 중... ({analysisProgress}%)</span>
                                </>
                            ) : (
                                <>
                                    <Play size={10} fill="white" />
                                    <span>분석 시작</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* 설문 구조 분석 · 3단 변수 병합 진행 상황 (STEP 1 내부 영역으로 통합) */}
                {isAnalyzing && pollingInfo && (
                    <div style={{
                        marginTop: '16px',
                        border: '1px solid #e2e8f0',
                        background: '#f1f5f9',
                        padding: '16px',
                        borderRadius: '8px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {pollingInfo.status === 'completed' || pollingInfo.progress === 100 ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', borderRadius: '50%', background: '#10b981', color: '#fff' }}>
                                        <Check size={9} strokeWidth={3} />
                                    </div>
                                ) : (
                                    <Loader2 className="animate-spin" size={14} color="#2f5597" />
                                )}
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                                    설문 구조 분석 · 3단 변수 병합 진행 중
                                </span>
                            </div>
                            <div style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>
                                ⏱ {(() => {
                                    const sec = pollingInfo.elapsed_time_seconds || 0;
                                    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
                                    const ss = String(sec % 60).padStart(2, '0');
                                    return `${mm}:${ss}`;
                                })()}
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '0 10px', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '13px', left: '40px', right: '40px', height: '2px', background: '#e2e8f0', zIndex: 1 }}></div>
                            <div style={{
                                position: 'absolute',
                                top: '13px',
                                left: '40px',
                                width: `calc((100% - 80px) * ${pollingInfo.total_steps > 1 ? Math.min(1, Math.max(0, pollingInfo.current_step_index / (pollingInfo.total_steps - 1))) : 0})`,
                                height: '2px',
                                background: '#4f46e5',
                                zIndex: 1,
                                transition: 'width 0.4s ease'
                            }}></div>

                            {(pollingInfo.steps || [
                                { step: 1, label: "1단계: 설문지 분석", status: "pending" },
                                { step: 2, label: "2단계: 조사개요 분석", status: "pending" },
                                { step: 3, label: "3단계: 3단 변수 병합 처리", status: "pending" },
                                { step: 4, label: "4단계: 분석 프레임 구성", status: "pending" }
                            ]).map((stepItem, sIdx) => {
                                const isStepCompleted = stepItem.status === 'completed';
                                const isStepProcessing = stepItem.status === 'processing';
                                const labelText = stepItem.label && stepItem.label.includes(':')
                                    ? stepItem.label.split(':')[1].trim()
                                    : (stepItem.label || '');

                                return (
                                    <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, width: '80px' }}>
                                        <div style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            background: isStepCompleted ? '#10b981' : (isStepProcessing ? '#3b82f6' : '#ffffff'),
                                            border: isStepCompleted ? 'none' : (isStepProcessing ? '2px solid #3b82f6' : '2px solid #cbd5e1'),
                                            color: isStepCompleted ? '#ffffff' : (isStepProcessing ? '#ffffff' : '#64748b'),
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            boxShadow: isStepProcessing ? '0 0 0 2px rgba(59, 130, 246, 0.15)' : 'none',
                                            transition: 'all 0.3s ease'
                                        }}>
                                            {isStepCompleted ? <Check size={10} strokeWidth={3} /> : stepItem.step}
                                        </div>
                                        <span style={{
                                            fontSize: '10px',
                                            fontWeight: isStepProcessing ? 600 : 500,
                                            color: isStepProcessing ? '#1e2b4f' : (isStepCompleted ? '#475569' : '#94a3b8'),
                                            marginTop: '5px',
                                            textAlign: 'center',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {labelText}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '11.5px' }}>
                                <span style={{ fontWeight: 500, color: '#475569' }}>
                                    {pollingInfo.step_info?.description || '설문지 분석 중...'}
                                </span>
                                <span style={{ fontWeight: 600, color: '#2f5597' }}>
                                    {pollingInfo.progress}%
                                </span>
                            </div>
                            <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${pollingInfo.progress}%`,
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
                                    borderRadius: '2px',
                                    transition: 'width 0.4s ease'
                                }}></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* STEP 2: 프로젝트 정보 */}
            <div className="ai-card" style={{ marginTop: '20px' }}>
                <div className="ai-step-badge-tag blue">STEP 2</div>
                <span className="ai-step-badge-title">프로젝트 정보</span>
                <span className="ai-step-badge-desc">병합 결과에서 자동 추출됩니다 · 직접 수정 가능</span>

                <div className="ai-form-grid" style={{ marginTop: '20px' }}>
                    <div className="ai-form-field">
                        <label className="ai-field-label">프로젝트명 <span className="ai-required">*</span></label>
                        <input
                            type="text"
                            className="ai-field-input"
                            value={overviewData.projectname}
                            placeholder="프로젝트명을 입력하거나 설문지 파일을 첨부해 주세요."
                            onChange={(e) => setOverviewData({ ...overviewData, projectname: e.target.value })}
                        />
                    </div>
                    <div className="ai-form-field">
                        <label className="ai-field-label">조사 방법</label>
                        <input
                            type="text"
                            className="ai-field-input"
                            value={overviewData.method}
                            placeholder="조사 방법을 입력해 주세요. (예: 모바일 Web 조사)"
                            onChange={(e) => setOverviewData({ ...overviewData, method: e.target.value })}
                        />
                    </div>
                    <div className="ai-form-field full-width">
                        <label className="ai-field-label">조사 배경 및 목적</label>
                        <textarea
                            className="ai-field-textarea"
                            value={overviewData.objectives}
                            placeholder="조사 배경 및 목적을 입력해 주세요."
                            onChange={(e) => setOverviewData({ ...overviewData, objectives: e.target.value })}
                            style={{ minHeight: '80px' }}
                        />
                    </div>
                    <div className="ai-form-field full-width">
                        <label className="ai-field-label">조사 대상 (모집단)</label>
                        <textarea
                            className="ai-field-textarea"
                            value={overviewData.target}
                            placeholder="조사 대상(모집단) 및 선정 조건 등을 입력해 주세요."
                            onChange={(e) => setOverviewData({ ...overviewData, target: e.target.value })}
                            style={{ minHeight: '80px' }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AiReportOverviewStep;
