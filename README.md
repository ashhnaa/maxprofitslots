# SPORTS TURF PROFIT OPTIMIZER

> **AI-powered off-peak turf utilization and profit optimization**

---

## 📌 Development Notice
> **Note:** This project is being developed **incrementally in stages**.  
> **Current Stage:** `Stage 0: Project Initialization` (Infrastructure & Communication Setup).  
> Features such as the database, dataset, ML models, AI agents, and decision engines will be added in subsequent stages.

---

## 📖 Problem Statement
Sports arenas and turf venues regularly suffer from significant revenue loss during **non-peak hours** (e.g., weekday mornings and early afternoons) due to low court utilization. Standard reactive approaches often resort to blanket discounts across all vacant slots, which can erode margins, degrade brand value, and fail to optimize net venue profit.

---

## 🎯 Main Objective
The primary objective of the **Sports Turf Profit Optimizer** is to:
- **Increase bookings and utilization during non-peak hours**
- **Maximize the sports arena owner's expected profit**
- Intelligently select and execute the most suitable and profitable intervention instead of blindly discounting every open slot.

---

## 🚀 Planned Features & Interventions

In future stages, the system will analyze historical demand and real-time slot vacancies to determine targeted interventions:
1. **Do Nothing** (when natural demand or baseline profit exceeds intervention value)
2. **Targeted Customer Notification** (alerting regular off-peak players)
3. **Loyalty / Reward Points Boost** (incentivizing play through points)
4. **Booking Extension / Increasing Playing Time** (e.g., 90 minutes for the price of 60)
5. **Dynamic Discounting** (context-aware price adjustments)
6. **Notification + Discount Combo** (personalized re-engagement)
7. **Tournament / Full-Day Booking Optimization** (bundling off-peak blocks for mini-tournaments)

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React.js (v18)
- **Bundler:** Vite
- **Language:** JavaScript (ES6+)
- **Styling:** Vanilla CSS (Modern design system)

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Middleware:** CORS, dotenv

### Database (Planned)
- **RDBMS:** PostgreSQL

### Machine Learning & AI (Planned)
- **Language:** Python
- **Libraries:** scikit-learn, pandas, numpy

### Visualization (Planned)
- **Library:** Recharts / Lightweight React Charts

### Version Control
- **VCS:** Git

---

## 📁 Project Structure

```
sports-turf-profit-optimizer/
│
├── frontend/             # React + Vite frontend application
│   ├── src/
│   │   ├── App.jsx       # Main App component
│   │   ├── App.css       # App styling
│   │   ├── index.css     # Global styles & design tokens
│   │   └── main.jsx      # Entry mount
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── .env.example
│   └── .env
│
├── backend/              # Node.js + Express backend API
│   ├── src/
│   │   └── index.js      # Server entry point with /api/health
│   ├── package.json
│   ├── .env.example
│   └── .env
│
├── ml/                   # Future Machine Learning models & data pipelines
│   └── README.md
│
├── database/             # Future PostgreSQL schemas, migrations, and seeds
│   └── README.md
│
├── docs/                 # Documentation, architecture specs, and artifacts
│   └── README.md
│
├── .gitignore            # Root gitignore rules
└── README.md             # Project documentation
```

---

## ⚙️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)

---

### 1. Backend Setup & Run

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables (optional; defaults provided):
   ```bash
   cp .env.example .env
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The backend will be live at:* `http://localhost:5000`  
   *Health check endpoint:* `http://localhost:5000/api/health`

---

### 2. Frontend Setup & Run

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables (optional; defaults provided):
   ```bash
   cp .env.example .env
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *The frontend will be live at:* `http://localhost:5173`

---

## 🔍 Verification & Health Check

1. Open `http://localhost:5173` in your browser.
2. Click the **"Check Backend"** button.
3. You should see a green success card displaying:
   `Sports Turf Profit Optimizer backend is running`
