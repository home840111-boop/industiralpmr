# Machine Power Analytics Dashboard

## Overview
A modern, high-performance analytics dashboard for real-time machine power monitoring. Built with **Chakra UI** for layout/structure and **Ant Design Charts** for data visualization.

## Features

### 🎯 Real-Time Monitoring
- **Live Phase Gauges**: Three-phase (L1/L2/L3) monitoring with color-coded ranges
- **Instantaneous Metrics**: Voltage, Current, Active Power, Apparent Power, Reactive Power, Power Factor
- **Connection Status**: Visual indicators (Online/Offline/Restoring)
- **Auto-refresh**: Updates every 30 seconds

### 📊 Trend Analysis
- **Hourly Load Charts**: Multi-series line and area charts
- **Phase Comparison**: Side-by-side comparison of all three phases
- **Interactive Charts**: Hover tooltips with detailed values
- **Multiple Views**: Voltage, Current, Power, and Power Factor tabs

### 📈 Metrics Overview
- **High-Density Cards**: 16 metric cards with sparklines
- **Mini Trend Graphs**: TinyArea charts showing 24-hour patterns
- **Statistical Summary**: Min/Max/Avg values with visual indicators
- **Consumption Tracking**: Total energy consumption per phase

### 📋 Data Grid
- **Comprehensive Table**: All metrics in a structured table format
- **Conditional Formatting**: Color-coded badges based on thresholds
  - ✅ Green: Normal range
  - ⚠️ Orange: Warning range
  - ❌ Red: Critical range
- **Phase Comparison**: Side-by-side values for all phases

## Architecture

### Technology Stack
```
UI Framework:     Chakra UI v2.4.9
Charts:           @ant-design/plots v1.2.5
State Management: Jotai v2.1.0
Date Handling:    dayjs v1.11.7
Backend:          Firebase Realtime Database
```

### Component Structure
```
Power/
├── AntDesign/
│   ├── PowerDashboard.tsx      # Main dashboard container
│   ├── RealTimeGauges.tsx      # Live gauge displays
│   ├── HourlyTrendChart.tsx    # Trend analysis charts
│   ├── PhaseMetricsCards.tsx   # Metric cards with sparklines
│   ├── DataGrid.tsx            # Tabular data view
│   └── index.ts                # Component exports
├── Phase/                       # Legacy components
├── Sum.tsx                      # Legacy components
└── index.tsx                    # Main entry point
```

## Data Schema

### Real-time Endpoint
```typescript
GET /reports/power/machines/{machineID}/now

Response: {
  isOnline: boolean | "RESTORING",
  updated: number,  // Unix timestamp
  SUM: {
    volt: number,
    amp: number,
    power: number,
    apparentPower: number,
    reactivePower: number,
    powerFactor: number,
    frequency: number
  },
  R: { /* Phase L1 data */ },
  S: { /* Phase L2 data */ },
  T: { /* Phase L3 data */ }
}
```

### Daily Aggregates
```typescript
GET /reports/power/machines/{machineID}/daily/{date}

Response: {
  SUM: {
    volt: { min: number, max: number, avg: number },
    amp: { min: number, max: number, avg: number },
    power: { min: number, max: number, avg: number },
    apparentPower: { min: number, max: number, avg: number },
    reactivePower: { min: number, max: number, avg: number },
    powerFactor: { min: number, max: number, avg: number },
    frequency: { min: number, max: number, avg: number },
    consumption: number  // Total kWh
  },
  R: { /* Phase L1 daily stats */ },
  S: { /* Phase L2 daily stats */ },
  T: { /* Phase L3 daily stats */ }
}
```

### Hourly Records
```typescript
GET /reports/power/machines/{machineID}/hourly/{date}

Response: {
  0: { /* Hour 0 data */ },
  1: { /* Hour 1 data */ },
  ...
  23: { /* Hour 23 data */ }
}
```

## Color Scheme & Theming

