# Setup Instructions for Constituency Pulse

## Prerequisites

- Node.js 18.16.1 or higher
- npm (comes with Node.js)

## Installation Steps

### 1. Install Dependencies

First, install all required packages:

```bash
npm install
```

This will install:
- React 18.2.0
- Vite 5.2.0 (build tool)
- TailwindCSS 4
- Leaflet.js (mapping library)
- React-Leaflet (React bindings)
- Lucide React (icons)
- All other dependencies

### 2. Start Development Server

After installation completes, start the dev server:

```bash
npm run dev
```

You should see output like:
```
VITE v5.2.0  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 3. Open in Browser

Open your browser to `http://localhost:5173`

You should see the Constituency Pulse dashboard with:
- Interactive map
- Left sidebar with data layer toggles
- Right sidebar with statistics and insights
- Event markers on the map

## Available Scripts

```bash
# Start development server (hot reload enabled)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Testing the Interactive Features

Once the app is running, try these interactions:

1. **Pan and Zoom the Map**
   - Click and drag to pan
   - Use mouse wheel to zoom
   - Double-click to zoom in

2. **Toggle Data Layers**
   - Click checkboxes in the left sidebar under "Demographics"
   - Watch the ward overlays change color

3. **View Event Details**
   - Click on colored event markers on the map
   - A popup will show event details

4. **Filter Events**
   - Click category buttons (Healthcare, Education, Transport, etc.)
   - Events will filter on the map

5. **Search Events**
   - Type in the search bar at the top
   - Map will focus on matching events

6. **Watch Dynamic Updates**
   - Pan/zoom the map
   - Notice the statistics in the right sidebar update
   - Top issues recalculate based on visible events

## Troubleshooting

### "vite is not recognized"
Run `npm install` first to install dependencies.

### Port 5173 already in use
Kill the process using that port, or Vite will automatically use the next available port.

### Build errors
Make sure you're using Node.js 18.16.1 or higher:
```bash
node --version
```

### Map not loading
Check browser console for errors. Make sure you have an internet connection (map tiles load from OpenStreetMap).

## File Structure

```
constituencypulse/
├── src/
│   ├── components/          # React components
│   │   ├── Header.jsx
│   │   ├── LeftSidebar.jsx
│   │   ├── RightSidebar.jsx
│   │   ├── InteractiveMap.jsx
│   │   └── LoadingSpinner.jsx
│   ├── data/               # JSON data files
│   │   ├── events.json
│   │   ├── constituencies.json
│   │   └── demographics/
│   │       ├── age.json
│   │       ├── income.json
│   │       ├── education.json
│   │       └── employment.json
│   ├── App.jsx            # Main app component
│   ├── main.jsx           # React entry point
│   └── index.css          # Global styles
├── index.html             # HTML template
├── package.json           # Dependencies
├── vite.config.js         # Vite configuration
└── tailwind.config.js     # Tailwind configuration
```

## Next Steps

After you have the app running:

1. **Customize Data**: Edit JSON files in `src/data/` to use your own constituency data
2. **Modify Styles**: Update colors in `tailwind.config.js`
3. **Add Features**: Build new components in `src/components/`
4. **Deploy**: Run `npm run build` and deploy the `dist/` folder

## Support

If you encounter any issues:
1. Check that Node.js version is 18.16.1+
2. Delete `node_modules` and `package-lock.json`, then run `npm install` again
3. Check browser console for JavaScript errors
4. Ensure you have a stable internet connection for map tiles

---

Happy mapping! 🗺️
