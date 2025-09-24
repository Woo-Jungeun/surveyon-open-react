// 숫자 인식 자연 정렬 키 ("A2" -> "A0000000002")
export const natKey = (s, pad = 10) =>
  String(s ?? '').replace(/\d+/g, d => String(d).padStart(pad, '0'));

/**
 * 정렬 프록시 필드 생성
 * rows: 원본 배열
 * spec: { [field]: 'nat' | (row) => any }  // 'nat'이면 natKey(row[field]) 사용
 * opts: { prefix?: string, pad?: number }
 */
export const buildSortProxy = (rows = [], spec = {}, { prefix = '__sort__', pad = 10 } = {}) => {
  const proxyField = {};
  const data = (rows || []).map(r => {
    let next = r;
    for (const [field, fn] of Object.entries(spec)) {
      const pf = `${prefix}${field}`;
      proxyField[field] = pf;
      const val = fn === 'nat' ? natKey(r?.[field], pad)
        : (typeof fn === 'function' ? fn(r) : r?.[field]);
      if (next[pf] !== val) next = { ...next, [pf]: val };
    }
    return next;
  });
  return { data, proxyField };
};

// SortDescriptor[] 의 field 를 프록시 필드로 매핑
export const mapSortFields = (sort = [], proxyField = {}) =>
  (sort || []).map(s => (proxyField[s?.field] ? { ...s, field: proxyField[s.field] } : s));

// 프록시 → 원본 필드로 되돌리기(상태/퍼시스턴스는 원본 기준으로 저장하고 싶을 때)
export const unmapSortFields = (sort = [], proxyField = {}) => {
  const inv = Object.fromEntries(Object.entries(proxyField).map(([k, v]) => [v, k]));
  return (sort || []).map(s => (inv[s?.field] ? { ...s, field: inv[s.field] } : s));
};

import { orderBy } from '@progress/kendo-data-query';

/**
 * 한 번에: 프록시 생성 + sort 매핑 + 정렬
 * 반환: { data, mappedSort, proxyField }
 */
export const orderByWithProxy = (rows, sort, spec, opts) => {
  const { data, proxyField } = buildSortProxy(rows, spec, opts);
  const mappedSort = mapSortFields(sort, proxyField);
  return { data: orderBy(data, mappedSort), mappedSort, proxyField };
};
