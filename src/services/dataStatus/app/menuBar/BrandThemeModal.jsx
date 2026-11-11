import React, { useState, useEffect, useRef, useCallback, useContext } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import {
  Palette, Upload, RotateCcw, Check, X, Sparkles, Plus,
  Table, BarChart3, PlusCircle, FileCog, Bell, Filter
} from "lucide-react";
import { modalContext } from "@/components/common/Modal.jsx";
import {
  BrandThemeApi,
  fetchProjectBrandThemeFromApi,
  syncTableThemeToDpTableSave,
} from "./BrandThemeApi.js";
import "./BrandThemeModal.css";

const STORAGE_PREFIX = "srtBrandTheme_";
const PENDING_TABLE_THEME_PREFIX = "srtBrandTablePending_";
const CUSTOM_PRESET_STORAGE_KEY = "srtBrandCustomPresets";

export const DEFAULT_PRESET_TABLE_THEMES = {
  SULMUNON_BLUE: {
    theme_primary: "#2563EB",
    theme_primary_fg: "#FFFFFF",
    theme_header_group_bg: "#3B82F6",
    theme_header_group_fg: "#FFFFFF",
    theme_stub_header_bg: "#DBEAFE",
    theme_stub_header_fg: "#0F172A",
    theme_stub_group_bg: "#EFF6FF",
    theme_stub_group_fg: "#0F172A",
    theme_stub_leaf_bg: "#FFFFFF",
    theme_stub_leaf_fg: "#0F172A",
    theme_bg: "#FFFFFF",
    theme_stripe: "#F8FAFC",
    theme_text: "#0F172A",
    theme_text_muted: "#64748B",
    theme_base_bg: "#EFF6FF",
    theme_base_fg: "#1E40AF",
    theme_etc_bg: "#F8FAFC",
    theme_etc_fg: "#334155",
    theme_group_preset_bg: "#E0E7FF",
    theme_group_preset_fg: "#1D4ED8",
  },
  KURLY_PURPLE: {
    theme_primary: "#5F0080",
    theme_primary_fg: "#FFFFFF",
    theme_header_group_bg: "#7B2CBF",
    theme_header_group_fg: "#FFFFFF",
    theme_stub_header_bg: "#F3E8FF",
    theme_stub_header_fg: "#2E1065",
    theme_stub_group_bg: "#FAF5FF",
    theme_stub_group_fg: "#2E1065",
    theme_stub_leaf_bg: "#FFFFFF",
    theme_stub_leaf_fg: "#0F172A",
    theme_bg: "#FFFFFF",
    theme_stripe: "#FCF9FF",
    theme_text: "#0F172A",
    theme_text_muted: "#64748B",
    theme_base_bg: "#FAF5FF",
    theme_base_fg: "#5F0080",
    theme_etc_bg: "#F8F5FF",
    theme_etc_fg: "#4C1D95",
    theme_group_preset_bg: "#EDE9FE",
    theme_group_preset_fg: "#6D28D9",
  },
  MCD_RED: {
    theme_primary: "#DA291C",
    theme_primary_fg: "#FFFFFF",
    theme_header_group_bg: "#E34A3B",
    theme_header_group_fg: "#FFFFFF",
    theme_stub_header_bg: "#FEE2E2",
    theme_stub_header_fg: "#450A0A",
    theme_stub_group_bg: "#FFFBEB",
    theme_stub_group_fg: "#450A0A",
    theme_stub_leaf_bg: "#FFFFFF",
    theme_stub_leaf_fg: "#0F172A",
    theme_bg: "#FFFFFF",
    theme_stripe: "#FFFDF7",
    theme_text: "#0F172A",
    theme_text_muted: "#64748B",
    theme_base_bg: "#FEF3C7",
    theme_base_fg: "#991B1B",
    theme_etc_bg: "#FFFBEB",
    theme_etc_fg: "#92400E",
    theme_group_preset_bg: "#FFEDD5",
    theme_group_preset_fg: "#C2410C",
  },
  SBUX_GREEN: {
    theme_primary: "#00704A",
    theme_primary_fg: "#FFFFFF",
    theme_header_group_bg: "#1E8460",
    theme_header_group_fg: "#FFFFFF",
    theme_stub_header_bg: "#D1FAE5",
    theme_stub_header_fg: "#064E3B",
    theme_stub_group_bg: "#F4F9F6",
    theme_stub_group_fg: "#064E3B",
    theme_stub_leaf_bg: "#FFFFFF",
    theme_stub_leaf_fg: "#0F172A",
    theme_bg: "#FFFFFF",
    theme_stripe: "#F8FBF9",
    theme_text: "#0F172A",
    theme_text_muted: "#64748B",
    theme_base_bg: "#ECFDF5",
    theme_base_fg: "#00704A",
    theme_etc_bg: "#FAF6EE",
    theme_etc_fg: "#785C28",
    theme_group_preset_bg: "#F5EFE2",
    theme_group_preset_fg: "#8C6928",
  },
  HYUNDAI_NAVY: {
    theme_primary: "#002C5F",
    theme_primary_fg: "#FFFFFF",
    theme_header_group_bg: "#1B4578",
    theme_header_group_fg: "#FFFFFF",
    theme_stub_header_bg: "#DCE6F2",
    theme_stub_header_fg: "#0F172A",
    theme_stub_group_bg: "#F2F6FA",
    theme_stub_group_fg: "#0F172A",
    theme_stub_leaf_bg: "#FFFFFF",
    theme_stub_leaf_fg: "#0F172A",
    theme_bg: "#FFFFFF",
    theme_stripe: "#F7FAFC",
    theme_text: "#0F172A",
    theme_text_muted: "#64748B",
    theme_base_bg: "#EBF3FA",
    theme_base_fg: "#002C5F",
    theme_etc_bg: "#F0F9FF",
    theme_etc_fg: "#0369A1",
    theme_group_preset_bg: "#E0F2FE",
    theme_group_preset_fg: "#0284C7",
  },
  LG_MAGENTA: {
    theme_primary: "#A50034",
    theme_primary_fg: "#FFFFFF",
    theme_header_group_bg: "#BD1E4A",
    theme_header_group_fg: "#FFFFFF",
    theme_stub_header_bg: "#FCE7F3",
    theme_stub_header_fg: "#500724",
    theme_stub_group_bg: "#FDF2F5",
    theme_stub_group_fg: "#500724",
    theme_stub_leaf_bg: "#FFFFFF",
    theme_stub_leaf_fg: "#0F172A",
    theme_bg: "#FFFFFF",
    theme_stripe: "#FEF7F9",
    theme_text: "#0F172A",
    theme_text_muted: "#64748B",
    theme_base_bg: "#FCE7EB",
    theme_base_fg: "#880E2B",
    theme_etc_bg: "#FDF2F8",
    theme_etc_fg: "#831843",
    theme_group_preset_bg: "#FBCFE8",
    theme_group_preset_fg: "#9D174D",
  },
};

