import PropTypes from "prop-types";

export default function ColumnsControl({ columns, setColumns }) {
  const toggle = (field) => {
    setColumns(prev =>
      prev.map(c => c.field === field ? { ...c, hidden: !c.hidden } : c)
    );
  };

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <span>컬럼:</span>
      {columns.map(c => (
        <label key={c.field} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={!c.hidden}
            onChange={() => toggle(c.field)}
          />
          {c.title ?? c.field}
        </label>
      ))}
    </div>
  );
}

ColumnsControl.propTypes = {
  columns: PropTypes.array.isRequired,
  setColumns: PropTypes.func.isRequired
};