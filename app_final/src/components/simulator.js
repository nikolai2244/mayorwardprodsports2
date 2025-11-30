import React, { useState } from "react";
import { TEAM_LIST } from "../data/teamList";
import { runFullSimulation } from "../services/simulatorEngine";
import "../assets/theme.css";

export default function Simulator() {
    const [home, setHome] = useState("");
    const [away, setAway] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleSimulate = async () => {
        if (!home || !away || home === away) {
            setError("Please select two different teams.");
            return;
        }

        setError(null);
        setLoading(true);

        const res = await runFullSimulation(away, home);
        setResult(res);
        setLoading(false);
    };

    return (
        <div className="fade-in" style={{ padding: "1rem" }}>
            <h1 className="mw-title">Game Simulator</h1>
            <p className="mw-subtitle">
                Our Alpha Model runs 1.5M simulations to generate predicted score,
                margin of victory, win probability & confidence levels.
            </p>

            {/* SELECT TEAMS */}
            <div
                className="mw-card fade-in"
                style={{ maxWidth: "600px", margin: "1rem auto" }}
            >
                <label className="mw-label">Away Team</label>
                <select
                    className="mw-select"
                    value={away}
                    onChange={(e) => setAway(e.target.value)}
                >
                    <option value="">Select Team</option>
                    {TEAM_LIST.map((t) => (
                        <option key={t.abbr} value={t.abbr}>
                            {t.name}
                        </option>
                    ))}
                </select>

                <label className="mw-label">Home Team</label>
                <select
                    className="mw-select"
                    value={home}
                    onChange={(e) => setHome(e.target.value)}
                >
                    <option value="">Select Team</option>
                    {TEAM_LIST.map((t) => (
                        <option key={t.abbr} value={t.abbr}>
                            {t.name}
                        </option>
                    ))}
                </select>

                <button
                    onClick={handleSimulate}
                    disabled={loading}
                    className="mw-button"
                    style={{ marginTop: "1rem" }}
                >
                    {loading ? "Running Simulation…" : "Simulate Game"}
                </button>
            </div>

            {/* RESULTS */}
            {result && (
                <div
                    className="mw-card fade-in"
                    style={{
                        marginTop: "1.5rem",
                        padding: "2rem",
                        borderLeft: "4px solid var(--mw-accent)",
                    }}
                >
                    <h2 className="mw-title" style={{ fontSize: "1.8rem" }}>
                        Simulation Results
                    </h2>

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginTop: "1.2rem",
                        }}
                    >
                        <div>
                            <div className="mw-team">{result.awayTeam}</div>
                            <div className="mw-score-large">{result.awayScore}</div>
                        </div>

                        <div className="mw-score-separator">at</div>

                        <div style={{ textAlign: "right" }}>
                            <div className="mw-team">{result.homeTeam}</div>
                            <div className="mw-score-large">{result.homeScore}</div>
                        </div>
                    </div>

                    <hr className="mw-divider" />

                    <div className="mw-stats-grid">
                        <div className="mw-stat-box">
                            <div className="mw-stat-label">Winner</div>
                            <div className="mw-stat-value">{result.winner}</div>
                        </div>

                        <div className="mw-stat-box">
                            <div className="mw-stat-label">Margin</div>
                            <div className="mw-stat-value">
                                {result.margin > 0
                                    ? `${result.winner} by ${result.margin}`
                                    : "Pick'em"}
                            </div>
                        </div>

                        <div className="mw-stat-box">
                            <div className="mw-stat-label">Total Points</div>
                            <div className="mw-stat-value">{result.total}</div>
                        </div>

                        <div className="mw-stat-box">
                            <div className="mw-stat-label">Win Probability</div>
                            <div className="mw-stat-value">
                                {result.winProb.toFixed(1)}%
                            </div>
                        </div>

                        <div className="mw-stat-box">
                            <div className="mw-stat-label">Confidence Score</div>
                            <div className="mw-stat-value">
                                {result.confidence.toFixed(1)}%
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <p className="mw-note">
                        Weather, injuries & matchup dynamics are included in this model.
                    </p>
                </div>
            )}
        </div>
    );
}

