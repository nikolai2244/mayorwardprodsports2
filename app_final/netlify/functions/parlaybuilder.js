// netlify/functions/parlayBuilder.js
const fetch = require("node-fetch");

// Cache for 10 minutes
let cache = { timestamp: 0, data: null };
const isFresh = () => Date.now() - cache.timestamp < 10 * 60 * 1000;

// Weight multipliers (can be tuned later)
const WEATHER_MULT = 0.88;
const INJURY_MULT = 0.75;
const DEPTH_MULT = [1.0, 0.82, 0.55, 0.32, 0.12];

// Simulation loops
const SIM_HEAVY = 1500000;
const SIM_MEDIUM = 5888;
const SIM_LIGHT = 200;
const SIM_SANITY = 50;

// Utility: safe fetch
async function safe(url) {
    try {
        const res = await fetch(url);
        return await res.json();
    } catch (e) {
        console.error("Fetch failed:", url);
        return null;
    }
}

// Get players + odds + weather
async function loadAll() {
    const [players, odds, weather] = await Promise.all([
        safe(`${process.env.URL}/.netlify/functions/players`),
        safe(`${process.env.URL}/.netlify/functions/odds`),
        safe(`${process.env.URL}/.netlify/functions/weather`),
    ]);

    return { players, odds, weather };
}

// Compute impact factor based on weather + injuries + depth
function computeImpact(player, weatherForTeam) {
    let w = 1;

    // Weather impact
    if (weatherForTeam) {
        if (weatherForTeam.wind_speed > 15) w *= WEATHER_MULT;
        if (weatherForTeam.precip_prob > 40) w *= WEATHER_MULT;
        if (weatherForTeam.field_type === "grass") w *= 0.95;
    }

    // Injury status modifier
    if (player.injury?.status === "Questionable") w *= INJURY_MULT;
    if (player.injury?.status === "Doubtful") w *= INJURY_MULT * 0.75;
    if (player.injury?.status === "Out") return 0;

    // Depth chart modifier
    const d = player.depth || 5;
    if (DEPTH_MULT[d - 1]) w *= DEPTH_MULT[d - 1];

    return w;
}

// Run simulation for ONE PROP
function runSimLoops(player, propType, impactFactor) {
    function simSingleRun() {
        let chance = 0;

        if (propType === "TD") chance = player.projection.td_probability;
        if (propType === "RECY") chance = player.projection.rec_yards / 100;
        if (propType === "RUSHY") chance = player.projection.rush_yards / 100;
        if (propType === "RECEPT") chance = (player.projection.rec_yards / 15) * 0.09;

        chance *= impactFactor;
        if (chance > 0.97) chance = 0.97;

        return Math.random() < chance ? 1 : 0;
    }

    function loop(count) {
        let hits = 0;
        for (let i = 0; i < count; i++) hits += simSingleRun();
        return hits / count;
    }

    // Deep model stack
    return (
        loop(SIM_HEAVY) * 0.7 +
        loop(SIM_MEDIUM) * 0.2 +
        loop(SIM_LIGHT) * 0.08 +
        loop(SIM_SANITY) * 0.02
    );
}

// Build a parlay from user-selected props
function buildParlay(players, weather, selections) {
    let legs = [];
    let totalEV = 1;

    for (const sel of selections) {
        const player = players.find((p) => p.id === sel.playerId);
        if (!player) continue;

        const w = weather[player.team] || null;
        const impact = computeImpact(player, w);
        const prob = runSimLoops(player, sel.prop, impact);

        legs.push({
            player: player.name,
            team: player.team,
            prop: sel.prop,
            probability: prob,
        });

        totalEV *= prob;
    }

    return {
        legs,
        total_probability: totalEV,
    };
}

// Auto-generate parlays for homepage + mayor's picks
function autoParlays(players, weather) {
    const candidates = players
        .filter((p) => p.position === "RB" || p.position === "WR" || p.position === "TE")
        .slice(0, 150);

    let parlay10 = [];
    let parlay12 = [];

    for (let i = 0; i < 10; i++) {
        const p = candidates[Math.floor(Math.random() * candidates.length)];
        const w = weather[p.team] || null;
        const impact = computeImpact(p, w);

        parlay10.push({
            player: p.name,
            team: p.team,
            prop: "TD",
            probability: runSimLoops(p, "TD", impact),
        });
    }

    for (let i = 0; i < 12; i++) {
        const p = candidates[Math.floor(Math.random() * candidates.length)];
        const w = weather[p.team] || null;
        const impact = computeImpact(p, w);

        parlay12.push({
            player: p.name,
            team: p.team,
            prop: "TD",
            probability: runSimLoops(p, "TD", impact),
        });
    }

    return {
        parlay10,
        hailMary: parlay12,
    };
}

exports.handler = async (event) => {
    try {
        if (cache.data && isFresh()) {
            return { statusCode: 200, body: JSON.stringify(cache.data) };
        }

        const { players, odds, weather } = await loadAll();

        if (!players || !weather) {
            return {
                statusCode: 200,
                body: JSON.stringify({ error: true, message: "Dependencies unavailable." }),
            };
        }

        // User-built parlay support
        let selections = [];
        if (event.body) {
            try {
                selections = JSON.parse(event.body).selections || [];
            } catch (e) { }
        }

        const userParlay = selections.length
            ? buildParlay(players, weather, selections)
            : null;

        const auto = autoParlays(players, weather);

        const result = {
            ok: true,
            updated: new Date().toISOString(),
            userParlay,
            autoParlays: auto,
        };

        cache.timestamp = Date.now();
        cache.data = result;

        return { statusCode: 200, body: JSON.stringify(result) };
    } catch (err) {
        console.error("PARLAY BUILDER ERROR:", err);

        return {
            statusCode: 200,
            body: JSON.stringify({ error: true }),
        };
    }
};
