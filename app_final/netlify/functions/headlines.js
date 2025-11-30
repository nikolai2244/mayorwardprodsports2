/**
 * headlines.js – PREMIUM NFL News Aggregator
 * Sources: ESPN, Yahoo Sports, NFL.com, NBC, CBS
 */

const fetch = require("node-fetch");

exports.handler = async () => {
    try {
        const sources = [
            {
                name: "ESPN",
                url: "https://site.api.espn.com/apis/site/v2/sports/football/nfl/news"
            },
            {
                name: "Yahoo",
                url:
                    "https://yahoo.com/news/_tdnews/api/resource/NewsSearchService;category=Sports;subcategory=Nfl"
            },
            {
                name: "NFL",
                url: "https://www.nfl.com/api/lazy/load?json={\"pageName\":\"news\"}"
            },
            {
                name: "NBC",
                url:
                    "https://scores.nbcsports.com/premiumservice/news/news.json?src=nfl"
            },
            {
                name: "CBS",
                url:
                    "https://www.cbssports.com/news/data/rss/nfl/"
            }
        ];

        const allHeadlines = [];

        for (const s of sources) {
            try {
                const res = await fetch(s.url);
                const json = await res.json().catch(() => null);

                if (!res.ok || !json) continue;

                // ESPN Format
                if (s.name === "ESPN" && json?.articles) {
                    json.articles.forEach(a => {
                        allHeadlines.push({
                            title: a?.headline || "",
                            source: "ESPN",
                            ts: a?.published || Date.now()
                        });
                    });
                }

                // Yahoo Format
                if (s.name === "Yahoo" && json?.data?.items) {
                    json.data.items.forEach(i => {
                        allHeadlines.push({
                            title: i?.title || "",
                            source: "Yahoo",
                            ts: i?.published_at || Date.now()
                        });
                    });
                }

                // NFL.com Format
                if (s.name === "NFL" && json?.items) {
                    json.items.forEach(i => {
                        allHeadlines.push({
                            title: i?.title || "",
                            source: "NFL.com",
                            ts: i?.date || Date.now()
                        });
                    });
                }

                // NBC Sports Format
                if (s.name === "NBC" && json?.news) {
                    json.news.forEach(n => {
                        allHeadlines.push({
                            title: n?.headline || "",
                            source: "NBC Sports",
                            ts: n?.time_published || Date.now()
                        });
                    });
                }

                // CBS Format (XML-ish, fallback text grabbing)
                if (s.name === "CBS" && json?.items) {
                    json.items.forEach(i => {
                        allHeadlines.push({
                            title: i?.title || "",
                            source: "CBS Sports",
                            ts: Date.now()
                        });
                    });
                }
            } catch (err) {
                console.error(`Error fetching ${s.name}:`, err);
            }
        }

        // Remove junk & clickbait
        const cleaned = allHeadlines
            .filter(h => h.title && h.title.length > 5)
            .filter(
                h =>
                    !h.title.toLowerCase().includes("fantasy") &&
                    !h.title.toLowerCase().includes("betting") &&
                    !h.title.toLowerCase().includes("odds boost") &&
                    !h.title.toLowerCase().includes("promo") &&
                    !h.title.toLowerCase().includes("sponsored")
            )
            .map(h => ({
                ...h,
                title: h.title
                    .replace(/<[^>]+>/g, "") // Remove HTML tags
                    .replace(/&quot;/g, '"')
                    .replace(/&amp;/g, "&")
                    .trim()
            }));

        // Deduplicate titles
        const deduped = Array.from(
            new Map(cleaned.map(h => [h.title, h])).values()
        );

        // Sort most recent first
        deduped.sort((a, b) => b.ts - a.ts);

        // Return top 20
        return {
            statusCode: 200,
            body: JSON.stringify({
                error: false,
                headlines: deduped.slice(0, 20)
            })
        };
    } catch (err) {
        console.error("HEADLINES ERROR:", err);

        return {
            statusCode: 200,
            body: JSON.stringify({
                error: true,
                headlines: [],
                fallback: true
            })
        };
    }
};
