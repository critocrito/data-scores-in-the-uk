#!/usr/bin/env node

process.on("unhandledRejection", up => {
  // throw up;
  console.log(up);
  process.exit(1);
});

const fs = require("fs");
const path = require("path");
const {URL} = require("url");
const {promisify} = require("util");
const {flow, zip} = require("lodash/fp");
const {delayP, flowP, collectP, tapP} = require("dashp");
const cheerio = require("cheerio");
const fetch = require("isomorphic-fetch");

const readFile = promisify(fs.readFile);
const appendFile = promisify(fs.appendFile);

const keywords = async (target) => {
    const data = await readFile(target);
    return data.toString().split("\n").filter(x => x !== "");
  };

const constructUrl = async (query) => {
  const url = new URL("https://google.co.uk/search");
  url.searchParams.append("q", `"${query.replace(/\((.*)\)/, "$1")}" site:uk`);
  return url.toString();
}

const query = (url) => fetch(url, {
  headers: {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:61.0) Gecko/20100101 Firefox/61.0"
  }
}).then(resp => resp.text());

const parseBody = (html) => {
  const results = cheerio.load(html)("div .g").first().html();
  return cheerio.load(results)("a").attr("href");
}

const urlToDomain = (url) => {
  const u = new URL(url);
  return u.host;
}

const persist = (term) => appendFile("./newspaper-domains.txt", `\n${term}`);

const parseDomain = async (newspaper) => {
  let domain;
  try {
    domain = await flowP([
      constructUrl,
      query,
      parseBody,
      urlToDomain,
    ], newspaper);
  } catch (e) {
    console.log(newspaper, e);
    domain = "error";
  }
  return `${newspaper},${domain}`;
}

(async () => {
  const newspapers = await keywords("./queries/newspapers.txt");
  
  await collectP(flowP([
    parseDomain,
    tapP(console.log),
    persist,
    (domain) => {
      const waitTime = Math.floor(Math.random() * 2) + 1;
      return delayP(waitTime * 60 * 1000, domain);
    },
  ]), newspapers);

  process.exit(0);
})();
