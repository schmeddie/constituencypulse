import { useState, useRef } from 'react';

const LeftSidebar = ({ activeLayers, activeCategory, onToggleLayer, onCategoryChange, onFindCorrelation, onShowRankings, onShowFilter, activeFiltersCount, onShowComparison, onShowNationalPredictor }) => {
  const [expandedSubmenu, setExpandedSubmenu] = useState(null);
  const [submenuPosition, setSubmenuPosition] = useState({ top: 0 });
  const ethnicityTriggerRef = useRef(null);
  const economicActivityTriggerRef = useRef(null);
  const countryOfBirthTriggerRef = useRef(null);
  const religionTriggerRef = useRef(null);
  const housingTenureTriggerRef = useRef(null);
  const qualificationsTriggerRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  const categories = [
    { id: 'all', label: 'All', color: 'bg-primary-blue' },
    { id: 'healthcare', label: 'Healthcare', color: 'bg-blue-500' },
    { id: 'education', label: 'Education', color: 'bg-green-500' },
    { id: 'transport', label: 'Transport', color: 'bg-orange-500' },
    { id: 'housing', label: 'Housing', color: 'bg-purple-500' },
    { id: 'environment', label: 'Environment', color: 'bg-emerald-500' },
  ];

  const handleSubmenuTriggerMouseEnter = (menuName, triggerRef) => {
    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setSubmenuPosition({ top: rect.top });
      setExpandedSubmenu(menuName);
    }
  };

  const handleSubmenuTriggerMouseLeave = () => {
    // Delay closing to allow moving to submenu
    closeTimeoutRef.current = setTimeout(() => {
      setExpandedSubmenu(null);
    }, 150);
  };

  const handleSubmenuMouseEnter = () => {
    // Clear any pending close timeout when entering submenu
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleSubmenuMouseLeave = () => {
    // Close immediately when leaving submenu
    setExpandedSubmenu(null);
  };

  return (
    <aside className="w-72 bg-white border-r border-border-grey shadow-md flex flex-col">
      <div className="p-6 overflow-y-auto flex-1">
        <h2 className="text-lg font-semibold mb-5 text-dark-grey">Data Layers</h2>

        {/* Action Buttons */}
        <div className="mb-6 space-y-3">
          <button
            onClick={onFindCorrelation}
            className="w-full px-4 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-sm"
          >
            Find Correlation
          </button>
          <button
            onClick={onShowRankings}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
          >
            Ward Rankings
          </button>
          <button
            onClick={onShowFilter}
            className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm relative"
          >
            Advanced Filter
            {activeFiltersCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <button
            onClick={onShowComparison}
            className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium shadow-sm"
          >
            Compare Constituencies
          </button>
          <button
            onClick={onShowNationalPredictor}
            className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-blue-600 text-white rounded-lg hover:from-red-700 hover:to-blue-700 transition-colors font-medium shadow-sm"
          >
            🗳️ Predict Election
          </button>
        </div>

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

        {/* Demographics Section */}
        <div className="mb-8">
          <h3 className="text-xs font-semibold text-medium-grey uppercase tracking-wide mb-3">
            Demographics
          </h3>
          <div className="space-y-2">
            <LayerToggle
              label="Average Age"
              checked={activeLayers.age}
              onChange={() => onToggleLayer('age')}
            />
            <LayerToggle
              label="Population Density"
              checked={activeLayers.populationDensity}
              onChange={() => onToggleLayer('populationDensity')}
            />
          </div>
        </div>

        {/* Ethnicity Section with Submenu */}
        <div className="mb-8 overflow-visible">
          <h3 className="text-xs font-semibold text-medium-grey uppercase tracking-wide mb-3">
            Ethnicity
          </h3>
          <div className="space-y-2 overflow-visible">
            <div
              ref={ethnicityTriggerRef}
              className="relative overflow-visible"
              onMouseEnter={() => handleSubmenuTriggerMouseEnter('ethnicity', ethnicityTriggerRef)}
              onMouseLeave={handleSubmenuTriggerMouseLeave}
            >
              <div className="py-2 px-2 -mx-2 cursor-pointer hover:bg-light-grey rounded-md transition-all">
                <span className="text-sm text-dark-grey select-none">Ethnicity Breakdown →</span>
              </div>

              {expandedSubmenu === 'ethnicity' && (
                <div
                  className="fixed left-72 w-56 bg-white border border-border-grey rounded-lg shadow-lg p-2 z-50"
                  style={{top: `${submenuPosition.top}px`}}
                  onMouseEnter={handleSubmenuMouseEnter}
                  onMouseLeave={handleSubmenuMouseLeave}
                >
                  <LayerToggle
                    label="% Asian"
                    checked={activeLayers.ethnicityAsian}
                    onChange={() => onToggleLayer('ethnicityAsian')}
                  />
                  <LayerToggle
                    label="% Black"
                    checked={activeLayers.ethnicityBlack}
                    onChange={() => onToggleLayer('ethnicityBlack')}
                  />
                  <LayerToggle
                    label="% Mixed"
                    checked={activeLayers.ethnicityMixed}
                    onChange={() => onToggleLayer('ethnicityMixed')}
                  />
                  <LayerToggle
                    label="% White"
                    checked={activeLayers.ethnicityWhite}
                    onChange={() => onToggleLayer('ethnicityWhite')}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Census 2021 Section with Submenus */}
        <div className="mb-8 overflow-visible">
          <h3 className="text-xs font-semibold text-medium-grey uppercase tracking-wide mb-3">
            Census 2021
          </h3>
          <div className="space-y-2 overflow-visible">
            {/* Economic Activity Submenu */}
            <div
              ref={economicActivityTriggerRef}
              className="relative overflow-visible"
              onMouseEnter={() => handleSubmenuTriggerMouseEnter('economicActivity', economicActivityTriggerRef)}
              onMouseLeave={handleSubmenuTriggerMouseLeave}
            >
              <div className="py-2 px-2 -mx-2 cursor-pointer hover:bg-light-grey rounded-md transition-all">
                <span className="text-sm text-dark-grey select-none">Economic Activity →</span>
              </div>

              {expandedSubmenu === 'economicActivity' && (
                <div
                  className="fixed left-72 w-56 bg-white border border-border-grey rounded-lg shadow-lg p-2 z-50"
                  style={{top: `${submenuPosition.top}px`}}
                  onMouseEnter={handleSubmenuMouseEnter}
                  onMouseLeave={handleSubmenuMouseLeave}
                >
                  <LayerToggle
                    label="% Employed"
                    checked={activeLayers.economicEmployed}
                    onChange={() => onToggleLayer('economicEmployed')}
                  />
                  <LayerToggle
                    label="% Self-Employed"
                    checked={activeLayers.economicSelfEmployed}
                    onChange={() => onToggleLayer('economicSelfEmployed')}
                  />
                  <LayerToggle
                    label="% Unemployed"
                    checked={activeLayers.economicUnemployed}
                    onChange={() => onToggleLayer('economicUnemployed')}
                  />
                  <LayerToggle
                    label="% Retired"
                    checked={activeLayers.economicRetired}
                    onChange={() => onToggleLayer('economicRetired')}
                  />
                  <LayerToggle
                    label="% Students"
                    checked={activeLayers.economicStudent}
                    onChange={() => onToggleLayer('economicStudent')}
                  />
                </div>
              )}
            </div>

            {/* Country of Birth Submenu */}
            <div
              ref={countryOfBirthTriggerRef}
              className="relative overflow-visible"
              onMouseEnter={() => handleSubmenuTriggerMouseEnter('countryOfBirth', countryOfBirthTriggerRef)}
              onMouseLeave={handleSubmenuTriggerMouseLeave}
            >
              <div className="py-2 px-2 -mx-2 cursor-pointer hover:bg-light-grey rounded-md transition-all">
                <span className="text-sm text-dark-grey select-none">Country of Birth →</span>
              </div>

              {expandedSubmenu === 'countryOfBirth' && (
                <div
                  className="fixed left-72 w-56 bg-white border border-border-grey rounded-lg shadow-lg p-2 z-50"
                  style={{top: `${submenuPosition.top}px`}}
                  onMouseEnter={handleSubmenuMouseEnter}
                  onMouseLeave={handleSubmenuMouseLeave}
                >
                  <LayerToggle
                    label="% UK Born"
                    checked={activeLayers.ukBorn}
                    onChange={() => onToggleLayer('ukBorn')}
                  />
                  <LayerToggle
                    label="% EU Born"
                    checked={activeLayers.euBorn}
                    onChange={() => onToggleLayer('euBorn')}
                  />
                  <LayerToggle
                    label="% Non-EU Born"
                    checked={activeLayers.nonEuBorn}
                    onChange={() => onToggleLayer('nonEuBorn')}
                  />
                </div>
              )}
            </div>

            {/* Religion Submenu */}
            <div
              ref={religionTriggerRef}
              className="relative overflow-visible"
              onMouseEnter={() => handleSubmenuTriggerMouseEnter('religion', religionTriggerRef)}
              onMouseLeave={handleSubmenuTriggerMouseLeave}
            >
              <div className="py-2 px-2 -mx-2 cursor-pointer hover:bg-light-grey rounded-md transition-all">
                <span className="text-sm text-dark-grey select-none">Religion →</span>
              </div>

              {expandedSubmenu === 'religion' && (
                <div
                  className="fixed left-72 w-56 bg-white border border-border-grey rounded-lg shadow-lg p-2 z-50"
                  style={{top: `${submenuPosition.top}px`}}
                  onMouseEnter={handleSubmenuMouseEnter}
                  onMouseLeave={handleSubmenuMouseLeave}
                >
                  <LayerToggle
                    label="% Christian"
                    checked={activeLayers.religionChristian}
                    onChange={() => onToggleLayer('religionChristian')}
                  />
                  <LayerToggle
                    label="% Muslim"
                    checked={activeLayers.religionMuslim}
                    onChange={() => onToggleLayer('religionMuslim')}
                  />
                  <LayerToggle
                    label="% Hindu"
                    checked={activeLayers.religionHindu}
                    onChange={() => onToggleLayer('religionHindu')}
                  />
                  <LayerToggle
                    label="% Sikh"
                    checked={activeLayers.religionSikh}
                    onChange={() => onToggleLayer('religionSikh')}
                  />
                  <LayerToggle
                    label="% Jewish"
                    checked={activeLayers.religionJewish}
                    onChange={() => onToggleLayer('religionJewish')}
                  />
                  <LayerToggle
                    label="% No Religion"
                    checked={activeLayers.religionNone}
                    onChange={() => onToggleLayer('religionNone')}
                  />
                </div>
              )}
            </div>

            {/* Housing Tenure Submenu */}
            <div
              ref={housingTenureTriggerRef}
              className="relative overflow-visible"
              onMouseEnter={() => handleSubmenuTriggerMouseEnter('housingTenure', housingTenureTriggerRef)}
              onMouseLeave={handleSubmenuTriggerMouseLeave}
            >
              <div className="py-2 px-2 -mx-2 cursor-pointer hover:bg-light-grey rounded-md transition-all">
                <span className="text-sm text-dark-grey select-none">Housing Tenure →</span>
              </div>

              {expandedSubmenu === 'housingTenure' && (
                <div
                  className="fixed left-72 w-56 bg-white border border-border-grey rounded-lg shadow-lg p-2 z-50"
                  style={{top: `${submenuPosition.top}px`}}
                  onMouseEnter={handleSubmenuMouseEnter}
                  onMouseLeave={handleSubmenuMouseLeave}
                >
                  <LayerToggle
                    label="% Owned Outright"
                    checked={activeLayers.housingOwnedOutright}
                    onChange={() => onToggleLayer('housingOwnedOutright')}
                  />
                  <LayerToggle
                    label="% Owned with Mortgage"
                    checked={activeLayers.housingOwnedMortgage}
                    onChange={() => onToggleLayer('housingOwnedMortgage')}
                  />
                  <LayerToggle
                    label="% Social Rented"
                    checked={activeLayers.housingSocialRented}
                    onChange={() => onToggleLayer('housingSocialRented')}
                  />
                  <LayerToggle
                    label="% Private Rented"
                    checked={activeLayers.housingPrivateRented}
                    onChange={() => onToggleLayer('housingPrivateRented')}
                  />
                </div>
              )}
            </div>

            {/* Qualifications Submenu */}
            <div
              ref={qualificationsTriggerRef}
              className="relative overflow-visible"
              onMouseEnter={() => handleSubmenuTriggerMouseEnter('qualifications', qualificationsTriggerRef)}
              onMouseLeave={handleSubmenuTriggerMouseLeave}
            >
              <div className="py-2 px-2 -mx-2 cursor-pointer hover:bg-light-grey rounded-md transition-all">
                <span className="text-sm text-dark-grey select-none">Qualifications →</span>
              </div>

              {expandedSubmenu === 'qualifications' && (
                <div
                  className="fixed left-72 w-56 bg-white border border-border-grey rounded-lg shadow-lg p-2 z-50"
                  style={{top: `${submenuPosition.top}px`}}
                  onMouseEnter={handleSubmenuMouseEnter}
                  onMouseLeave={handleSubmenuMouseLeave}
                >
                  <LayerToggle
                    label="% No Qualifications"
                    checked={activeLayers.qualificationsNone}
                    onChange={() => onToggleLayer('qualificationsNone')}
                  />
                  <LayerToggle
                    label="% Level 1-3"
                    checked={activeLayers.qualificationsLevel1to3}
                    onChange={() => onToggleLayer('qualificationsLevel1to3')}
                  />
                  <LayerToggle
                    label="% Level 4+ (Degree)"
                    checked={activeLayers.qualificationsLevel4Plus}
                    onChange={() => onToggleLayer('qualificationsLevel4Plus')}
                  />
                  <LayerToggle
                    label="% Apprenticeship"
                    checked={activeLayers.qualificationsApprenticeship}
                    onChange={() => onToggleLayer('qualificationsApprenticeship')}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Political Predictions Section */}
        <div className="mb-8">
          <h3 className="text-xs font-semibold text-medium-grey uppercase tracking-wide mb-3">
            Political Predictions
          </h3>
          <div className="space-y-2">
            <LayerToggle
              label="2025 Election Prediction"
              checked={activeLayers.prediction2025}
              onChange={() => onToggleLayer('prediction2025')}
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
