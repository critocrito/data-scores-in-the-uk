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

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const querify = (term) => {
  const t = term.toLowerCase().trim();
  if (/\s/g.test(t)) return `"${t}"`;
  return t;
}

const chunks = (array, chunk_size) =>
  Array(Math.ceil(array.length / chunk_size))
    .fill()
    .map((_, index) => index * chunk_size)
    .map(begin => array.slice(begin, begin + chunk_size));

const blacklist = [
  "amazon.co.uk",
  "mark-knopfler-news.co.uk",
  "sfx.abdn.ac.uk:9003",
  "swpp.co.uk",
  "taxi-driver.co.uk",
  "ukriversguidebook.co.uk",
  "travelweekly.co.uk",
  "thescottishfarmer.co.uk",
  "ebay.co.uk",
  "glassdoor.co.uk",
  "copac.jisc.ac.uk",
  "pinterest.co.uk",
  "beta.companieshouse.gov.uk",
  "bis.lexisnexis.co.uk",
  "hmc.org.uk",
  "sainsburys.co.uk",
  "iannounce.co.uk",
  "zipleaf.co.uk",
  "fisherstours.co.uk",
  "techglide.co.uk",
  "britishpapers.co.uk",
  "buildingsatrisk.org.uk",
  "nora.nerc.ac.uk",
  "yelp.co.uk",
  "findit.maltonmercury.co.uk",
  "archanthub.co.uk",
];

const companies = fs.readFileSync("./queries/companies.txt")
  .toString()
  .split("\n")
  .filter(x => x !== "")
  .map(querify);
const systems = fs.readFileSync("./queries/systems.txt")
  .toString()
  .split("\n")
  .filter(x => x !== "")
  .map(querify);
const authorities = fs.readFileSync("./queries/authorities.txt")
  .toString()
  .split("\n")
  .filter(x => x !== "")
  .map(querify);
const newspapers = fs.readFileSync("./queries/british-papers-domains.txt")
  .toString()
  .split("\n")
  .filter(x => x !== "");
const keywords = companies.concat(systems);

(async () => {
  const keywordChunks = chunks(keywords, 8).map(chunk => `(${chunk.join(" OR ")})`);
  const authorityChunks = chunks(authorities, 2).map(chunk => `(${chunk.join(" OR ")})`);
  const queries = authorityChunks
    .reduce(
      (memo, chunk) => memo.concat(keywordChunks.map(k => `${k} ${chunk}`)),
      []
    );
  
  const mediaQueries = newspapers.reduce(
    (memo, domain) => memo.concat(queries.map(q => `${q} site:${domain}`)),
    []
  );
  await writeFile("./queries/media-queries.txt", mediaQueries.join("\n"));
  
  process.exit(0);
})();
