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
  "Wycombe District Council": [51.6385, -0.8079],
  "Wokingham Borough Council": [51.4102, -0.8432],
  "Wigan Metropolitan Borough Council": [53.533333, -2.616667],
  "West Dunbartonshire Council": [55.99, -4.515],
  "Wealden District Council": [50.999, 0.212],
  "Waveney District Council": [52.4831, 1.7561],
  "Surrey Heath Borough Council": [51.3395, -0.7433],
  "Sunderland City Council": [54.91, -1.385],
  "Stroud District Council": [51.748, -2.216],
  "Stoke-on-Trent City Council": [53, -2.183333],
  "Stockton-on-Tees Borough Council": [54.55, -1.333333],
  "South Ribble Borough Council": [53.697, -2.69],
  "Somerset County Council": [51.18, -3],
  "Sevenoaks District Council": [51.27, 0.193],
  "Selby District Council": [53.777, -1.079],
  "Scarborough Borough Council": [54.28, -0.402],
  "Runnymede Borough Council": [51.395, -0.541],
  "Rother District Council": [50.849789, 0.470503],
  "Renfrewshire Council": [55.829858, -4.542838],
  "Redcar and Cleveland Borough Council": [54.57923, -1.03409],
  "Oxfordshire County Council": [51.75, -1.28],
  "Northamptonshire County Council": [52.283333, -0.833333],
  "North Somerset Council": [51.39, -2.8],
  "North Norfolk District Council": [52.933333, 1.3],
  "North Lincolnshire Council": [53.6, -0.65],
  "Newcastle City Council": [54.966667, -1.6],
  "Monmouthshire County Council": [51.783333, -2.866667],
  "Mid Ulster District Council": [54.668, -6.679],
  "Mid Sussex District Council": [51.020667, -0.137328],
  "Mid Devon District Council": [50.9, -3.49],
  "Merthyr Tydfil County Borough Council": [51.75, -3.383333],
  "Mendip District Council": [51.3, -2.733333],
  "Mansfield District Council": [53.15, -1.2],
  "London Borough of Barnet": [51.6254, -0.1527],
  "Lewes District Council": [50.873889, 0.008889],
  "Isle of Wight Council": [50.666667, -1.266667],
  "Ipswich Borough Council": [52.059444, 1.155556],
  "Herefordshire Council": [52.053, -2.694],
  "Harlow Council": [51.779, 0.128],
  "Fenland District Council": [52.575, 0.049],
  "Epping Forest District Council": [51.66, 0.05],
  "Elmbridge Borough Council": [51.37, -0.3618],
  "East Sussex County Council": [50.916667, 0.333333],
  "East Staffordshire Borough Council": [52.808, -1.6457],
  "Dover District Council": [51.13, 1.311],
  "Devon County Council": [50.714722, -3.5175],
  "Derbyshire Dales District Council": [53.05, -1.7],
  "Council of the Isles of Scilly": [49.936111, -6.322778],
  "City of Bradford Metropolitan District Council": [53.792, -1.754],
  "Cheltenham Borough Council": [51.883333, -2.066667],
  "Carlisle City Council": [54.890833, -2.943889],
  "Caerphilly County Borough Council": [51.656, -3.183],
  "Broxtowe Borough Council": [52.95, -1.27],
  "Bridgend County Borough Council": [51.506667, -3.579444],
  "Bracknell Forest Council": [51.417, -0.7469],
  "Borough of Poole": [50.716667, -1.983333],
  "Borough Council of Kings Lynn and West Norfolk": [52.7549, 0.3962],
  "Bolton Metropolitan Borough Council": [53.5775, -2.43],
  "Blaenau Gwent County Borough Council": [51.775833, -3.196389],
  "Bath and North East Somerset Council": [51.38, -2.36],
  "Bassetlaw District Council": [53.4, -0.95],
  "Ashfield District Council": [53.05, -1.3],
  "Stockport Metropolitan Borough Council": [53.40581, -2.1594],
  "Southampton City Council": [50.9, -1.4],
  "Rushmoor Borough Council": [51.277453, -0.771511],
  "London Borough of Wandsworth": [51.457306, -0.194861],
  "London Borough of Havering": [51.55, 0.216667],
  "Liverpool City Council": [53.407194, -2.991667],
  "Hastings Borough Council": [50.855, 0.583333],
  "Eastbourne Borough Council": [50.77, 0.28],
  "Brighton and Hove City Council": [50.827778, -0.152778],
  "Belfast City Council": [54.593889, -5.929444],
  "Bedford Borough Council": [52.134444, -0.463056],
  "Adur District Council": [50.8326, -0.2689],
  "Sheffield City Council": [53.383611, -1.466944],
  "Derbyshire County Council": [53.133333, -1.6]
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
