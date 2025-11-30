import React, { useState } from "react";
import "../assets/theme.css";

export default function SignupCard() {
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(null);

    function validateEmail(e) {
        return /\S+@\S+\.\S+/.test(e);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);

        if (!validateEmail(email)) {
            setError("Please enter a valid email.");
            return;
        }

        // Netlify Forms requires a POST with form data
        const formData = new FormData();
        formData.append("form-name", "mw-signups");
        formData.append("email", email);
        formData.append("phone", phone);

        try {
            await fetch("/", {
                method: "POST",
                body: formData,
            });

            setSubmitted(true);
            setEmail("");
            setPhone("");
        } catch (err) {
            console.error(err);
            setError("Network error — try again.");
        }
    }

    return (
        <div
            className="mw-card fade-in"
            style={{
                maxWidth: "500px",
                margin: "1rem auto",
                borderLeft: "4px solid var(--mw-accent)",
            }}
        >
            <h2 className="mw-title">Sign Up for Updates</h2>
            <p className="mw-subtitle">
                Be the first to know about new versions, features, and announcements.
            </p>

            {submitted ? (
                <p className="mw-success fade-in">
                    Thank you! You're officially on the early-access list.
                </p>
            ) : (
                <>
                    {/* ---- Hidden Netlify Form: Required ---- */}
                    <form
                        name="mw-signups"
                        data-netlify="true"
                        netlify-honeypot="bot-field"
                        hidden
                    >
                        <input type="email" name="email" />
                        <input type="text" name="phone" />
                    </form>

                    {/* ---- Visible Form ---- */}
                    <form onSubmit={handleSubmit}>
                        <label className="mw-label">Email</label>
                        <input
                            className="mw-select"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            name="email"
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <label className="mw-label">Phone (optional)</label>
                        <input
                            className="mw-select"
                            type="text"
                            placeholder="SMS Number"
                            value={phone}
                            name="phone"
                            onChange={(e) => setPhone(e.target.value)}
                        />

                        {error && <p className="mw-error">{error}</p>}

                        <button className="mw-button" style={{ marginTop: "1rem" }}>
                            Join Early Access
                        </button>
                    </form>
                </>
            )}
        </div>
    );
}


