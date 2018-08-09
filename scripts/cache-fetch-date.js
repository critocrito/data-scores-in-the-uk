#!/usr/bin/env node

process.on("unhandledRejection", up => {
  // throw up;
  console.log(up);
  process.exit(1);
});

const fs = require("fs");
const path = require("path");
const {promisify} = require("util");
const elastic = require("elasticsearch");

const elasticHost = "localhost";
const elasticPort = 9201;
const index = "data-scores";

const writeFile = promisify(fs.writeFile);

(async () => {
  const client = new elastic.Client({host: `${elasticHost}:${elasticPort}`, log: "warning"})

  const q = {
    _source: ["$sc_id_hash", "$sc_pubdates"],
    size: 2000,
    query: {
      match_all: {}
    }
  }
  const results = await client.search({index, body: q, size: 2000});
  const data = results.hits.hits.map(u => u._source);
  await writeFile("./cached-fetch-dates.json", JSON.stringify(data));
})();
