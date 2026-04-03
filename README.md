# AquaGuard: Hyper-Local Income Protection for Q-Commerce

## Inspiration
India’s delivery partners are the backbone of the digital economy but lose up to 30% of their earnings to uncontrollable disruptions like extreme weather. AquaGuard by Team Horizon provides a localized safety net that operates as fast as they do—on a week-to-week basis.

## What it does
AquaGuard is an AI-powered parametric insurance platform designed for Q-Commerce partners (Zepto, Blinkit, Swiggy, Dunzo). It delivers automated income protection against environmental and social disruptions.

- **Weekly Pricing**: A micro-premium model matching the worker’s payout cycle.
- **Zero-Touch Claims**: No paperwork. If a parametric trigger (e.g., Heavy Rain > 15mm/hr, Flood, Strike, Heat) is met via public APIs, the system automatically processes and approves a payout.
- **Dynamic AI Adjustments**: Premiums are tuned dynamically by simulated XGBoost models tracking risk score factors based on geography, weather history, and vehicle type.
- **Fraud Engine**: Integrated sensor telemetry simulation to decline fraudulent claims automatically.

## How we built it
- **Architecture**: A multi-page dynamic web interface leveraging `localStorage` to securely pass context and simulate a full application lifecycle from onboarding to live monitoring.
- **Frontend Design**: Built with pure HTML, CSS, and Vanilla JavaScript. Features a premium, enterprise-grade dark glassmorphism aesthetic complete with deep ambient glows, modern typography, and a polished, icon-free professional visual identity.
- **Parametric Logic**: Seamless integration with five simulated live environment APIs (OpenWeatherMap, Traffic Disruption, IMD Flood Alerts, Civic Strikes, and NDMA Heat Advisory).
- **Backend Ready**: The core repository contains foundation structures (Java & PostgreSQL) to scale the product past the prototype phase and into a real-world enterprise deployment.

## Accomplishments that we're proud of
- **Automated Claims Pipeline**: Achieving a transparent zero-touch claim lifecycle that simulates API polling, risk scoring, trigger verification, and payout initiation without any manual intervention.
- **Highly Responsive UI/UX**: The application provides an engaging user journey, progressing from registration through a sleek loading overlay into a fully-featured, live-updating dashboard.
- **Custom Aesthetic Branding**: Successfully pivoting to a highly credible, strict enterprise-grade interface.

## What's next for AquaGuard
- **Phase 3 Scaling**: Implementing instant payout gateways using real UPI simulators.
- **Backend Migration**: Shifting our local `localStorage` architecture to fully persist data mapping across the integrated PostgreSQL databases.
- **Real API Access**: Transitioning away from randomized mock data streams towards enterprise subscriptions for real-time weather and traffic disruption accuracy.
