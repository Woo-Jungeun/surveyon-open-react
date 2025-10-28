import React, { useMemo, useState, useEffect } from 'react';
import { GridColumnMenuSort } from '@progress/kendo-react-grid';
import { Checkbox, Input } from '@progress/kendo-react-inputs';
import { Button } from '@progress/kendo-react-buttons';

const styles = {
  wrap: { padding: 10, minWidth: 260 },
  section: { paddingBottom: 8, borderBottom: '1px solid #eee', marginBottom: 10 },
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  listRow: (hidden, locked) => ({
    display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
    color: hidden ? '#999' : 'inherit', opacity: locked ? 0.65 : 1
  }),
  badge: { marginLeft: 'auto', fontSize: 11, padding: '1px 6px', borderRadius: 999, background: '#f0f0f0', color: '#666' },
  controls: { display: 'flex', gap: 6 }
};

// ---------- helpers (필터 머지/추출) ----------
const getFilterForField = (filter, field) => {
  const list = Array.isArray(filter?.filters) ? filter.filters : [];
  return list.find(f => f?.field === field);
};
const mergeFilter = (prevFilter, nextForField, field) => {
  const list = Array.isArray(prevFilter?.filters) ? prevFilter.filters : [];
  const others = list.filter(f => f?.field !== field);
  const filters = nextForField ? [...others, nextForField] : others;
  return { logic: 'and', filters };
};

export default function ExcelColumnMenu(props) {
  const { columns = [], onColumnsChange, column, onFilterChange, filter, onSortChange } = props;

  // --------- 간단 필터(텍스트 1개 + 적용/지우기) ---------
  // 컬럼 타입(숫자면 number, 그 외 텍스트)
  const meta = columns.find(c => c.field === column.field);
  const isNumeric = meta?.type === 'number' || meta?.numeric === true;

  // 현재 필드에 적용된 값 읽어서 초기화
  const current = getFilterForField(filter, column.field);
  const initialValue =
    current?.value != null ? String(current.value) : '';

  const [value, setValue] = useState(initialValue);
  useEffect(() => setValue(initialValue), [initialValue, column.field]);

  const applySimpleFilter = () => {
    // 값 없으면 해당 필드의 필터 제거
    if (!value?.trim()) {
      onFilterChange?.(mergeFilter(filter, null, column.field));
      return;
    }
    // 숫자 컬럼 → eq 숫자, 그 외 → contains 문자열
    const next = isNumeric
      ? { field: column.field, operator: 'eq', value: Number(value) }
      : { field: column.field, operator: 'contains', value: value };

    onFilterChange?.(mergeFilter(filter, next, column.field));
  };

  const clearSimpleFilter = () => {
    setValue('');
    onFilterChange?.(mergeFilter(filter, null, column.field));
  };

  // --------- Columns Chooser 관련 ---------
  const [q, setQ] = useState('');
 
  const hideables = useMemo(
    () => columns.filter(c => c.allowHide !== false),
    [columns]
  );

  const setAll = (show) => {
    if (!onColumnsChange) return;
    const next = columns.map(c => (c.allowHide === false ? c : { ...c, show }));
    onColumnsChange(next);
  };

  const toggle = (field, show) => {
    if (!onColumnsChange) return;
    const col = columns.find(c => c.field === field);
    if (col?.allowHide === false) return;
    onColumnsChange(columns.map(c => (c.field === field ? { ...c, show } : c)));
  };

  return (
    <div style={styles.wrap}>
      {/* Sort */}
      <div style={styles.section}>
        <GridColumnMenuSort {...props} onSortChange={(sort) => onSortChange?.(sort)}/></div>

      {/* 간단 필터: 텍스트 + 적용/지우기만 표시 */}
      <div style={styles.section}>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Filter</div>
        <Input
          value={value}
          onChange={(e) => setValue(e.value)}
          placeholder={isNumeric ? '숫자 입력' : '텍스트 입력'}
          type={isNumeric ? 'number' : 'text'}
          style={{ marginBottom: 8 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <Button themeColor="primary" onClick={applySimpleFilter}>적용</Button>
          <Button onClick={clearSimpleFilter}>지우기</Button>
        </div>
      </div>

      {/* Columns Chooser */}
      {hideables.length > 0 && (
        <div>
          <div style={styles.headerRow}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Columns
            </div>
            <div style={styles.controls}>
              <Button size="small" fillMode="flat" onClick={() => setAll(true)}>모두 표시</Button>
              <Button size="small" fillMode="flat" onClick={() => setAll(false)}>모두 숨김</Button>
            </div>
          </div>

          <Input
            value={q}
            onChange={(e) => setQ(e.value)}
            placeholder="컬럼 검색"
            style={{ marginBottom: 8 }}
          />

          {hideables
            .filter(c => {
              const term = q.trim().toLowerCase();
              return !term || (c.title || c.field).toLowerCase().includes(term);
            })
            .map(c => {
              const hidden = c.show === false;
              return (
                <label key={c.field} style={styles.listRow(hidden, false)}>
                  <Checkbox
                    checked={c.show !== false}
                    onChange={(e) => toggle(c.field, e.value)}
                  />
                  <span>{c.title ?? c.field}</span>
                  {hidden && <span style={styles.badge}>숨김</span>}
                </label>
              );
            })}
        </div>
      )}
    </div>
  );
}