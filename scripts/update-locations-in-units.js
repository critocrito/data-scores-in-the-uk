#!/usr/bin/env node

process.on("unhandledRejection", up => {
  throw up;
});

const fs = require("fs");
const path = require("path");
const {uniqBy, groupBy} = require("lodash/fp");
const {flowP, collectP, delayP} = require("dashp");
const {crypto, utils} = require("@sugarcube/core");
const {withSession, rowsToUnits} = require("@sugarcube/plugin-googlesheets");
const {Elastic} = require("@sugarcube/plugin-elasticsearch");

const client = "373647540422-l3vmnirgkg2v67sjj7i03nmd8otf7kkk.apps.googleusercontent.com";
const secret = "sM4uddspGv3N9OCFS7-OmqIF";
const tokens = JSON.parse(fs.readFileSync("./google-sheets-token.json"));
const id = "1KgkNPfNiVfxBm8lkVfU2OPyJtrGsQesYrY8t8xzilQU";
const elasticHost = "localhost";
const elasticPort = 9200;
const index = "data-scores-staging";

const citiesGeolocated = JSON.parse(fs.readFileSync(path.join(process.cwd(),
                                                              "data/cities-geolocated.json")));

withSession(async ({getSpreadsheet, getRows}) => {
  const {sheets} = await getSpreadsheet(id);
  const notFound = [];

  collectP(flowP([
    async ({title}) => {
      const [city, county] = title.match(/(.*) \((.*)\)$/).slice(1);
      const hash = crypto.sha256(utils.stringify([city, county]));
      const location = citiesGeolocated.find(e => e._sc_content_hash === hash);
      if (!location) {
        console.log(`Not found in geo located cities: ${city} (${county})`);
        notFound.push(title);
        return;
      }
      const rows = await getRows(id, title);
      const rowsByKeywords = groupBy("keyword", rowsToUnits(["keyword"], rows));

      console.log(`Fetched ${rows.length} rows from ${title}.`);

      await collectP(flowP([
        async keyword => {
          await Elastic.Do(function* ({queryByIds, bulk}) {
            const ids = rowsByKeywords[keyword].map(r => r._sc_id_hash);
            const units = yield queryByIds(`${index}-web-searches`, ids);

            console.log(
              `Fetched ${units.length} units from ${index} for keyword ${keyword}.`
            );

            const toIndex = units.map(u => {
              const keywords = "_sc_keywords" in u ?
                Array.from(new Set(u._sc_keywords).add(keyword)) :
                [keyword];

              const current = "_sc_locations" in u &&
                u._sc_locations.find(e => e._sc_content_hash === hash) ?
                Object.assign(
                  {},
                  u._sc_locations.find(e => e._sc_content_hash === hash)) :
                Object.assign({}, location);
              current.keywords = "keywords" in current ?
                Array.from(new Set(current.keywords).add(keyword)) :
                [keyword]

              const locations = "_sc_locations" in u ?
                u._sc_locations
                  .filter(e => e._sc_content_hash !== hash)
                  .concat([current]) :
                [current];

              return Object.assign(
                {},
                u,
                {_sc_keywords: keywords, _sc_locations: locations}
              );
            });

            const errors = yield bulk(index, {index: toIndex});

            if (errors.length > 0) {
              errors.forEach(e =>
                console.log(
                  `Unit ${e.id} threw an error (${e.error.type}): ${e.error.reason}`,
                ),
              );
              throw new Error(`Indexing units threw an error.`);
            }
          }, {host: elasticHost, port: elasticPort}).then(([, history]) => {
            history.forEach(([k, meta]) => console.log(`${k}: ${JSON.stringify(meta)}.`));
          });
        },
        delayP(1500),
        () => console.log("#### new keyword ####"),
      ]), Object.keys(rowsByKeywords));
    },
    delayP(1000),
    () => console.log("**** new sheet ****"),
  ]), sheets.map(s => s.properties));
}, {client, secret, tokens}).then(() => console.log("done"));
