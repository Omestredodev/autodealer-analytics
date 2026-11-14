import 'dotenv/config';
import { Client } from 'cassandra-driver';

const contactPoints = (process.env.CASSANDRA_CONTACT_POINTS ?? '127.0.0.1')
  .split(',').map((point) => point.trim()).filter(Boolean);
const localDataCenter = process.env.CASSANDRA_LOCAL_DC ?? 'datacenter1';
const keyspace = process.env.CASSANDRA_KEYSPACE ?? 'autodealer';

const client = new Client({
  contactPoints,
  localDataCenter,
  keyspace,
  socketOptions: { connectTimeout: 5000, readTimeout: 8000 },
});

let connecting: Promise<Client> | undefined;
let connected = false;

export async function getCassandraClient(): Promise<Client> {
  if (!connecting) {
    connecting = client.connect().then(() => {
      connected = true;
      return client;
    }).catch((error: unknown) => {
      connecting = undefined;
      throw error;
    });
  }
  return connecting;
}

export async function checkCassandraConnection(): Promise<boolean> {
  try {
    const active = await getCassandraClient();
    await active.execute('SELECT release_version FROM system.local');
    return true;
  } catch {
    return false;
  }
}

export async function closeCassandraConnection(): Promise<void> {
  if (connected) {
    await client.shutdown();
    connected = false;
    connecting = undefined;
  }
}
