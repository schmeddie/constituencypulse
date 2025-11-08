/**
 * Drawing Controls for custom region selection
 * Provides UI controls for drawing polygons on the map
 */
const DrawingControls = ({ isDrawing, onStartDrawing, onCancelDrawing, onFinishDrawing, pointCount }) => {
  if (!isDrawing) {
    return (
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={onStartDrawing}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-lg"
        >
          Draw Custom Region
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-xl p-4 border border-border-grey">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-dark-grey mb-1">Drawing Mode Active</h3>
        <p className="text-xs text-medium-grey">
          Click on the map to add points. Need at least 3 points to create a region.
        </p>
      </div>

      <div className="mb-3 py-2 px-3 bg-light-grey rounded text-center">
        <span className="text-sm text-dark-grey">
          Points: <span className="font-bold text-primary-blue">{pointCount}</span>
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onCancelDrawing}
          className="flex-1 px-3 py-2 border border-border-grey rounded-md text-dark-grey hover:bg-light-grey transition-colors text-sm"
        >
          Cancel
        </button>
        <button
          onClick={onFinishDrawing}
          disabled={pointCount < 3}
          className="flex-1 px-3 py-2 bg-primary-blue text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Analyze Region
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-border-grey">
        <p className="text-xs text-medium-grey">
          Click "Analyze Region" when done, or "Cancel" to exit drawing mode.
        </p>
      </div>
    </div>
  );
};

export default DrawingControls;
