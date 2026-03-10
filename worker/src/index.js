import { MongoClient } from "mongodb";

let cachedClient = null;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  };
}

async function getCollection(env) {
  if (!cachedClient) {
    cachedClient = new MongoClient(env.MONGODB_URI);
    await cachedClient.connect();
  }

  const db = cachedClient.db(env.MONGODB_DB);
  return db.collection(env.MONGODB_COLLECTION);
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders();
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (url.pathname !== "/state") {
      return new Response("Not found", { status: 404, headers });
    }

    try {
      const collection = await getCollection(env);

      if (request.method === "GET") {
        const doc = await collection.findOne({ _id: "leagueState" });
        const state = doc?.state ?? {};
        return new Response(JSON.stringify(state), {
          status: 200,
          headers: {
            ...headers,
            "Content-Type": "application/json"
          }
        });
      }

      if (request.method === "POST") {
        const state = await request.json();

        await collection.updateOne(
          { _id: "leagueState" },
          {
            $set: {
              state,
              updatedAt: new Date().toISOString()
            }
          },
          { upsert: true }
        );

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            ...headers,
            "Content-Type": "application/json"
          }
        });
      }

      return new Response("Method not allowed", { status: 405, headers });
    } catch (err) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : "Unknown error"
        }),
        {
          status: 500,
          headers: {
            ...headers,
            "Content-Type": "application/json"
          }
        }
      );
    }
  }
};