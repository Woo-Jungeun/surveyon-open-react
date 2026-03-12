export const CHART_PALETTES = {
    // 1. Classic (Original default - 20 colors)
    default: [
        "#60a5fa", "#a78bfa", "#f472b6", "#fb923c", "#34d399", "#2dd4bf", "#facc15", "#fb7185", "#818cf8", "#a3e635", "#ef4444", "#f87171",
        "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#14b8a6", "#eab308", "#f43f5e", "#6366f1", "#84cc16", "#dc2626", "#ef4444"
    ],

    // 2. Professional (Modern and clean - 20 colors)
    professional: [
        "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#3b82f6", "#f43f5e", "#84cc16",
        "#4338ca", "#b45309", "#047857", "#b91c1c", "#6d28d9", "#be185d", "#0e7490", "#c2410c", "#0f766e", "#1d4ed8", "#9f1239", "#4d7c0f"
    ],

    // 3. Tableau 20 (The BI standard - 20 colors)
    tableau: [
        "#4E79A7", "#A0CBE8", "#F28E2B", "#FFBE7D", "#59A14F", "#8CD17D", "#B6992D", "#F1CE63", "#499894", "#86BCB6",
        "#E15759", "#FF9D9A", "#79706E", "#BAB0AC", "#D37295", "#FABFD2", "#B07AA1", "#D4A5A7", "#9D7660", "#D7B5A6"
    ],

    // 4. Soft Pastel (Eye-friendly - 20 colors)
    pastel: [
        "#bae6fd", "#fef08a", "#bbf7d0", "#fecaca", "#ddd6fe", "#fbcfe8", "#cffafe", "#fed7aa", "#d9f99d", "#e9d5ff", "#f5d0fe", "#fce7f3",
        "#7dd3fc", "#fde047", "#86efac", "#fca5a5", "#c4b5fd", "#f9a8d4", "#a5f3fc", "#fdba74", "#bef264", "#d8b4fe", "#f0abfc", "#f9a8d4"
    ],

    // 5. Vivid Bold (High energy - 20 colors)
    vivid: [
        "#003f5c", "#2f4b7c", "#665191", "#a05195", "#d45087", "#f95d6a", "#ff7c43", "#ffa600", "#115f9a", "#1984c5", "#22a7f0", "#48cae4",
        "#004c6a", "#3c5e8b", "#7876a3", "#ae8fb1", "#e0abcf", "#ffcaea", "#ff8a5c", "#ff9e00", "#1a73e8", "#24b1d5", "#48c78e", "#00d1b2"
    ],

    // 6. Ocean Blue (Professional blue tones - 20 colors)
    ocean: [
        "#0ea5e9", "#bae6fd", "#075985", "#0284c7", "#0369a1", "#0c4a6e", "#38bdf8", "#7dd3fc", "#e0f2fe", "#f0f9ff",
        "#1d4ed8", "#1e40af", "#1e3a8a", "#172554", "#2563eb", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe", "#eff6ff"
    ],

    // 7. Forest Green (Calm green tones - 20 colors)
    forest: [
        "#10b981", "#a7f3d0", "#064e3b", "#059669", "#047857", "#065f46", "#34d399", "#6ee7b7", "#d1fae5", "#ecfdf5",
        "#15803d", "#166534", "#14532d", "#052e16", "#16a34a", "#4ade80", "#86efac", "#bbf7d0", "#dcfce7", "#f0fdf4"
    ],

    // 8. Sunset Orange (Warm energetic tones - 20 colors)
    sunset: [
        "#f59e0b", "#fde68a", "#92400e", "#d97706", "#b45309", "#78350f", "#fbbf24", "#fcd34d", "#fef3c7", "#fffbeb",
        "#ea580c", "#c2410c", "#9a3412", "#7c2d12", "#fb923c", "#fdba74", "#fed7aa", "#ffedd5", "#fff7ed", "#9a3412"
    ],

    // 9. Slate Gray (Modern minimalist tones - 20 colors)
    slate: [
        "#475569", "#cbd5e1", "#0f172a", "#334155", "#1e293b", "#020617", "#64748b", "#94a3b8", "#e2e8f0", "#f1f5f9",
        "#374151", "#1f2937", "#111827", "#030712", "#4b5563", "#6b7280", "#9ca3af", "#d1d5db", "#e5e7eb", "#f3f4f6"
    ],

    // 10. Elegant Purple (Premium creative tones - 20 colors)
    premium: [
        "#8b5cf6", "#ddd6fe", "#4c1d95", "#7c3aed", "#6d28d9", "#5b21b6", "#a78bfa", "#c4b5fd", "#ede9fe", "#f5f3ff",
        "#7e22ce", "#6b21a8", "#581c87", "#3b0764", "#9333ea", "#a855f7", "#c084fc", "#d8b4fe", "#e9d5ff", "#f3e8ff"
    ]
};

export const CHART_THEME_OPTIONS = [
    { id: 'default', name: '기본 테마 (Classic)', preview: ["#60a5fa", "#a78bfa", "#f472b6"] },
    { id: 'professional', name: '프로페셔널', preview: ["#6366f1", "#f59e0b", "#10b981"] },
    { id: 'tableau', name: '태블로 20', preview: ["#4E79A7", "#F28E2B", "#59A14F"] },
    { id: 'pastel', name: '파스텔 드림', preview: ["#bae6fd", "#fef08a", "#bbf7d0"] },
    { id: 'ocean', name: '오션 블루', preview: ["#0ea5e9", "#bae6fd", "#075985"] },
    { id: 'forest', name: '포레스트 그린', preview: ["#10b981", "#a7f3d0", "#064e3b"] },
    { id: 'sunset', name: '선셋 오렌지', preview: ["#f59e0b", "#fde68a", "#92400e"] },
    { id: 'slate', name: '슬레이트 그레이', preview: ["#475569", "#cbd5e1", "#0f172a"] },
    { id: 'premium', name: '엘레강트 퍼플', preview: ["#8b5cf6", "#ddd6fe", "#4c1d95"] },
    { id: 'vivid', name: '비비드 볼드', preview: ["#003f5c", "#2f4b7c", "#665191"] }
];
