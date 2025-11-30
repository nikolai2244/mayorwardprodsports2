import React from "react";

const circleLogo = process.env.PUBLIC_URL + "/logos/mw_circle.png";

export default function HomeHero() {
    return (
        <div className="mw-hero">
            <img src={circleLogo} alt="MW Hero Logo" className="mw-hero-logo" />
            <h2 className="mw-hero-title">Elite Models. Elite Predictions.</h2>
            <p className="mw-hero-sub">Your edge starts here.</p>
        </div>
    );
}
