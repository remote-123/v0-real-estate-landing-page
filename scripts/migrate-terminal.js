const { createClient } = require('@sanity/client');
require('dotenv').config({ path: '.env.local' });

const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    useCdn: false,
    token: process.env.SANITY_API_TOKEN,
    apiVersion: '2023-05-03',
});

const CATEGORY_MAP = {
    economic: {
        title: "Economic Foundations",
        icon: "TrendingUp",
        order: 1,
        description: "Macro-level fiscal indicators and financial market performance based on Dubai Statistics Center data.",
        metrics: [
            {
                label: "GDP Growth (Real)", value: "+3.2%", trend: "Stable", trendDir: "up", description: "Consolidated growth after 2021 rebound; 4.5% forecast for 2026.",
                historicalData: [
                    { year: "2021", value: 5.7 },
                    { year: "2022", value: 4.6 },
                    { year: "2023", value: 3.3 },
                    { year: "2024", value: 3.2 },
                    { year: "2026(F)", value: 4.5 }
                ]
            },
            {
                label: "M2 Money Supply", value: "AED 2.2T", trend: "+14.5%", trendDir: "up", description: "High liquidity (UAE aggregate) confirms capital flight into safe-haven assets.",
                historicalData: [
                    { year: "2021", value: 1.48 },
                    { year: "2022", value: 1.61 },
                    { year: "2023", value: 1.91 },
                    { year: "2024", value: 2.17 },
                    { year: "2025(E)", value: 2.38 }
                ]
            },
            {
                label: "CPI (Inflation)", value: "3.3%", trend: "Controlled", trendDir: "neutral", description: "Easing from 2022 peak (4.7%); maintaining stability relative to OECD nations.",
                historicalData: [
                    { year: "2021", value: 2.5 },
                    { year: "2022", value: 4.7 },
                    { year: "2023", value: 3.3 },
                    { year: "2024", value: 3.3 }
                ]
            },
            {
                label: "Active Licenses", value: "451k", trend: "+21.6%", trendDir: "up", description: "Record business activity; Dubai now accounts for 48% of total UAE commercial licenses.",
                historicalData: [
                    { year: "2021", value: 310 },
                    { year: "2022", value: 342 },
                    { year: "2023", value: 371 },
                    { year: "2024", value: 451 }
                ]
            },
            {
                label: "Nasdaq Dubai 20", value: "5,339", trend: "+22.3%", trendDir: "up", description: "Liquid UAE 20 index tracking top-tier listed equities and secondary market health.",
                historicalData: [
                    { year: "2021", value: 4284 },
                    { year: "2022", value: 3988 },
                    { year: "2023", value: 4878 },
                    { year: "2024", value: 5339 }
                ]
            },
            {
                label: "Bounced Cheques Rate", value: "1.8%", trend: "-0.5%", trendDir: "down", description: "Decriminalization and Al Etihad Credit Bureau reporting improving market discipline.",
                historicalData: [
                    { year: "2021", value: 2.4 },
                    { year: "2022", value: 2.1 },
                    { year: "2023", value: 1.9 },
                    { year: "2024", value: 1.8 }
                ]
            }
        ],
        curation: {
            title: "The Macro Thesis",
            content: "Dubai's decoupling from broader global inflation trends is a result of fiscal discipline and aggressive sovereign wealth deployment. For investors, this means capital preservation is high, even if global volatility persists."
        }
    },
    infrastructure: {
        title: "Macro Infrastructure",
        icon: "Plane",
        order: 2,
        description: "Mobility, connectivity, and utility capacity analysis based on RTA and DEWA datasets.",
        metrics: [
            {
                label: "Metro Passenger Vol", value: "275M/y", trend: "+6%", trendDir: "up", description: "Sustained ridership growth supports TOD premiums in communities like Al Furjan and JVC.",
                historicalData: [
                    { year: "2021", value: 151 },
                    { year: "2022", value: 225 },
                    { year: "2023", value: 260 },
                    { year: "2024", value: 275 }
                ]
            },
            {
                label: "Salik Transactions", value: "498M", trend: "+8%", trendDir: "up", description: "Increased revenue trips following the activation of two new gates in 2024.",
                historicalData: [
                    { year: "2022", value: 410 },
                    { year: "2023", value: 461 },
                    { year: "2024", value: 498 }
                ]
            },
            {
                label: "Building Certificates", value: "4,200", trend: "+15%", trendDir: "up", description: "Record completions expected in the next 18 months, primarily in the South Corridor.",
                historicalData: [
                    { year: "2021", value: 2800 },
                    { year: "2022", value: 3100 },
                    { year: "2023", value: 3500 },
                    { year: "2024", value: 4200 }
                ]
            },
            {
                label: "Energy Surplus", value: "1.2GW", trend: "Steady", trendDir: "neutral", description: "Sufficient capacity for the 2026 delivery cycle; grid stability remains high.",
                historicalData: [
                    { year: "2021", value: 0.9 },
                    { year: "2022", value: 0.95 },
                    { year: "2023", value: 1.1 },
                    { year: "2024", value: 1.2 }
                ]
            }
        ],
        curation: {
            title: "The Expansion Meter",
            content: "The introduction of variable Salik pricing and the focus on TOD (Transit Oriented Development) confirms that the market is shifting its weight towards DWC and Emaar South ahead of the 2030 vision."
        }
    },
    society: {
        title: "Society & Commitment",
        icon: "Users",
        order: 3,
        description: "Demographics, social infrastructure, and resident longevity metrics (KHDA & GDRFA).",
        metrics: [
            {
                label: "Private School Enrollment", value: "387k", trend: "+12%", trendDir: "up", description: "Record enrollment growth indicates families are committing to 5-10 year housing cycles.",
                historicalData: [
                    { year: "2021", value: 289 },
                    { year: "2022", value: 326 },
                    { year: "2023", value: 365 },
                    { year: "2024", value: 387 }
                ]
            },
            {
                label: "Golden Visa Issuance", value: "158k", trend: "+98%", trendDir: "up", description: "Exponential growth following the removal of minimum down payment requirements.",
                historicalData: [
                    { year: "2021", value: 47 },
                    { year: "2022", value: 79 },
                    { year: "2023", value: 158 }
                ]
            },
            {
                label: "Total Resident Vol", value: "3.8M", trend: "+3.6%", trendDir: "up", description: "Accelerated population growth (134k new residents in 2024) driving end-user demand.",
                historicalData: [
                    { year: "2021", value: 3.41 },
                    { year: "2022", value: 3.55 },
                    { year: "2023", value: 3.68 },
                    { year: "2024", value: 3.81 }
                ]
            },
            {
                label: "Police Response Time", value: "2.4m", trend: "Optimized", trendDir: "up", description: "Safety metrics continue to rank amongst the top 5 global cities, ensuring long-term trust.",
                historicalData: [
                    { year: "2021", value: 3.5 },
                    { year: "2022", value: 3.2 },
                    { year: "2023", value: 2.8 },
                    { year: "2024", value: 2.4 }
                ]
            }
        ],
        curation: {
            title: "Inelastic Demand",
            content: "School enrollment growth is the single best predictor for 3-4BR villa demand. When families commit to education locally, they commit to long-term residency, protecting against short-term rental fluctuations."
        }
    },
    logistics: {
        title: "Logistics & Trade",
        icon: "Ship",
        order: 4,
        description: "Global trade flows and cargo volumes via JAFZA and DWC.",
        metrics: [
            {
                label: "UAE Non-Oil Trade", value: "AED 3.5T", trend: "+18%", trendDir: "up", description: "Trade growth outpaces real estate, providing a healthy non-property economic base.",
                historicalData: [
                    { year: "2021", value: 1.9 },
                    { year: "2022", value: 2.2 },
                    { year: "2023", value: 3.5 },
                    { year: "2024", value: 3.0 }
                ]
            },
            {
                label: "DWC Cargo Throughput", value: "576k Tons", trend: "+203%", trendDir: "up", description: "South Dubai is now the primary growth corridor for the next decade of cargo expansion.",
                historicalData: [
                    { year: "2021", value: 204 },
                    { year: "2022", value: 189 },
                    { year: "2023", value: 576 },
                    { year: "2024", value: 620 }
                ]
            }
        ],
        curation: {
            title: "The Sleeper Play",
            content: "While residential gets the headlines, the logistics growth at DWC makes industrial real estate in Dubai South the most undervalued asset class for institutional portfolio diversification."
        }
    },
    hospitality: {
        title: "Hospitality & Yields",
        icon: "Hotel",
        order: 5,
        description: "Tourism performance and rental yield benchmarks (Department of Economy and Tourism).",
        metrics: [
            {
                label: "Avg Hotel Occupancy", value: "78.0%", trend: "+1.5%", trendDir: "up", description: "Post-pandemic records surpassed; supports short-term rental ROI models.",
                historicalData: [
                    { year: "2021", value: 67.0 },
                    { year: "2022", value: 73.0 },
                    { year: "2023", value: 77.4 },
                    { year: "2024", value: 78.0 }
                ]
            },
            {
                label: "RevPAR (Market Avg)", value: "AED 425", trend: "+12%", trendDir: "up", description: "Revenue per room rising despite increased supply; indicative of strong ADR power.",
                historicalData: [
                    { year: "2021", value: 301 },
                    { year: "2022", value: 391 },
                    { year: "2023", value: 416 },
                    { year: "2024", value: 425 }
                ]
            }
        ],
        curation: {
            title: "Grade A Focus",
            content: "With 8,000+ new rooms entering the market, yield compression is coming for mid-tier assets. We recommend shifting focus to prime beachfront units with unique operator value."
        }
    },
    system: {
        title: "Terminal Health",
        icon: "Database",
        order: 6,
        description: "Technical status of the North Capital data and AI pipeline.",
        metrics: [
            {
                label: "Data Pipeline", value: "Online", trend: "99.9%", trendDir: "up", description: "Direct feed from data.dubai and DLD APIs active with < 50ms latency.",
                historicalData: [
                    { year: "Q1", value: 98.5 },
                    { year: "Q2", value: 99.2 },
                    { year: "Q3", value: 99.8 },
                    { year: "Q4", value: 99.9 }
                ]
            },
            {
                label: "AI Model", value: "Gemini 3 Flash", trend: "Active", trendDir: "neutral", description: "Multimodal processing of developer PDFs and PR feeds active.",
                historicalData: [
                    { year: "Q1", value: 85 },
                    { year: "Q2", value: 92 },
                    { year: "Q3", value: 98 },
                    { year: "Q4", value: 100 }
                ]
            }
        ],
        curation: {
            title: "Pipeline Status",
            content: "The North Capital data engine is currently processing real-time feeds from DLD. All systems functioning within institutional thresholds."
        }
    }
};

async function migrate() {
    console.log('Starting migration to Sanity...');
    for (const [key, data] of Object.entries(CATEGORY_MAP)) {
        console.log(`Migrating ${data.title}...`);
        const doc = {
            _type: 'terminalCategory',
            _id: `terminal-category-${key}`,
            title: data.title,
            slug: { _type: 'slug', current: key },
            icon: data.icon,
            order: data.order,
            description: data.description,
            strategicVerdict: {
                title: data.curation.title,
                content: data.curation.content,
            },
            metrics: data.metrics.map((m, idx) => ({
                _key: `m-${idx}`,
                label: m.label,
                value: m.value,
                trend: m.trend,
                trendDir: m.trendDir,
                description: m.description,
                historicalData: m.historicalData.map((h, hIdx) => ({
                    _key: `h-${hIdx}`,
                    year: h.year,
                    value: h.value,
                })),
            })),
        };

        try {
            await client.createOrReplace(doc);
            console.log(`✅ Success: ${data.title}`);
        } catch (err) {
            console.error(`❌ Error migrating ${data.title}:`, err.message);
        }
    }
    console.log('Migration finished.');
}

migrate();
