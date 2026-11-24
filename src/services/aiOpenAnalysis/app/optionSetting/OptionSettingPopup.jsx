import { useMemo, useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

/**
 * 분석 > 정보 영역 > 프롬프트 지침 이력 팝업 (공통 모달 규격 · 주황 브랜드 테마)
 *
 * @author jewoo
 * @since 2025-08-19<br />
 */
const OptionSettingPopup = (parentProps) => {
    const {
        popupShow,
        previousPromptResValue,
        previousPromptExValue,
        onSelectPrompt,
        qnum = "",
        displayQnum = "",
    } = parentProps;
    const modalOnOff = popupShow ? "on" : "off";

    const handleCancelButton = () => parentProps.setPopupShow(false);

    useEffect(() => {
        if (!popupShow) return undefined;
        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                parentProps.setPopupShow(false);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [popupShow, parentProps]);

    const badgeLabel = String(displayQnum || qnum || "").trim();

    // "시간: 내용" 형태(or JSON 문자열) → [ [time, text], ... ] 내림차순
    const parseToRows = (src) => {
        if (src == null) return [];
        let obj = src;
        if (typeof obj === "string") {
            try {
                obj = JSON.parse(obj);
            } catch {
                return [];
            }
        }
        if (typeof obj !== "object") return [];
        return Object.entries(obj)
            .filter(([k, v]) => k && v != null)
            .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
    };

    const rowsRes = useMemo(
        () => parseToRows(previousPromptResValue),
        [previousPromptResValue]
    );
    const rowsEx = useMemo(
        () => parseToRows(previousPromptExValue),
        [previousPromptExValue]
    );

    // 깔끔한 미니멀 섹션 헤더 (장식 아이콘 없이 6px 포인트 도트 + 볼드 라벨 + 건수 배지)
    const SectionTitle = ({ label, count }) => (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "8px",
            }}
        >
            <div style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
                <span
                    aria-hidden="true"
                    style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: "#f97316",
                        flexShrink: 0,
                    }}
                />
                <span
                    style={{
                        fontSize: "13.5px",
                        fontWeight: 700,
                        color: "#1e293b",
                        lineHeight: 1.2,
                    }}
                >
                    {label}
                </span>
            </div>
            {typeof count === "number" && (
                <span
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        height: "20px",
                        padding: "0 8px",
                        borderRadius: "999px",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        color: "#64748b",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                    }}
                >
                    {count}건
                </span>
            )}
        </div>
    );

    /**
     * 테이블 행 컴포넌트 (2줄 초과 시 펼치기 토글 + 수직 중앙 정렬 + 소프트 선택 버튼)
     */
    const LogRow = ({ time, text, isLast, onPick, popupShow }) => {
        const [opened, setOpened] = useState(false);
        const [showToggle, setShowToggle] = useState(false);
        const [pickHover, setPickHover] = useState(false);
        const textRef = useRef(null);

        useEffect(() => {
            if (!popupShow) return undefined;
            const timer = setTimeout(() => {
                const el = textRef.current;
                if (el) {
                    setShowToggle(el.scrollHeight > el.clientHeight + 1);
                }
            }, 50);
            return () => clearTimeout(timer);
        }, [text, popupShow]);

        const borderBottom = isLast ? "none" : "1px solid #f1f5f9";

        return (
            <tr>
                <th
                    style={{
                        width: "168px",
                        padding: "10px 14px",
                        textAlign: "left",
                        verticalAlign: "middle",
                        borderBottom,
                        borderRight: "1px solid #f1f5f9",
                        backgroundColor: "#f8fafc",
                        color: "#64748b",
                        fontSize: "12.5px",
                        fontWeight: 500,
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap",
                    }}
                >
                    {time}
                </th>
                <td
                    style={{
                        padding: "10px 14px",
                        verticalAlign: "middle",
                        borderBottom,
                        backgroundColor: "#ffffff",
                    }}
                >
                    <div
                        ref={textRef}
                        title={!opened && showToggle ? String(text) : undefined}
                        style={{
                            color: "#1e293b",
                            fontSize: "13px",
                            lineHeight: 1.5,
                            wordBreak: "break-all",
                            ...(opened
                                ? { whiteSpace: "pre-wrap" }
                                : {
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                  }),
                        }}
                    >
                        {String(text)}
                    </div>
                </td>
                <td
                    style={{
                        width: "104px",
                        padding: "8px 12px",
                        verticalAlign: "middle",
                        textAlign: "right",
                        borderBottom,
                        backgroundColor: "#ffffff",
                    }}
                >
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: "6px",
                        }}
                    >
                        {showToggle && (
                            <button
                                type="button"
                                aria-label={opened ? "접기" : "펼치기"}
                                title={opened ? "접기" : "전체 보기"}
                                onClick={() => setOpened((v) => !v)}
                                style={{
                                    width: "26px",
                                    height: "26px",
                                    padding: 0,
                                    borderRadius: "6px",
                                    border: "1px solid #e2e8f0",
                                    backgroundColor: "#f8fafc",
                                    color: "#64748b",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    flexShrink: 0,
                                }}
                            >
                                {opened ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => onPick(time, text)}
                            onMouseEnter={() => setPickHover(true)}
                            onMouseLeave={() => setPickHover(false)}
                            style={{
                                height: "27px",
                                padding: "0 12px",
                                borderRadius: "6px",
                                border: `1px solid ${pickHover ? "#ea580c" : "#fdba74"}`,
                                backgroundColor: pickHover ? "#f97316" : "#fff7ed",
                                color: pickHover ? "#ffffff" : "#ea580c",
                                fontSize: "12px",
                                fontWeight: 700,
                                lineHeight: 1,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                transition: "all 0.14s ease",
                                flexShrink: 0,
                            }}
                        >
                            선택
                        </button>
                    </div>
                </td>
            </tr>
        );
    };

    const LogTable = ({ rows, type, popupShow }) => {
        const onPick = (time, text) => {
            if (typeof onSelectPrompt === "function") {
                onSelectPrompt({ type, time, text: String(text) });
            }
        };

        if (rows.length === 0) {
            return (
                <div
                    style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        backgroundColor: "#f8fafc",
                        padding: "20px 14px",
                        textAlign: "center",
                        color: "#94a3b8",
                        fontSize: "12.5px",
                    }}
                >
                    조회된 데이터가 없습니다.
                </div>
            );
        }

        return (
            <div
                style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    overflow: "hidden",
                    backgroundColor: "#ffffff",
                }}
            >
                <table
                    style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        tableLayout: "fixed",
                    }}
                >
                    <colgroup>
                        <col style={{ width: "168px" }} />
                        <col />
                        <col style={{ width: "104px" }} />
                    </colgroup>
                    <tbody>
                        {rows.map(([time, text], idx) => (
                            <LogRow
                                key={`${type}-${time}-${idx}`}
                                time={time}
                                text={text}
                                isLast={idx === rows.length - 1}
                                onPick={onPick}
                                popupShow={popupShow}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <article className={`modal ${modalOnOff} orange-theme osa-modal`} style={{ zIndex: 9992 }}>
            <div
                className="cmn_popup"
                style={{
                    width: "880px",
                    maxWidth: "94vw",
                    maxHeight: "86vh",
                    position: "relative",
                    top: "auto",
                    left: "auto",
                    transform: "none",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    borderRadius: "16px",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className="popTit"
                    style={{
                        height: "auto",
                        padding: "16px 24px",
                    }}
                >
                    <div style={{ minWidth: 0, paddingRight: "32px" }}>
                        <h3
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                fontSize: "20px",
                                fontWeight: "800",
                                color: "#0f172a",
                                margin: 0,
                                lineHeight: "1.3",
                            }}
                        >
                            <i
                                aria-hidden="true"
                                style={{
                                    display: "inline-block",
                                    width: "4px",
                                    height: "20px",
                                    borderRadius: "2px",
                                    background: "linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)",
                                    boxShadow: "0 2px 4px rgba(255, 107, 53, 0.28)",
                                    flexShrink: 0,
                                }}
                            />
                            프롬프트 지침 이력
                            {badgeLabel && (
                                <span
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        padding: "2px 10px",
                                        borderRadius: "999px",
                                        fontSize: "12px",
                                        fontWeight: "700",
                                        backgroundColor: "#fff7ed",
                                        color: "#ea580c",
                                        border: "1px solid #fdba74",
                                        flexShrink: 0,
                                    }}
                                >
                                    {badgeLabel}
                                </span>
                            )}
                        </h3>
                    </div>

                    <a
                        className="btnClose"
                        onClick={handleCancelButton}
                        title="닫기 (Esc)"
                        style={{ cursor: "pointer" }}
                    >
                        <span className="hidden">close</span>
                    </a>
                </div>

                <div
                    className="popCont"
                    style={{
                        flex: 1,
                        maxHeight: 600,
                        overflowY: "auto",
                        padding: "18px 24px 22px",
                        backgroundColor: "#ffffff",
                        display: "flex",
                        flexDirection: "column",
                        gap: "20px",
                    }}
                >
                    {/* 보기 프롬프트 */}
                    <div>
                        <SectionTitle label="보기 프롬프트" count={rowsEx.length} />
                        <LogTable rows={rowsEx} type="ex" popupShow={popupShow} />
                    </div>

                    {/* 응답 프롬프트 */}
                    <div>
                        <SectionTitle label="응답 프롬프트" count={rowsRes.length} />
                        <LogTable rows={rowsRes} type="res" popupShow={popupShow} />
                    </div>
                </div>
            </div>
        </article>
    );
};

export default OptionSettingPopup;
