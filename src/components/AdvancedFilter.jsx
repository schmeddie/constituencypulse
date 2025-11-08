import { useState } from 'react';

const AdvancedFilter = ({ isOpen, onClose, onApplyFilter }) => {
  const [filters, setFilters] = useState([
    { id: 1, metric: '', operator: '>', value: '' }
  ]);

  const metrics = [
    { value: 'imd', label: 'Overall Deprivation (IMD)' },
    { value: 'income', label: 'Income Deprivation' },
    { value: 'education', label: 'Education Deprivation' },
    { value: 'employment', label: 'Employment Deprivation' },
    { value: 'health', label: 'Health Deprivation' },
    { value: 'crime', label: 'Crime Levels' },
    { value: 'housing', label: 'Housing Barriers' },
    { value: 'environment', label: 'Living Environment' },
    { value: 'age', label: 'Average Age' },
    { value: 'population', label: 'Population' },
    { value: 'ethnicityAsian', label: '% Asian Population' },
    { value: 'ethnicityBlack', label: '% Black Population' },
    { value: 'ethnicityMixed', label: '% Mixed Population' },
    { value: 'ethnicityWhite', label: '% White Population' },
  ];

  const operators = [
    { value: '>', label: 'Greater than (>)' },
    { value: '>=', label: 'Greater than or equal (≥)' },
    { value: '<', label: 'Less than (<)' },
    { value: '<=', label: 'Less than or equal (≤)' },
    { value: '=', label: 'Equal to (=)' },
  ];

  const addFilter = () => {
    const newId = Math.max(...filters.map(f => f.id)) + 1;
    setFilters([...filters, { id: newId, metric: '', operator: '>', value: '' }]);
  };

  const removeFilter = (id) => {
    if (filters.length > 1) {
      setFilters(filters.filter(f => f.id !== id));
    }
  };

  const updateFilter = (id, field, value) => {
    setFilters(filters.map(f =>
      f.id === id ? { ...f, [field]: value } : f
    ));
  };

  const handleApply = () => {
    // Validate all filters
    const validFilters = filters.filter(f =>
      f.metric && f.operator && f.value !== ''
    );

    if (validFilters.length === 0) {
      alert('Please add at least one complete filter');
      return;
    }

    onApplyFilter(validFilters);
  };

  const handleClear = () => {
    setFilters([{ id: 1, metric: '', operator: '>', value: '' }]);
    onApplyFilter([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border-grey">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-dark-grey">Advanced Filter</h2>
            <button
              onClick={onClose}
              className="text-medium-grey hover:text-dark-grey text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-medium-grey mt-2">
            Filter wards based on multiple criteria. All conditions must be met (AND logic).
          </p>
        </div>

        {/* Filter List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {filters.map((filter, index) => (
              <div key={filter.id} className="flex gap-3 items-start">
                {/* AND label for 2nd+ filters */}
                {index > 0 && (
                  <div className="text-sm font-semibold text-primary-blue pt-2 w-12">
                    AND
                  </div>
                )}
                {index === 0 && <div className="w-12"></div>}

                {/* Metric Selector */}
                <select
                  value={filter.metric}
                  onChange={(e) => updateFilter(filter.id, 'metric', e.target.value)}
                  className="flex-1 px-3 py-2 border border-border-grey rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue"
                >
                  <option value="">Select metric...</option>
                  {metrics.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>

                {/* Operator Selector */}
                <select
                  value={filter.operator}
                  onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)}
                  className="w-48 px-3 py-2 border border-border-grey rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue"
                >
                  {operators.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>

                {/* Value Input */}
                <input
                  type="number"
                  value={filter.value}
                  onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                  placeholder="Value"
                  className="w-32 px-3 py-2 border border-border-grey rounded-md focus:outline-none focus:ring-2 focus:ring-primary-blue"
                />

                {/* Remove Button */}
                <button
                  onClick={() => removeFilter(filter.id)}
                  disabled={filters.length === 1}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Remove filter"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          {/* Add Filter Button */}
          <button
            onClick={addFilter}
            className="mt-4 px-4 py-2 border-2 border-dashed border-border-grey text-medium-grey hover:border-primary-blue hover:text-primary-blue rounded-lg transition-colors w-full"
          >
            + Add Another Condition
          </button>

          {/* Example Filters */}
          <div className="mt-6 p-4 bg-light-grey rounded-lg">
            <h3 className="text-sm font-semibold text-dark-grey mb-2">Example Filters:</h3>
            <ul className="text-xs text-medium-grey space-y-1">
              <li>• High crime, young population: Crime &gt; 7 AND Average Age &lt; 35</li>
              <li>• Diverse, deprived areas: % Asian &gt; 20 AND Overall Deprivation &gt; 7</li>
              <li>• Specific demographics: % White &gt; 80 AND Population &gt; 10000</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border-grey flex gap-3">
          <button
            onClick={handleClear}
            className="flex-1 px-4 py-2 border border-border-grey rounded-md text-dark-grey hover:bg-light-grey transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-border-grey rounded-md text-dark-grey hover:bg-light-grey transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2 bg-primary-blue text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedFilter;
