import { useState } from "react";
import PropTypes from "prop-types";
import { process } from "@progress/kendo-data-query";

export default function SortControl({ fields, dataState, setDataState }) {
  const [field, setField] = useState(fields[0]?.field ?? "");
  const [dir, setDir] = useState("asc");

  const apply = () => {
    const current = dataState?.data ?? [];
    const next = process(current, { sort: [{ field, dir }] }).data;
    setDataState(prev => ({ ...prev, data: next }));
  };

  const clear = () => {
    const current = dataState?.data ?? [];
    const next = process(current, { sort: [] }).data;
    setDataState(prev => ({ ...prev, data: next }));
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <span>정렬:</span>
      <select value={field} onChange={e => setField(e.target.value)}>
        {fields.map(f => (
          <option key={f.field} value={f.field}>{f.title ?? f.field}</option>
        ))}
      </select>
      <select value={dir} onChange={e => setDir(e.target.value)}>
        <option value="asc">오름차순</option>
        <option value="desc">내림차순</option>
      </select>
      <button type="button" onClick={apply}>적용</button>
      <button type="button" onClick={clear}>초기화</button>
    </div>
  );
}

SortControl.propTypes = {
  fields: PropTypes.array.isRequired,
  dataState: PropTypes.object.isRequired,
  setDataState: PropTypes.func.isRequired
};