#!/usr/bin/env node

process.on("unhandledRejection", up => {
  throw up;
});

const fs = require("fs");
const path = require("path");
const parse = require('csv-parse/lib/sync');
const stringify = require("csv-stringify/lib/sync");
const {crypto} = require("@sugarcube/core");
const {withSession} = require("@sugarcube/plugin-googlesheets");

const cities = fs.readFileSync(path.join(process.cwd(), "data/cities.csv"));
const gbLocations = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/gb-cities.json")));
const targetCsv = path.join((process.cwd(), "data/cities-geolocated.csv"));
const targetJson = path.join((process.cwd(), "data/cities-geolocated.json"));

const client = "373647540422-l3vmnirgkg2v67sjj7i03nmd8otf7kkk.apps.googleusercontent.com";
const secret = "sM4uddspGv3N9OCFS7-OmqIF";
const tokens = JSON.parse(fs.readFileSync("./google-sheets-token.json"));
const id = "1KgkNPfNiVfxBm8lkVfU2OPyJtrGsQesYrY8t8xzilQU";

const missingCities = {
  "Bentham (North Yorkshire)": ["54.118", "-2.51"],
  "Coleshill (Warwickshire)": ["52.499", "-1.708"],
  "Orford (Suffolk)": ["52.095", "1.534"],
  "Carlton Colville (Suffolk)": ["52.454", "1.691"],
  "Tunstall (Staffordshire)": ["53.0583", "-2.2114"],
  "Wixams (Bedfordshire)": ["52.0879", "-0.4738"],
  "Laindon (Essex)": ["51.574", "0.4181"],
  "Corringham (Essex)": ["51.5224", "0.462"],
  "Heybridge (Essex)": ["51.7417", "0.6897"],
  "Langdon Hills (Essex)": ["51.5618", "0.4213"],
  "Ongar (Essex)": ["51.703", "0.244"],
  "Southchurch (Essex)": ["51.5416", "0.7383"],
  "Chingford (Greater London)": ["51.631", "0.016"],
  "Finchley (Greater London)": ["51.599", "-0.187"],
  "Hornsey (Greater London)": ["51.587131", "-0.12195"],
  "Leyton (Greater London)": ["51.560558", "-0.015465"],
  "St Mary Cray (Greater London)": ["51.392", "0.108"],
  "West Ham (Greater London)": ["51.5347", "0.00769"],
  "Whitehill (Hampshire)": ["51.10181", "-0.86908"],
  "Crayford (Kent)": ["51.4491", "0.1812"],
  "Northfleet (Kent)": ["51.447588", "0.324783"],
  "Southborough (Kent)": ["51.1598", "0.2652"],
  "Gorleston (Norfolk)": ["52.5757", "1.7235"],
  "Wroxham (Norfolk)": ["52.706", "1.412"],
  "Hawes (North Yorkshire)": ["54.304143", "-2.196418"],
  "Barnes (Greater London)": ["51.4741", "-0.2352"],
  "Edmonton (Greater London)": ["51.6154", "-0.0708"],
  "Enfield (Greater London)": ["51.6516", "-0.0837"],
  "Tottenham (Greater London)": ["51.605", "-0.058"],
  "Wimbledon (Greater London)": ["51.4235", "-0.18171"],
  "Willesden (Greater London)": ["51.5468", "-0.2295"],
  "Portchester (Hampshire)": ["50.842", "-1.12"],
  "Minster (Kent)": ["51.421", "0.809"],
  "Tunbridge Wells (Kent)": ["51.132", "0.263"],
  "Halewood (Merseyside)": ["53.3599", "-2.84"],
  "Dereham (Norfolk)": ["52.681", "0.94"],
  "Brierley (South Yorkshire)": ["53.5947", "-1.38201"],
  "Fenton (Staffordshire)": ["52.9977", "-2.1578"],
  "Birchwood (Cheshire)": ["53.4157", "-2.5304"],
  "Grange over Sands (Cumbria)": ["54.19", "-2.915"],
  "Burnham on Crouch (Essex)": ["51.6284", "0.8145"],
  "Bradley Stoke (Gloucestershire)": ["51.5293", "-2.5456"],
  "Stoke on Trent (Staffordshire)": ["53", "-2.183333"],
  "Stratford upon Avon (Warwickshire)": ["52.19", "-1.71"],
  "Lye (West Midlands)": ["52.459", "-2.116"],
  "Malvern (Worcestershire)": ["52.118", "-2.325"],
  "Maud (Aberdeenshire)": ["57.5221", "-2.12687"],
  "St Andrews (Fife)": ["56.3404", "-2.7955"],
  "Towyn (Conwy)": ["53.302", "-3.54"],
  "Montgomery (Powys)": ["52.5628", "-3.1493"],
  "Stockton on Tees (County Durham)": ["54.57", "-1.32"],
  "Linslade (Bedfordshire)": ["51.9243", "-0.6774"],
  "Fenny Stratford (Buckinghamshire)": ["51.998", "-0.715"],
  "Fairfield (Derbyshire)": ["53.258889", "-1.910833"],
  "Polegate (East Sussex)": ["50.8216", "0.2442"],
  "Telscombe (East Sussex)": ["50.803", "-0.01"],
  "Winchelsea (East Sussex)": ["50.9251", "0.7088"],
  "Berwick upon Tweed (Northumberland)": ["55.771", "-2.007"],
  "Southend on Sea (Essex)": ["51.53789", "0.71377"],
  "Northstowe (Cambridgeshire)": ["52.27", "0.07"],
  "Southwark (Surrey)": ["51.45", "-0.083333"],
  "Stockton on Tees (North Yorkshire)": ["54.57", "-1.32"],
  "Neithrop (Oxfordshire)": ["52.06025", "-1.36256"],
  "Ruscote (Oxfordshire)": ["52.06025", "-1.36256"]
};

