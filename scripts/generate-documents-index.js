#!/usr/bin/env node

process.on("unhandledRejection", up => {
  // throw up;
  console.log(up);
  process.exit(1);
});

const fs = require("fs");
const path = require("path");
const {SheetsDo, concatEnvelopeAndRows, unitsToRows} = require("@sugarcube/plugin-googlesheets");
const {Elastic} = require("@sugarcube/plugin-elasticsearch");

const client = "373647540422-l3vmnirgkg2v67sjj7i03nmd8otf7kkk.apps.googleusercontent.com";
const secret = "sM4uddspGv3N9OCFS7-OmqIF";
const tokens = JSON.parse(fs.readFileSync("./google-sheets-token.json"));
const id = "1aaYMPZpoLFkBIMrTWSuG6-uAZGrkkX-JifduXjsA_s0";
const sheet = "Documents Index";
const fields = [
  "title",
  "description",
  "href",
  "companies",
  "systems",
  "authorities",
  "companiesCount",
  "systemsCount",
  "authoritiesCount"
];

const elasticHost = "localhost";
const elasticPort = 9201;
const index = "data-scores";

const fetchUnits = () => Elastic.Do(function* ({query}) {
  const q = {
    "query": {
      "bool": {
        "should": [
          {
          "exists": {
            "field": "companies"
          }
        },
          {
          "exists": {
            "field": "systems"
          }
        },
          {
          "nested": {
            "path": "authorities",
            "query": {
              "bool": {
                "must": [
                  {
                  "exists": {
                    "field": "authorities"
                  }
                }
                ]
              }
            }
          }
        }
        ]
      }
    },
    "_source": [
      "$sc_id_hash",
      "$sc_content_hash",
      "title",
      "description",
      "href",
      "companies",
      "systems",
      "authorities"
    ],
  };
  
  yield query(index, q, 500);
}, {host: elasticHost, port: elasticPort});

const createDocumentsIndex = (units) => SheetsDo(
  function* ({getOrCreateSheet, getRows, replaceRows, safeReplaceRows}) {
    const {sheetUrl: url} = yield getOrCreateSheet(id, sheet);

    console.log(`Units exported to ${url}.`);

    const rows = yield getRows(id, sheet);

    console.log(
      `Merging ${units.length} into ${rows.slice(1).length} units.`,
    );
    
    const {data} = concatEnvelopeAndRows({
      data: units.map(u => Object.assign(
        {},
        u,
        {
          companies: "companies" in u ? u.companies.join(", ") : "-",
          systems: "systems" in u ? u.systems.join(", ") : "-",
          authorities: "authorities" in u ? u.authorities.map(({name}) => name).join(", ") : "-",
          companiesCount: "companies" in u ? u.companies.length : 0,
          systemsCount: "systems" in u ? u.systems.length : 0,
          authoritiesCount: "authorities" in u ? u.authorities.length : 0,
        }))
    }, rows);
    const mergedRows = unitsToRows(fields, data);
    
    // No need to safely update data if the sheet is empty.
    if (rows.length === 0) {
      yield replaceRows(id, sheet, mergedRows);
    } else {
      const [, e] = yield safeReplaceRows(id, sheet, mergedRows);
      if (e) {
        log.error(`Atomic data export failed.`);
        log.error(`Backup sheet ${e.sheet} is located at ${e.sheetUrl}.`);
        throw e;
      }
    }
  }, {client, secret, tokens});

(async () => {
  const [units] = await fetchUnits();
  console.log(`Fetched ${units.length} units from the database.`);
  await createDocumentsIndex(units);
  process.exit(0);
})();
