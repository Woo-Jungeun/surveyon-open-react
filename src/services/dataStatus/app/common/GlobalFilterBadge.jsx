import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Filter } from 'lucide-react';
import { DpRequestPageApi } from '../hsrt/dpRequest/DpRequestPageApi';

/**
 * 표설정 범용 데이터 필터 적용 힌트 배지 (읽기 전용)
 * - 교차분석/추가분석 상단 필터 영역에 표시
 * - table/detail 의 data_filter_badges 가 1개 이상일 때만 노출
 * - 범용 필터는 각 화면 로컬 필터와 서버에서 AND 결합됨 (팝업 목록에는 섞지 않음)
 */
const GlobalFilterBadge = () => {
    const auth = useSelector((store) => store.auth);
    const { getTableDetail } = DpRequestPageApi();
    const [info, setInfo] = useState({ badges: [], expression: '' });

    useEffect(() => {
        const load = async () => {
            const pageId = sessionStorage.getItem('pageId');
            const user = auth?.user?.userId;
            if (!pageId || !user) return;
            try {
                const res = await getTableDetail.mutateAsync({ pageid: pageId, user });
                const d = res?.resultjson || res || {};
                setInfo({
                    badges: Array.isArray(d.data_filter_badges) ? d.data_filter_badges : [],
                    expression: d.data_filter_expression || '',
                });
            } catch (e) {
                console.error('Failed to load global data filter:', e);
            }
        };
        load();
        window.addEventListener('pageSelected', load);
        return () => window.removeEventListener('pageSelected', load);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth?.user?.userId]);

    if (info.badges.length === 0) return null;

    // 툴팁: 조건식 + 문항별 보기 목록
    const groups = new Map();
    info.badges.forEach(b => {
        const k = b.variable_id || b.id;
        if (!groups.has(k)) groups.set(k, { label: b.variable_label || k, items: [] });
        groups.get(k).items.push(b.category_label || b.display_label);
    });
    const tooltip = [
        '표설정 범용 필터가 항상 AND 결합되어 적용됩니다.',
        ...Array.from(groups.values()).map(g => `· ${g.label} [${g.items.join(', ')}]`),
        info.expression ? `\n조건식: ${info.expression}` : '',
    ].join('\n');

    return (
        <span
            id="global-data-filter-badge"
            title={tooltip}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
                padding: '3px 8px', borderRadius: 4, cursor: 'help', whiteSpace: 'nowrap',
                background: '#FFFBEB', border: '1px solid #FDE68A', color: '#B45309',
            }}
        >
            <Filter size={12} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>범용 필터 적용 중 ({groups.size}개 문항)</span>
        </span>
    );
};

export default GlobalFilterBadge;