const duplicateCities = {
  "Whiston (Merseyside)": ["53.413", "-2.798"],
  "Kington (Herefordshire)": ["52.2035", "-3.03"],
  "Alford (Aberdeenshire)": ["57.23", "-2.71"],
  "Dundonald (County Down)": ["54.594", "-5.813"],
  "Brandon (Suffolk)": ["52.4474", "0.6242"],
  "Whitchurch (Shropshire)": ["52.969", "-2.682"],
  "Watton (Norfolk)": ["52.57127", "0.82586"],
  "Reepham (Norfolk)": ["52.762", "1.112"],
  "Alford (Lincolnshire)": ["53.26", "0.18"],
  "Greenhill (Kent)": ["51.36", "1.103"],
  "Gillingham (Kent)": ["51.3792", "0.5498"],
  "Wickham (Hampshire)": ["50.9", "-1.19"],
  "Whitchurch (Hampshire)": ["51.23", "-1.34"],
  "Gillingham (Dorset)": ["51.0375", "-2.2748"],
  "Buxton (Derbyshire)": ["53.259", "-1.911"],
  "Hythe (Kent)": ["51.0716", "1.084"],
  "Hythe (Hampshire)": ["50.869", "-1.399"],
  "Newport (Pembrokeshire)": ["52.01975", "-4.83607"],
  "Bangor (Gwynedd)": ["53.228", "-4.128"],
  "Broughton (Flintshire)": ["53.169", "-2.985"],
  "Wick (Highlands)": ["58.454", "-3.089"],
  "Leven (Fife)": ["56.195", "-2.994167"],
  "Bangor (County Down)": ["54.66", "-5.67"],
  "Westbury (Wiltshire)": ["51.26", "-2.191"],
  "Mere (Wiltshire)": ["51.09", "-2.266"],
  "Featherstone (West Yorkshire)": ["53.7", "-1.37"],
  "Washington (Tyne and Wear)": ["54.9", "-1.52"],
  "Ashford (Surrey)": ["51.434", "-0.464"],
  "Mildenhall (Suffolk)": ["52.34461", "0.5089"],
  "Hadleigh (Suffolk)": ["52.044", "0.961"],
  "Stone (Staffordshire)": ["52.9", "-2.15"],
  "Hatfield (South Yorkshire)": ["53.58", "-1"],
  "Wellington (Somerset)": ["50.9755", "-3.2243"],
  "Wellington (Shropshire)": ["52.7001", "-2.5157"],
  "Newport (Shropshire)": ["52.7691", "-2.3787"],
  "Richmond (North Yorkshire)": ["54.403", "-1.737"],
  "Holt (Norfolk)": ["52.9", "1.09"],
  "Broughton (Lincolnshire)": ["53.5638", "-0.5465"],
  "Thornton (Lancashire)": ["53.871", "-3.004"],
  "Preston (Lancashire)": ["53.759", "-2.699"],
  "Nelson (Lancashire)": ["53.8346", "-2.218"],
  "Rochester (Kent)": ["51.3883", "0.4982"],
  "Ashford (Kent)": ["51.1465", "0.8676"],
  "Newport (Isle of Wight)": ["50.666667", "-1.266667"],
  "Royston (Hertfordshire)": ["52.0471", "-0.0202"],
  "Hatfield (Hertfordshire)": ["51.762", "-0.228"],
  "Hatfield (Herefordshire)": ["52.231", "-2.599"],
  "Farnborough (Hampshire)": ["51.29", "-0.75"],
  "Fleet (Hampshire)": ["51.2834", "-0.8456"],
  "Leigh (Greater Manchester)": ["53.4975", "-2.515"],
  "Denton (Greater Manchester)": ["53.4554", "-2.1122"],
  "Richmond (Greater London)": ["51.456", "-0.301"],
  "Acton (Greater London)": ["51.513519", "-0.270661"],
  "Kingswood (Gloucestershire)": ["51.46", "-2.505"],
  "Hadleigh (Essex)": ["51.5535", "0.6095"],
  "Melbourne (Derbyshire)": ["52.823", "-1.429"],
  "Stanley (County Durham)": ["54.867", "-1.692"],
  "Willington (County Durham)": ["54.71", "-1.69"],
  "Warrington (Cheshire)": ["53.391667", "-2.597222"],
  "Brampton (Cumbria)": ["54.9409", "-2.7329"],
  "Newport (Gwent)": ["51.583333", "-3"],
};

