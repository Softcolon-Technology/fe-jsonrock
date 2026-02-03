import { MongoClient, Db } from "mongodb";

const uri: string = process.env.MONGODB_URI || "";
const dbName: string = process.env.MONGODB_DB || "json_cracker";

// if (!uri) {
//   throw new Error("Please define the MONGODB_URI environment variable.");
// }

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (db) return db;

  if (!client) {
    client = new MongoClient(uri);
  }

  // Ensure connection
  await client.connect();

  db = client.db(dbName);

  // Ensure Indexes (TTL for 30 days)
  await db.collection("share_links").createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 Days
  );

  return db;
}


