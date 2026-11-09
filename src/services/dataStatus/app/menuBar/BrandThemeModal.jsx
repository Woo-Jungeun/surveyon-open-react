import React, { useState, useEffect, useRef, useCallback, useContext } from "react";
import { createPortal } from "react-dom";
import {
  Palette, Upload, RotateCcw, Check, X, Sparkles,
  Table, BarChart3, PlusCircle, FileCog, Bell, Filter
} from "lucide-react";
import { modalContext } from "@/components/common/Modal.jsx";
import "./BrandThemeModal.css";

const STORAGE_PREFIX = "srtBrandTheme_";

const BRAND_PRESETS = [
  { name: "설문온 기본", primary: "#2563EB", secondary: "#3B82F6", surface: "#EFF6FF", isDefault: true },
  { name: "컬리 퍼플", primary: "#5F0080", secondary: "#9333EA", surface: "#F5F3FF" },
  { name: "맥도날드", primary: "#DA291C", secondary: "#D97706", surface: "#FEF3C7" },
  { name: "스타벅스", primary: "#00704A", secondary: "#1E3932", surface: "#ECFDF5" },
  { name: "현대 네이비", primary: "#002C5F", secondary: "#00AAD2", surface: "#F0F9FF" },
  { name: "LG 마젠타", primary: "#A50034", secondary: "#E11D48", surface: "#FFF1F2" },
];

const FONT_OPTIONS = [
  { label: "Spoqa Han Sans Neo (설문온 기본)", value: "'Spoqa Han Sans Neo', 'Noto Sans KR', sans-serif" },
  { label: "Noto Sans KR (본고딕)", value: "'Noto Sans KR', 'Spoqa Han Sans Neo', sans-serif" },
  { label: "맑은 고딕 (문서 표준)", value: "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif" },
  { label: "나눔명조 (리포트 세리프)", value: "'Nanum Myeongjo', 'Batang', serif" },
];

function hexToHsl(hex) {
  const clean = (hex || "#2563EB").replace("#", "");
  const r = parseInt(clean.substring(0, 2) || "25", 16) / 255;
  const g = parseInt(clean.substring(2, 4) || "63", 16) / 255;
  const b = parseInt(clean.substring(4, 6) || "EB", 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default:
        break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function colorDistance(rgb1, rgb2) {
  return Math.sqrt(
    Math.pow(rgb1[0] - rgb2[0], 2) +
    Math.pow(rgb1[1] - rgb2[1], 2) +
    Math.pow(rgb1[2] - rgb2[2], 2)
  );
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
      .toUpperCase()
  );
}

function extractColorsFromImageElement(imgElement, maxColors = 6) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const sampleSize = 120;
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  ctx.drawImage(imgElement, 0, 0, sampleSize, sampleSize);

  const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
  const buckets = new Map();

  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const a = imageData[i + 3];

    if (a < 128) continue;

    const hex = rgbToHex(r, g, b);
    const { s, l } = hexToHsl(hex);

    if (l > 96 || l < 5) continue;

    const qr = Math.round(r / 16) * 16;
    const qg = Math.round(g / 16) * 16;
    const qb = Math.round(b / 16) * 16;
    const key = `${qr},${qg},${qb}`;

    const prev = buckets.get(key) || { count: 0, rSum: 0, gSum: 0, bSum: 0 };
    prev.count += 1;
    prev.rSum += r;
    prev.gSum += g;
    prev.bSum += b;
    buckets.set(key, prev);
  }

  const candidates = Array.from(buckets.values()).map((item) => {
    const avgR = item.rSum / item.count;
    const avgG = item.gSum / item.count;
    const avgB = item.bSum / item.count;
    const hex = rgbToHex(avgR, avgG, avgB);
    const { s, l } = hexToHsl(hex);
    const brandScore = item.count * (1 + (s / 100) * 1.6) * (l >= 18 && l <= 75 ? 1.3 : 0.7);
    return {
      rgb: [avgR, avgG, avgB],
      hex,
      count: item.count,
      s,
      l,
      brandScore,
    };
  });

  candidates.sort((a, b) => b.brandScore - a.brandScore);

  const picked = [];
  for (const cand of candidates) {
    if (picked.length >= maxColors) break;
    const isTooSimilar = picked.some((p) => colorDistance(p.rgb, cand.rgb) < 42);
    if (!isTooSimilar) {
      picked.push(cand);
    }
  }

  const primaryObj = picked.find((c) => c.s >= 20 && c.l >= 18 && c.l <= 75) || picked[0];
  const secondaryObj =
    picked.find((c) => c.hex !== primaryObj?.hex && c.l <= 75 && c.s >= 12) ||
    picked[1] ||
    primaryObj;
  const surfaceObj =
    picked.find((c) => c.hex !== primaryObj?.hex && c.hex !== secondaryObj?.hex && c.l >= 60) ||
    picked.find((c) => c.hex !== primaryObj?.hex && c.hex !== secondaryObj?.hex) ||
    primaryObj;

  return {
    palette: picked.map((p) => p.hex),
    roles: {
      primary: primaryObj?.hex || "#2563EB",
      secondary: secondaryObj?.hex || primaryObj?.hex || "#0284C7",
      surface: surfaceObj?.hex || primaryObj?.hex || "#EFF6FF",
    },
  };
}

