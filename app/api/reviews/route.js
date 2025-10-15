export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name") || "";
    const address = searchParams.get("address") || "";

    const upstream = `${process.env.REVIEW_API}?name=${encodeURIComponent(
      name
    )}&address=${encodeURIComponent(address)}`;

    const res = await fetch(upstream, {
      method: "GET",
      cache: "no-store",
      // wichtig: keine CORS-Probleme im Browser, weil Server-zu-Server
      headers: { "Accept": "application/json" },
    });

    // Falls Upstream fehlschlägt
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: true, status: res.status, body: text }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // optional: damit du es auch lokal aus anderen Origins testen könntest
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: true, message: e?.message || String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
