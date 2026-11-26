import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import { ChevronDown } from "lucide-react";
import { cleanStr } from "./optionSettingUtils";

export const STAGE_OPTIONS = [
    { value: "3", text: "3단계 (대,중,소)" },
    { value: "2", text: "2단계 (중,소)" },
    { value: "1", text: "1단계 (소분류)" },
];

/**
 * 분석 화면 전용 Kendo DropDownList 공통 래퍼 (주황색 브랜드 테마 적용)
 * @param {"md"|"stage"|"sm"} size
 */
export const OsaDropDown = ({
    options = [],
    value,
    onValueChange,
    disabled = false,
    size = "md",
    popupWidth,
    valueColor,
    placeholder,
    allowSameValueSelect = false,
    className = "",
    style = {},
    title,
}) => {
    const normalizedOptions = useMemo(
        () =>
            (options || []).map((o) => ({
                value: String(o?.value ?? ""),
                text: String(o?.text ?? o?.label ?? o?.value ?? ""),
            })),
        [options]
    );

    const selectedItem = useMemo(() => {
        const strVal = String(value ?? "");
        const found = normalizedOptions.find((o) => o.value === strVal);
        if (found) return found;
        if (placeholder !== undefined && !strVal) {
            return { value: "", text: placeholder };
        }
        if (normalizedOptions.length > 0 && !strVal) return normalizedOptions[0];
        return { value: strVal, text: strVal };
    }, [normalizedOptions, placeholder, value]);

    const sizeClass =
        size === "sm"
            ? "osa-kendo-ddl-sm"
            : size === "stage"
                ? "osa-kendo-ddl-stage"
                : "osa-kendo-ddl-md";

    const popupClass =
        size === "sm"
            ? "osa-kendo-popup osa-kendo-popup-sm"
            : "osa-kendo-popup";

    const resolvedPopupWidth =
        popupWidth || (size === "sm" ? "118px" : size === "stage" ? "148px" : undefined);

    const customValueRender = valueColor
        ? (element, val) => {
            if (!val) return element;
            return React.cloneElement(
                element,
                element.props,
                <span
                    className="k-input-value-text"
                    style={{ color: valueColor, fontWeight: 400 }}
                >
                    {val.text}
                </span>
            );
        }
        : undefined;

    const customItemRender = allowSameValueSelect
        ? (li, itemProps) => {
              const prevClick = li.props?.onClick;
              return React.cloneElement(li, {
                  ...li.props,
                  onClick: (ev) => {
                      prevClick?.(ev);
                      const clickedVal = String(itemProps?.dataItem?.value ?? "");
                      if (clickedVal === String(selectedItem?.value ?? "")) {
                          onValueChange?.(clickedVal);
                      }
                  },
              });
          }
        : undefined;

    return (
        <DropDownList
            data={normalizedOptions}
            textField="text"
            dataItemKey="value"
            value={selectedItem}
            disabled={disabled}
            title={title || selectedItem?.text}
            className={`osa-kendo-ddl ${sizeClass} ${className}`.trim()}
            style={style}
            valueRender={customValueRender}
            itemRender={customItemRender}
            popupSettings={{
                className: popupClass,
                ...(resolvedPopupWidth ? { width: resolvedPopupWidth } : {}),
            }}
            onChange={(e) => {
                const next = e?.value?.value ?? "";
                onValueChange?.(String(next));
            }}
        />
    );
};

/**
 * 상단 공통 헤더 문항 전환 전용 Kendo DropDownList
 */
