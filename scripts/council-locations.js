#!/usr/bin/env node

process.on("unhandledRejection", up => {
  // throw up;
  console.log(up);
  process.exit(1);
});

const fs = require("fs");
const path = require("path");
const {promisify} = require("util");
const {flowP, delayP, collectP} = require("dashp");
const elastic = require("elasticsearch");
const {Elastic} = require("@sugarcube/plugin-elasticsearch");

const elasticHost = "localhost";
const elasticPort = 9201;
const index = "data-scores";

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

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
  "Wirral Council": [53.396972, -3.011914],
  "Wiltshire Council": [51.317, -2.21],
  "West Sussex County Council": [50.916667, -0.5],
  "West Lindsey District Council": [53.35, -0.6],
  "Wakefield Metropolitan District Council": [53.683, -1.499],
  "Thurrock Council": [51.5, 0.416667],
  "The Highland Council": [57.5, -5],
  "Tewkesbury Borough Council": [52, -2.166667],
  "Tameside Metropolitan Borough Council": [53.49, -2.094167],
  "Swale Borough Council": [51.340203, 0.730922],
  "Surrey County Council": [51.25, -0.416667],
  "St Edmundsbury Borough Council": [52.2514, 0.6968],
  "South Norfolk District Council": [52.492, 1.2312],
  "South Gloucestershire Council": [51.479, -2.38],
  "Salford City Council": [53.509722, -2.334444],
  "Royal Borough of Kingston upon Thames": [51.39, -0.28],
  "Rotherham Metropolitan Borough Council": [53.430833, -1.354722],
  "Rochdale Metropolitan Borough Council": [53.616667, -2.156667],
  "Plymouth City Council": [50.371389, -4.142222],
  "Pendle Borough Council": [53.869, -2.164],
  "Pembrokeshire County Council": [51.845, -4.842222],
  "Nottinghamshire County Council": [53.166667, -1],
  "North Lanarkshire Council": [55.829, -3.922],
  "Newport City Council": [51.583333, -3],
  "Manchester City Council": [53.479444, -2.245278],
  "Maidstone Borough Council": [51.27596, 0.52192],
  "London Borough of Waltham Forest": [51.566667, -0.033333],
  "London Borough of Haringey": [51.601632, -0.112915],
  "Lincolnshire County Council": [53.066667, -0.183333],
  "Kirklees Council": [53.593, -1.801],
  "Kent County Council": [51.19, 0.73],
  "Havant Borough Council": [50.85088, -0.98284],
  "City of Edinburgh Council": [55.953056, -3.188889],
  "City of London Corporation": [51.516, -0.092],
  "East Riding of Yorkshire Council": [53.916667, -0.5],
  "Flintshire County Council": [53.25, -3.166667],
  "Gloucester City Council": [51.87, -2.24],
  "Hull City Council": [53.744333, -0.3325],
  "Inverclyde Council": [55.9, -4.75],
  "London Borough of Hackney": [51.55, -0.058333],
  "South Cambridgeshire District Council": [52.132, 0.105],
  "Carmarthenshire County Council": [51.856111, -4.310556],
  "Cornwall Council": [50.3, -4.9],
  "Darlington Borough Council": [54.527, -1.5526],
  "Denbighshire County Council": [53.086667, -3.354444],
  "East Cambridgeshire District Council": [52.387, 0.294],
  "Exeter City Council": [50.716667, -3.533333],
  "Falkirk Council": [56.0011, -3.7835],
  "Fife Council": [56.25, -3.2],
  "Forest Heath District Council": [52.3461, 0.519],
  "Gateshead Metropolitan Borough Council": [54.95, -1.6],
  "Gloucestershire County Council": [51.833333, -2.166667],
};

const keywords = async (target) => {
  const data = await readFile(target);
  return data.toString().split("\n").filter(x => x !== "");
};

const fetchLocalAuthorities = async (blacklist) => {
  const client = new elastic.Client({host: `${elasticHost}:${elasticPort}`, log: "warning"});
  
  const q = {
    query: {
      bool: {
        must_not: [{
          ids: {
            values: blacklist
          }
        }]
      }
    },
    aggs: {
      councils: {
        nested: {
          path: "authorities"
        },
        aggs: {
          names: {
            terms: {
              field: "authorities.prettyName.keyword",
              size: 500
            }
          }
        }
      }
    }
  };

  const {aggregations} = await client.search({
    index,
    body: q,
    size: 0,
  });
  
  return aggregations.councils.names.buckets.map(({key}) => key);
}

(async () => {
  const blacklist = await keywords("./queries/blacklist.txt");
  const names = await fetchLocalAuthorities(blacklist);
  
  const missing = [];
  names.forEach(n => {
    if (!coordinates[n]) {
      missing.push(n);
    }
  });
  missing.forEach(m => console.log(m));
  console.log(`${missing.length} of ${names.length} local authorities are missing.`);
  
  await writeFile("./queries/coordinates.json", JSON.stringify(coordinates));

  process.exit(0);
})();
