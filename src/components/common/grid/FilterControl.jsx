import { useState } from "react";
import PropTypes from "prop-types";
import { process } from "@progress/kendo-data-query";

export default function FilterControl({ fields, dataState, setDataState }) {
  const [field, setField] = useState(fields[0]?.field ?? "");
  const [operator, setOperator] = useState("contains");
  const [value, setValue] = useState("");

  const apply = () => {
    const current = dataState?.data ?? [];
    const filter = {
      logic: "and",
      filters: value ? [{ field, operator, value }] : []
    };
    const next = process(current, { filter }).data;
    setDataState(prev => ({ ...prev, data: next }));
  };

  const clear = () => {
    const current = dataState?.data ?? [];
    const next = process(current, { filter: undefined }).data;
    setDataState(prev => ({ ...prev, data: next }));
    setValue("");
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <span>필터:</span>
      <select value={field} onChange={e => setField(e.target.value)}>
        {fields.map(f => (
          <option key={f.field} value={f.field}>{f.title ?? f.field}</option>
        ))}
      </select>
      <select value={operator} onChange={e => setOperator(e.target.value)}>
        <option value="contains">포함</option>
        <option value="eq">일치</option>
        <option value="neq">불일치</option>
        <option value="startswith">시작</option>
        <option value="endswith">끝</option>
      </select>
      <input value={value} onChange={e => setValue(e.target.value)} placeholder="값 입력" />
      <button type="button" onClick={apply}>적용</button>
      <button type="button" onClick={clear}>초기화</button>
    </div>
  );
}

FilterControl.propTypes = {
  fields: PropTypes.array.isRequired,
  dataState: PropTypes.object.isRequired,
  setDataState: PropTypes.func.isRequired
};