export const OsaQuestionNavSelect = ({
    questionList = [],
    currentQIndex = -1,
    currentDisplayNum = "",
    currentQTitle = "",
    currentQnum = "",
    onSelectQuestion,
}) => {
    const items = useMemo(
        () =>
            (questionList || []).map((q, idx) => ({
                value: q._navKey,
                displayNum: q._displayNum || q._navKey,
                title: q._title || q._navKey,
                text: `[${q._displayNum || q._navKey}] ${q._title || q._navKey}`,
                index: idx + 1,
            })),
        [questionList]
    );

    const selectedItem = useMemo(() => {
        if (currentQIndex >= 0 && items[currentQIndex]) {
            return items[currentQIndex];
        }
        return {
            value: currentQnum,
            displayNum: currentDisplayNum || currentQnum,
            title: currentQTitle || currentQnum,
            text: `${currentDisplayNum || currentQnum} ${currentQTitle || ""}`.trim(),
        };
    }, [items, currentQIndex, currentQnum, currentDisplayNum, currentQTitle]);

    const renderValue = (element, val) => {
        if (!val) return element;
        const content = (
            <div className="osa-qddl-val-inner" title={`${val.displayNum} ${val.title}`}>
                <span className="osa-qddl-badge">{val.displayNum}</span>
                <span className="osa-qddl-title">{val.title}</span>
            </div>
        );
        return React.cloneElement(
            element,
            {
                ...element.props,
                style: {
                    ...element.props?.style,
                    display: "flex",
                    alignItems: "center",
                    flex: 1,
                    minWidth: 0,
                },
            },
            content
        );
    };

    const renderItem = (li, itemProps) => {
        const d = itemProps.dataItem;
        const content = (
            <div className="osa-qddl-item-inner" title={`${d.displayNum} ${d.title}`}>
                <span className="osa-qddl-item-badge">{d.displayNum}</span>
                <span className="osa-qddl-item-title">{d.title}</span>
            </div>
        );
        return React.cloneElement(li, li.props, content);
    };

    if (items.length === 0) {
        return (
            <div className="osa-qddl-static">
                <span className="osa-qddl-badge">{currentDisplayNum || currentQnum}</span>
                <span className="osa-qddl-title">{currentQTitle || currentQnum}</span>
            </div>
        );
    }

    return (
        <DropDownList
            data={items}
            textField="text"
            dataItemKey="value"
            value={selectedItem}
            valueRender={renderValue}
            itemRender={renderItem}
            className="osa-kendo-ddl osa-kendo-ddl-qnav"
            popupSettings={{
                className: "osa-kendo-popup osa-kendo-popup-qnav",
                width: "400px",
            }}
            onChange={(e) => {
                const nextKey = e?.value?.value;
                if (nextKey) onSelectQuestion?.(nextKey);
            }}
        />
    );
};

/**
 * 대분류명·중분류명 인라인 자동완성 콤보 입력창 (상시 화살표 노출 · 클릭 시 전체 목록 오픈 · 직접 입력 병행)
 */
