import React, { useEffect, useState } from "react";
import { getScoreboard, getWeather } from "../services/api";
import "./../assets/theme.css";

export default function Scoreboard() {
    const [games, setGames] = useState([]);
    const [headlines, setHeadlines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [weatherMap, setWeatherMap] = useState({});
    const [error, setError] = useState(null);

    useEffect(() => {
        load();

        // Refresh timing logic built into service file
        const interval = setInterval(load, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    async function load() {
        setLoading(true);

        // Fetch scoreboard data
        const sb = await getScoreboard();
        const weather = await getWeather();

        if (!sb.ok) {
            setError("Failed to load scoreboard.");
            setLoading(false);
            return;
        }

        const events = sb.data?.games || sb.data?.events || [];

        // Extract headlines if provided
        let topHeadlines = sb.data?.headlines || [];
        if (Array.isArray(topHeadlines)) {
            setHeadlines(topHeadlines.slice(0, 12));
        }

        // Map weather by team abbreviation
        const weatherObj = {};
        if (weather.ok && Array.isArray(weather.data)) {
            weather.data.forEach(w => {
                if (w.team) weatherObj[w.team] = w;
            });
        }
        setWeatherMap(weatherObj);

        // Format games for UI
        const formatted = events.map(ev => {
            const comp = ev.competitions?.[0];
            if (!comp) return null;

            const home = comp.competitors?.find(t => t.homeAway === "home");
            const away = comp.competitors?.find(t => t.homeAway === "away");

            return {
                id: ev.id,
                date: ev.date,
                headline: ev.shortName,
                injuries: comp.notes?.filter(n => n.type === "injury") || [],
                home: {
                    name: home?.team?.displayName,
                    abbr: home?.team?.abbreviation,
                    score: home?.score,
                },
                away: {
                    name: away?.team?.displayName,
                    abbr: away?.team?.abbreviation,
                    score: away?.score,
                }
            };
        }).filter(Boolean);

        setGames(formatted);
        setLoading(false);
    }

    return (
        <div className="fade-in" style={{ padding: "1rem" }}>
            <h1 className="mw-title">Weekly Matchups</h1>
            <p className="mw-subtitle">
                Live rotation updated every 30 minutes on game days.
            </p>

            {/* ?? Headline Ticker */}
            {headlines.length > 0 && (
                <div className="mw-ticker-wrapper" style={{ marginBottom: "1rem" }}>
                    <div className="mw-ticker">
                        {headlines.map((hl, i) => (
                            <span key={i}>?? {hl}</span>
                        ))}
                    </div>
                </div>
            )}

            {loading && <p>Loading matchups…</p>}
            {error && <p style={{ color: "var(--mw-accent-red)" }}>{error}</p>}

            <div className="mw-scoreboard">
                {games.map((game) => (
                    <div key={game.id} className="mw-matchup fade-in">
                        {/* LEFT TEAM */}
                        <div>
                            <div className="mw-team">{game.away.abbr}</div>
                            <div>{game.away.name}</div>
                            {weatherMap[game.away.abbr] && (
                                <div style={{ opacity: 0.7, fontSize: "0.85rem" }}>
                                    ?? {weatherMap[game.away.abbr].temp}° | ?? {weatherMap[game.away.abbr].wind_speed} mph
                                </div>
                            )}
                        </div>

                        {/* VS + SCORE */}
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "1.2rem", marginBottom: "0.3rem" }}>
                                {game.away.score ?? "-"} &nbsp; vs &nbsp; {game.home.score ?? "-"}
                            </div>
                            <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>
                                {new Date(game.date).toLocaleString()}
                            </div>
                        </div>

                        {/* RIGHT TEAM */}
                        <div style={{ textAlign: "right" }}>
                            <div className="mw-team">{game.home.abbr}</div>
                            <div>{game.home.name}</div>
                            {weatherMap[game.home.abbr] && (
                                <div style={{ opacity: 0.7, fontSize: "0.85rem" }}>
                                    ?? {weatherMap[game.home.abbr].temp}° | ?? {weatherMap[game.home.abbr].wind_speed} mph
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Injury summaries */}
            <h2 className="mw-title" style={{ marginTop: "1.4rem", fontSize: "1.6rem" }}>
                Key Injuries
            </h2>

            {games.map((g) => (
                <div key={g.id} className="mw-card fade-in">
                    <h3 style={{ marginBottom: "0.5rem" }}>
                        {g.away.abbr} @ {g.home.abbr}
                    </h3>
                    {g.injuries.length === 0 && (
                        <p style={{ opacity: 0.6 }}>No major injuries reported.</p>
                    )}
                    {g.injuries.map((inj, i) => (
                        <p key={i} style={{ fontSize: "0.9rem", opacity: 0.8 }}>
                            ? {inj.text}
                        </p>
                    ))}
                </div>
            ))}
        </div>
    );
}
