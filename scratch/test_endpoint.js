// No import needed for fetch in Node 18+

async function testEndpoint() {
    try {
        const res = await fetch('http://localhost:3001/api/reports/customer-report?dateFilter=all');
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Response Body (first 100 chars):", text.substring(0, 100));
        try {
            const json = JSON.parse(text);
            console.log("Valid JSON received");
        } catch (e) {
            console.error("Failed to parse JSON:", e.message);
        }
    } catch (err) {
        console.error("Fetch failed:", err.message);
    }
}

testEndpoint();
