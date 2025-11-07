# Constituency Pulse

A fully functional, responsive data and mapping platform designed for Members of Parliament to visualize and interact with constituency information, events, and demographic data. Built with React, TailwindCSS, and Leaflet.js.

## ✨ Features

### 🗺️ Interactive Map
- **Pan, Zoom, and Navigate**: Fully interactive Leaflet.js map with smooth controls
- **Constituency Boundaries**: Visual representation with soft blue styling
- **Ward-Level Data**: Click on individual wards to see detailed demographics
- **Town Markers**: Major towns displayed with population information
- **Event Pins**: Color-coded event markers with interactive popups
- **Dynamic Legend**: Updates based on active data layers

### 📊 Data Layer Toggling
- **Demographics**: Age distribution, income levels, education, and employment
- **Political Data**: Voting intention and voter turnout visualization
- **Events & Activities**: Local events, community meetings, and town halls
- **Color-Coded Overlays**: Ward shading updates in real-time based on selected data
- **Smooth Transitions**: Loading animations when switching datasets

### 📍 Event Management
- **10 Sample Events**: Healthcare, education, transport, housing, and environment
- **Rich Popups**: Click events to see detailed information
- **Category Filtering**: Filter events by type
- **Search Functionality**: Search events by name, category, or keywords

### 📈 Dynamic Insights
- **Real-Time Statistics**: Updates based on visible map area
- **AI-Generated Insights**: Top issues and upcoming events
- **Adaptive Content**: Right sidebar updates dynamically

## 🚀 Getting Started

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Open your browser to `http://localhost:5173`

## 📁 Project Structure

```
constituencypulse/
├── src/
│   ├── components/           # React components
│   ├── data/                 # JSON data files
│   ├── App.jsx              # Main app
│   └── index.css            # Tailwind styles
├── index.html
├── tailwind.config.js
└── package.json
```

## 🛠️ Technology Stack

- **React 19**: Modern React with hooks
- **Vite**: Lightning-fast build tool
- **TailwindCSS 4**: Utility-first CSS framework
- **Leaflet.js 1.9**: Interactive mapping library
- **React-Leaflet 5**: React bindings for Leaflet
- **Lucide React**: Icon set

## 📊 Key Features

### Interactive Map
- Full pan/zoom functionality
- Click on wards to see demographics
- Click on event markers for detailed popups
- Constituency boundary visualization

### Dynamic Data Layers
- Toggle demographics (age, income, education, employment)
- Ward overlays change color based on data
- Real-time legend updates

### Smart Filtering
- Filter events by category (Healthcare, Education, Transport, Housing, Environment)
- Search across event names and descriptions
- Map bounds automatically filter visible events

### Responsive Insights
- Statistics update based on visible map area
- Top issues calculated from event distribution
- Upcoming events sorted chronologically

## 🎨 Customization

### Adding Events
Edit `src/data/events.json`

### Changing Boundaries
Edit `src/data/constituencies.json`

### Modifying Demographics
Edit files in `src/data/demographics/`

## 📱 Responsive Design

- Desktop: Full three-column layout
- Tablet: Simplified layout
- Mobile: Stacked components

## 📄 License

MIT License

---

**Constituency Pulse** - Built with React, TailwindCSS, and Leaflet.js