### Light Mode
- Background: `#EDF2F7`
- Card Background: `white`
- Text: `gray.700`
- Border: `gray.200`
- Accent: `blue.500`

### Dark Mode
- Background: `#1a1d21`
- Card Background: `#212529`
- Text: `whiteAlpha.900`
- Border: `#32383e`
- Accent: `blue.300`

### Chart Colors
- Phase L1 (R): `#ff4d4f` (Red)
- Phase L2 (S): `#52c41a` (Green)
- Phase L3 (T): `#1890ff` (Blue)
- Total/SUM: `#722ed1` (Purple)

## Conditional Formatting Rules

### Voltage Thresholds
- 🟢 Normal: 390V - 410V
- 🟠 Warning: 380V - 390V or 410V - 420V
- 🔴 Critical: < 380V or > 420V

### Current Thresholds
- 🟢 Normal: < 80A
- 🟠 Warning: 80A - 100A
- 🔴 Critical: > 100A

### Power Factor Thresholds
- 🟢 Good: ≥ 0.9
- 🟠 Fair: 0.8 - 0.9
- 🔴 Poor: < 0.8

## Usage

### Basic Implementation
```tsx
import Power from './routes/Machines/Machine/Power';

// In your router
<Route path="/machines/:machineID/power" element={<Power />} />
```

### Direct Component Usage
```tsx
import { PowerDashboard } from './routes/Machines/Machine/Power/AntDesign';

function MyComponent() {
  return <PowerDashboard />;
}
```

## Interactive Features

### Date Selection
- Date picker to view historical data
- "Today" quick action button
- Date persists in application state

### Tab Navigation
1. **Real-Time Monitoring**: Live gauges and current values
2. **Trend Analysis**: Hourly charts with multiple metrics
3. **Metrics Overview**: Card-based summary with sparklines
4. **Data Grid**: Detailed table with all values

### Auto-refresh
- Automatically refreshes every 30 seconds
- Manual refresh via date change
- Loading states during data fetch

## Performance Optimizations

- **Lazy Tab Loading**: Charts render only when tab is active
- **Memoized Calculations**: Chart data transformations cached
- **Skeleton Loading**: Smooth loading experience
- **Responsive Grid**: Optimized for mobile to desktop
- **Chart Animation**: Disabled on real-time updates for performance

## Responsive Design

### Breakpoints
- **Base (Mobile)**: Single column layout
- **MD (Tablet)**: 2-3 column grid
- **LG (Desktop)**: 4 column grid for metrics

### Mobile Optimizations
- Collapsible navigation
- Stacked gauges
- Touch-friendly date picker
- Reduced chart heights

## Error Handling

- Toast notifications for errors
- Graceful fallbacks for missing data
- Empty state messages
- Loading skeletons

## Future Enhancements

### Potential Additions
- [ ] Export to PDF/Excel
- [ ] Custom date range selection
- [ ] Phase imbalance alerts
- [ ] Power quality analysis
- [ ] Comparative analytics (machine vs machine)
- [ ] Predictive maintenance indicators
- [ ] Energy cost calculations
- [ ] Historical trend comparisons

### Performance Improvements
- [ ] Virtual scrolling for large datasets
- [ ] Web Worker for data processing
- [ ] Chart data streaming
- [ ] Service Worker caching

## Troubleshooting

### Charts Not Rendering
- Verify @ant-design/plots is installed
- Check browser console for errors
- Ensure data format matches schema

### Data Not Loading
- Check Firebase connection
- Verify machineID parameter
- Check network tab for API calls

### Theme Not Applied
- Verify Chakra UI provider wraps component
- Check color mode value
- Inspect CSS specificity

## Contributing

When extending this dashboard:
1. Maintain Chakra UI for layout
2. Use Ant Design Charts for visualizations
3. Follow existing color scheme
4. Add proper TypeScript types
5. Include loading states
6. Test in both light and dark modes

## License
Proprietary - Industrial PMR Dashboard
