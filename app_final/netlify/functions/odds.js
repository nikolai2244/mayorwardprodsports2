// netlify/functions/odds.js
const fetch = require("node-fetch");

const API_KEY = "35ea2bfd08888692d90a60bb91273c16"; // Your key

// Cache for 2 minutes
let cache = {
    timestamp: 0,
    data: null,
};

const isFresh = () => Date.now() - cache.timestamp < 2 * 60 * 1000;

exports.handler = async () => {
    try {
        if (cache.data && isFresh()) {
            return {
                statusCode: 200,
                body: JSON.stringify(cache.data),
            };
        }

        const url =
            "https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds?" +
            new URLSearchParams({
                apiKey: API_KEY,
                regions: "us",
                markets: "h2h,spreads,totals",
                oddsFormat: "american",
            }).toString();

        const res = await fetch(url);
        const json = await res.json();

        if (!res.ok || !Array.isArray(json)) {
            console.error("Odds API error:", res.status, json);

            // FALLBACK
            const fallback = {
                ok: false,
                fallback: true,
                message: "Odds API unavailable; fallback activated.",
                games: [],
            };

            cache.timestamp = Date.now();
            cache.data = fallback;

            return {
                statusCode: 200,
                body: JSON.stringify(fallback),
            };
        }

        // Produce a clean structure the frontend can use
        const games = json.map((g) => ({
            id: g.id,
            sport: g.sport_key,
            start: g.commence_time,
            home_team: g.home_team,
            away_team: g.away_team,
            books: g.bookmakers.map((b) => ({
                key: b.key,
                title: b.title,
                last_update: b.last_update,
                markets: b.markets,
            })),
        }));

        const result = {
            ok: true,
            updated: new Date().toISOString(),
            games,
        };

        // Update cache
        cache.timestamp = Date.now();
        cache.data = result;

        return {
            statusCode: 200,
            body: JSON.stringify(result),
        };
    } catch (err) {
        console.error("ODDS FUNCTION ERROR", err);

        // Fallback minimal structure
        return {
            statusCode: 200,
            body: JSON.stringify({
                ok: false,
                fallback: true,
                message: "Internal error fetching odds.",
                games: [],
            }),
        };
    }
};
