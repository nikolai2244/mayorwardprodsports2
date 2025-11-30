import React from "react";

const towerLogo = process.env.PUBLIC_URL + "/logos/mw_tower.png";

export default function Footer() {
    return (
        <footer className="mw-footer">
            <img src={towerLogo} alt="MW Footer Logo" className="footer-icon" />
            <p>© 2025 MayorWard Productions — All Rights Reserved</p>
        </footer>
    );
}