const BRAND_PRESETS = [
  { code: "SULMUNON_BLUE", name: "설문온 기본", primary: "#2563EB", secondary: "#3B82F6", surface: "#EFF6FF", isDefault: true, isSystem: true, tableThemeJson: DEFAULT_PRESET_TABLE_THEMES.SULMUNON_BLUE },
  { code: "KURLY_PURPLE", name: "컬리 퍼플", primary: "#5F0080", secondary: "#9333EA", surface: "#FAF5FF", isSystem: true, tableThemeJson: DEFAULT_PRESET_TABLE_THEMES.KURLY_PURPLE },
  { code: "MCD_RED", name: "맥도날드", primary: "#DA291C", secondary: "#F59E0B", surface: "#FEF2F2", isSystem: true, tableThemeJson: DEFAULT_PRESET_TABLE_THEMES.MCD_RED },
  { code: "SBUX_GREEN", name: "스타벅스", primary: "#00704A", secondary: "#CBA258", surface: "#ECFDF5", isSystem: true, tableThemeJson: DEFAULT_PRESET_TABLE_THEMES.SBUX_GREEN },
  { code: "HYUNDAI_NAVY", name: "현대 네이비", primary: "#002C5F", secondary: "#00AAD2", surface: "#F0F9FF", isSystem: true, tableThemeJson: DEFAULT_PRESET_TABLE_THEMES.HYUNDAI_NAVY },
  { code: "LG_MAGENTA", name: "LG 마젠타", primary: "#A50034", secondary: "#E11D48", surface: "#FFF1F2", isSystem: true, tableThemeJson: DEFAULT_PRESET_TABLE_THEMES.LG_MAGENTA },
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

function hexToRgb(hex) {
  const clean = String(hex || "#2563EB").replace("#", "").trim();
  const full = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean.padEnd(6, "0").slice(0, 6);
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  return [
    Number.isNaN(r) ? 37 : r,
    Number.isNaN(g) ? 99 : g,
    Number.isNaN(b) ? 235 : b,
  ];
}

function mixHex(hex1, hex2, ratio1 = 0.5) {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const w1 = Math.max(0, Math.min(1, ratio1));
  const w2 = 1 - w1;
  return rgbToHex(r1 * w1 + r2 * w2, g1 * w1 + g2 * w2, b1 * w1 + b2 * w2);
}

function getContrastFg(bgHex) {
  const [r, g, b] = hexToRgb(bgHex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.75 ? "#0F172A" : "#FFFFFF";
}

/**
 * 브랜드 3색(primary, secondary, surface)으로
 * DP의뢰서 > 표 디자인 설정 > 영역별 테마 색상 설정(20개)을 조화롭게 자동 생성
 */
export function generateTableThemeFromBrand(primary = "#2563EB", secondary = "#3B82F6", surface = "#EFF6FF", presetCode = "") {
  if (presetCode && DEFAULT_PRESET_TABLE_THEMES[presetCode]) {
    return { ...DEFAULT_PRESET_TABLE_THEMES[presetCode] };
  }

  const pUpper = String(primary || "#2563EB").toUpperCase();
  const sUpper = String(secondary || pUpper).toUpperCase();
  const sfUpper = String(surface || "#EFF6FF").toUpperCase();

  const matchedPreset = BRAND_PRESETS.find(
    (bp) => bp.primary.toUpperCase() === pUpper && bp.secondary.toUpperCase() === sUpper
  );
  if (matchedPreset && DEFAULT_PRESET_TABLE_THEMES[matchedPreset.code]) {
    return { ...DEFAULT_PRESET_TABLE_THEMES[matchedPreset.code] };
  }

  const { l: sfLightness } = hexToHsl(sfUpper);
  const safeSurface = sfLightness < 86 ? mixHex(sfUpper, "#FFFFFF", 0.16) : sfUpper;
  const primaryFg = getContrastFg(pUpper);

  return {
    theme_primary: pUpper,
    theme_primary_fg: primaryFg,
    theme_header_group_bg: pUpper,
    theme_header_group_fg: primaryFg,
    theme_stub_header_bg: mixHex(pUpper, "#FFFFFF", 0.16),
    theme_stub_header_fg: mixHex(pUpper, "#0F172A", 0.35),
    theme_stub_group_bg: mixHex(safeSurface, "#F8FAFC", 0.65),
    theme_stub_group_fg: mixHex(pUpper, "#0F172A", 0.30),
    theme_stub_leaf_bg: "#FFFFFF",
    theme_stub_leaf_fg: "#0F172A",
    theme_bg: "#FFFFFF",
    theme_stripe: mixHex(safeSurface, "#FFFFFF", 0.45),
    theme_text: "#0F172A",
    theme_text_muted: "#64748B",
    theme_base_bg: mixHex(safeSurface, "#FFFFFF", 0.85),
    theme_base_fg: mixHex(pUpper, "#0F172A", 0.72),
    theme_etc_bg: mixHex(sUpper, "#FFFFFF", 0.10),
    theme_etc_fg: mixHex(sUpper, "#1E293B", 0.55),
    theme_group_preset_bg: mixHex(sUpper, "#FFFFFF", 0.16),
    theme_group_preset_fg: mixHex(sUpper, "#0F172A", 0.75),
  };
}

export function normalizeTableThemeJson(rawJson, primary = "#2563EB", secondary = "#3B82F6", surface = "#EFF6FF", code = "") {
  if (!rawJson || typeof rawJson !== "object") {
    return generateTableThemeFromBrand(primary, secondary, surface, code);
  }
  const cloned = { ...rawJson };
  const p = String(cloned.theme_primary || primary || "#2563EB").toUpperCase();
  const primaryFg = getContrastFg(p);
  cloned.theme_primary_fg = primaryFg;
  if (
    !cloned.theme_header_group_bg ||
    String(cloned.theme_header_group_bg).toUpperCase() === "#FFFFFF"
  ) {
    cloned.theme_header_group_bg = DEFAULT_PRESET_TABLE_THEMES[code]?.theme_header_group_bg || p;
  }
  cloned.theme_header_group_fg = primaryFg;
  return cloned;
}

/**
 * 현재 프로젝트에 저장된 브랜드 테마 및 20개 표 영역 색상(tableThemeJson)을 동기 조회
 */
export function getSavedBrandTableTheme(projectnum) {
  const targetPn = projectnum || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("projectnum") : "") || "";
  if (targetPn) {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${targetPn}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.primary) {
          const p = parsed.primary || "#2563EB";
          const s = parsed.secondary || p || "#3B82F6";
          const sf = parsed.surface || "#EFF6FF";
          const tableThemeJson = normalizeTableThemeJson(parsed.tableThemeJson, p, s, sf);
          return {
            primary: p,
            secondary: s,
            surface: sf,
            isDefault: Boolean(parsed.isDefault),
            tableThemeJson,
          };
        }
      }
    } catch (e) {
      // ignore
    }
  }
  return {
    primary: "#2563EB",
    secondary: "#3B82F6",
    surface: "#EFF6FF",
    isDefault: true,
    tableThemeJson: { ...DEFAULT_PRESET_TABLE_THEMES.SULMUNON_BLUE },
  };
}