export const OsaCategoryComboInput = ({
    value = "",
    options = [],
    placeholder = "",
    disabled = false,
    rowKey,
    field,
    cellAttrName = "data-tab2-cell",
    forceCommitOnSame = false,
    onCommit,
    onNavigateRow,
}) => {
    const [draft, setDraft] = useState(value || "");
    const [isOpen, setIsOpen] = useState(false);
    const [focused, setFocused] = useState(false);
    const [hasTyped, setHasTyped] = useState(false);
    const [highlightIdx, setHighlightIdx] = useState(-1);
    const [popupRect, setPopupRect] = useState(null);

    const wrapRef = useRef(null);
    const inputRef = useRef(null);
    const popupRef = useRef(null);
    const skipBlurCommitRef = useRef(false);

    useEffect(() => {
        setDraft(value || "");
    }, [value]);

    const filteredOptions = useMemo(() => {
        if (!hasTyped) return options;
        const kw = draft.trim().toLowerCase();
        if (!kw) return options;
        return options.filter(
            (o) =>
                o.name.toLowerCase().includes(kw) ||
                (o.code && o.code.toLowerCase().includes(kw))
        );
    }, [options, draft, hasTyped]);

    const updatePopupPosition = useCallback(() => {
        const el = wrapRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const popupWidth = Math.max(rect.width, 188);
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUpward = spaceBelow < 220 && rect.top > 240;
        const clampedLeft = Math.max(
            8,
            Math.min(rect.left, window.innerWidth - popupWidth - 12)
        );
        setPopupRect({
            left: clampedLeft,
            width: popupWidth,
            top: openUpward ? undefined : rect.bottom + 3,
            bottom: openUpward ? window.innerHeight - rect.top + 3 : undefined,
        });
    }, []);

    useEffect(() => {
        if (!isOpen) return undefined;
        updatePopupPosition();

        const handleOutside = (e) => {
            if (
                wrapRef.current?.contains(e.target) ||
                popupRef.current?.contains(e.target)
            ) {
                return;
            }
            setIsOpen(false);
            setHighlightIdx(-1);
        };
        const handleScrollOrResize = (e) => {
            if (popupRef.current?.contains(e?.target)) return;
            updatePopupPosition();
        };

        document.addEventListener("mousedown", handleOutside);
        window.addEventListener("scroll", handleScrollOrResize, true);
        window.addEventListener("resize", handleScrollOrResize);
        return () => {
            document.removeEventListener("mousedown", handleOutside);
            window.removeEventListener("scroll", handleScrollOrResize, true);
            window.removeEventListener("resize", handleScrollOrResize);
        };
    }, [isOpen, updatePopupPosition]);

    const commitSelection = (nextText) => {
        const cleaned = cleanStr(nextText);
        setDraft(cleaned);
        setIsOpen(false);
        setHasTyped(false);
        setHighlightIdx(-1);
        if (forceCommitOnSame || cleaned !== cleanStr(value)) {
            onCommit?.(cleaned);
        }
    };

    const cellProps = rowKey && field ? { [cellAttrName]: `${rowKey}:${field}` } : {};

    return (
        <>
            <div
                ref={wrapRef}
                className={`osa-ac-wrap ${focused || isOpen ? "focused" : ""} ${
                    disabled ? "disabled" : ""
                }`}
                onDoubleClick={(e) => e.stopPropagation()}
            >
                <input
                    ref={inputRef}
                    {...cellProps}
                    type="text"
                    className="osa-ac-input"
                    placeholder={disabled ? "-" : placeholder}
                    disabled={disabled}
                    value={draft}
                    title={draft || placeholder}
                    onFocus={() => {
                        if (disabled) return;
                        setFocused(true);
                        setHasTyped(false);
                        setHighlightIdx(-1);
                        setIsOpen(true);
                    }}
                    onClick={() => {
                        if (disabled) return;
                        if (!isOpen) {
                            setHasTyped(false);
                            setIsOpen(true);
                        }
                    }}
                    onChange={(e) => {
                        setDraft(e.target.value);
                        setHasTyped(true);
                        setHighlightIdx(-1);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onBlur={() => {
                        setFocused(false);
                        setIsOpen(false);
                        setHighlightIdx(-1);
                        if (skipBlurCommitRef.current) {
                            skipBlurCommitRef.current = false;
                            return;
                        }
                        const cleaned = cleanStr(draft);
                        if (cleaned !== cleanStr(value)) {
                            onCommit?.(cleaned);
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") {
                            e.preventDefault();
                            skipBlurCommitRef.current = true;
                            setDraft(value || "");
                            setIsOpen(false);
                            setHighlightIdx(-1);
                            inputRef.current?.blur();
                            return;
                        }
                        if (e.key === "ArrowDown") {
                            if (isOpen && filteredOptions.length > 0 && !e.ctrlKey && !e.altKey) {
                                e.preventDefault();
                                setHighlightIdx((prev) =>
                                    prev + 1 < filteredOptions.length ? prev + 1 : 0
                                );
                                return;
                            }
                            if (onNavigateRow) {
                                e.preventDefault();
                                skipBlurCommitRef.current = true;
                                commitSelection(draft);
                                onNavigateRow(rowKey, field, 1);
                            }
                            return;
                        }
                        if (e.key === "ArrowUp") {
                            if (isOpen && highlightIdx >= 0 && filteredOptions.length > 0) {
                                e.preventDefault();
                                setHighlightIdx((prev) => (prev > 0 ? prev - 1 : -1));
                                return;
                            }
                            if (onNavigateRow) {
                                e.preventDefault();
                                skipBlurCommitRef.current = true;
                                commitSelection(draft);
                                onNavigateRow(rowKey, field, -1);
                            }
                            return;
                        }
                        if (e.key === "Enter") {
                            e.preventDefault();
                            skipBlurCommitRef.current = true;
                            if (isOpen && highlightIdx >= 0 && filteredOptions[highlightIdx]) {
                                commitSelection(filteredOptions[highlightIdx].name);
                            } else {
                                commitSelection(draft);
                            }
                            if (onNavigateRow) {
                                onNavigateRow(rowKey, field, e.shiftKey ? -1 : 1);
                            } else {
                                inputRef.current?.blur();
                            }
                        }
                    }}
                />
                {!disabled && (
                    <button
                        type="button"
                        tabIndex={-1}
                        className="osa-ac-btn"
                        title="분류 목록 열기"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (disabled) return;
                            inputRef.current?.focus();
                            setHasTyped(false);
                            setIsOpen((prev) => !prev);
                        }}
                    >
                        <ChevronDown size={12} />
                    </button>
                )}
            </div>

            {isOpen &&
                !disabled &&
                popupRect &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        ref={popupRef}
                        className="osa-ac-popup"
                        style={{
                            left: `${popupRect.left}px`,
                            width: `${popupRect.width}px`,
                            ...(popupRect.top !== undefined ? { top: `${popupRect.top}px` } : {}),
                            ...(popupRect.bottom !== undefined
                                ? { bottom: `${popupRect.bottom}px` }
                                : {}),
                        }}
                    >
                        {filteredOptions.length === 0 ? (
                            <div className="osa-ac-empty">
                                {options.length === 0
                                    ? "등록된 분류 없음 (직접 입력 후 Enter)"
                                    : "일치하는 분류 없음 (Enter로 신규 등록)"}
                            </div>
                        ) : (
                            filteredOptions.map((opt, i) => (
                                <div
                                    key={`${opt.code}_${opt.name}`}
                                    className={`osa-ac-item ${
                                        i === highlightIdx ? "active" : ""
                                    }`}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        skipBlurCommitRef.current = true;
                                        commitSelection(opt.name);
                                    }}
                                >
                                    {opt.code && (
                                        <span className="osa-ac-item-code">{opt.code}</span>
                                    )}
                                    <span className="osa-ac-item-name" title={opt.name}>
                                        {opt.name}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>,
                    document.body
                )}
        </>
    );
};

/**
 * 인라인 코드/텍스트 셀 입력기 — 외부 자동채움(예: 중분류명 입력 시 중코드 자동 부여) 시에도
 * DOM 언마운트(포커스 유실) 없이 값만 즉시 동기화
 */
export const OsaInlineInput = React.memo(
    ({
        value = "",
        placeholder = "",
        disabled = false,
        className = "osa-rp-inline-input",
        style,
        title,
        onCommit,
        onKeyDown,
        ...restProps
    }) => {
        const [draft, setDraft] = useState(value ?? "");
        const inputRef = useRef(null);
        const dirtyByUserRef = useRef(false);

        useEffect(() => {
            const next = value ?? "";
            setDraft(next);
            // 방금 옆 셀(예: 중분류명) 커밋과 동시에 이 코드 칸을 클릭해 포커스된 상태라면 자동 부여된 코드를 선택 상태로 표시
            if (
                typeof document !== "undefined" &&
                document.activeElement === inputRef.current &&
                !dirtyByUserRef.current &&
                next !== ""
            ) {
                requestAnimationFrame(() => {
                    if (document.activeElement === inputRef.current && !dirtyByUserRef.current) {
                        inputRef.current?.select?.();
                    }
                });
            }
        }, [value]);

        return (
            <input
                ref={inputRef}
                type="text"
                className={className}
                style={style}
                placeholder={placeholder}
                disabled={disabled}
                title={title}
                value={draft}
                onFocus={() => {
                    dirtyByUserRef.current = false;
                }}
                onChange={(e) => {
                    dirtyByUserRef.current = true;
                    setDraft(e.target.value);
                }}
                onBlur={(e) => {
                    dirtyByUserRef.current = false;
                    onCommit?.(e.target.value, e);
                }}
                onKeyDown={(e) => {
                    if (onKeyDown) {
                        onKeyDown(e);
                        return;
                    }
                    if (e.key === "Enter") {
                        e.target.blur();
                    } else if (e.key === "Escape") {
                        e.preventDefault();
                        dirtyByUserRef.current = false;
                        setDraft(value ?? "");
                        e.target.blur();
                    }
                }}
                {...restProps}
            />
        );
    }
);


