import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Missing MONGODB_URI (cluster URI without a DB suffix)");
}

const PRIMARY_DB = process.env.MONGODB_DB_PRIMARY || "products";
const USERS_DB   = process.env.MONGODB_DB_USERS   || "fanevent-db";

/**
 * Create the USERS connection *synchronously* so models can bind at import time.
 * Mongoose lets you call `createConnection()` before the socket is connected.
 */
export const usersDb = mongoose.createConnection(uri, { dbName: USERS_DB });
usersDb.on("connected", () => console.log(`Database connected → ${USERS_DB}`));
usersDb.on("error", (e) => console.error(`usersDb error:`, e?.message));

/**
 * Default app connection (PRIMARY) via mongoose.connect().
 * Your existing Event/Group/Report models that use `mongoose.model(...)`
 * will attach to this default connection and hit the "products" DB.
 */
const connectDB = async () => {
  await mongoose.connect(uri, { dbName: PRIMARY_DB });
  console.log(`Database connected → ${PRIMARY_DB}`);

  // Ensure the users connection is actually up too (optional but nice)
  await usersDb.asPromise();
};

export default connectDB;
