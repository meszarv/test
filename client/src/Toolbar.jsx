import React from 'react';

export default function Toolbar({ showGrid, toggleGrid, showBorders, toggleBorders }) {
  return (
    <div className="toolbar">
      <label>
        <input type="checkbox" checked={showGrid} onChange={toggleGrid} />
        Grid
      </label>
      <label>
        <input type="checkbox" checked={showBorders} onChange={toggleBorders} />
        Owned borders
      </label>
    </div>
  );
}
