// netlify/functions/simulateGame.js
const fetch = require("node-fetch");

// Cache every 10 minutes
let cache = { timestamp: 0, data: null };
const isFresh = () => Date.now() - cache.timestamp < 10 * 60 * 1000;

// Team baseline strengths (adjustable if needed)
const TEAM_STRENGTH = {
    KC: 1.34, BUF: 1.28, PHI: 1.30, SF: 1.36, BAL: 1.32,
    DAL: 1.22, DET: 1.21, CIN: 1.20, MIA: 1.18, GB: 1.14,
    LAR: 1.12, LAC: 1.10, MIN: 1.09, HOU: 1.10, CLE: 1.11,
    PIT: 1.06, SEA: 1.07, IND: 1.02, TB: 1.03, JAX: 1.04,
    NO: 1.00, ATL: 0.99, NYJ: 0.97, WAS: 0.95, NE: 0.85,
    CHI: 0.92, NYG: 0.90, TEN: 0.88, CAR: 0.83, ARI: 0.86,
    LV: 0.87, DEN: 1.01
};

// Simulation loop counts
const SIM_HEAVY = 1500000;
const SIM_MEDIUM = 5888;
const SIM_LIGHT = 200;
const SIM_SANITY = 50;

// Weather multipliers
function weatherModifier(w) {
    if (!w) return 1;

    let m = 1;

    if (w.wind_speed > 20) m *= 0.92;
    if (w.precip_prob > 50) m *= 0.90;
    if (w.temp < 25) m *= 0.93;
    if (w.temp > 95) m *= 0.94;

    return m;
}

// Injury modifier
function injuryModifier(inj) {
    if (!inj) return 1;
    if (inj.status === "Questionable") return 0.94;
    if (inj.status === "Doubtful") return 0.85;
    if (inj.status === "Out") return 0.75;
    return 1;
}

// Fetch dependencies
async function loadAll() {
    const [players, weather] = await Promise.all([
        safe(`${process.env.URL}/.netlify/functions/players`),
        safe(`${process.env.URL}/.netlify/functions/weather`),
    ]);
    return { players, weather };
}

async function safe(url) {
    try {
        const res = await fetch(url);
        return await res.json();
    } catch {
        return null;
    }
}

// Per-run game simulation
function simulateOnce(home, away, weatherHome, weatherAway, injuriesHome, injuriesAway) {
    const sHome = TEAM_STRENGTH[home] || 1.0;
    const sAway = TEAM_STRENGTH[away] || 1.0;

    const wHome = weatherModifier(weatherHome);
    const wAway = weatherModifier(weatherAway);

    const injHome = injuriesHome.reduce((a, p) => a * injuryModifier(p.injury), 1);
    const injAway = injuriesAway.reduce((a, p) => a * injuryModifier(p.injury), 1);

    let baseHome = 21 * sHome * wHome * injHome;
    let baseAway = 21 * sAway * wAway * injAway;

    // Variance (random drive outcomes)
    const volHome = Math.random() * 12 - 6;
    const volAway = Math.random() * 12 - 6;

    // Turnover randomness
    const turnoverHome = Math.random() < 0.12 ? -3 : 0;
    const turnoverAway = Math.random() < 0.12 ? -3 : 0;

    // Final score estimate (bounded)
    const scoreHome = Math.max(3, Math.round(baseHome + volHome + turnoverHome));
    const scoreAway = Math.max(3, Math.round(baseAway + volAway + turnoverAway));

    return {
        home: scoreHome,
        away: scoreAway,
        diff: scoreHome - scoreAway,
    };
}

// Multi-layer simulation stack
function runSimulations(home, away, wh, wa, injuriesHome, injuriesAway) {
    function run(count) {
        let wins = 0;
        let totalDiff = 0;
        let totalPoints = 0;

        for (let i = 0; i < count; i++) {
            const s = simulateOnce(home, away, wh, wa, injuriesHome, injuriesAway);

            if (s.home > s.away) wins++;
            totalDiff += s.diff;
            totalPoints += s.home + s.away;
        }

        return {
            winRate: wins / count,
            avgDiff: totalDiff / count,
            avgTotal: totalPoints / count,
        };
    }

    const heavy = run(SIM_HEAVY);
    const medium = run(SIM_MEDIUM);
    const light = run(SIM_LIGHT);
    const sanity = run(SIM_SANITY);

    // Weighted blend
    return {
        winProbability:
            heavy.winRate * 0.7 +
            medium.winRate * 0.2 +
            light.winRate * 0.08 +
            sanity.winRate * 0.02,

        margin:
            heavy.avgDiff * 0.7 +
            medium.avgDiff * 0.2 +
            light.avgDiff * 0.08 +
            sanity.avgDiff * 0.02,

        total:
            heavy.avgTotal * 0.7 +
            medium.avgTotal * 0.2 +
            light.avgTotal * 0.08 +
            sanity.avgTotal * 0.02,
    };
}

exports.handler = async (event) => {
    try {
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing request body" }),
            };
        }

        const { home, away } = JSON.parse(event.body);
        if (!home || !away) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Home and away teams required" }),
            };
        }

        const { players, weather } = await loadAll();

        const injuriesHome = players.filter((p) => p.team === home && p.injury);
        const injuriesAway = players.filter((p) => p.team === away && p.injury);

        const wHome = weather[home] || null;
        const wAway = weather[away] || null;

        const sim = runSimulations(home, away, wHome, wAway, injuriesHome, injuriesAway);

        const result = {
            ok: true,
            updated: new Date().toISOString(),
            home,
            away,
            winProbabilityHome: sim.winProbability,
            winProbabilityAway: 1 - sim.winProbability,
            projectedMargin: sim.margin,
            projectedTotalPoints: sim.total,
            projectedHomeScore: Math.round(sim.total / 2 + sim.margin / 2),
            projectedAwayScore: Math.round(sim.total / 2 - sim.margin / 2),
        };

        return { statusCode: 200, body: JSON.stringify(result) };
    } catch (err) {
        console.error("SIM ERROR:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: true }),
        };
    }
};
