// netlify/functions/games.js
const fetch = require("node-fetch");

// Simple in-memory cache (survives warm Netlify instances)
let cache = {
    timestamp: 0,
    data: null,
};

// Helper: check if cache is fresh (5 minutes)
const isFresh = () => Date.now() - cache.timestamp < 5 * 60 * 1000;

// ESPN endpoints
const SCOREBOARD_URL =
    "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
const NFL_NEWS_URL =
    "https://site.api.espn.com/apis/site/v2/sports/football/nfl/news";
const NFL_INJURIES_URL =
    "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/injuries";

// Utility for safe fetch JSON
async function safeJson(url) {
    try {
        const res = await fetch(url);
        return await res.json();
    } catch (e) {
        console.error("Fetch failed:", url, e);
        return null;
    }
}

exports.handler = async () => {
    try {
        // Return cached version if fresh
        if (cache.data && isFresh()) {
            return {
                statusCode: 200,
                body: JSON.stringify(cache.data),
            };
        }

        // Fetch ESPN data
        const [scoreboard, news, injuriesRoot] = await Promise.all([
            safeJson(SCOREBOARD_URL),
            safeJson(NFL_NEWS_URL),
            safeJson(NFL_INJURIES_URL),
        ]);

        // Scoreboard parsing
        let games = [];
        if (scoreboard?.events) {
            games = scoreboard.events.map((ev) => {
                const comp = ev.competitions?.[0];
                const home = comp?.competitors?.find((c) => c.homeAway === "home");
                const away = comp?.competitors?.find((c) => c.homeAway === "away");

                return {
                    id: ev.id,
                    date: ev.date,
                    status: ev.status?.type?.description || "Scheduled",
                    home: {
                        team: home?.team?.abbreviation || "TBD",
                        name: home?.team?.displayName || "",
                        score: home?.score || 0,
                    },
                    away: {
                        team: away?.team?.abbreviation || "TBD",
                        name: away?.team?.displayName || "",
                        score: away?.score || 0,
                    },
                };
            });
        }

        // Headlines (top 8)
        let headlines = [];
        if (news?.articles?.length) {
            headlines = news.articles.slice(0, 8).map((a) => ({
                headline: a.headline,
                link: a.links?.web?.href || "",
            }));
        }

        // Injuries (balanced)
        let injuries = [];
        if (injuriesRoot?.items?.length) {
            // Each item is a team-level link
            const teamRequests = injuriesRoot.items.map((t) => safeJson(t.$ref));

            const teamData = await Promise.all(teamRequests);

            for (const team of teamData) {
                if (!team?.injuries) continue;

                for (const entry of team.injuries) {
                    const player = entry.athlete;
                    if (!player) continue;

                    injuries.push({
                        team: team.team?.abbreviation || "UNK",
                        name: player.displayName,
                        position: player.position,
                        status: entry.status,
                        description: entry.details || "",
                    });
                }
            }
        }

        // Build final payload
        const result = {
            ok: true,
            updated: new Date().toISOString(),
            games,
            headlines,
            injuries,
        };

        // Update cache
        cache.timestamp = Date.now();
        cache.data = result;

        return {
            statusCode: 200,
            body: JSON.stringify(result),
        };
    } catch (err) {
        console.error("GAMES FUNCTION ERROR:", err);

        // Fallback minimal structure
        return {
            statusCode: 200,
            body: JSON.stringify({
                ok: false,
                fallback: true,
                message: "ESPN data unavailable; using fallback.",
                games: [],
                headlines: [],
                injuries: [],
            }),
        };
    }
};
