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

const searchTerms = fs.readFileSync("./queries/search-terms.txt")
  .toString()
  .split("\n")
  .filter(x => x !== "")
  .map(querify);
const newspapers = fs.readFileSync("./queries/british-papers-domains.txt")
  .toString()
  .split("\n")
  .filter(x => x !== "");

(async () => {
  const queries = chunks(searchTerms, 11).map(chunk => `(${chunk.join(" OR ")})`);
  
  const mediaQueries = newspapers.reduce(
    (memo, domain) => /\.gov\.uk/.test(domain) ?
      memo :
      memo.concat(queries.map(q => `${q} site:${domain}`)),
    []
  );
  
  await writeFile("./queries/media-queries.txt", mediaQueries.join("\n"));
  
  process.exit(0);
})();
