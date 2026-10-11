# 📊 Booth Visitor Dashboard & API

A lightweight web dashboard and API backend designed to visualize real-time visitor metrics for a 4-day event. This system is built to ingest telemetry data from an external edge-AI camera pipeline and aggregate the data into actionable business insights.

## 🚀 Key Features

* **Shift-Based Aggregation:** SQL logic groups visitor timestamps into two daily 6-hour operational shifts (09:00 - 15:00 and 15:00 - 21:00).
* **Out-of-Hours Filtering:** Automatically catches and categorizes data recorded outside of official event hours.
* **Database Seeder:** Includes a built-in TypeScript seeder to generate simulated 12-hour event telemetry, allowing frontend testing without needing the live camera feed.
* **Lightweight Storage:** Uses a local SQLite database for fast, zero-configuration data storage ideal for temporary event deployments.

## 🛠️ Tech Stack

* **Backend:** Node.js, TypeScript
* **Database:** SQLite
* **Data Processing:** SQL Time/Date Aggregation

## 📂 Project Structure

* `/server/routes/metrics.ts` - API endpoints and SQL aggregation logic for the 6-hour shift breakdowns.
* `/server/seeder.ts` - Data generation script for testing UI components.
* `/server/db.ts` - Database initialization and connection handling.

## 📝 Note on Data & Setup
The repository does not contain the live database file (`visitor_tracking.db`). To set up the environment locally, run the initialization and seeder scripts to generate a fresh SQLite database with dummy data for UI testing. When deploying to the live event, bypass the seeder to start with an empty database.
