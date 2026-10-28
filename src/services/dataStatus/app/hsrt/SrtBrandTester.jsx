import { useEffect, useState } from "react";
import "./srtTheme.css";
import "./SrtBrandTester.css";

/**
 * [개발 전용] SRT 브랜드 색 테스트 패널
 * - 개발 서버(npm run dev)에서만 보임. 운영 빌드에서는 렌더링하지 않음.
 * - srtTheme.css 의 --srt-brand / --srt-brand-secondary / --srt-brand-accent 를 html 에 주입하고
 *   data-srt-brand 속성을 붙여 브랜드 색을 미리 확인한다.
 * - 선택값은 localStorage 에 저장되어 새로고침해도 유지됨.
 * ※ 추후 실제 기능은 프로젝트별 DB 값(브랜드 테마)으로 대체 예정.
 */

const STORAGE_KEY = "srtBrandTest";

const PRESETS = [
    { key: "default", label: "기본 (설문온)", primary: null },
    { key: "mcdonalds", label: "맥도날드", primary: "#DA291C", secondary: "#F2A900", accent: "#27251F" },
    { key: "starbucks", label: "스타벅스", primary: "#00704A", secondary: "#1E3932", accent: "#CBA258" },
    { key: "samsung", label: "삼성", primary: "#1428A0", secondary: "#0689D8", accent: "#000000" },
    { key: "custom", label: "직접 지정", primary: "#7C3AED", secondary: "#0EA5E9", accent: "#F43F5E" },
];

const VARS = ["--srt-brand", "--srt-brand-secondary", "--srt-brand-accent"];

const applyBrand = (brand) => {
    const root = document.documentElement;
    if (!brand?.primary) {
        VARS.forEach((v) => root.style.removeProperty(v));
        root.removeAttribute("data-srt-brand");
        return;
    }
    root.style.setProperty("--srt-brand", brand.primary);
    root.style.setProperty("--srt-brand-secondary", brand.secondary || brand.primary);
    root.style.setProperty("--srt-brand-accent", brand.accent || brand.primary);
    root.setAttribute("data-srt-brand", "");
};

const loadSaved = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { key: "default" };
    } catch {
        return { key: "default" };
    }
};

const SrtBrandTester = () => {
    const [open, setOpen] = useState(false);
    const [state, setState] = useState(loadSaved);

    const preset = PRESETS.find((p) => p.key === state.key) || PRESETS[0];
    const brand = state.key === "custom" ? { ...preset, ...state.custom } : preset;

    useEffect(() => {
        applyBrand(brand);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

    // SRT 화면을 벗어나면 원래대로
    useEffect(() => () => applyBrand(null), []);

    const setCustom = (field, value) =>
        setState((prev) => ({
            key: "custom",
            custom: { ...(prev.custom || PRESETS.find((p) => p.key === "custom")), [field]: value },
        }));

    return (
        <div className={`srt-brand-tester ${open ? "open" : ""}`}>
            {open && (
                <div className="srt-brand-tester-panel">
                    <div className="srt-brand-tester-title">
                        브랜드 색 테스트 <span>(개발 전용)</span>
                    </div>
                    <div className="srt-brand-tester-presets">
                        {PRESETS.map((p) => (
                            <button
                                key={p.key}
                                className={`srt-brand-tester-preset ${state.key === p.key ? "active" : ""}`}
                                onClick={() => setState((prev) => ({ ...prev, key: p.key }))}
                            >
                                <span className="srt-brand-tester-swatches">
                                    {p.primary ? (
                                        [p.primary, p.secondary, p.accent].map((c, i) => (
                                            <i key={i} style={{ background: c }} />
                                        ))
                                    ) : (
                                        <i style={{ background: "#2563eb" }} />
                                    )}
                                </span>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    {state.key === "custom" && (
                        <div className="srt-brand-tester-custom">
                            {[
                                ["primary", "메인"],
                                ["secondary", "보조"],
                                ["accent", "강조"],
                            ].map(([field, label]) => (
                                <label key={field}>
                                    <input
                                        type="color"
                                        value={brand[field]}
                                        onChange={(e) => setCustom(field, e.target.value)}
                                    />
                                    {label} <code>{brand[field]}</code>
                                </label>
                            ))}
                        </div>
                    )}
                    <p className="srt-brand-tester-note">
                        ※ 현재 브랜드 변수가 적용된 화면: DP의뢰서. 나머지 화면·좌측 메뉴는 아직 기존 색.
                    </p>
                </div>
            )}
            <button className="srt-brand-tester-toggle" onClick={() => setOpen((v) => !v)} title="브랜드 색 테스트">
                <i style={{ background: brand.primary || "#2563eb" }} />
                {open ? "닫기" : `브랜드: ${preset.label}`}
            </button>
        </div>
    );
};

/** 개발 서버에서만 렌더링 */
const SrtBrandTesterGate = () => (import.meta.env.DEV ? <SrtBrandTester /> : null);

export default SrtBrandTesterGate;
