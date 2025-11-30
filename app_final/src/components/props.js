import React, { useEffect, useState } from "react";
import { PLAYER_POOL } from "../data/playerPool";
import { runFullSimulation } from "../services/simulatorEngine";
import { getRefreshInterval } from "../services/api";
import "../assets/theme.css";

export default function Props() {
    const [loading, setLoading] = useState(true);
    const [propsList, setPropsList] = useState([]);
    const [error, setError] = useState(null);

    const propOptions = [
        { key: "1 TD", label: "Anytime TD" },
        { key: "2 TD", label: "2+ Touchdowns" },
        { key: "30 Yards", label: "30+ Yards" },
        { key: "40 Yards", label: "40+ Yards" },
        { key: "50 Yards", label: "50+ Yards" },
        { key: "3 Receptions", label: "3+ Receptions" },
    ];

    useEffect(() => {
        loadProps();
        const refresh = getRefreshInterval();
        const interval = setInterval(loadProps, refresh);
        return () => clearInterval(interval);
    }, []);

    async function loadProps() {
        try {
            setLoading(true);

            const results = [];

            // Loop through players & props
            for (let i = 0; i < PLAYER_POOL.length; i++) {
                const p = PLAYER_POOL[i];

                for (let j = 0; j < propOptions.length; j++) {
                    const prop = propOptions[j];

                    // Run simulation for team-level performance
                    const sim = await runFullSimulation(p.team, p.team);

                    // Player performance influenced by team model
                    let probability = 0.45;

                    switch (prop.key) {
                        case "1 TD":
                            probability = 0.52 + sim.confidence / 240;
                            break;
                        case "2 TD":
                            probability = 0.18 + sim.confidence / 510;
                            break;
                        case "30 Yards":
                            probability = 0.66 + sim.confidence / 260;
                            break;
                        case "40 Yards":
                            probability = 0.55 + sim.confidence / 300;
                            break;
                        case "50 Yards":
                            probability = 0.42 + sim.confidence / 360;
                            break;
                        case "3 Receptions":
                            probability = 0.63 + sim.confidence / 220;
                            break;
                        default:
                            probability = 0.5;
                    }

                    probability = Math.min(Math.max(probability, 0.05), 0.97);

                    results.push({
                        player: p.name,
                        team: p.team,
                        prop: prop.label,
                        prob: probability,
                    });
                }
            }

            // Sort highest → lowest probability and take top 10
            const sorted = results
                .sort((a, b) => b.prob - a.prob)
                .slice(0, 10);

            setPropsList(sorted);
            setLoading(false);
            setError(null);
        } catch (err) {
            console.error(err);
            setError("Failed to load props.");
            setLoading(false);
        }
    }

    return (
        <div className="fade-in" style={{ padding: "1rem" }}>
            <h1 className="mw-title">Top Player Props of the Week</h1>
            <p className="mw-subtitle">
                Ranked by our advanced simulation engine using weather, injuries, and
                matchup dynamics.
            </p>

            {loading && <p>Loading props…</p>}
            {error && <p className="mw-error">{error}</p>}

            <div className="mw-props-grid">
                {propsList.map((item, idx) => (
                    <div key={idx} className="mw-card fade-in" style={{ padding: "1.2rem" }}>
                        <div className="mw-label" style={{ fontSize: "1.1rem" }}>
                            #{idx + 1}
                        </div>

                        <div className="mw-team" style={{ marginTop: "0.5rem" }}>
                            {item.player}
                        </div>

                        <div
                            style={{
                                opacity: 0.7,
                                fontSize: "0.95rem",
                                marginBottom: "0.8rem",
                            }}
                        >
                            {item.team}
                        </div>

                        <div
                            className="mw-stat-box"
                            style={{ borderLeft: "3px solid var(--mw-accent)" }}
                        >
                            <div className="mw-stat-label">Prop</div>
                            <div className="mw-stat-value">{item.prop}</div>
                        </div>

                        <div
                            className="mw-stat-box"
                            style={{ borderLeft: "3px solid var(--mw-accent)" }}
                        >
                            <div className="mw-stat-label">Projected Hit Rate</div>
                            <div className="mw-stat-value">
                                {(item.prob * 100).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