const notFound = [];
const multiple = [];
const results = [];

withSession(async ({getSpreadsheet}) => {
  const {sheets} = await getSpreadsheet(id);
  sheets
    .map(s => s.properties)
    .forEach(({title}) => {
      const [city, county] = title.match(/(.*) \((.*)\)$/).slice(1);
      const location = `${city} (${county})`;
      const matchedLocations = gbLocations.filter(({name}) => name === city);
      const [firstMatch, ...rest] = matchedLocations;

      if (!firstMatch) {
        if (missingCities[location]) {
          const [lat, lng] = missingCities[location];
          results.push({city, county, lat, lng});
        } else {
          notFound.push(location);
          results.push({city, county});
        }
      } else if (rest.length > 0) {
        if (duplicateCities[location]) {
          const [lat, lng] = duplicateCities[location];
          results.push({city, county, lat, lng});
        } else {
          multiple.push([
            location,
            matchedLocations.length,
            JSON.stringify(matchedLocations),
          ]);
          results.push({city, county});
        }
      } else {
        const {lat, lng} = firstMatch;
        results.push({city, county, lat, lng});
      }
    });
  results.forEach(r => {
    const idHash = crypto.hashKeys(["lat", "lng"], r);
    const contentHash = crypto.hashKeys(["city", "county"], r);
    Object.assign(r, {_sc_id_hash: idHash, _sc_content_hash: contentHash});
  }); 
}, {client, secret, tokens}).then(() => {
  console.log("Multiple Cities:");
  multiple.forEach(([name, count, d]) => console.log(`${name}: ${count} (${d})`));
  console.log("");
  console.log("Not Found Cities:");
  notFound.forEach(t => console.log(t));
  console.log("");
  console.log(`${notFound.length} not found and ${multiple.length} duplicates.`);
  fs.writeFileSync(targetJson, JSON.stringify(results));
  fs.writeFileSync(
    targetCsv,
    stringify(results, {quotedString: true, header: true})
  );
});
