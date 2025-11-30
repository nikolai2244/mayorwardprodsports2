import React from "react";

const towerLogo = process.env.PUBLIC_URL + "/logos/mw_tower.png";

export default function SimulatorHeader() {
    return (
        <div className="sim-header">
            <img src={towerLogo} alt="MW Tower Icon" className="sim-tower-icon" />
            <h2>MW Game Simulator</h2>
        </div>
    );
}
