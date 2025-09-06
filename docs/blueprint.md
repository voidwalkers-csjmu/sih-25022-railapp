# **App Name**: RailPulse

## Core Features:

- Simulation Visualizer: Visually represents the train simulation using an interactive map. Display train locations, track sections, and stations. Provides real-time updates as the simulation progresses. Map data will be static: pre-processed and included with the app itself, to minimize server requests and database requirements. Offers standard map controls such as zoom, pan, and detail level adjustments. Will include at least one ai tool (described below).
- Train Details Panel: Displays detailed information about each train, including its ID, category, priority, speed, acceleration, current location, route, and scheduled departure/arrival times.
- Analytics Dashboard: Provides key performance indicators (KPIs) for the simulation, such as average train delay, throughput (trains per hour), and section utilization. Displays this information through charts and graphs for easy interpretation. No database is to be used.
- Event Logger Display: Displays the event logger messages in a scrollable, sortable, filterable list.
- Predictive Delay Analysis: Leverages a tool to provide predictions about potential train delays, based on real-time events and historical simulation data, estimating arrival times and highlighting sections likely to cause bottlenecks.
- Disruption Impact Tool: Simulates the impact of a disruption (e.g., track closure) on train schedules. Estimates delays, identifies trains affected, and suggests alternative routes or schedule adjustments, acting as a planning tool. Provides the ability to manually schedule and reschedule train departure times
- Simulation Controls: Implements standard controls such as start/stop, pause, speed up (simulation rate), and reset simulation. Features a seek bar, allowing the user to set the simulation time.

## Style Guidelines:

- Primary color: Slate blue (#708090) to convey professionalism and reliability.
- Background color: Light gray (#F0F8FF) to ensure readability and reduce eye strain.
- Accent color: Soft orange (#FFB347) to highlight key elements and CTAs.
- Font pairing: 'Space Grotesk' (sans-serif) for headings and 'Inter' (sans-serif) for body text, creating a balance of modernity and readability.
- Code font: 'Source Code Pro' for displaying simulation logs.
- Use modern, flat icons representing trains, stations, and various events in the simulation. Consistent style throughout.
- Divide the screen into logical panels: a main map area, a train details sidebar, an analytics dashboard, and a simulation controls bar at the bottom.
- Implement subtle animations to represent train movements and event updates, improving the user experience without being distracting.