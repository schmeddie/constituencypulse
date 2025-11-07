const LeftSidebar = ({ activeLayers, activeCategory, onToggleLayer, onCategoryChange }) => {
  const categories = [
    { id: 'all', label: 'All', color: 'bg-primary-blue' },
    { id: 'healthcare', label: 'Healthcare', color: 'bg-blue-500' },
    { id: 'education', label: 'Education', color: 'bg-green-500' },
    { id: 'transport', label: 'Transport', color: 'bg-orange-500' },
    { id: 'housing', label: 'Housing', color: 'bg-purple-500' },
    { id: 'environment', label: 'Environment', color: 'bg-emerald-500' },
  ];

  return (
    <aside className="w-72 bg-white border-r border-border-grey overflow-y-auto shadow-md">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-5 text-dark-grey">Data Layers</h2>

        {/* Deprivation Indices Section */}
        <div className="mb-8">
          <h3 className="text-xs font-semibold text-medium-grey uppercase tracking-wide mb-3">
            Deprivation Indices
          </h3>
          <div className="space-y-2">
            <LayerToggle
              label="IMD - Overall Deprivation"
              checked={activeLayers.imd}
              onChange={() => onToggleLayer('imd')}
            />
            <LayerToggle
              label="Income Deprivation"
              checked={activeLayers.income}
              onChange={() => onToggleLayer('income')}
            />
            <LayerToggle
              label="Education Deprivation"
              checked={activeLayers.education}
              onChange={() => onToggleLayer('education')}
            />
            <LayerToggle
              label="Employment Deprivation"
              checked={activeLayers.employment}
              onChange={() => onToggleLayer('employment')}
            />
            <LayerToggle
              label="Health Deprivation"
              checked={activeLayers.health}
              onChange={() => onToggleLayer('health')}
            />
            <LayerToggle
              label="Crime Levels"
              checked={activeLayers.crime}
              onChange={() => onToggleLayer('crime')}
            />
            <LayerToggle
              label="Housing Barriers"
              checked={activeLayers.housing}
              onChange={() => onToggleLayer('housing')}
            />
            <LayerToggle
              label="Living Environment"
              checked={activeLayers.environment}
              onChange={() => onToggleLayer('environment')}
            />
          </div>
        </div>

        {/* Events & Activities Section */}
        <div className="mb-8">
          <h3 className="text-xs font-semibold text-medium-grey uppercase tracking-wide mb-3">
            Events & Activities
          </h3>
          <div className="space-y-2">
            <LayerToggle
              label="Local Events"
              checked={activeLayers.events}
              onChange={() => onToggleLayer('events')}
            />
          </div>
        </div>

        {/* Political Data Section */}
        <div className="mb-8">
          <h3 className="text-xs font-semibold text-medium-grey uppercase tracking-wide mb-3">
            Political Data
          </h3>
          <div className="space-y-2">
            <LayerToggle
              label="Voting Intention"
              checked={activeLayers.voting}
              onChange={() => onToggleLayer('voting')}
            />
            <LayerToggle
              label="Voter Turnout"
              checked={activeLayers.turnout}
              onChange={() => onToggleLayer('turnout')}
            />
          </div>
        </div>

        {/* Event Categories Section */}
        <div className="mb-8">
          <h3 className="text-xs font-semibold text-medium-grey uppercase tracking-wide mb-3">
            Event Categories
          </h3>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={`px-3.5 py-2 text-xs font-medium rounded-md transition-all ${
                  activeCategory === category.id
                    ? `${category.color} text-white border-transparent`
                    : 'bg-white text-medium-grey border border-border-grey hover:border-primary-blue hover:text-primary-blue'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

const LayerToggle = ({ label, checked, onChange }) => {
  return (
    <label className="flex items-center py-2 px-2 -mx-2 cursor-pointer hover:bg-light-grey rounded-md transition-all">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4.5 h-4.5 mr-3 cursor-pointer accent-primary-blue"
      />
      <span className="text-sm text-dark-grey select-none">{label}</span>
    </label>
  );
};

export default LeftSidebar;
