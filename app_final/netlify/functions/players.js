// netlify/functions/players.js
const fetch = require("node-fetch");

let cache = { timestamp: 0, data: null };
const isFresh = () => Date.now() - cache.timestamp < 15 * 60 * 1000;

// Convert ESPN team names to your team abbreviations
const TEAM_MAP = {
    "Arizona Cardinals": "ARI", "Atlanta Falcons": "ATL", "Baltimore Ravens": "BAL", "Buffalo Bills": "BUF",
    "Carolina Panthers": "CAR", "Chicago Bears": "CHI", "Cincinnati Bengals": "CIN", "Cleveland Browns": "CLE",
    "Dallas Cowboys": "DAL", "Denver Broncos": "DEN", "Detroit Lions": "DET", "Green Bay Packers": "GB",
    "Houston Texans": "HOU", "Indianapolis Colts": "IND", "Jacksonville Jaguars": "JAX", "Kansas City Chiefs": "KC",
    "Las Vegas Raiders": "LV", "Los Angeles Chargers": "LAC", "Los Angeles Rams": "LAR", "Miami Dolphins": "MIA",
    "Minnesota Vikings": "MIN", "New England Patriots": "NE", "New Orleans Saints": "NO", "New York Giants": "NYG",
    "New York Jets": "NYJ", "Philadelphia Eagles": "PHI", "Pittsburgh Steelers": "PIT", "San Francisco 49ers": "SF",
    "Seattle Seahawks": "SEA", "Tampa Bay Buccaneers": "TB", "Tennessee Titans": "TEN", "Washington Commanders": "WAS"
};

// Determine NFL week boundary — reset weekly at Tuesday 8 AM EST
function currentNFLWeek() {
    const now = new Date();

    // Convert to EST
    const est = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const day = est.getDay();
    const hour = est.getHours();

    // New NFL Week starts Tuesday 8 AM EST
    if (day > 2 || (day === 2 && hour >= 8)) {
        return "CURRENT_WEEK";
    }
    return "LAST_WEEK";
}

// Build ESPN endpoints for all teams
function buildRosterUrls() {
    return Object.keys(TEAM_MAP).map(teamFull => ({
        url: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${TEAM_MAP[teamFull]}/roster`,
        teamFull
    }));
}

// Deep usage estimation (predictive)
function usageFromPosition(pos, depth) {
    if (pos === "QB") return { rush_share: 0.05, target_share: 0, redzone_share: 0.25 };
    if (pos === "RB") return { rush_share: depth === 1 ? 0.72 : 0.18, target_share: depth === 1 ? 0.14 : 0.06, redzone_share: depth === 1 ? 0.61 : 0.22 };
    if (pos === "WR") return { rush_share: 0.01, target_share: depth === 1 ? 0.25 : 0.12, redzone_share: depth === 1 ? 0.21 : 0.09 };
    if (pos === "TE") return { rush_share: 0, target_share: depth === 1 ? 0.18 : 0.09, redzone_share: depth === 1 ? 0.27 : 0.13 };
    return { rush_share: 0, target_share: 0, redzone_share: 0 };
}

// Predictive model for prop projections (extremely simplified but realistic)
function projectionFromUsage(pos, usage) {
    if (pos === "QB") return { pass_yards: 240 + Math.random() * 40, rush_yards: usage.rush_share * 25, td_probability: 0.045 };
    if (pos === "RB") return { rush_yards: usage.rush_share * 120, rec_yards: usage.target_share * 40, td_probability: usage.redzone_share };
    if (pos === "WR") return { rec_yards: usage.target_share * 110, td_probability: usage.redzone_share };
    if (pos === "TE") return { rec_yards: usage.target_share * 70, td_probability: usage.redzone_share };
    return {};
}

exports.handler = async () => {
    try {
        if (cache.data && isFresh()) {
            return { statusCode: 200, body: JSON.stringify(cache.data) };
        }

        const urls = buildRosterUrls();
        let players = [];

        for (let entry of urls) {
            try {
                const res = await fetch(entry.url);
                const json = await res.json();

                const teamFull = entry.teamFull;
                const teamAbbr = TEAM_MAP[teamFull];

                const athleteGroup = json.athletes || [];

                athleteGroup.forEach(group => {
                    (group.items || []).forEach(player => {
                        const pos = player.position?.abbreviation || "UNK";
                        const depth = player.depthChartOrder || 5;
                        const injury = player.injuries?.[0] || null;

                        const usage = usageFromPosition(pos, depth);
                        const proj = projectionFromUsage(pos, usage);

                        players.push({
                            id: player.id,
                            name: player.fullName,
                            team: teamAbbr,
                            team_full: teamFull,
                            position: pos,
                            depth,
                            status: player.status || "ACTIVE",
                            injury: injury ? {
                                type: injury.detail,
                                status: injury.status,
                                practice: injury.practiceStatus
                            } : null,
                            usage,
                            projection: proj
                        });
                    });
                });

            } catch (err) {
                console.log("Roster failed:", entry.teamFull, err);
            }
        }

        // Fallback if ESPN outage
        if (players.length < 200) {
            players = [{
                id: "FALLBACK",
                name: "Fallback Player",
                team: "FA",
                team_full: "Free Agent",
                position: "WR",
                depth: 1,
                status: "ACTIVE",
                injury: null,
                usage: { rush_share: 0, target_share: 0.22, redzone_share: 0.15 },
                projection: { rec_yards: 45, td_probability: 0.1 }
            }];
        }

        cache = { timestamp: Date.now(), data: players };

        return {
            statusCode: 200,
            body: JSON.stringify(players)
        };

    } catch (e) {
        console.error("PLAYER API ERROR:", e);

        return {
            statusCode: 200,
            body: JSON.stringify({
                error: true,
                players: []
            })
        };
    }
};
