import React, { useState, useEffect, useContext } from 'react';
import { X, RefreshCw, AlertTriangle, CheckCircle2, FileCheck, Loader2, ArrowRight, Info } from 'lucide-react';
import { useSelector } from 'react-redux';
import { modalContext } from "@/components/common/Modal.jsx";
import { MapManagementPageApi } from './MapManagementPageApi';
import './MapManagementPage.css';

const OpenTypeCheckModal = ({ isOpen, onClose, refreshData }) => {
    const auth = useSelector((store) => store.auth);
    const modal = useContext(modalContext);
    const { checkOpenType, fixOpenType } = MapManagementPageApi();

    const [isChecking, setIsChecking] = useState(false);
    const [isFixing, setIsFixing] = useState(false);
    const [checkData, setCheckData] = useState(null); // { message, resultjson }

    const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum') || '';
    const user = auth?.user?.userId || sessionStorage.getItem('userId') || '';

    const handleCheck = async () => {
        if (!pn) return;
        setIsChecking(true);
        try {
            const rawRes = await checkOpenType.mutateAsync({ pn, user });
            const resultjson = rawRes?.resultjson || rawRes?.data;
            if (String(rawRes?.success) === '777' || resultjson) {
                setCheckData({
                    message: rawRes?.message || '',
                    result: resultjson || rawRes
                });
            } else {
                const errMsg = rawRes?.message || resultjson?.message || '검사 중 오류가 발생했습니다.';
                modal.showErrorAlert('오류', errMsg);
                setCheckData(null);
            }
        } catch (err) {
            console.error("open-type check API failed:", err);
            const errMsg = err?.response?.data?.message || err?.message || '오픈 유형 검사 처리 중 오류가 발생했습니다.';
            modal.showErrorAlert('오류', errMsg);
            setCheckData(null);
        } finally {
            setIsChecking(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            handleCheck();
        } else {
            setCheckData(null);
            setIsChecking(false);
            setIsFixing(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const res = checkData?.result || {};
    const rows = res?.rows || [];
    const toNumber = res?.toNumber ?? 0;
    const toText = res?.toText ?? 0;
    const skipped = res?.skipped;
    const serverMessage = checkData?.message || '';

    const handleFixConfirm = () => {
        if (!rows || rows.length === 0) {
            modal.showAlert('알림', '교정할 대상이 없습니다.');
            return;
        }

        const confirmMsg = `큐마스터 스크립트 기준으로 오픈 유형을 교정하시겠습니까?\n\n• 문자 → 숫자: ${toNumber}건\n• 숫자 → 문자: ${toText}건\n\n(교정 실행 시 교정 전 복원 지점이 자동 생성됩니다.)`;

        modal.showConfirm('교정 확인', confirmMsg, {}, {
            btns: [
                {
                    title: "취소",
                    click: () => { }
                },
                {
                    title: "확인",
                    click: () => executeFix()
                }
            ]
        });
    };


    const executeFix = async () => {
        setIsFixing(true);
        try {
            const rawRes = await fixOpenType.mutateAsync({ pn, user });
            const resultjson = rawRes?.resultjson || rawRes?.data;

            if (String(rawRes?.success) === '777' || resultjson) {
                const fixedCount = resultjson?.fixed ?? 0;
                const versionId = resultjson?.versionId ?? resultjson?.version_id ?? 0;
                const msg = rawRes?.message || '';

                // 맵 목록 새로고침
                if (refreshData) {
                    refreshData();
                }

                if (fixedCount === 0 || versionId === 0) {
                    // 고칠 게 없거나 versionId = 0 이면 복원 지점 안내를 하지 않음
                    modal.showAlert('알림', msg || '어긋난 것이 없어 아무것도 고치지 않았습니다.');
                } else {
                    // versionId > 0 및 fixed > 0 인 경우에만 복원 지점 포함 안내
                    const displayMsg = msg || `오픈 ${fixedCount}개를 큐마스터 스크립트 기준으로 고쳤습니다.\n(복원 지점: 버전 #${versionId})`;
                    modal.showAlert('교정 완료', displayMsg);
                }

                // 검사 결과 갱신
                handleCheck();
            } else {
                const errMsg = rawRes?.message || resultjson?.message || '교정 처리 중 오류가 발생했습니다.';
                modal.showErrorAlert('오류', errMsg);
            }
        } catch (err) {
            console.error("open-type fix API failed:", err);
            const errMsg = err?.response?.data?.message || err?.message || '교정 처리 중 오류가 발생했습니다.';
            modal.showErrorAlert('오류', errMsg);
        } finally {
            setIsFixing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="variable-modal-overlay" style={{ zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="variable-modal-content" style={{ width: '860px', maxWidth: '95vw', padding: 0, borderRadius: '12px', overflow: 'hidden', background: '#fff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>

                {/* 헤더 */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '4px', height: '18px', backgroundColor: '#16a34a', borderRadius: '4px', marginRight: '2px' }}></div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>
                            오픈 문항 유형 검사 및 교정
                        </h3>
                        <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '12px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', marginLeft: '4px' }}>
                            {pn}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={handleCheck}
                            disabled={isChecking}
                            style={{ border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '12.5px', fontWeight: '500' }}
                        >
                            <RefreshCw size={14} className={isChecking ? "spin-animation" : ""} />
                            다시 검사
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* skipped 경고 알림 */}
                {skipped && (
                    <div style={{ padding: '10px 24px', background: '#fff7ed', borderBottom: '1px solid #ffedd5', color: '#c2410c', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                        <span><strong>검사 제외 사유:</strong> {skipped}</span>
                    </div>
                )}

                {/* 서버 응답 메시지 표시 (message) */}
                {serverMessage && !skipped && (
                    <div style={{ padding: '10px 24px', background: '#f0fdf4', borderBottom: '1px solid #dcfce7', color: '#166534', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                        <span><strong>검사 결과:</strong> {serverMessage}</span>
                    </div>
                )}



                {/* 메인 리스트 / 테이블 */}
                <div style={{ flex: 1, minHeight: 0, padding: '16px 24px', overflowY: 'auto', background: '#ffffff', display: 'flex', flexDirection: 'column' }}>
                    {!isChecking && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div style={{ fontSize: '13.5px', fontWeight: 'bold', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>교정 대상 문항</span>
                                <span style={{ background: rows.length > 0 ? '#ef4444' : '#16a34a', color: '#fff', padding: '1px 8px', borderRadius: '10px', fontSize: '11.5px', fontWeight: 'bold' }}>
                                    {rows.length}건
                                </span>
                            </div>

                            <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span>문자→숫자 <strong style={{ color: '#2563eb' }}>{toNumber}건</strong></span>
                                <span style={{ color: '#cbd5e1' }}>•</span>
                                <span>숫자→문자 <strong style={{ color: '#d97706' }}>{toText}건</strong></span>
                                {res.scriptOpens !== undefined && (
                                    <>
                                        <span style={{ color: '#cbd5e1' }}>•</span>
                                        <span>스크립트 {res.scriptOpens}개 중 {res.agreed}개 일치</span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {isChecking ? (
                        <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
                            <Loader2 size={28} className="spin-animation" style={{ margin: '0 auto 12px auto', color: '#16a34a' }} />
                            <div>큐마스터 스크립트와 맵 데이터를 비교 검사 중입니다...</div>
                        </div>
                    ) : rows.length === 0 ? (
                        <div style={{ padding: '50px 0', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                            <CheckCircle2 size={36} style={{ color: '#16a34a', margin: '0 auto 10px auto' }} />
                            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b' }}>교정할 오픈 문항이 없습니다.</div>
                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>모든 오픈 문항의 데이터 유형(문자/숫자)이 스크립트와 일치합니다.</div>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#334155', textAlign: 'left' }}>
                                    <th style={{ padding: '10px 12px', width: '150px' }}>변수명</th>
                                    <th style={{ padding: '10px 12px' }}>레이블</th>
                                    <th style={{ padding: '10px 12px', width: '220px', textAlign: 'center' }}>지금 값 → 바뀔 값</th>
                                    <th style={{ padding: '10px 12px', width: '120px', textAlign: 'center' }}>스크립트 자릿수</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, idx) => (
                                    <tr 
                                        key={row.variable || idx} 
                                        style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}
                                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                    >
                                        <td style={{ padding: '12px 14px', fontWeight: '600', color: '#0f172a', fontFamily: 'monospace', fontSize: '13.5px' }}>
                                            {row.variable}
                                        </td>
                                        <td style={{ padding: '12px 14px', color: '#334155' }}>
                                            {row.label || '—'}
                                        </td>
                                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ background: '#f1f5f9', color: '#64748b', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', border: '1px solid #e2e8f0' }}>
                                                    {row.was || '—'}
                                                </span>
                                                <ArrowRight size={14} style={{ color: '#94a3b8' }} />
                                                <span style={{ background: row.now?.includes('숫자') ? '#dcfce7' : '#fef3c7', color: row.now?.includes('숫자') ? '#15803d' : '#b45309', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', border: row.now?.includes('숫자') ? '1px solid #bbf7d0' : '1px solid #fde68a' }}>
                                                    {row.now || '—'}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b', fontWeight: '500' }}>
                                            {row.scriptLen !== undefined ? `${row.scriptLen}자리` : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* 푸터 영역 */}
                <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Info size={14} style={{ color: '#94a3b8' }} />
                        <span>교정 전 복원 지점(버전)이 자동으로 생성되어 안전하게 관리됩니다.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ height: '36px', padding: '0 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', color: '#475569', cursor: 'pointer', fontSize: '13px', fontWeight: '500', transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                        >
                            닫기
                        </button>
                        <button
                            type="button"
                            onClick={handleFixConfirm}
                            disabled={isChecking || isFixing || rows.length === 0}
                            style={{ height: '36px', padding: '0 20px', border: 'none', background: (rows.length === 0 || isChecking || isFixing) ? '#94a3b8' : '#16a34a', borderRadius: '6px', color: '#fff', cursor: (rows.length === 0 || isChecking || isFixing) ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: (rows.length > 0 && !isChecking && !isFixing) ? '0 2px 4px rgba(22, 163, 74, 0.2)' : 'none', transition: 'all 0.15s' }}
                            onMouseEnter={e => { if (rows.length > 0 && !isChecking && !isFixing) e.currentTarget.style.background = '#15803d'; }}
                            onMouseLeave={e => { if (rows.length > 0 && !isChecking && !isFixing) e.currentTarget.style.background = '#16a34a'; }}
                        >
                            {isFixing ? (
                                <>
                                    <Loader2 size={16} className="spin-animation" />
                                    교정 처리 중...
                                </>
                            ) : (
                                '교정 실행'
                            )}
                        </button>
                    </div>
                </div>


            </div>
        </div>
    );
};

export default OpenTypeCheckModal;
