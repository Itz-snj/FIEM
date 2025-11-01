import {envs} from "../envs/index.js";

export default [
  {
    id: "default", // Recommended: define default connection. All models without dbName will be assigned to this connection
    url: envs.MONGODB_URI || "mongodb://127.0.0.1:27017/ambulance-booking",
    connectionOptions: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  }
];