export function consumePendingBrandTableTheme(projectnum) {
  const targetPn = projectnum || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("projectnum") : "") || "";
  if (!targetPn) return null;
  try {
    const raw = localStorage.getItem(`${PENDING_TABLE_THEME_PREFIX}${targetPn}`);
    if (!raw) return null;
    localStorage.removeItem(`${PENDING_TABLE_THEME_PREFIX}${targetPn}`);
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? normalizeTableThemeJson(parsed, parsed.theme_primary) : null;
  } catch (e) {
    return null;
  }
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

export function loadAndApplySavedBrandTheme(projectnum, userId = "") {
  if (!projectnum) {
    applyProjectBrandTheme(null);
    return null;
  }

  let cached = null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${projectnum}`);
    if (raw) {
      cached = JSON.parse(raw);
      applyProjectBrandTheme(cached);
    } else {
      applyProjectBrandTheme(null);
    }
  } catch (e) {
    console.warn("Failed to load cached brand theme", e);
  }

  // 비동기로 surveyon-theme-api(HTheme DB)에서 최신 테마 조회 및 동기화
  fetchProjectBrandThemeFromApi(projectnum, userId).then((dbTheme) => {
    if (!dbTheme) return;
    const p = dbTheme.primary || dbTheme.primary_color || "#2563EB";
    const s = dbTheme.secondary || dbTheme.secondary_color || p || "#3B82F6";
    const sf = dbTheme.surface || dbTheme.surface_color || "#EFF6FF";
    const dbTableTheme = normalizeTableThemeJson(
      dbTheme.tableThemeJson || dbTheme.table_theme_json,
      p,
      s,
      sf
    );
    const normalized = {
      projectnum,
      primary: p,
      secondary: s,
      surface: sf,
      isDefault: Boolean(dbTheme.isDefault ?? dbTheme.is_default),
      extractedPalette: Array.isArray(dbTheme.extractedPalette || dbTheme.extracted_palette)
        ? (dbTheme.extractedPalette || dbTheme.extracted_palette)
        : [],
      tableThemeJson: dbTableTheme,
    };
    try {
      if (normalized.isDefault) {
        localStorage.removeItem(`${STORAGE_PREFIX}${projectnum}`);
        applyProjectBrandTheme(null);
      } else {
        localStorage.setItem(`${STORAGE_PREFIX}${projectnum}`, JSON.stringify(normalized));
        applyProjectBrandTheme(normalized);
      }
    } catch (e) {
      // ignore storage quota errors
    }
  });

  return cached;
}

function readInitialThemeSync(projectnum) {
  if (projectnum) {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${projectnum}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.primary) {
          const p = parsed.primary || "#2563EB";
          const s = parsed.secondary || p || "#3B82F6";
          const sf = parsed.surface || "#EFF6FF";
          return {
            hasCache: true,
            primary: p,
            secondary: s,
            surface: sf,
            fontFamily: parsed.fontFamily || FONT_OPTIONS[0].value,
            isDefault: Boolean(parsed.isDefault),
            tableThemeJson: normalizeTableThemeJson(parsed.tableThemeJson, p, s, sf),
          };
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (typeof document !== "undefined") {
    const root = document.documentElement;
    if (root.getAttribute("data-srt-brand") === "true") {
      const p = root.style.getPropertyValue("--srt-brand")?.trim();
      const s = root.style.getPropertyValue("--srt-brand-secondary")?.trim();
      const sf = root.style.getPropertyValue("--srt-brand-surface")?.trim();
      if (p) {
        return {
          hasCache: true,
          primary: p,
          secondary: s || p,
          surface: sf || "#EFF6FF",
          fontFamily: FONT_OPTIONS[0].value,
          isDefault: false,
          tableThemeJson: generateTableThemeFromBrand(p, s || p, sf || "#EFF6FF"),
        };
      }
    }
  }

  return {
    hasCache: false,
    primary: "#2563EB",
    secondary: "#3B82F6",
    surface: "#EFF6FF",
    fontFamily: FONT_OPTIONS[0].value,
    isDefault: true,
    tableThemeJson: { ...DEFAULT_PRESET_TABLE_THEMES.SULMUNON_BLUE },
  };
}

const BrandThemeModal = ({ isOpen, onClose, projectnum, projectname }) => {
  const modal = useContext(modalContext);
  const auth = useSelector((store) => store.auth);
  const { getBrandTheme, saveBrandTheme, getBrandPresets, addBrandPreset, deleteBrandPreset } = BrandThemeApi();
  const fileInputRef = useRef(null);

  const initialTheme = readInitialThemeSync(projectnum);

  const [primaryColor, setPrimaryColor] = useState(initialTheme.primary);
  const [secondaryColor, setSecondaryColor] = useState(initialTheme.secondary);
  const [surfaceColor, setSurfaceColor] = useState(initialTheme.surface);
  const [tableThemeJson, setTableThemeJson] = useState(initialTheme.tableThemeJson);
  const [activeSlot, setActiveSlot] = useState("primary");

  const [fontFamily, setFontFamily] = useState(initialTheme.fontFamily);
  const [isDefaultTheme, setIsDefaultTheme] = useState(initialTheme.isDefault);
  const [presetList, setPresetList] = useState(() => {
    try {
      const localCustom = JSON.parse(localStorage.getItem(CUSTOM_PRESET_STORAGE_KEY) || "[]");
      return [...BRAND_PRESETS, ...localCustom];
    } catch (e) {
      return BRAND_PRESETS;
    }
  });
  const [isAddingPreset, setIsAddingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [isReady, setIsReady] = useState(initialTheme.hasCache);

  const [uploadedImageSrc, setUploadedImageSrc] = useState(null);
  const [extractedPalette, setExtractedPalette] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setUploadedImageSrc(null);
    setExtractedPalette([]);

    const syncTheme = readInitialThemeSync(projectnum);
    setPrimaryColor(syncTheme.primary);
    setSecondaryColor(syncTheme.secondary);
    setSurfaceColor(syncTheme.surface);
    setTableThemeJson(syncTheme.tableThemeJson);
    setFontFamily(syncTheme.fontFamily);
    setIsDefaultTheme(syncTheme.isDefault);
    setIsReady(syncTheme.hasCache);

    const userId = auth?.user?.userId || sessionStorage.getItem("userId") || "";

    if (projectnum) {
      // DB(HTheme.theme_brand)에서 최신 프로젝트 테마 조회 완료 후 오픈
      getBrandTheme
        .mutateAsync({ user: userId, projectnum })
        .then((res) => {
          if (String(res?.success) === "777") {
            const d = res?.data || res?.resultjson;
            if (d) {
              const p = d.primary || d.primary_color || "#2563EB";
              const s = d.secondary || d.secondary_color || p || "#3B82F6";
              const sf = d.surface || d.surface_color || "#EFF6FF";
              const def = Boolean(d.isDefault ?? d.is_default);
              const tJson = normalizeTableThemeJson(
                d.tableThemeJson || d.table_theme_json,
                p,
                s,
                sf
              );
              setPrimaryColor(p);
              setSecondaryColor(s);
              setSurfaceColor(sf);
              setTableThemeJson(tJson);
              setIsDefaultTheme(def);
              try {
                if (def) {
                  localStorage.removeItem(`${STORAGE_PREFIX}${projectnum}`);
                } else {
                  localStorage.setItem(
                    `${STORAGE_PREFIX}${projectnum}`,
                    JSON.stringify({
                      projectnum,
                      primary: p,
                      secondary: s,
                      surface: sf,
                      isDefault: false,
                      tableThemeJson: tJson,
                    })
                  );
                }
              } catch (e) {
                // ignore
              }
            }
          }
        })
        .catch(() => { })
        .finally(() => {
          setIsReady(true);
        });
    } else {
      setIsReady(true);
    }

    // DB(HTheme.theme_preset)에서 프리셋 목록 조회
    getBrandPresets
      .mutateAsync({ user: userId })
      .then((res) => {
        if (String(res?.success) === "777") {
          const list = res?.data || res?.resultjson;
          if (Array.isArray(list) && list.length > 0) {
            setPresetList(
              list.map((item) => {
                const code = item.preset_code || item.code;
                const p = item.primary_color || item.primary;
                const s = item.secondary_color || item.secondary || p;
                const sf = item.surface_color || item.surface || "#EFF6FF";
                return {
                  presetId: item.preset_id ?? item.presetId,
                  code,
                  name: item.preset_name || item.name,
                  primary: p,
                  secondary: s,
                  surface: sf,
                  isDefault: Boolean(item.is_default ?? item.isDefault),
                  isSystem: Boolean(item.is_system ?? item.isSystem),
                  tableThemeJson: normalizeTableThemeJson(
                    item.table_theme_json || item.tableThemeJson || DEFAULT_PRESET_TABLE_THEMES[code],
                    p,
                    s,
                    sf,
                    code
                  ),
                };
              })
            );
          }
        }
      })
      .catch(() => { });
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
          setTableThemeJson(generateTableThemeFromBrand(roles.primary, roles.secondary, roles.surface));
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

  if (!isOpen || !isReady) return null;

  const updateBrandRoleColor = (role, hex) => {
    setIsDefaultTheme(false);
    const nextPrimary = role === "primary" ? hex : primaryColor;
    const nextSecondary = role === "secondary" ? hex : secondaryColor;
    const nextSurface = role === "surface" ? hex : surfaceColor;

    if (role === "primary") setPrimaryColor(hex);
    if (role === "secondary") setSecondaryColor(hex);
    if (role === "surface") setSurfaceColor(hex);

    setTableThemeJson(generateTableThemeFromBrand(nextPrimary, nextSecondary, nextSurface));
  };

  const handleSelectExtractedColor = (hex) => {
    updateBrandRoleColor(activeSlot, hex);
  };

  const handleSelectPreset = (preset) => {
    const p = preset.primary;
    const s = preset.secondary || preset.primary;
    const sf = preset.surface || "#EFF6FF";
    const tJson =
      preset.tableThemeJson ||
      DEFAULT_PRESET_TABLE_THEMES[preset.code] ||
      generateTableThemeFromBrand(p, s, sf, preset.code);

    setPrimaryColor(p);
    setSecondaryColor(s);
    setSurfaceColor(sf);
    setTableThemeJson(tJson);
    setIsDefaultTheme(Boolean(preset.isDefault));
    setUploadedImageSrc(null);
    setExtractedPalette([]);
    setIsAddingPreset(false);
    setNewPresetName("");
  };

  const handleAddPresetSubmit = async () => {
    const trimmed = newPresetName.trim();
    if (!trimmed) {
      modal?.showAlert("알림", "추가할 프리셋 이름을 입력해 주세요.");
      return;
    }

    const userId = auth?.user?.userId || sessionStorage.getItem("userId") || "";
    const customCode = `CUSTOM_${Date.now()}`;
    const generatedTableTheme = generateTableThemeFromBrand(primaryColor, secondaryColor, surfaceColor);
    const newItem = {
      code: customCode,
      name: trimmed,
      primary: primaryColor,
      secondary: secondaryColor,
      surface: surfaceColor,
      isDefault: false,
      isSystem: false,
      tableThemeJson: generatedTableTheme,
    };

    try {
      const res = await addBrandPreset.mutateAsync({
        user: userId,
        code: customCode,
        name: trimmed,
        primary: primaryColor,
        secondary: secondaryColor,
        surface: surfaceColor,
        tableThemeJson: generatedTableTheme,
      });
      if (String(res?.success) === "777" && (res?.data || res?.resultjson)) {
        const d = res?.data || res?.resultjson;
        newItem.presetId = d.preset_id ?? d.presetId;
        newItem.code = d.preset_code || d.code || customCode;
        if (d.table_theme_json || d.tableThemeJson) {
          newItem.tableThemeJson = d.table_theme_json || d.tableThemeJson;
        }
      }
    } catch (e) {
      // API 미반영 시에도 로컬 스토리지에 안전하게 보존
    }

    setTableThemeJson(newItem.tableThemeJson);
    setPresetList((prev) => {
      const next = [...prev, newItem];
      try {
        const onlyCustom = next.filter((p) => !p.isSystem && !p.isDefault);
        localStorage.setItem(CUSTOM_PRESET_STORAGE_KEY, JSON.stringify(onlyCustom));
      } catch (e) {
        // ignore
      }
      return next;
    });

    setNewPresetName("");
    setIsAddingPreset(false);
  };

  const handleDeletePreset = (preset, e) => {
    e.stopPropagation();
    if (preset.isSystem || preset.isDefault) return;

    const doDelete = async () => {
      const userId = auth?.user?.userId || sessionStorage.getItem("userId") || "";
      try {
        await deleteBrandPreset.mutateAsync({
          user: userId,
          presetId: preset.presetId,
          code: preset.code,
        });
      } catch (err) {
        // ignore
      }

      setPresetList((prev) => {
        const next = prev.filter((p) => (p.code || p.name) !== (preset.code || preset.name));
        try {
          const onlyCustom = next.filter((p) => !p.isSystem && !p.isDefault);
          localStorage.setItem(CUSTOM_PRESET_STORAGE_KEY, JSON.stringify(onlyCustom));
        } catch (err) {
          // ignore
        }
        return next;
      });
    };

    if (modal?.showConfirm) {
      modal.showConfirm("알림", `'${preset.name}' 프리셋을 삭제하시겠습니까?`, {
        btns: [
          { title: "취소", background: "#75849a" },
          { title: "삭제", click: doDelete },
        ],
      });
    } else {
      doDelete();
    }
  };

  const handleResetDefault = () => {
    setPrimaryColor("#2563EB");
    setSecondaryColor("#3B82F6");
    setSurfaceColor("#EFF6FF");
    setTableThemeJson({ ...DEFAULT_PRESET_TABLE_THEMES.SULMUNON_BLUE });
    setFontFamily(FONT_OPTIONS[0].value);
    setIsDefaultTheme(true);
    setUploadedImageSrc(null);
    setExtractedPalette([]);
    setIsAddingPreset(false);
    setNewPresetName("");
  };

  const handleSaveTheme = async () => {
    const targetPn = projectnum || "DEFAULT";
    const userId = auth?.user?.userId || sessionStorage.getItem("userId") || "";
    const resolvedTableTheme = isDefaultTheme
      ? { ...DEFAULT_PRESET_TABLE_THEMES.SULMUNON_BLUE }
      : normalizeTableThemeJson(
        tableThemeJson || generateTableThemeFromBrand(primaryColor, secondaryColor, surfaceColor),
        primaryColor,
        secondaryColor,
        surfaceColor
      );

    const payload = {
      user: userId,
      projectnum: targetPn,
      projectname: projectname || "",
      primary: primaryColor,
      secondary: secondaryColor,
      surface: surfaceColor,
      fontFamily,
      isDefault: isDefaultTheme,
      extractedPalette,
      tableThemeJson: resolvedTableTheme,
      updatedAt: new Date().toISOString(),
    };

    try {
      // 1) 백엔드 API(HTheme DB: theme_brand + theme_history) 저장 호출
      let themeSaved = false;
      try {
        const saveRes = await saveBrandTheme.mutateAsync(payload);
        themeSaved = String(saveRes?.success) === "777" || Boolean(saveRes);
      } catch (apiErr) {
        console.warn("Brand theme API save fallback to localStorage:", apiErr);
      }

      // 1-2) 브랜드 테마 저장 API 성공 시 -> DP의뢰서 표 디자인 설정 저장 API(/dp-request/table/save) 연이어 호출
      let tableSaved = false;
      if (themeSaved) {
        const currentPageId = sessionStorage.getItem("pageId") || "";
        tableSaved = await syncTableThemeToDpTableSave(currentPageId, userId, resolvedTableTheme);
      }

      // 2) 로컬 캐시 및 화면 즉시 반영 + DP의뢰서 표 설정 자동 동기화 큐 저장
      try {
        if (!tableSaved) {
          localStorage.setItem(`${PENDING_TABLE_THEME_PREFIX}${targetPn}`, JSON.stringify(resolvedTableTheme));
        } else {
          localStorage.removeItem(`${PENDING_TABLE_THEME_PREFIX}${targetPn}`);
        }
      } catch (e) {
        // ignore
      }

      if (isDefaultTheme) {
        localStorage.removeItem(`${STORAGE_PREFIX}${targetPn}`);
        applyProjectBrandTheme(null);
      } else {
        localStorage.setItem(`${STORAGE_PREFIX}${targetPn}`, JSON.stringify(payload));
        applyProjectBrandTheme(payload);
      }
      window.dispatchEvent(new CustomEvent("srtBrandThemeUpdated", { detail: { ...payload, tableSaved } }));
      modal?.showAlert(
        "알림",
        isDefaultTheme
          ? "설문온 기본(Blue) 테마로 초기화되었습니다."
          : `현재 프로젝트(${projectname || targetPn})에 브랜드 테마 및 표 디자인 색상이 저장·적용되었습니다.`
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

  const previewTable = normalizeTableThemeJson(
    tableThemeJson,
    primaryColor,
    secondaryColor,
    surfaceColor
  );

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
                      <span>클릭하여 다른 이미지 업로드</span>
                    </div>
                  </div>
                ) : (
                  <div className="btm-dropzone-empty">
                    <div className="btm-upload-icon">
                      <Upload size={18} />
                    </div>
                    <div className="btm-drop-texts">
                      <p className="btm-drop-main">홈페이지 캡처나 로고 이미지를 업로드하세요</p>
                      <p className="btm-drop-sub">메인·보조·배경 3가지 역할 색상을 자동으로 조합합니다</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="btm-divider" />

            {/* Step 2: 3대 브랜드 컬러 역할 배정 */}
            <div className="btm-group">
              <div className="btm-group-head">
                <span className="btm-group-label">2. 브랜드 컬러 설정</span>
                <div className="btm-head-actions">
                  <button
                    type="button"
                    className={`btm-head-add-btn ${isAddingPreset ? "active" : ""}`}
                    onClick={() => setIsAddingPreset((prev) => !prev)}
                    title="현재 설정된 브랜드 컬러(메인·보조·배경)를 프리셋 목록에 추가합니다"
                  >
                    <Plus size={12} /> 프리셋 추가
                  </button>
                  <button type="button" className="btm-reset-btn" onClick={handleResetDefault}>
                    <RotateCcw size={12} /> 설문온 기본 초기화
                  </button>
                </div>
              </div>

              {isAddingPreset && (
                <div className="btm-preset-add-box">
                  <span className="btm-preset-dots">
                    <span className="btm-preset-circle" style={{ backgroundColor: primaryColor }} />
                    <span className="btm-preset-circle sub" style={{ backgroundColor: secondaryColor }} />
                    <span className="btm-preset-circle surface" style={{ backgroundColor: surfaceColor }} />
                  </span>
                  <input
                    type="text"
                    className="btm-preset-name-input"
                    placeholder="프리셋 이름"
                    value={newPresetName}
                    maxLength={20}
                    autoFocus
                    onChange={(e) => setNewPresetName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddPresetSubmit();
                      } else if (e.key === "Escape") {
                        setIsAddingPreset(false);
                        setNewPresetName("");
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btm-preset-save-btn"
                    onClick={handleAddPresetSubmit}
                  >
                    등록
                  </button>
                  <button
                    type="button"
                    className="btm-preset-cancel-btn"
                    onClick={() => {
                      setIsAddingPreset(false);
                      setNewPresetName("");
                    }}
                  >
                    취소
                  </button>
                </div>
              )}

              <div className="btm-role-grid">
                <div className="btm-role-card">
                  <div className="btm-role-top">
                    <span className="btm-role-badge primary">메인 컬러</span>
                    <span className="btm-role-desc">주요 버튼·선택 탭</span>
                  </div>
                  <div className="btm-role-picker">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => updateBrandRoleColor("primary", e.target.value.toUpperCase())}
                      className="btm-color-well"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => updateBrandRoleColor("primary", e.target.value)}
                      className="btm-color-hex"
                      maxLength={7}
                    />
                  </div>
                  {uploadedImageSrc && extractedPalette.length > 0 && (
                    <div className="btm-role-swatches">
                      {extractedPalette.map((hex, idx) => {
                        const isMatched = primaryColor.toUpperCase() === hex.toUpperCase();
                        return (
                          <button
                            key={idx}
                            type="button"
                            className={`btm-role-dot ${isMatched ? "selected" : ""}`}
                            style={{ backgroundColor: hex }}
                            onClick={() => updateBrandRoleColor("primary", hex)}
                            title={`메인 컬러를 ${hex}로 변경`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="btm-role-card">
                  <div className="btm-role-top">
                    <span className="btm-role-badge secondary">보조 컬러</span>
                    <span className="btm-role-desc">서브 버튼·필터 칩</span>
                  </div>
                  <div className="btm-role-picker">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => updateBrandRoleColor("secondary", e.target.value.toUpperCase())}
                      className="btm-color-well"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => updateBrandRoleColor("secondary", e.target.value)}
                      className="btm-color-hex"
                      maxLength={7}
                    />
                  </div>
                  {uploadedImageSrc && extractedPalette.length > 0 && (
                    <div className="btm-role-swatches">
                      {extractedPalette.map((hex, idx) => {
                        const isMatched = secondaryColor.toUpperCase() === hex.toUpperCase();
                        return (
                          <button
                            key={idx}
                            type="button"
                            className={`btm-role-dot ${isMatched ? "selected" : ""}`}
                            style={{ backgroundColor: hex }}
                            onClick={() => updateBrandRoleColor("secondary", hex)}
                            title={`보조 컬러를 ${hex}로 변경`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="btm-role-card">
                  <div className="btm-role-top">
                    <span className="btm-role-badge surface">배경 컬러</span>
                    <span className="btm-role-desc">선택 행·호버 배경</span>
                  </div>
                  <div className="btm-role-picker">
                    <input
                      type="color"
                      value={surfaceColor}
                      onChange={(e) => updateBrandRoleColor("surface", e.target.value.toUpperCase())}
                      className="btm-color-well"
                    />
                    <input
                      type="text"
                      value={surfaceColor}
                      onChange={(e) => updateBrandRoleColor("surface", e.target.value)}
                      className="btm-color-hex"
                      maxLength={7}
                    />
                  </div>
                  {uploadedImageSrc && extractedPalette.length > 0 && (
                    <div className="btm-role-swatches">
                      {extractedPalette.map((hex, idx) => {
                        const isMatched = surfaceColor.toUpperCase() === hex.toUpperCase();
                        return (
                          <button
                            key={idx}
                            type="button"
                            className={`btm-role-dot ${isMatched ? "selected" : ""}`}
                            style={{ backgroundColor: hex }}
                            onClick={() => updateBrandRoleColor("surface", hex)}
                            title={`배경 컬러를 ${hex}로 변경`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="btm-preset-grid">
                {presetList.map((preset, idx) => {
                  const isSelected =
                    (preset.isDefault && isDefaultTheme) ||
                    (!preset.isDefault &&
                      !isDefaultTheme &&
                      primaryColor.toUpperCase() === preset.primary.toUpperCase() &&
                      secondaryColor.toUpperCase() === (preset.secondary || preset.primary).toUpperCase());
                  const canDelete = !preset.isSystem && !preset.isDefault;
                  return (
                    <div
                      key={preset.code || idx}
                      role="button"
                      tabIndex={0}
                      className={`btm-preset-pill ${isSelected ? "active" : ""}`}
                      onClick={() => handleSelectPreset(preset)}
                    >
                      <span className="btm-preset-dots">
                        <span className="btm-preset-circle" style={{ backgroundColor: preset.primary }} />
                        <span className="btm-preset-circle sub" style={{ backgroundColor: preset.secondary }} />
                        <span className="btm-preset-circle surface" style={{ backgroundColor: preset.surface || "#EFF6FF" }} />
                      </span>
                      <span className="btm-preset-label" title={preset.name}>{preset.name}</span>
                      {canDelete && (
                        <button
                          type="button"
                          className="btm-preset-del-btn"
                          onClick={(e) => handleDeletePreset(preset, e)}
                          title={`${preset.name} 프리셋 삭제`}
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
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
                  </div>
                </div>

                {/* C. 교차표 디자인 설정 (20개 영역 자동 배색) 미리보기 */}
                <div className="btm-crosstab-card">
                  <div className="btm-crosstab-head">
                    <span className="btm-crosstab-title">교차표 디자인 미리보기 (20개 영역 자동 배색)</span>
                    <span className="btm-crosstab-badge">표 디자인 설정 연동</span>
                  </div>
                  <div className="btm-crosstab-wrap">
                    <table className="btm-crosstab-table">
                      <colgroup>
                        <col className="col-stub-1" />
                        <col className="col-stub-2" />
                        <col className="col-stub-3" />
                        <col className="col-data" />
                        <col className="col-data" />
                        <col className="col-data" />
                        <col className="col-data" />
                        <col className="col-data" />
                      </colgroup>
                      <thead>
                        <tr>
                          <th
                            colSpan={3}
                            rowSpan={2}
                            style={{
                              backgroundColor: previewTable.theme_stub_header_bg,
                              color: previewTable.theme_stub_header_fg,
                            }}
                          >
                            구분
                          </th>
                          <th
                            rowSpan={2}
                            style={{
                              backgroundColor: previewTable.theme_header_group_bg,
                              color: previewTable.theme_header_group_fg,
                            }}
                          >
                            전체
                          </th>
                          <th
                            colSpan={2}
                            style={{
                              backgroundColor: previewTable.theme_header_group_bg,
                              color: previewTable.theme_header_group_fg,
                            }}
                          >
                            성별
                          </th>
                          <th
                            colSpan={2}
                            style={{
                              backgroundColor: previewTable.theme_header_group_bg,
                              color: previewTable.theme_header_group_fg,
                            }}
                          >
                            지역
                          </th>
                        </tr>
                        <tr>
                          <th
                            style={{
                              backgroundColor: previewTable.theme_primary,
                              color: previewTable.theme_primary_fg,
                            }}
                          >
                            남자
                          </th>
                          <th
                            style={{
                              backgroundColor: previewTable.theme_primary,
                              color: previewTable.theme_primary_fg,
                            }}
                          >
                            여자
                          </th>
                          <th
                            style={{
                              backgroundColor: previewTable.theme_primary,
                              color: previewTable.theme_primary_fg,
                            }}
                          >
                            수도권
                          </th>
                          <th
                            style={{
                              backgroundColor: previewTable.theme_primary,
                              color: previewTable.theme_primary_fg,
                            }}
                          >
                            비수도권
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* 1. Base 행 */}
                        <tr>
                          <td
                            rowSpan={5}
                            className="is-stub-group"
                            style={{
                              backgroundColor: previewTable.theme_stub_group_bg,
                              color: previewTable.theme_stub_group_fg,
                            }}
                          >
                            만족도
                          </td>
                          <td
                            className="is-stub-group"
                            style={{
                              backgroundColor: previewTable.theme_stub_group_bg,
                              color: previewTable.theme_stub_group_fg,
                            }}
                          >
                            기준
                          </td>
                          <td
                            className="is-stub-leaf"
                            style={{
                              backgroundColor: previewTable.theme_base_bg,
                              color: previewTable.theme_base_fg,
                            }}
                          >
                            Base
                          </td>
                          {["(500)", "(242)", "(258)", "(271)", "(229)"].map((v, i) => (
                            <td
                              key={i}
                              className="is-num"
                              style={{
                                backgroundColor: previewTable.theme_base_bg,
                                color: previewTable.theme_base_fg,
                              }}
                            >
                              {v}
                            </td>
                          ))}
                        </tr>
                        {/* 2. 그룹(STT) 행 */}
                        <tr>
                          <td
                            rowSpan={2}
                            className="is-stub-group"
                            style={{
                              backgroundColor: previewTable.theme_stub_group_bg,
                              color: previewTable.theme_stub_group_fg,
                            }}
                          >
                            긍정
                          </td>
                          <td
                            className="is-stub-leaf is-bold"
                            style={{
                              backgroundColor: previewTable.theme_group_preset_bg,
                              color: previewTable.theme_group_preset_fg,
                            }}
                          >
                            ▣Top2 (만족계)
                          </td>
                          {[
                            ["320", "64.0"],
                            ["150", "62.0"],
                            ["170", "65.9"],
                            ["185", "68.3"],
                            ["135", "59.0"],
                          ].map(([n, pct], i) => (
                            <td
                              key={i}
                              className="is-num"
                              style={{
                                backgroundColor: previewTable.theme_group_preset_bg,
                                color: previewTable.theme_group_preset_fg,
                              }}
                            >
                              <div className="btm-cell-main">{n}</div>
                              <div
                                className="btm-cell-sub"
                                style={{ color: previewTable.theme_text_muted }}
                              >
                                {pct}
                              </div>
                            </td>
                          ))}
                        </tr>
                        {/* 3. 일반 본문 행 */}
                        <tr>
                          <td
                            className="is-stub-leaf"
                            style={{
                              backgroundColor: previewTable.theme_stub_leaf_bg,
                              color: previewTable.theme_stub_leaf_fg,
                            }}
                          >
                            만족
                          </td>
                          {[
                            ["220", "44.0"],
                            ["100", "41.3"],
                            ["120", "46.5"],
                            ["135", "49.8"],
                            ["85", "37.1"],
                          ].map(([n, pct], i) => (
                            <td
                              key={i}
                              className="is-num"
                              style={{
                                backgroundColor: previewTable.theme_bg,
                                color: previewTable.theme_text,
                              }}
                            >
                              <div className="btm-cell-main">{n}</div>
                              <div
                                className="btm-cell-sub"
                                style={{ color: previewTable.theme_text_muted }}
                              >
                                {pct}
                              </div>
                            </td>
                          ))}
                        </tr>
                        {/* 4. 교차 행 (Stripe) */}
                        <tr>
                          <td
                            className="is-stub-group"
                            style={{
                              backgroundColor: previewTable.theme_stub_group_bg,
                              color: previewTable.theme_stub_group_fg,
                            }}
                          >
                            부정
                          </td>
                          <td
                            className="is-stub-leaf"
                            style={{
                              backgroundColor: previewTable.theme_stripe,
                              color: previewTable.theme_stub_leaf_fg,
                            }}
                          >
                            불만족
                          </td>
                          {[
                            ["180", "36.0"],
                            ["92", "38.0"],
                            ["88", "34.1"],
                            ["86", "31.7"],
                            ["94", "41.0"],
                          ].map(([n, pct], i) => (
                            <td
                              key={i}
                              className="is-num"
                              style={{
                                backgroundColor: previewTable.theme_stripe,
                                color: previewTable.theme_text,
                              }}
                            >
                              <div className="btm-cell-main">{n}</div>
                              <div
                                className="btm-cell-sub"
                                style={{ color: previewTable.theme_text_muted }}
                              >
                                {pct}
                              </div>
                            </td>
                          ))}
                        </tr>
                        {/* 5. 통계 행 (평균) */}
                        <tr>
                          <td
                            className="is-stub-group"
                            style={{
                              backgroundColor: previewTable.theme_stub_group_bg,
                              color: previewTable.theme_stub_group_fg,
                            }}
                          >
                            통계
                          </td>
                          <td
                            className="is-stub-leaf is-bold"
                            style={{
                              backgroundColor: previewTable.theme_etc_bg,
                              color: previewTable.theme_etc_fg,
                            }}
                          >
                            평균
                          </td>
                          {["3.2", "3.4", "3.1", "3.6", "3.0"].map((v, i) => (
                            <td
                              key={i}
                              className="is-num is-bold"
                              style={{
                                backgroundColor: previewTable.theme_etc_bg,
                                color: previewTable.theme_etc_fg,
                              }}
                            >
                              {v}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. 하단 푸터 */}
        <div className="btm-footer">
          <span className="btm-footer-guide">
            ※ 브랜드 테마 저장 시 사이드바·버튼·선택행 UI뿐만 아니라 [DP의뢰서 &gt; 표 설정]의 표 영역 색상도 함께 저장·적용됩니다.
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
