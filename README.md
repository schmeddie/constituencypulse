# Constituency Pulse

A modern, responsive data and mapping platform designed for Members of Parliament to visualize and interact with constituency information, events, and demographic data.

## Features

### Interactive Map
- **Constituency Boundaries**: Visual representation of constituency boundaries with soft blue styling
- **Town Markers**: Major towns displayed with population information
- **Event Pins**: Color-coded event markers with hover cards showing detailed information
- **Responsive Navigation**: Pan, zoom, and explore constituency data seamlessly

### Left Sidebar - Data Layers & Filters
- **Demographics Toggle**: Age distribution, income levels, education, and employment data
- **Events & Activities**: Local events, community meetings, and town halls
- **Political Data**: Voting intention and voter turnout visualization
- **Category Filters**: Quick filter events by healthcare, education, transport, housing, and environment

### Right Sidebar - Analytics & Insights
- **Summary Statistics**:
  - Total population
  - Registered voters
  - Voter turnout
  - Median income
- **AI-Generated Insights**:
  - Top issues in the area
  - Upcoming community events
  - Sentiment analysis and trends

### Header
- **Search Functionality**: Search constituencies, events, and topics
- **Clean Branding**: Professional "Constituency Pulse" logo
- **Profile Access**: Quick access to user profile

## Design Philosophy

The dashboard follows a modern, minimalist design aesthetic suitable for official government use:

- **Color Palette**: Soft blues (#3b82f6, #60a5fa) and greys (#1f2937, #6b7280, #f3f4f6)
- **Typography**: Inter font family for clean, professional readability
- **Shadows**: Subtle shadows for depth without distraction
- **Responsive**: Fully responsive design that works on desktop, tablet, and mobile devices

## Technology Stack

- **HTML5**: Semantic structure
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **JavaScript (Vanilla)**: No heavy frameworks for optimal performance
- **Leaflet.js**: Interactive mapping library
- **OpenStreetMap**: Map tile provider

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Node.js (optional, for local development server)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd constituencypulse
```

2. Open the application:

**Option A: Direct File Access**
Simply open `index.html` in your web browser.

**Option B: Local Server**
```bash
npm start
```
Then navigate to `http://localhost:3000`

### File Structure

```
constituencypulse/
├── index.html          # Main HTML structure
├── styles.css          # All styling and responsive design
├── app.js             # Application logic and interactivity
├── package.json       # Project metadata
└── README.md          # Documentation
```

## Usage

### Filtering Events
1. Use the left sidebar to toggle different data layers on/off
2. Click category buttons to filter events by type (Healthcare, Education, etc.)
3. Hover over map pins to see event details

### Viewing Insights
1. Check the right sidebar for real-time statistics
2. Review AI-generated insights about constituency issues
3. See upcoming community events calendar

### Search
1. Use the search bar in the header to find specific events or topics
2. The map will automatically pan to matching results

## Customization

### Adding New Events
Edit the `eventsData` array in `app.js`:

```javascript
{
    id: 9,
    name: 'Your Event Name',
    category: 'healthcare', // or education, transport, housing, environment
    lat: 52.7684,
    lng: -1.2048,
    date: '2025-12-15',
    summary: 'Event description',
    color: '#3b82f6' // Hex color for the marker
}
```

### Changing Constituency Boundary
Modify the `constituencyBoundary` array in `app.js` with your coordinates:

```javascript
const constituencyBoundary = [
    [lat1, lng1],
    [lat2, lng2],
    // ... more coordinates
];
```

### Adding Towns
Update the `majorTowns` array in `app.js`:

```javascript
{
    name: 'Town Name',
    lat: 52.7684,
    lng: -1.2048,
    population: 50000
}
```

## Responsive Breakpoints

- **Desktop**: > 1200px (full three-column layout)
- **Tablet**: 768px - 1200px (simplified sidebar)
- **Mobile**: < 768px (stacked layout, hidden right sidebar)

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

## Future Enhancements

- Real-time data integration with government APIs
- Advanced demographic visualization layers
- Export functionality for reports
- User authentication and personalized dashboards
- Mobile app companion
- Integration with constituent relationship management (CRM) systems

## License

MIT License - See LICENSE file for details

## Contributing

This is a demonstration project. For production use, please ensure compliance with:
- Government Digital Service (GDS) design standards
- Data protection regulations (GDPR, DPA 2018)
- Accessibility standards (WCAG 2.1 AA)

## Support

For issues, questions, or suggestions, please open an issue in the repository.

---

**Constituency Pulse** - Professional data visualization for parliamentary constituencies
