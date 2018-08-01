#!/usr/bin/env node

process.on("unhandledRejection", up => {
  throw up;
});

const fs = require("fs");
const path = require("path");
const {promisify} = require("util");
const {flowP, collectP, delayP} = require("dashp");
const {Elastic} = require("@sugarcube/plugin-elasticsearch");

const readFile = promisify(fs.readFile);

const elasticHost = "localhost";
const elasticPort = 9201;
const index = "data-scores-staging";

const keywords = async (target) => {
  const data = await readFile(target);
  return data.toString().split("\n").filter(x => x !== "");
};

const makeStats = async (keywords) => {
  const keywordStats = {};
  const idStats = {};

  await collectP(async keyword => {
    await Elastic.Do(function* ({query}) {
      const q = {
        query: {
          "multi_match": {
            "query": keyword,
            "type": "phrase_prefix",
            "fields": ["title", "description", "href_text"]
          }
        },
        "_source": "$sc_id_hash"
      };

      console.log(`Querying for ${keyword}`);

      const docs = yield query(index, q, 2000);

      keywordStats[keyword] = docs.length;
      docs.forEach(doc => {
        const id = doc._sc_id_hash;
        if (id in idStats) {
          idStats[id].push(keyword);
        } else {
          idStats[id] = [keyword];
        }
      });
    }, {host: elasticHost, port: elasticPort});
  }, keywords);

  return [keywordStats, idStats];
};

(async () => {
  const companies = await keywords("./queries/companies.txt");
  const software = await keywords("./queries/software.txt");
  const leads = await keywords("./queries/leads.txt");
  const systems = await keywords("./queries/systems.txt");

  const companyStats = await makeStats(companies);
  const softwareStats = await makeStats(software);
  const leadsStats = await makeStats(leads);
  const systemsStats = await makeStats(systems);

  const stats = Object.assign(
    {},
    companyStats[0],
    softwareStats[0],
    leadsStats[0],
    systemsStats[0]
  );
  const ids = Array.from(
    new Set(Object
      .keys(companyStats[1])
      .concat(Object.keys(softwareStats[1]))
      .concat(Object.keys(leadsStats[1]))
      .concat(Object.keys(systemsStats[1]))));

  console.log("Companies");
  // console.dir(companyStats[0]);
  console.dir(companyStats[1]);
  console.log("Softwares");
  // console.dir(softwareStats[0]);
  console.dir(softwareStats[1]);
  console.log("Leads");
  // console.dir(leadsStats[0]);
  console.dir(leadsStats[1]);
  console.log("Systems");
  // console.dir(systemsStats[0]);
  console.dir(systemsStats[1]);

  Object.keys(stats).forEach(key => {
    if (stats[key] > 0) console.log(`${key}: ${stats[key]}`);
  });
  const total = Object.keys(stats).reduce((memo, k) => memo + stats[k], 0);
  console.log(`${ids.length}/${total}`);

  process.exit(0);
})();
