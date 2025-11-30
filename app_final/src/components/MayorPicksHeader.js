import React from "react";

const circleLogo = process.env.PUBLIC_URL + "/logos/mw_circle.png";

export default function MayorPicksHeader() {
    return (
        <div className="mayor-header">
            <img src={circleLogo} alt="Mayor Picks Icon" className="mayor-icon" />
            <h2>The Mayor’s Picks</h2>
        </div>
    );
}
