// src/services/api.js

const API = {
    odds: "/.netlify/functions/odds",
    games: "/.netlify/functions/espn-games",
    weather: "/.netlify/functions/weather",
    props: "/.netlify/functions/props",
    parlay: "/.netlify/functions/parlay",
    simulate: "/.netlify/functions/sim-engine",
    injuries: "/.netlify/functions/injuries",
    headlines: "/.netlify/functions/headlines"
};

/** --------------------------------------------------------
 * Determine whether today is a GAME DAY
 * -------------------------------------------------------- */
export function isGameDay() {
    const today = new Date();
    const day = today.getDay(); // 0 Sun, 1 Mon, ..., 6 Sat

    return day === 0 || day === 1 || day === 4; // Sun, Mon, Thu = NFL days
}

/** --------------------------------------------------------
 * Determine if the system should roll over to NEXT WEEK
 * Every Tuesday @ 8:00AM EST
 * -------------------------------------------------------- */
export function useWeeklyRollover() {
    const now = new Date();
    const est = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));

    const isTuesday = est.getDay() === 2;
    const hour = est.getHours();

    return isTuesday && hour >= 8;
}

/** --------------------------------------------------------
 * Generic fetcher with fallback handling
 * -------------------------------------------------------- */
async function smartFetch(url, fallback = null) {
    try {
        const res = await fetch(url);
        const json = await res.json();

        if (!res.ok || json.error) {
            console.warn("API Error from:", url, json);
            return fallback;
        }

        return json;
    } catch (err) {
        console.error("Network error:", url, err);
        return fallback;
    }
}

/** --------------------------------------------------------
 * GET LIVE ODDS
 * -------------------------------------------------------- */
export async function getOdds() {
    return smartFetch(API.odds, { games: [] });
}

/** --------------------------------------------------------
 * GET ESPN GAME DATA
 * -------------------------------------------------------- */
export async function getGames() {
    return smartFetch(API.games, { games: [] });
}

/** --------------------------------------------------------
 * GET WEATHER DATA
 * -------------------------------------------------------- */
export async function getWeather(stadium = "") {
    return smartFetch(API.weather + `?stadium=${stadium}`, {
        city: "Unknown",
        tempF: "--",
        windMph: "--",
        conditions: "N/A"
    });
}

/** --------------------------------------------------------
 * GET PLAYER PROPS
 * -------------------------------------------------------- */
export async function getPlayerProps() {
    return smartFetch(API.props, { props: [] });
}

/** --------------------------------------------------------
 * RUN PARLAY BUILDER ENGINE
 * -------------------------------------------------------- */
export async function getParlayBuild(legs) {
    return smartFetch(API.parlay, { parlay: [], probability: 0, legs });
}

/** --------------------------------------------------------
 * RUN SIMULATION ENGINE
 * -------------------------------------------------------- */
export async function runSimulationEngine(gamePayload) {
    return smartFetch(API.simulate, {
        winner: null,
        homeScore: 0,
        awayScore: 0,
        margin: 0,
        runs: 0
    });
}

/** --------------------------------------------------------
 * GET KEY INJURIES FOR ALL TEAMS
 * -------------------------------------------------------- */
export async function getInjuries() {
    return smartFetch(API.injuries, { injuries: [] });
}

/** --------------------------------------------------------
 * GET LATEST NFL HEADLINES FOR TICKER
 * -------------------------------------------------------- */
export async function getHeadlines() {
    return smartFetch(API.headlines, { headlines: [] });
}

/** --------------------------------------------------------
 * AUTO REFRESH LOGIC
 * 30 mins = game day
 * 2 hours = non game day
 * -------------------------------------------------------- */
export function getRefreshInterval() {
    if (isGameDay()) return 30 * 60 * 1000; // 30 min
    return 2 * 60 * 60 * 1000; // 2 hours
}

