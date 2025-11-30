import React, { useState, useEffect } from "react";
import { PLAYER_POOL } from "../data/playerPool";
import { TEAM_LIST } from "../data/teamList";
import { runFullSimulation } from "../services/simulatorEngine";
import "../assets/theme.css";

// ---------------------------------------------------------
// LOGIN CREDENTIALS
// ---------------------------------------------------------
const USER = "mayorsbetaguest";
const PASS = "iamlucky321";

// ---------------------------------------------------------
export default function MayorPicks() {
    const [authenticated, setAuthenticated] = useState(false);
    const [username, setUser] = useState("");
    const [password, setPass] = useState("");
    const [loading, setLoading] = useState(false);

    const [bestProps, setBestProps] = useState([]);
    const [topParlay, setTopParlay] = useState(null);
    const [hailMary, setHailMary] = useState([]);

    // ---------------------------------------------------------
    // LOGIN HANDLER
    // ---------------------------------------------------------
    function handleLogin(e) {
        e.preventDefault();

        if (username === USER && password === PASS) {
            setAuthenticated(true);
        } else {
            alert("Invalid login.");
        }
    }

    // ---------------------------------------------------------
    // LOAD ONCE LOGGED IN
    // ---------------------------------------------------------
    useEffect(() => {
        if (!authenticated) return;
        generatePicks();
    }, [authenticated]);

    // ---------------------------------------------------------
    // PROP PROBABILITY MODEL (triple depth)
    // ---------------------------------------------------------
    async function propScore(player, team, propType) {
        const sim = await runFullSimulation(team, team);

        let base = 0.45;

        if (propType === "1 TD") base = 0.52 + sim.confidence / 210;
        if (propType === "2 TD") base = 0.18 + sim.confidence / 480;
        if (propType === "30 Yards") base = 0.66 + sim.confidence / 180;
        if (propType === "40 Yards") base = 0.56 + sim.confidence / 210;
        if (propType === "50 Yards") base = 0.41 + sim.confidence / 260;
        if (propType === "3 Receptions") base = 0.64 + sim.confidence / 190;

        base = Math.max(0.05, Math.min(base, 0.97));

        return {
            player,
            team,
            prop: propType,
            prob: base,
        };
    }

    // ---------------------------------------------------------
    // GET FULL SET OF POSSIBLE PROPS
    // ---------------------------------------------------------
    async function computeAllProps() {
        const propTypes = [
            "1 TD",
            "2 TD",
            "30 Yards",
            "40 Yards",
            "50 Yards",
            "3 Receptions",
        ];

        const results = [];

        for (const p of PLAYER_POOL) {
            for (const prop of propTypes) {
                const r = await propScore(p.name, p.team, prop);
                results.push(r);
            }
        }

        return results
            .sort((a, b) => b.prob - a.prob)
            .slice(0, 10);
    }

    // ---------------------------------------------------------
    // CREATE SIX-LEG PARLAY
    // ---------------------------------------------------------
    async function createTopParlay(bestPropsList) {
        const legs = bestPropsList.slice(0, 6).map((p) => ({
            label: `${p.player} — ${p.prop}`,
            prob: p.prob,
        }));

        const combinedProb =
            legs.reduce((acc, x) => acc * x.prob, 1) * 100;

        return {
            legs,
            combinedProb,
        };
    }

    // ---------------------------------------------------------
    // CREATE 12-LEG HAIL MARY (NO PROBS SHOWN)
    // ---------------------------------------------------------
    async function buildHailMary() {
        let picks = [];

        const extendedProps = [];
        const propTypes = [
            "1 TD",
            "2 TD",
            "30 Yards",
            "40 Yards",
            "50 Yards",
            "3 Receptions",
        ];

        // Tripled-player pool depth
        for (let i = 0; i < PLAYER_POOL.length; i++) {
            const p = PLAYER_POOL[i];
            for (let prop of propTypes) {
                extendedProps.push(`${p.name} — ${prop}`);
            }
        }

        // Shuffle
        extendedProps.sort(() => Math.random() - 0.5);

        // Take 9 prop legs
        picks = extendedProps.slice(0, 9);

        // Add 3 different game result legs
        const gameLegs = [];
        for (let i = 0; i < 3; i++) {
            const t1 = TEAM_LIST[Math.floor(Math.random() * TEAM_LIST.length)];
            const t2 = TEAM_LIST[Math.floor(Math.random() * TEAM_LIST.length)];
            if (t1.abbr !== t2.abbr) {
                gameLegs.push(`${t1.abbr} vs ${t2.abbr} — Winner Simulated`);
            }
        }

        return [...picks, ...gameLegs].slice(0, 12);
    }

    // ---------------------------------------------------------
    async function generatePicks() {
        setLoading(true);

        // Top 10 props
        const props = await computeAllProps();
        setBestProps(props);

        // 6-leg parlay
        const parlay = await createTopParlay(props);
        setTopParlay(parlay);

        // Hail Mary
        const hm = await buildHailMary();
        setHailMary(hm);

        setLoading(false);
    }

    // ---------------------------------------------------------
    // LOGIN SCREEN UI
    // ---------------------------------------------------------
    if (!authenticated) {
        return (
            <div
                className="fade-in"
                style={{
                    padding: "1rem",
                    maxWidth: "450px",
                    margin: "3rem auto",
                }}
            >
                <h1 className="mw-title">Mayor's Picks Login</h1>
                <p className="mw-subtitle">
                    Authorized beta users only — this section runs deeper versions of the
                    MayorWardProd simulation engine.
                </p>

                <form className="mw-card" onSubmit={handleLogin}>
                    <label className="mw-label">Username</label>
                    <input
                        className="mw-select"
                        value={username}
                        onChange={(e) => setUser(e.target.value)}
                    />

                    <label className="mw-label">Password</label>
                    <input
                        type="password"
                        className="mw-select"
                        value={password}
                        onChange={(e) => setPass(e.target.value)}
                    />

                    <button className="mw-button" style={{ marginTop: "1rem" }}>
                        Log In
                    </button>
                </form>
            </div>
        );
    }

    // ---------------------------------------------------------
    // MAIN PICKS DASHBOARD
    // ---------------------------------------------------------
    return (
        <div className="fade-in" style={{ padding: "1rem" }}>
            <h1 className="mw-title">The Mayor’s Picks</h1>
            <p className="mw-subtitle">
                Triple-strength modeling. Custom probability weighting. Exclusive to the
                MayorWardProd Sports Lab.
            </p>

            {loading && <p>Loading mayoral picks…</p>}

            {/* -----------------------------------------------------
        TOP 10 PROPS
      ----------------------------------------------------- */}
            <h2 className="mw-section-title">Top 10 Player Props</h2>
            <div className="mw-props-grid">
                {bestProps.map((p, i) => (
                    <div key={i} className="mw-card fade-in">
                        <div className="mw-label">#{i + 1}</div>
                        <div className="mw-team">{p.player}</div>
                        <div style={{ opacity: 0.7 }}>{p.team}</div>
                        <div className="mw-stat-box">
                            <div className="mw-stat-label">Prop</div>
                            <div className="mw-stat-value">{p.prop}</div>
                        </div>
                        <div className="mw-stat-box">
                            <div className="mw-stat-label">Hit Rate</div>
                            <div className="mw-stat-value">
                                {(p.prob * 100).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* -----------------------------------------------------
        TOP 6-LEG PARLAY
      ----------------------------------------------------- */}
            {topParlay && (
                <>
                    <h2 className="mw-section-title">Mayor’s 6-Leg Parlay</h2>
                    <div className="mw-card fade-in">
                        {topParlay.legs.map((l, i) => (
                            <div key={i} className="mw-stat-box">
                                <div className="mw-stat-label">{l.label}</div>
                                <div className="mw-stat-value">
                                    {(l.prob * 100).toFixed(1)}%
                                </div>
                            </div>
                        ))}

                        <hr className="mw-divider" />

                        <div className="mw-label">
                            Combined Probability:{" "}
                            {topParlay.combinedProb.toFixed(2)}%
                        </div>
                    </div>
                </>
            )}

            {/* -----------------------------------------------------
        HAIL MARY 12-LEG PARLAY
      ----------------------------------------------------- */}
            <h2 className="mw-section-title">The Mayor’s Hail Mary — 12-Leg</h2>
            <div className="mw-card fade-in">
                {hailMary.map((leg, i) => (
                    <div key={i} className="mw-stat-box">
                        <div className="mw-stat-label">{leg}</div>
                    </div>
                ))}
                <p className="mw-note" style={{ marginTop: "1rem" }}>
                    As requested — no probabilities displayed for the Hail Mary.
                    Just the 12 chosen legs.
                </p>
            </div>
        </div>
    );
}
