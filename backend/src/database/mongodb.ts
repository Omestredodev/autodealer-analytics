import 'dotenv/config';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017';
const databaseName = process.env.MONGO_DB ?? 'autodealer';

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000,
  maxPoolSize: 10,
});

let connecting: Promise<MongoClient> | undefined;
let connected = false;

async function getClient(): Promise<MongoClient> {
  if (!connecting) {
    connecting = client.connect().then((active) => {
      connected = true;
      return active;
    }).catch((error: unknown) => {
      connecting = undefined;
      throw error;
    });
  }
  return connecting;
}

export async function getMongoDatabase() {
  const active = await getClient();
  return active.db(databaseName);
}

export async function checkMongoConnection(): Promise<boolean> {
  try {
    const database = await getMongoDatabase();
    await database.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

export async function closeMongoConnection(): Promise<void> {
  if (connected) {
    await client.close();
    connected = false;
    connecting = undefined;
  }
}
