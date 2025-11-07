import { useEffect, useState } from 'react';
import { Zap, Calendar, TrendingUp } from 'lucide-react';

const RightSidebar = ({ constituency, events, mapBounds, demographicData, activeLayers }) => {
  const [stats, setStats] = useState({
    population: 0,
    voters: 0,
    turnout: 72,
    medianIncome: 32400,
  });

  const [insights, setInsights] = useState({
    topIssues: [],
    upcomingEvents: [],
    sentiment: '',
  });

  // Update statistics when constituency data changes
  useEffect(() => {
    if (constituency && constituency.wards) {
      // Calculate total population from all wards
      const totalPop = constituency.wards.reduce((sum, ward) => {
        return sum + (ward.demographics?.population || 0);
      }, 0);

      // Calculate registered voters (population aged 16+)
      // Total population - population aged 0-15
      const population0to15 = constituency.wards.reduce((sum, ward) => {
        return sum + (ward.demographics?.population0to15 || 0);
      }, 0);

      const totalVoters = totalPop - population0to15;

      setStats({
        population: totalPop,
        voters: totalVoters,
        turnout: 72, // Keep static for now
        medianIncome: 32400, // Keep static for now
      });
    }
  }, [constituency]);

  // Update insights based on visible events
  useEffect(() => {
    if (events && events.length > 0) {
      // Calculate top issues from event categories
      const categoryCount = {};
      events.forEach(event => {
        categoryCount[event.category] = (categoryCount[event.category] || 0) + 1;
      });

      const topIssues = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category, count]) => ({
          name: capitalizeFirst(category),
          percentage: Math.round((count / events.length) * 100),
          description: getIssueDescription(category),
        }));

      // Get upcoming events (sorted by date)
      const upcoming = [...events]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 3);

      setInsights({
        topIssues,
        upcomingEvents: upcoming,
        sentiment: generateSentiment(activeLayers),
      });
    }
  }, [events, activeLayers]);

  return (
    <aside className="w-80 bg-white border-l border-border-grey overflow-y-auto shadow-md">
      <div className="p-6">
        {/* Constituency Overview */}
        <div className="mb-8 fade-in">
          <h2 className="text-lg font-semibold mb-5 text-dark-grey">Constituency Overview</h2>

          <div className="grid grid-cols-2 gap-4">
            <StatCard value={stats.population.toLocaleString()} label="Total Population" sublabel="(estimated)" />
            <StatCard value={stats.voters.toLocaleString()} label="Registered Voters" sublabel="(estimated)" />
            <StatCard value={`${stats.turnout}%`} label="Turnout (2024)" />
            <StatCard value={`£${stats.medianIncome.toLocaleString()}`} label="Median Income" />
          </div>
        </div>

        {/* AI Insights */}
        <div className="mb-6 fade-in">
          <h2 className="text-lg font-semibold mb-5 text-dark-grey">AI Insights</h2>

          {/* Top Issues */}
          <InsightCard
            icon={<Zap className="w-5 h-5" />}
            title="Top Issues in This Area"
          >
            {insights.topIssues.length > 0 ? (
              <ul className="space-y-3">
                {insights.topIssues.map((issue, index) => (
                  <li key={index} className="text-sm leading-relaxed">
                    <strong className="text-dark-grey">{issue.name}</strong>
                    <span className="text-medium-grey"> - {issue.percentage}% of conversations mention {issue.description}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-medium-grey">No data available for current view</p>
            )}
          </InsightCard>

          {/* Upcoming Events */}
          <InsightCard
            icon={<Calendar className="w-5 h-5" />}
            title="Upcoming Community Events"
          >
            <div className="space-y-4">
              {insights.upcomingEvents.map(event => (
                <EventItem key={event.id} event={event} />
              ))}
            </div>
          </InsightCard>

          {/* Sentiment Analysis */}
          {insights.sentiment && (
            <InsightCard
              icon={<TrendingUp className="w-5 h-5" />}
              title="Recent Sentiment Shift"
            >
              <p className="text-sm leading-relaxed text-medium-grey">
                {insights.sentiment}
              </p>
            </InsightCard>
          )}
        </div>
      </div>
    </aside>
  );
};

const StatCard = ({ value, label, sublabel }) => (
  <div className="bg-light-grey p-4 rounded-lg text-center">
    <div className="text-2xl font-bold text-primary-blue mb-1">{value}</div>
    <div className="text-xs text-medium-grey font-medium">
      {label}
      {sublabel && <span className="block text-xxs text-gray-400 mt-0.5">{sublabel}</span>}
    </div>
  </div>
);

const InsightCard = ({ icon, title, children }) => (
  <div className="bg-light-grey p-5 rounded-lg mb-4 flex gap-4">
    <div className="flex-shrink-0 w-9 h-9 bg-light-blue rounded-lg flex items-center justify-center text-primary-blue">
      {icon}
    </div>
    <div className="flex-1">
      <h4 className="text-sm font-semibold mb-3 text-dark-grey">{title}</h4>
      {children}
    </div>
  </div>
);

const EventItem = ({ event }) => {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-12 px-2 py-2 bg-white rounded-md text-center">
        <div className="text-xs font-semibold text-primary-blue">{formatDate(event.date)}</div>
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-dark-grey mb-1">{event.name}</div>
        <div className="text-xs text-medium-grey">{event.location}</div>
      </div>
    </div>
  );
};

// Helper functions
const calculateWardCenter = (boundary) => {
  const lats = boundary.map(coord => coord[0]);
  const lngs = boundary.map(coord => coord[1]);
  return [
    (Math.min(...lats) + Math.max(...lats)) / 2,
    (Math.min(...lngs) + Math.max(...lngs)) / 2,
  ];
};

const calculateAverageIncome = (wards, incomeData) => {
  if (!incomeData || !wards.length) return 32400;

  const wardIds = wards.map(w => w.id);
  const relevantWards = incomeData.wards.filter(w => wardIds.includes(w.wardId));

  if (relevantWards.length === 0) return 32400;

  const avgIncome = relevantWards.reduce((sum, w) => sum + w.medianIncome, 0) / relevantWards.length;
  return Math.round(avgIncome);
};

const capitalizeFirst = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const getIssueDescription = (category) => {
  const descriptions = {
    healthcare: 'NHS waiting times and access',
    education: 'school funding and quality',
    transport: 'public transport improvements',
    housing: 'affordability and availability',
    environment: 'green spaces and sustainability',
  };
  return descriptions[category] || category;
};

const generateSentiment = (activeLayers) => {
  if (activeLayers.education) {
    return 'Positive sentiment toward local education initiatives has increased by +18% in the past month, following the announcement of new school funding.';
  }
  if (activeLayers.employment) {
    return 'Employment satisfaction has improved by +12% this quarter, with new job opportunities in the technology sector.';
  }
  return 'Overall constituency sentiment remains stable with slight positive trends in community engagement.';
};

export default RightSidebar;
