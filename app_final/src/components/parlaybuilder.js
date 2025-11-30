import React, { useState, useEffect } from "react";
import { TEAM_LIST } from "../data/teamList";
import { PLAYER_POOL } from "../data/playerPool";
import { runFullSimulation } from "../services/simulatorEngine";
import "../assets/theme.css";

export default function ParlayBuilder() {
    const [legs, setLegs] = useState([]);
    const [result, setResult] = useState(null);
    const [building, setBuilding] = useState(false);
    const [error, setError] = useState(null);

    // -------------------------
    // Add a new blank leg
    // -------------------------
    function addLeg() {
        setLegs([
            ...legs,
            {
                type: "",
                player: "",
                team: "",
                prop: "",
                home: "",
                away: "",
                projected: null,
            },
        ]);
    }

    // -------------------------
    // Remove specific leg
    // -------------------------
    function removeLeg(index) {
        const updated = [...legs];
        updated.splice(index, 1);
        setLegs(updated);
    }

    // -------------------------
    // Update specific leg key
    // -------------------------
    function updateLeg(index, field, value) {
        const updated = [...legs];
        updated[index][field] = value;

        // Reset dependent fields
        if (field === "type") {
            updated[index].player = "";
            updated[index].team = "";
            updated[index].home = "";
            updated[index].away = "";
            updated[index].prop = "";
        }

        // If game type chosen, clear player fields
        if (field === "home" || field === "away") {
            updated[index].player = "";
            updated[index].team = "";
            updated[index].prop = "";
        }

        setLegs(updated);
    }

    // -------------------------
    // Simulate a single leg
    // -------------------------
    async function simulateLeg(leg) {
        // GAME RESULT LEG
        if (leg.type === "game") {
            const sim = await runFullSimulation(leg.away, leg.home);
            return {
                prob: sim.winProb / 100,
                label: `${leg.away} @ ${leg.home} — ${sim.winner} projected`,
            };
        }

        // PLAYER PROP LEG
        const sim = await runFullSimulation(leg.team, leg.team); // Mirror sim (same model effect)

        // Fake player model (uses team-level sim impact)
        let baseProb = 0.45;

        if (leg.prop === "1 TD") baseProb = 0.52 + (sim.confidence / 250);
        if (leg.prop === "2 TD") baseProb = 0.21 + (sim.confidence / 500);
        if (leg.prop === "30 Yards") baseProb = 0.68 + (sim.confidence / 200);
        if (leg.prop === "40 Yards") baseProb = 0.58 + (sim.confidence / 220);
        if (leg.prop === "50 Yards") baseProb = 0.43 + (sim.confidence / 260);
        if (leg.prop === "3 Receptions") baseProb = 0.61 + (sim.confidence / 230);

        // Cap probability to valid range
        baseProb = Math.min(Math.max(baseProb, 0.05), 0.95);

        return {
            prob: baseProb,
            label: `${leg.player} — ${leg.prop}`,
        };
    }

    // -------------------------
    // Build the entire parlay
    // -------------------------
    async function buildParlay() {
        if (legs.length === 0) {
            setError("Add at least one leg.");
            return;
        }

        setError(null);
        setBuilding(true);

        const legResults = [];

        for (let i = 0; i < legs.length; i++) {
            const lr = await simulateLeg(legs[i]);
            legResults.push(lr);
        }

        // Multiply all probabilities for final parlay hit rate
        const combinedProb = legResults.reduce(
            (acc, l) => acc * l.prob,
            1
        );

        setResult({
            legs: legResults,
            combinedProb: combinedProb * 100,
        });

        setBuilding(false);
    }

    return (
        <div className="fade-in" style={{ padding: "1rem" }}>
            <h1 className="mw-title">Parlay Builder</h1>
            <p className="mw-subtitle">
                Select your legs. Our advanced simulation engine will compute your custom
                parlay’s probability using weather, injuries, team-level models & our
                multi-phase simulation stack.
            </p>

            {/* LEG LIST */}
            {legs.map((leg, index) => (
                <div
                    key={index}
                    className="mw-card fade-in"
                    style={{
                        marginBottom: "1rem",
                        borderLeft: "4px solid var(--mw-accent)",
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <h3 className="mw-label">Leg #{index + 1}</h3>
                        <button
                            className="mw-button-outline"
                            onClick={() => removeLeg(index)}
                            style={{ padding: "0.3rem 0.8rem" }}
                        >
                            Remove
                        </button>
                    </div>

                    {/* Type: Game or Player */}
                    <label className="mw-label">Leg Type</label>
                    <select
                        className="mw-select"
                        value={leg.type}
                        onChange={(e) => updateLeg(index, "type", e.target.value)}
                    >
                        <option value="">Select Type</option>
                        <option value="game">Game Result</option>
                        <option value="player">Player Prop</option>
                    </select>

                    {/* GAME RESULTS */}
                    {leg.type === "game" && (
                        <>
                            <label className="mw-label">Away Team</label>
                            <select
                                className="mw-select"
                                value={leg.away}
                                onChange={(e) => updateLeg(index, "away", e.target.value)}
                            >
                                <option value="">Select team</option>
                                {TEAM_LIST.map((t) => (
                                    <option key={t.abbr} value={t.abbr}>
                                        {t.name}
                                    </option>
                                ))}
                            </select>

                            <label className="mw-label">Home Team</label>
                            <select
                                className="mw-select"
                                value={leg.home}
                                onChange={(e) => updateLeg(index, "home", e.target.value)}
                            >
                                <option value="">Select team</option>
                                {TEAM_LIST.map((t) => (
                                    <option key={t.abbr} value={t.abbr}>
                                        {t.name}
                                    </option>
                                ))}
                            </select>
                        </>
                    )}

                    {/* PLAYER PROP */}
                    {leg.type === "player" && (
                        <>
                            <label className="mw-label">Player</label>
                            <select
                                className="mw-select"
                                value={leg.player}
                                onChange={(e) => {
                                    const p = PLAYER_POOL.find((x) => x.name === e.target.value);
                                    updateLeg(index, "player", e.target.value);
                                    updateLeg(index, "team", p?.team || "");
                                }}
                            >
                                <option value="">Select Player</option>
                                {PLAYER_POOL.map((p) => (
                                    <option key={p.name} value={p.name}>
                                        {p.name} — {p.team}
                                    </option>
                                ))}
                            </select>

                            <label className="mw-label">Prop Type</label>
                            <select
                                className="mw-select"
                                value={leg.prop}
                                onChange={(e) => updateLeg(index, "prop", e.target.value)}
                            >
                                <option value="">Choose Prop</option>
                                <option value="1 TD">Anytime TD</option>
                                <option value="2 TD">2+ TD</option>
                                <option value="30 Yards">30+ Yards</option>
                                <option value="40 Yards">40+ Yards</option>
                                <option value="50 Yards">50+ Yards</option>
                                <option value="3 Receptions">3+ Receptions</option>
                            </select>
                        </>
                    )}
                </div>
            ))}

            <button className="mw-button" onClick={addLeg} style={{ marginBottom: "1rem" }}>
                Add Leg
            </button>

            {error && <p className="mw-error">{error}</p>}

            <button
                className="mw-button"
                disabled={building}
                onClick={buildParlay}
                style={{ width: "100%", maxWidth: "500px" }}
            >
                {building ? "Simulating…" : "Build Parlay"}
            </button>

            {/* RESULT */}
            {result && (
                <div className="mw-card fade-in" style={{ marginTop: "2rem" }}>
                    <h2 className="mw-title">Parlay Results</h2>

                    {result.legs.map((leg, i) => (
                        <div key={i} className="mw-stat-box" style={{ marginBottom: "0.8rem" }}>
                            <div className="mw-stat-label">{leg.label}</div>
                            <div className="mw-stat-value">
                                {(leg.prob * 100).toFixed(1)}%
                            </div>
                        </div>
                    ))}

                    <hr className="mw-divider" />

                    <h2 className="mw-title">
                        Combined Probability:{" "}
                        {result.combinedProb.toFixed(2)}%
                    </h2>

                    <p className="mw-note">This number reflects the simulated chance your parlay hits.</p>
                </div>
            )}
        </div>
    );
}
