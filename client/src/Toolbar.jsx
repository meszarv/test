import React from 'react';

export default function Toolbar({ showGrid, toggleGrid, showBorders, toggleBorders, resetPixels }) {
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
      <button onClick={resetPixels}>Reset pixels</button>
    </div>
  );
}
