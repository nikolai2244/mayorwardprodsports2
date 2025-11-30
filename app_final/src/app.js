import React, { useState } from "react";
import Scoreboard from "./components/Scoreboard";
import Simulator from "./components/Simulator";
import ParlayBuilder from "./components/ParlayBuilder";
import Props from "./components/Props";
import MayorPicks from "./components/MayorPicks";
import SignupCard from "./components/SignupCard";
import "./assets/theme.css";

export default function App() {
    const [tab, setTab] = useState("home");

    return (
        <div className="mw-app">

            {/* -----------------------------------------------------
        TOP DISCLAIMER
      ----------------------------------------------------- */}
            <div className="mw-disclaimer">
                This is our first beta version — please double-check stats. These are
                simulations and predictions, not guarantees.
            </div>

            {/* -----------------------------------------------------
        TOP NAVIGATION
      ----------------------------------------------------- */}
            <nav className="mw-nav">
                <button
                    className={tab === "home" ? "mw-nav-btn active" : "mw-nav-btn"}
                    onClick={() => setTab("home")}
                >
                    Home
                </button>

                <button
                    className={tab === "sim" ? "mw-nav-btn active" : "mw-nav-btn"}
                    onClick={() => setTab("sim")}
                >
                    Simulator
                </button>

                <button
                    className={tab === "parlay" ? "mw-nav-btn active" : "mw-nav-btn"}
                    onClick={() => setTab("parlay")}
                >
                    Parlay Builder
                </button>

                <button
                    className={tab === "props" ? "mw-nav-btn active" : "mw-nav-btn"}
                    onClick={() => setTab("props")}
                >
                    Player Props
                </button>

                <button
                    className={tab === "mayor" ? "mw-nav-btn active" : "mw-nav-btn"}
                    onClick={() => setTab("mayor")}
                >
                    Mayor’s Picks
                </button>
            </nav>

            {/* -----------------------------------------------------
        MAIN CONTENT ROUTING
      ----------------------------------------------------- */}
            <div className="mw-content">
                {tab === "home" && (
                    <div className="fade-in">

                        {/* SCOREBOARD */}
                        <Scoreboard />

                        {/* SIGN-UP CARD */}
                        <SignupCard />

                        {/* SUPPORT BUTTONS */}
                        <div className="mw-card fade-in" style={{ marginTop: "2rem" }}>
                            <h2 className="mw-title">Support Development</h2>
                            <p className="mw-subtitle">
                                Help support the MayorWardProd Sports Lab and future creative
                                projects.
                            </p>

                            <div className="mw-support-row">
                                <a
                                    href="https://www.venmo.com/mayorward"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mw-button"
                                >
                                    Venmo
                                </a>

                                <a
                                    href="https://www.gofundme.com/f/support-nikolas-wards-journey-to-creative-revival"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mw-button"
                                >
                                    GoFundMe
                                </a>

                                <a
                                    href="https://paypal.me/njw2244?locale.x=en_US&country.x=US"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mw-button"
                                >
                                    PayPal
                                </a>
                            </div>

                            <p className="mw-note" style={{ marginTop: "1rem" }}>
                                Learn more about the mission and follow updates on GoFundMe.
                            </p>
                        </div>
                    </div>
                )}

                {tab === "sim" && <Simulator />}
                {tab === "parlay" && <ParlayBuilder />}
                {tab === "props" && <Props />}
                {tab === "mayor" && <MayorPicks />}
            </div>

            {/* -----------------------------------------------------
        FOOTER
      ----------------------------------------------------- */}
            <footer className="mw-footer fade-in">
                © {new Date().getFullYear()} MayorWardProd Sports Lab.
                All rights reserved. Simulation engine & UI licensed exclusively to
                MayorWard Productions.
            </footer>
        </div>
    );
}
