// Backend/config/db.js
import mongoose from "mongoose";

let defaultDb;     // the DB your existing models keep using
let usersDb;       // the DB for the User model (and anything else in fanevent-db)

/**
 * Connects once to the cluster, then opens two logical DBs:
 * - PRIMARY DB (default connection): process.env.MONGODB_DB_PRIMARY (default: "products")
 * - USERS DB:  process.env.MONGODB_DB_USERS   (default: "fanevent-db")
 *
 * IMPORTANT:
 * - Do NOT append a DB name to MONGODB_URI. Point it at your cluster only.
 *   e.g. MONGODB_URI="mongodb+srv://user:pass@cluster0.abcd.mongodb.net"
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");

  const primaryName = process.env.MONGODB_DB_PRIMARY || "products";
  const usersName   = process.env.MONGODB_DB_USERS   || "fanevent-db";

  // One physical connection to the cluster (no dbName here)
  await mongoose.connect(uri, {});

  // Default DB = where your existing models will attach by default
  defaultDb = mongoose.connection.useDb(primaryName, { useCache: true });
  usersDb   = mongoose.connection.useDb(usersName,   { useCache: true });

  // Nice logs
  defaultDb.on("connected", () => console.log(`Database connected → ${primaryName}`));
  usersDb.on("connected",   () => console.log(`Database connected → ${usersName}`));
};

export default connectDB;

// Expose handles so models can bind to the correct DB
export { defaultDb, usersDb };
