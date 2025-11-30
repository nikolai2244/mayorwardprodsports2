// netlify/functions/props.js
const fetch = require("node-fetch");

// Cache: 10 minutes
let cache = { timestamp: 0, data: null };
const isFresh = () => Date.now() - cache.timestamp < 10 * 60 * 1000;

// Multipliers
const WEATHER_MULT = 0.88;
const INJURY_MULT = 0.78;
const DEPTH_MULT = [1.0, 0.82, 0.55, 0.32, 0.12];

// Sim layers
const SIM_HEAVY = 1500000;
const SIM_MEDIUM = 5888;
const SIM_LIGHT = 200;
const SIM_SANITY = 50;

// Utility safe fetch
async function safe(url) {
    try {
        const res = await fetch(url);
        return await res.json();
    } catch (err) {
        console.log("Fetch failed:", url);
        return null;
    }
}

async function loadAll() {
    const [players, weather] = await Promise.all([
        safe(`${process.env.URL}/.netlify/functions/players`),
        safe(`${process.env.URL}/.netlify/functions/weather`),
    ]);

    return { players, weather };
}

function computeImpact(player, w) {
    let mult = 1;

    // Weather
    if (w) {
        if (w.wind_speed > 15) mult *= WEATHER_MULT;
        if (w.precip_prob > 40) mult *= WEATHER_MULT;
        if (w.field_type === "grass") mult *= 0.95;
    }

    // Injuries
    const s = player.injury?.status;
    if (s === "Questionable") mult *= INJURY_MULT;
    if (s === "Doubtful") mult *= INJURY_MULT * 0.75;
    if (s === "Out") return 0;

    // Depth
    const d = player.depth || 5;
    if (DEPTH_MULT[d - 1]) mult *= DEPTH_MULT[d - 1];

    return mult;
}

function simulateProp(player, type, factor) {
    function simOne() {
        let chance = 0;

        switch (type) {
            case "TD":
                chance = player.projection.td_probability;
                break;

            case "REC_YDS":
                chance = Math.min(0.97, (player.projection.rec_yards / 100));
                break;

            case "RUSH_YDS":
                chance = Math.min(0.97, (player.projection.rush_yards / 100));
                break;

            case "RECEPTIONS":
                chance = Math.min(0.97, (player.projection.rec_yards / 15) * 0.1);
                break;

            default:
                chance = 0.1;
        }

        chance *= factor;
        if (chance > 0.97) chance = 0.97;

        return Math.random() < chance ? 1 : 0;
    }

    function run(count) {
        let hits = 0;
        for (let i = 0; i < count; i++) hits += simOne();
        return hits / count;
    }

    return (
        run(SIM_HEAVY) * 0.7 +
        run(SIM_MEDIUM) * 0.2 +
        run(SIM_LIGHT) * 0.08 +
        run(SIM_SANITY) * 0.02
    );
}

// Compute expected value and pick OVER or UNDER
function deriveRecommendation(probability) {
    const implied = 0.5; // baseline for props
    const ev = probability - implied;
    return {
        ev,
        pick: ev >= 0 ? "OVER" : "UNDER",
    };
}

function generateTopProps(players, weather) {
    const list = [];

    players.forEach((p) => {
        if (!["RB", "WR", "TE"].includes(p.position)) return;

        const w = weather[p.team] || null;
        const factor = computeImpact(p, w);

        if (factor <= 0) return;

        const props = [
            { type: "TD", label: "Anytime TD" },
            { type: "REC_YDS", label: "Receiving Yards" },
            { type: "RUSH_YDS", label: "Rushing Yards" },
            { type: "RECEPTIONS", label: "Receptions" },
        ];

        props.forEach((pr) => {
            const prob = simulateProp(p, pr.type, factor);
            const rec = deriveRecommendation(prob);

            list.push({
                player: p.name,
                team: p.team,
                position: p.position,
                prop_type: pr.type,
                label: pr.label,
                probability: prob,
                expected_value: rec.ev,
                recommendation: rec.pick,
            });
        });
    });

    // Sort by EV
    list.sort((a, b) => b.expected_value - a.expected_value);

    // Top 10
    return list.slice(0, 10);
}

exports.handler = async () => {
    try {
        if (cache.data && isFresh()) {
            return { statusCode: 200, body: JSON.stringify(cache.data) };
        }

        const { players, weather } = await loadAll();

        if (!players || !weather) {
            return {
                statusCode: 200,
                body: JSON.stringify({ error: true, message: "Missing dependencies." }),
            };
        }

        const topProps = generateTopProps(players, weather);

        const result = {
            ok: true,
            updated: new Date().toISOString(),
            topProps,
        };

        cache.timestamp = Date.now();
        cache.data = result;

        return { statusCode: 200, body: JSON.stringify(result) };
    } catch (err) {
        console.error("PROP ERROR:", err);

        return {
            statusCode: 200,
            body: JSON.stringify({ error: true }),
        };
    }
};
