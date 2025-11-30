import React from "react";

const headerLogo = process.env.PUBLIC_URL + "/logos/mw_LOGOnobackground.png";

export default function Header() {
    return (
        <header className="mw-header">
            <img
                src={headerLogo}
                alt="MW Logo"
                className="mw-header-logo"
            />
            <h1 className="mw-title">MayorWardProd Sports Lab</h1>
        </header>
    );
}
