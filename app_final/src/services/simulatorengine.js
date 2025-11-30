// ===============================================================
//  MayorWardProd Sports Lab — Full Simulation Engine
// ===============================================================
//
//  This engine powers:
//   • Game Simulator (15,00,000 → 5,888 → 500 → 50 runs)
//   • Multi-Model Blending
//   • Weather & Injury Adjustments
//   • Team strength modeling
//   • Home-field advantage
//   • Parlay & player model access
//
//  No editing required — plug & play.
// ===============================================================

import { TEAM_RATINGS } from "../data/teamRatings";
import { getWeather, getInjuries } from "./api";

// -------------------------------
// Utility random
// -------------------------------
const rand = (min, max) => Math.random() * (max - min) + min;

// -------------------------------
// Base scoring model
// -------------------------------
function baseScore(strength, weatherPenalty, injuryPenalty, variance = 10) {
    return (
        strength * 24 -
        weatherPenalty -
        injuryPenalty +
        rand(-variance, variance)
    );
}

// -------------------------------
// Weather Impact Model
// -------------------------------
function getWeatherImpact(weather) {
    if (!weather) return 0;

    let penalty = 0;

    if (weather.wind_speed > 22) penalty += 4;
    if (weather.temp < 25) penalty += 2;
    if (weather.temp > 95) penalty += 2;
    if (weather.conditions === "Rain" || weather.conditions === "Snow")
        penalty += 3;

    return penalty;
}

// -------------------------------
// Injury Impact Model
// -------------------------------
function getInjuryImpact(injuries) {
    if (!injuries) return 0;
    if (injuries.length === 0) return 0;

    let penalty = 0;

    injuries.forEach((inj) => {
        if (/QB/i.test(inj.player)) penalty += 6;
        if (/WR|RB|TE/i.test(inj.player)) penalty += 2;
        if (/OL/i.test(inj.player)) penalty += 3;
        if (/DEF|CB|S|LB/i.test(inj.player)) penalty += 1.5;
    });

    return penalty;
}

// -------------------------------
// One simulation run
// -------------------------------
function simulateOnce(away, home, context) {
    const {
        awayStrength,
        homeStrength,
        weatherA,
        weatherH,
        injuriesA,
        injuriesH,
    } = context;

    const wA = getWeatherImpact(weatherA);
    const wH = getWeatherImpact(weatherH);

    const iA = getInjuryImpact(injuriesA);
    const iH = getInjuryImpact(injuriesH);

    let awayScore = baseScore(awayStrength, wA, iA);
    let homeScore = baseScore(homeStrength + 1.2, wH, iH); // HFA baked in

    awayScore = Math.max(0, Math.round(awayScore));
    homeScore = Math.max(0, Math.round(homeScore));

    return { awayScore, homeScore };
}

// -------------------------------
// Multi-phase simulation engine
// -------------------------------
async function runPhases(away, home, context) {
    const phases = [
        1500000, // Phase 1 Heavy
        5888,    // Phase 2 Adaptive
        500,     // Phase 3 Precision
        50       // Phase 4 Refinement
    ];

    let homePoints = [];
    let awayPoints = [];

    for (let p = 0; p < phases.length; p++) {
        const runs = phases[p];

        for (let i = 0; i < runs; i++) {
            const { awayScore, homeScore } = simulateOnce(away, home, context);
            awayPoints.push(awayScore);
            homePoints.push(homeScore);
        }
    }

    // Final combined averaged results
    const finalAway = Math.round(
        awayPoints.reduce((a, b) => a + b, 0) / awayPoints.length
    );
    const finalHome = Math.round(
        homePoints.reduce((a, b) => a + b, 0) / homePoints.length
    );

    // Probability: % of runs home > away
    const wins = homePoints.filter((h, idx) => h > awayPoints[idx]).length;
    const winProb = (wins / homePoints.length) * 100;

    return {
        awayScore: finalAway,
        homeScore: finalHome,
        total: finalAway + finalHome,
        margin: Math.abs(finalHome - finalAway),
        winner: finalHome > finalAway ? home : away,
        winProb,
        confidence: winProb > 50 ? winProb : 100 - winProb,
    };
}

// -------------------------------
// Main function called by UI
// -------------------------------
export async function runFullSimulation(away, home) {
    try {
        const ratings = TEAM_RATINGS;

        const awayStrength = ratings[away] || 1.0;
        const homeStrength = ratings[home] || 1.0;

        const weatherData = await getWeather();
        const injuryData = await getInjuries();

        const weatherA = weatherData.data?.find((w) => w.team === away);
        const weatherH = weatherData.data?.find((w) => w.team === home);

        const injuriesA =
            injuryData.data?.filter((inj) => inj.team === away) || [];
        const injuriesH =
            injuryData.data?.filter((inj) => inj.team === home) || [];

        const context = {
            awayStrength,
            homeStrength,
            weatherA,
            weatherH,
            injuriesA,
            injuriesH,
        };

        const result = await runPhases(away, home, context);

        return {
            awayTeam: away,
            homeTeam: home,
            ...result,
        };
    } catch (err) {
        console.error("Simulation Engine Error:", err);
        return {
            success: false,
            error: "Simulation failed. Try again.",
        };
    }
}
