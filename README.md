# 🛡️ ShieldGig AI: Hyper-Local Income Protection for Q-Commerce

## Inspiration
India’s delivery partners are the backbone of the digital economy but lose up to 30% of their earnings to uncontrollable disruptions like extreme weather. We were inspired by the "Seed-Scale-Soar" philosophy to build a safety net that operates as fast as they do—week-to-week.

## What it does
ShieldGig AI is an AI-powered parametric insurance platform designed for Q-Commerce partners (Zepto, Blinkit). It provides automated income protection against environmental and social disruptions.

- **Weekly Pricing**: A micro-premium model (e.g., $P_w$) that matches the worker’s payout cycle.
- **Zero-Touch Claims**: No paperwork. If a parametric trigger (like heavy rain > 15mm/hr) is met, the system automatically initiates a payout.
- **Adversarial Defense**: Uses "Sensor Fusion" to detect GPS spoofing and fraud rings.

## How we built it
- **Frontend**: Mobile-first design cleanly built with **HTML** and **CSS** for instant, on-the-go accessibility without heavy frameworks.
- **Backend**: A robust **Java** architecture featuring a weekly cron job for premium "burn" and seamless payout cycles.
- **AI/ML**: Predictive modeling powered by **Scikit-Learn** and **XGBoost** to calculate dynamic premiums based on hyper-local risk zones.
- **Database**: **PostgreSQL** schema configured to securely handle and query high volumes of user, geospatial, and transactional data.
- **Parametric Logic**: Integrated OpenWeatherMap and mock Traffic APIs for real-time monitoring and trigger events.

## Challenges we ran into
The biggest challenge was the Phase 1 Market Crash—preventing coordinated fraud. We had to pivot from simple GPS pings to a multi-layered verification system. We also had to ensure we strictly excluded vehicle or health coverage to stay compliant with Guidewire's constraints.

## Accomplishments that we're proud of
- **Automated Claims**: Achieving a "zero-touch" experience where a worker is notified of their payout before they even have to ask.
- **Dynamic Risk Model**: Building a formula that adjusts premiums weekly based on hyper-local waterlogging history.
- **Anti-Spoofing Architecture**: Designing logic that flags "Impossible Travel" and coordinated fraud rings.

## What we learned
We learned the complexity of "Parametric Insurance"—that it’s not about the damage, but the trigger. We also learned to treat our hackathon project as a startup, managing our DC 1,00,000 budget against weekly operational "burn".

## What's next for ShieldGig AI
- **Phase 2 Expansion**: Full integration of dynamic pricing models based on hyper-local weather.
- **Phase 3 Scaling**: Implementing instant payout systems through UPI simulators to get money to workers in minutes.
