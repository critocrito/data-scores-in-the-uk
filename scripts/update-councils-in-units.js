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
const id = "1-HJwxemYly7M5S3lOG3S-8KRNPjmzJVhxHlSjZ5JVZo";
const elasticHost = "localhost";
const elasticPort = 9200;
const index = "data-scores-staging";

const coordinates = {
  "Borough of Broxbourn": [51.702, -0.035],
  "Bristol City Council": [51.45, -2.583333],
  "Buckinghamshire County Council": [51.8168, -0.8124],
  "Cambridgeshire County Council": [52.205, 0.119],
  "Central Bedfordshire Council": [52.083333, -0.416667],
  "Dacorum Borough Council": [51.752, -0.336],
  "East Hertfordshire District Council": [51.7912, -0.081],
  "Essex County Council": [51.75, 0.583333],
  "Hampshire County Council": [51.0577, -1.3081],
  "Hertfordshire County Council": [51.9, -0.2],
  "Hertsmere Borough Council": [51.66, -0.27],
  "Lichfield District Council": [52.68118, -1.827103],
  "London Borough of Camden": [51.533333, -0.166667],
  "London Borough of Islington": [51.533333, -0.133333],
  "London Borough of Redbridge": [51.566667, 0.083333],
  "London Borough of Richmond upon Thames": [51.416667, -0.333333],
  "Luton Borough Council": [51.879722, -0.4175],
  "Borough of Broxbourne": [51.702, -0.035],
  "Glasgow City Council": [55.858, -4.259],
  "Durham County Council": [54.666667, -1.833333],
  "Suffolk County Council": [52.166667, 1],
  "Lancashire County Council": [53.8, -2.6],
  "Birmingham City Council": [52.483056, -1.893611],
  "North Yorkshire County Council": [54.166667, -1.333333],
  "Harrogate Borough Council": [53.990278, -1.541111],
  "City of York Council": [53.958333, -1.080278],
  "Cheshire East Council": [53.146, -2.367],
  "Cheshire West and Chester Council": [53.213, -2.902],
  "Allerdale Borough Council": [54.64, -3.412],
  "Norwich City Council": [52.6, 1.3],
  "Norfolk County Council": [52.666667, 1],
  "Great Yarmouth Borough Council": [52.6075, 1.732778],
  "Cambridge City Council": [52.333333, 0],
  "Broadland District Council": [52.633681, 1.35235],
  "Tunbridge Wells Borough Council": [51.128889, 0.260833],
  "Reading Borough Council": [51.454167, -0.973056],
  "London Borough of Bromley": [51.333333, 0.083333],
  "Leeds City Council": [53.799722, -1.549167],
  "Horsham District Council": [51.062, -0.325],
  "Derby City": [52.923333, -1.476389],
  "Arun District Council": [50.80825, -0.5385],
  "Amber Valley Borough Council": [53, -1.4],
  "Spelthorne Borough Council": [51.433333, -0.5],
  "Slough Borough Council": [51.51, -0.59],
  "Royal Borough of Kensington and Chelsea": [51.5, -0.19],
  "Reigate and Banstead Borough Council": [51.249, -0.16],
  "Oxford City Council": [51.751944, -1.257778],
  "London Borough of Tower Hamlets": [51.516667, -0.05],
  "London Borough of Southwark": [51.45, -0.083333],
  "London Borough of Lewisham": [51.416667, -0.033333],
  "London Borough of Merton": [51.383333, -0.166667],
  "London Borough of Newham": [51.516667, 0.033333],
  "London Borough of Hounslow": [51.4675, -0.361667],
  "London Borough of Hillingdon": [51.5, -0.45],
  "London Borough of Lambeth": [51.460218, -0.121445],
  "London Borough of Hammersmith & Fulham": [51.5, -0.25],
  "London Borough of Enfield": [51.645, -0.06],
  "Crawley Borough Council": [51.109167, -0.187222],
  "City of Westminster": [51.5, -0.133333],
  "Watford Borough Council": [51.655, -0.398],
  "Three Rivers District Council": [51.639, -0.469],
  "Stevenage Borough Council": [51.9, -0.2],
  "St Albans City and District Council": [51.783333, -0.333333],
  "Staffordshire County Council": [52.833333, -2],
  "Southend-on-Sea Borough Council": [51.53789, 0.71377],
  "Royal Borough of Greenwich": [51.45, 0.05],
  "Peterborough City Council": [52.583333, -0.25],
  "North Hertfordshire District Council": [51.976, -0.23],
};

withSession(async ({getSpreadsheet, getRows}) => {
  const {sheets} = await getSpreadsheet(id);
  const notFound = [];

  collectP(flowP([
    async ({title}) => {
      const hash = crypto.sha256(utils.stringify([title])); 
      const rows = await getRows(id, title);
      const rowsByKeywords = groupBy("keyword", rowsToUnits(["keyword"], rows));

      console.log(`Fetched ${rows.length} rows from ${title}.`);
      const [lat, lng] = coordinates[title];
      const council = {lat, lng, council: title, _sc_id_hash: hash};
      if (!council) {
        console.log(`No coordinates found for ${title}.`);
        throw new Error("Boom!");
      }

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

              const current = "_sc_council_areas" in u &&
                u._sc_council_areas.find(e => e._sc_content_hash === hash) ?
                Object.assign(
                  {},
                  u._sc_council_areas.find(e => e._sc_content_hash === hash)) :
                Object.assign({}, council);
              current.keywords = "keywords" in current ?
                Array.from(new Set(current.keywords).add(keyword)) :
                [keyword]

              const councils = "_sc_council_areas" in u ?
                u._sc_council_areas
                  .filter(e => e._sc_content_hash !== hash)
                  .concat([current]) :
                [current];

              return Object.assign(
                {},
                u,
                {_sc_keywords: keywords, _sc_council_areas: councils}
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
