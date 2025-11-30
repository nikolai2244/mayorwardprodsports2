/**
 * injuries.js – Netlify Serverless Function
 * Returns key injuries for all NFL teams
 */

const fetch = require("node-fetch");

exports.handler = async () => {
    try {
        // ESPN Injury API
        const url =
            "https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries";

        const res = await fetch(url);
        const json = await res.json();

        if (!res.ok || !json.injuries) {
            console.error("ESPN injury API error:", json);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    error: true,
                    injuries: [],
                    fallback: true
                })
            };
        }

        // Normalize output
        const formatted = [];

        json.injuries.forEach(team => {
            const teamName = team.team?.displayName || "Unknown Team";

            team.injuries.forEach(player => {
                formatted.push({
                    team: teamName,
                    name: player.athlete?.displayName || "Unknown Player",
                    position: player.athlete?.position?.abbreviation || "",
                    status: player.status || "Unknown",
                    description: player.details || "",
                    date: player.date || "",
                    type: player.type || ""
                });
            });
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                error: false,
                injuries: formatted
            })
        };
    } catch (err) {
        console.error("Injury fetch ERROR:", err);

        // Safe fallback so frontend doesn’t break
        return {
            statusCode: 200,
            body: JSON.stringify({
                error: true,
                injuries: [],
                fallback: true
            })
        };
    }
};