export function applyProjectBrandTheme(themeConfig) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (!themeConfig || !themeConfig.primary || themeConfig.isDefault) {
    root.removeAttribute("data-srt-brand");
    root.style.removeProperty("--srt-brand");
    root.style.removeProperty("--srt-brand-secondary");
    root.style.removeProperty("--srt-brand-accent");
    root.style.removeProperty("--srt-brand-surface");
    root.style.removeProperty("--srt-font-family");
    document.body.style.removeProperty("font-family");
    return;
  }

  root.setAttribute("data-srt-brand", "true");
  root.style.setProperty("--srt-brand", themeConfig.primary);
  root.style.setProperty("--srt-brand-secondary", themeConfig.secondary || themeConfig.primary);
  root.style.setProperty("--srt-brand-accent", themeConfig.secondary || themeConfig.primary);
  root.style.setProperty("--srt-brand-surface", themeConfig.surface || themeConfig.primary);
  root.style.removeProperty("--srt-font-family");
  document.body.style.removeProperty("font-family");
}

export function loadAndApplySavedBrandTheme(projectnum) {
  if (!projectnum) {
    applyProjectBrandTheme(null);
    return null;
  }
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${projectnum}`);
    if (!raw) {
      applyProjectBrandTheme(null);
      return null;
    }
    const parsed = JSON.parse(raw);
    applyProjectBrandTheme(parsed);
    return parsed;
  } catch (e) {
    console.warn("Failed to load brand theme", e);
    return null;
  }
}

const BrandThemeModal = ({ isOpen, onClose, projectnum, projectname }) => {
  const modal = useContext(modalContext);
  const fileInputRef = useRef(null);

  const [primaryColor, setPrimaryColor] = useState("#2563EB");
  const [secondaryColor, setSecondaryColor] = useState("#0284C7");
  const [surfaceColor, setSurfaceColor] = useState("#EFF6FF");
  const [activeSlot, setActiveSlot] = useState("primary");

  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].value);
  const [isDefaultTheme, setIsDefaultTheme] = useState(true);

  const [uploadedImageSrc, setUploadedImageSrc] = useState(null);
  const [extractedPalette, setExtractedPalette] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (projectnum) {
      try {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}${projectnum}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setPrimaryColor(parsed.primary || "#2563EB");
          setSecondaryColor(parsed.secondary || parsed.primary || "#3B82F6");
          setSurfaceColor(parsed.surface || parsed.primary || "#EFF6FF");
          setFontFamily(parsed.fontFamily || FONT_OPTIONS[0].value);
          setIsDefaultTheme(Boolean(parsed.isDefault));
          setUploadedImageSrc(null);
          setExtractedPalette([]);
          return;
        }
      } catch (e) {
        // ignore
      }
    }
    setPrimaryColor("#2563EB");
    setSecondaryColor("#3B82F6");
    setSurfaceColor("#EFF6FF");
    setFontFamily(FONT_OPTIONS[0].value);
    setIsDefaultTheme(true);
  }, [isOpen, projectnum]);

  const processImageFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) {
      modal?.showAlert("알림", "이미지 파일(PNG, JPG, WEBP 등)만 업로드할 수 있습니다.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setUploadedImageSrc(dataUrl);

      const img = new Image();
      img.onload = () => {
        const { palette, roles } = extractColorsFromImageElement(img, 6);
        setExtractedPalette(palette);
        if (palette.length > 0) {
          setPrimaryColor(roles.primary);
          setSecondaryColor(roles.secondary);
          setSurfaceColor(roles.surface);
          setIsDefaultTheme(false);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [modal]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            processImageFile(blob);
            e.preventDefault();
            break;
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen, processImageFile]);

  if (!isOpen) return null;

  const handleSelectExtractedColor = (hex) => {
    setIsDefaultTheme(false);
    if (activeSlot === "primary") {
      setPrimaryColor(hex);
    } else if (activeSlot === "secondary") {
      setSecondaryColor(hex);
    } else if (activeSlot === "surface") {
      setSurfaceColor(hex);
    }
  };

  const handleSelectPreset = (preset) => {
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.secondary || preset.primary);
    setSurfaceColor(preset.surface || preset.primary);
    setIsDefaultTheme(Boolean(preset.isDefault));
    setUploadedImageSrc(null);
    setExtractedPalette([]);
  };

  const handleResetDefault = () => {
    setPrimaryColor("#2563EB");
    setSecondaryColor("#3B82F6");
    setSurfaceColor("#EFF6FF");
    setFontFamily(FONT_OPTIONS[0].value);
    setIsDefaultTheme(true);
    setUploadedImageSrc(null);
    setExtractedPalette([]);
  };

  const handleSaveTheme = () => {
    const targetPn = projectnum || "DEFAULT";
    const payload = {
      projectnum: targetPn,
      primary: primaryColor,
      secondary: secondaryColor,
      surface: surfaceColor,
      fontFamily,
      isDefault: isDefaultTheme,
      extractedPalette,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (isDefaultTheme) {
        localStorage.removeItem(`${STORAGE_PREFIX}${targetPn}`);
        applyProjectBrandTheme(null);
      } else {
        localStorage.setItem(`${STORAGE_PREFIX}${targetPn}`, JSON.stringify(payload));
        applyProjectBrandTheme(payload);
      }
      window.dispatchEvent(new CustomEvent("srtBrandThemeUpdated", { detail: payload }));
      modal?.showAlert(
        "알림",
        isDefaultTheme
          ? "설문온 기본(Blue) 테마로 초기화되었습니다."
          : `현재 프로젝트(${projectname || targetPn})에 멀티 컬러 브랜드 테마가 적용되었습니다.`
      );
      onClose();
    } catch (e) {
      modal?.showErrorAlert("ERR", "브랜드 테마 저장 중 문제가 발생했습니다.");
    }
  };

  const getSwatchRoleBadge = (hex) => {
    if (isDefaultTheme) return null;
    const upper = hex.toUpperCase();
    if (primaryColor.toUpperCase() === upper) return "메인";
    if (secondaryColor.toUpperCase() === upper) return "보조";
    if (surfaceColor.toUpperCase() === upper) return "배경";
    return null;
  };

  return createPortal(
    <div className="btm-overlay" onClick={onClose}>
      <div
        className="btm-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          "--preview-brand": primaryColor,
          "--preview-secondary": secondaryColor,
          "--preview-surface": surfaceColor,
          "--preview-font": fontFamily,
        }}
      >
        {/* 1. 상단 헤더 */}
        <div className="btm-header">
          <div className="btm-header-left">
            <div className="btm-header-icon">
              <Palette size={18} />
            </div>
            <div className="btm-header-titles">
              <h2 className="btm-title">고객사 브랜드 테마 설정</h2>
              <span className="btm-project-pill">
                {projectname || "선택된 프로젝트"} <em>{projectnum || "-"}</em>
              </span>
            </div>
          </div>
          <button type="button" className="btm-close-btn" onClick={onClose} title="닫기">
            <X size={20} />
          </button>
        </div>

        {/* 2. 본문: 좌측 설정(440px) + 우측 실제 반영 영역 미리보기(1fr) */}
        <div className="btm-body">
          {/* [좌측 패널] */}
          <div className="btm-left-panel">
            {/* Step 1: 이미지 캡처 업로드 */}
            <div className="btm-group">
              <div className="btm-group-head">
                <span className="btm-group-label">1. 이미지로 컬러 자동 추출</span>
                <span className="btm-kbd-hint">Ctrl + V 붙여넣기</span>
              </div>

              <div
                className={`btm-dropzone ${isDragging ? "dragging" : ""} ${uploadedImageSrc ? "has-image" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer?.files?.[0];
                  if (file) processImageFile(file);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processImageFile(file);
                    e.target.value = "";
                  }}
                />

                {uploadedImageSrc ? (
                  <div className="btm-uploaded-preview">
                    <img src={uploadedImageSrc} alt="업로드된 캡처" className="btm-uploaded-img" />
                    <div className="btm-uploaded-overlay">
                      <Upload size={15} />
                      <span>클릭하거나 Ctrl+V로 이미지 변경</span>
                    </div>
                  </div>
                ) : (
                  <div className="btm-dropzone-empty">
                    <div className="btm-upload-icon">
                      <Upload size={18} />
                    </div>
                    <div className="btm-drop-texts">
                      <p className="btm-drop-main">홈페이지 캡처나 로고 이미지를 올리거나 Ctrl+V 하세요</p>
                      <p className="btm-drop-sub">메인·보조·배경 3가지 역할 색상을 자동으로 조합합니다</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 추출된 컬러 팔레트 (이미지가 업로드된 상태에서만 노출) */}
              {uploadedImageSrc && extractedPalette.length > 0 && (
                <div className="btm-extracted-box">
                  <div className="btm-extracted-top">
                    <span className="btm-extracted-title">
                      <Sparkles size={12} /> 추출된 색상 팔레트
                    </span>
                    <span className="btm-extracted-sub">
                      아래 역할 카드를 선택한 뒤 원형 색상을 누르면 교체됩니다
                    </span>
                  </div>
                  <div className="btm-swatch-row">
                    {extractedPalette.map((hex, idx) => {
                      const roleBadge = getSwatchRoleBadge(hex);
                      return (
                        <button
                          key={idx}
                          type="button"
                          className={`btm-swatch-item ${roleBadge ? "is-assigned" : ""}`}
                          onClick={() => handleSelectExtractedColor(hex)}
                          title={`${hex} (${activeSlot === "primary" ? "메인" : activeSlot === "secondary" ? "보조" : "배경"} 컬러로 지정)`}
                        >
                          <span className="btm-swatch-circle" style={{ backgroundColor: hex }} />
                          <span className="btm-swatch-tag">{roleBadge || hex}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="btm-divider" />

            {/* Step 2: 3대 브랜드 컬러 역할 배정 */}
            <div className="btm-group">
              <div className="btm-group-head">
                <span className="btm-group-label">2. 브랜드 컬러 설정</span>
                <button type="button" className="btm-reset-btn" onClick={handleResetDefault}>
                  <RotateCcw size={12} /> 기본 파랑으로 초기화
                </button>
              </div>

              <div className="btm-role-grid">
                <div
                  className={`btm-role-card ${activeSlot === "primary" ? "active" : ""}`}
                  onClick={() => setActiveSlot("primary")}
                >
                  <div className="btm-role-top">
                    <span className="btm-role-badge primary">메인 컬러</span>
                    <span className="btm-role-desc">주요 버튼·선택 탭</span>
                  </div>
                  <div className="btm-role-picker">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => {
                        setPrimaryColor(e.target.value.toUpperCase());
                        setIsDefaultTheme(false);
                      }}
                      className="btm-color-well"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => {
                        setPrimaryColor(e.target.value);
                        setIsDefaultTheme(false);
                      }}
                      className="btm-color-hex"
                      maxLength={7}
                    />
                  </div>
                </div>

                <div
                  className={`btm-role-card ${activeSlot === "secondary" ? "active" : ""}`}
                  onClick={() => setActiveSlot("secondary")}
                >
                  <div className="btm-role-top">
                    <span className="btm-role-badge secondary">보조 컬러</span>
                    <span className="btm-role-desc">서브 버튼·필터 칩</span>
                  </div>
                  <div className="btm-role-picker">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => {
                        setSecondaryColor(e.target.value.toUpperCase());
                        setIsDefaultTheme(false);
                      }}
                      className="btm-color-well"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => {
                        setSecondaryColor(e.target.value);
                        setIsDefaultTheme(false);
                      }}
                      className="btm-color-hex"
                      maxLength={7}
                    />
                  </div>
                </div>

                <div
                  className={`btm-role-card ${activeSlot === "surface" ? "active" : ""}`}
                  onClick={() => setActiveSlot("surface")}
                >
                  <div className="btm-role-top">
                    <span className="btm-role-badge surface">배경 컬러</span>
                    <span className="btm-role-desc">선택 행·호버 배경</span>
                  </div>
                  <div className="btm-role-picker">
                    <input
                      type="color"
                      value={surfaceColor}
                      onChange={(e) => {
                        setSurfaceColor(e.target.value.toUpperCase());
                        setIsDefaultTheme(false);
                      }}
                      className="btm-color-well"
                    />
                    <input
                      type="text"
                      value={surfaceColor}
                      onChange={(e) => {
                        setSurfaceColor(e.target.value);
                        setIsDefaultTheme(false);
                      }}
                      className="btm-color-hex"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>

              <div className="btm-preset-grid">
                {BRAND_PRESETS.map((preset, idx) => {
                  const isSelected =
                    (preset.isDefault && isDefaultTheme) ||
                    (!preset.isDefault &&
                      !isDefaultTheme &&
                      primaryColor.toUpperCase() === preset.primary.toUpperCase());
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`btm-preset-pill ${isSelected ? "active" : ""}`}
                      onClick={() => handleSelectPreset(preset)}
                    >
                      <span className="btm-preset-dots">
                        <span className="btm-preset-circle" style={{ backgroundColor: preset.primary }} />
                        <span className="btm-preset-circle sub" style={{ backgroundColor: preset.secondary }} />
                      </span>
                      <span className="btm-preset-label">{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* [우측 패널: 실제 브랜드 테마가 적용되는 H-SRT UI 컴포넌트 미리보기] */}
          <div className="btm-right-panel">
            <div className="btm-preview-top">
              <span className="btm-preview-heading">실제 반영되는 H-SRT UI 영역 미리보기</span>
            </div>

            {/* 미니 H-SRT 캔버스 */}
            <div className="btm-stage" style={{ fontFamily }}>
              {/* 1) 좌측 LNB 사이드바 (로고, 프로젝트 카드, 하위 메뉴 트리) */}
              <div className="btm-stage-sidebar">
                <div className="btm-stage-logo">H-SRT</div>
                <div className="btm-stage-proj">
                  <div className="btm-stage-proj-title">{projectname || "2026 브랜드 조사"}</div>
                  <span className="btm-stage-proj-id">{projectnum || "q261001"}</span>
                </div>
                <div className="btm-stage-menu">
                  <div className="btm-stage-menu-item">
                    <PlusCircle size={13} />
                    <span>문항추가</span>
                  </div>
                  <div className="btm-stage-menu-item active">
                    <FileCog size={13} />
                    <span>DP의뢰서</span>
                  </div>
                  <div className="btm-stage-submenu">
                    <div className="btm-stage-sub-item">
                      <span className="btm-sub-circle">1</span>표 설정
                    </div>
                    <div className="btm-stage-sub-item">
                      <span className="btm-sub-circle">2</span>배너
                    </div>
                    <div className="btm-stage-sub-item active">
                      <span className="btm-sub-circle active">3</span>스터브
                    </div>
                    <div className="btm-stage-sub-item">
                      <span className="btm-sub-circle">4</span>요약표
                    </div>
                  </div>
                  <div className="btm-stage-menu-item">
                    <Table size={13} />
                    <span>교차분석</span>
                  </div>
                </div>
              </div>

              {/* 2) 우측 본문: 실제 DP의뢰서/그리드/모달과 1:1 동일한 구성 */}
              <div className="btm-stage-content">
                {/* A. 상단 스텝 탭 & 액션 버튼 바 */}
                <div className="btm-stage-header">
                  <div className="btm-step-pills">
                    <span className="btm-step-pill done">
                      <span className="btm-step-dot done">✓</span> 표 설정
                    </span>
                    <span className="btm-step-pill done">
                      <span className="btm-step-dot done">✓</span> 배너
                    </span>
                    <span className="btm-step-pill current">
                      <span className="btm-step-dot current">3</span> 스터브
                    </span>
                  </div>
                  <div className="btm-stage-btns">
                    <button type="button" className="btm-stage-btn-line">문항뷰어</button>
                    <button type="button" className="btm-stage-btn-fill">저장</button>
                  </div>
                </div>

                {/* B. 스터브/문항 Kendo Grid (헤더 Surface, single=Secondary, multi=Primary, 선택행) */}
                <div className="btm-stage-card">
                  <div className="btm-stage-card-head">
                    <div className="btm-filter-chips">
                      <span className="btm-chip-active">
                        전체 <strong>234</strong>건
                      </span>
                      <span className="btm-chip-sub">선택·호버 하이라이트</span>
                    </div>
                    <div className="btm-view-toggle">
                      <span className="btm-toggle-item active">막대형</span>
                      <span className="btm-toggle-item">원형</span>
                    </div>
                  </div>

                  {/* 실제 스터브 그리드와 동일한 헤더 + 행 구조 */}
                  <div className="btm-grid-list">
                    <div className="btm-grid-head-row">
                      <span>표출</span>
                      <span>변수</span>
                      <span>라벨</span>
                      <span>상세</span>
                      <span>유형</span>
                    </div>
                    <div className="btm-grid-row is-selected">
                      <span className="btm-checkbox checked">
                        <Check size={10} color="#fff" strokeWidth={3} />
                      </span>
                      <span className="btm-q-code">SQ1</span>
                      <span className="btm-q-title">SQ1. 성별 / 연령대 구분</span>
                      <span className="btm-q-setting-btn">설정</span>
                      <span className="btm-q-type">single</span>
                    </div>
                    <div className="btm-grid-row">
                      <span className="btm-checkbox checked">
                        <Check size={10} color="#fff" strokeWidth={3} />
                      </span>
                      <span className="btm-q-code">SQ4</span>
                      <span className="btm-q-title">SQ4. 최근 1년 온라인 쇼핑몰 이용</span>
                      <span className="btm-q-setting-btn">설정</span>
                      <span className="btm-q-type primary-badge">multi</span>
                    </div>
                    <div className="btm-grid-row">
                      <span className="btm-checkbox" />
                      <span className="btm-q-code muted">SQ6</span>
                      <span className="btm-q-title">SQ6. 뷰티 제품 구입 관여도</span>
                      <span className="btm-q-setting-btn">설정</span>
                      <span className="btm-q-type">single</span>
                    </div>
                  </div>
                </div>

                {/* C. 공통 확인 팝업(Modal.jsx) & 로딩 스피너 프리뷰 */}
                <div className="btm-modal-preview-row">
                  <div className="btm-mini-popup">
                    <div className="btm-mini-popup-top">
                      <span className="btm-mini-noti-icon">!</span>
                      <span className="btm-mini-popup-title">알림 팝업 & 스피너 테마</span>
                    </div>
                    <p className="btm-mini-popup-txt">변경된 스터브 설정을 저장하시겠습니까?</p>
                    <div className="btm-mini-popup-btns">
                      <button type="button" className="btm-mini-popup-cancel">취소</button>
                      <button type="button" className="btm-mini-popup-ok">확인</button>
                    </div>
                  </div>

                  <div className="btm-mini-spinner-card">
                    <div className="btm-mini-spinner-dots">
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <span className="btm-mini-spinner-label">로딩 스피너 & 포커스 링</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. 하단 푸터 */}
        <div className="btm-footer">
          <span className="btm-footer-guide">
            ※ 교차분석 표 내부 색상은 [DP의뢰서 &gt; 표 설정]을 따르며, 브랜드 테마는 사이드바·버튼·선택행·모달에 적용됩니다.
          </span>
          <div className="btm-footer-actions">
            <button type="button" className="btm-btn-cancel" onClick={onClose}>
              취소
            </button>
            <button
              type="button"
              className="btm-btn-submit"
              style={{ backgroundColor: primaryColor }}
              onClick={handleSaveTheme}
            >
              <Check size={15} strokeWidth={2.5} />
              <span>테마 저장 및 적용</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BrandThemeModal;
