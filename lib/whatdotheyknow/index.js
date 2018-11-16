const {get, merge} = require("lodash/fp");
const {flowP, collectP, flatmapP, tapP} = require("dashp");
const {URL} = require("url");
const {envelope: env} = require("@sugarcube/core");
const {SheetsDo, rowsToQueries} = require("@sugarcube/plugin-googlesheets");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const tika = require("tika");
const {inspect} = require("util");
const dots = require("dot").process({
  path: "./lib/whatdotheyknow",
  templateSettings: {strip: false},
});

const queriesPluginQuerySource = "sheets_query";
const fetchPluginQuerySource = "whatdotheyknow_url";

const fetchFoi = (url) => fetch(url).then(res => res.text());

const extractAttachments = href => new Promise((resolve, reject) => {
  tika.text(href, (err, text) => {
    if (err) reject(err);
    resolve({href, text: text.trim()});
  });
});

const parseFoi = async (href) => {
  const html = await fetchFoi(href);
  const $ = cheerio.load(html);

  const title = $("p.request-header__subtitle")
    .text()
    .trim()
    .replace(/\n/g, "")
    .replace(/\s\s+/, " ");
  const state = $("#request_status > p > strong").text();
  const sections = $("#left_column > div.correspondence")
    .toArray()
    .map((el, order) => {
      const author = $("span.correspondence__header__author", el)
        .text()
        .trim()
        .replace(/\n/g, "")
        .replace(/\s\s+/, " ");
      const date = $("a.correspondence__header__date > time", el).attr("datetime");
      const text = $("div.correspondence_text > p", el)
        .text()
        .trim()
        .replace(/\n\nshow quoted sections$/, "");
      const attachments = $("div.correspondence_text", el).has("div.attachments") ?
        $("ul.list-of-attachments > li", el)
          .toArray()
          .map(ell => {
            const u = new URL(`https://whatdotheyknow.com${$("a", ell).attr("href")}`);
            u.searchParams.delete("cookie_passthrough");
            return u.toString();
          })
          .filter(url => {
            const u = new URL(url);
            return /(doc|docx|xls|xlsx|pdf)$/.test(u.pathname);
          }):
        [];
      const reference = $("div.correspondence__footer__cplink > input", el).attr("value");
      return {order, author, date, text, reference, attachments};
    }).sort((a, b) => {
      if (a.order < b.order) return -1;
      if (a.order > b.order) return 1;
      return 0;
    });

  const createdAt = sections[0].date;
  const issuer = sections[0].author;

  return {
    title,
    href,
    state,
    description: `${title}. The request was issued on the ${createdAt} by ${issuer} and marked to be ${state}. See the full request at: ${href}.`,
    sections: await Promise.all(sections.map(async ({attachments, ...section}) => {
      if (attachments.length === 0) return {attachments, ...section};
      const texts = await collectP(extractAttachments, attachments);
      return {attachments: texts, ...section};
    }))};
};

const foiRequest = flowP([
  fetchFoi,
  parseFoi,
]);

const queriesPlugin = (envelope, {cfg, log, cache}) => {
  const client = get("google.client_id", cfg);
  const secret = get("google.client_secret", cfg);
  const id = get("google.spreadsheet_id", cfg);
  const queries = env.queriesByType(queriesPluginQuerySource, envelope);
  let tokens;

  queries.forEach(q => log.info(`Extracting scrapes from ${q}.`));

  const querySheet = async query => {
    const [qs, t, history] = await SheetsDo(
      function* fetchQueries({getSheet, getRows}) {
        const {sheetUrl} = yield getSheet(id, query);
        const rows = yield getRows(id, query);

        const termIndex = rows[0].indexOf("Link to FOI");
        const outcomeIndex = rows[0].indexOf("Outcome");

        const validRows = rows
          .slice(1)
          .filter(r => r[outcomeIndex] === "S")
          .map(r => ({type: fetchPluginQuerySource, term: r[termIndex]}));

        log.info(`${validRows.length} out of ${rows.length - 1} rows are valid queries.`);

        return validRows;
      },
      {client, secret, tokens: cache.get("sheets.tokens")},
    );
    history.forEach(([k, meta]) => log.debug(`${k}: ${JSON.stringify(meta)}.`));
    tokens = t;
    return qs;
  };

  return flowP(
    [
    flatmapP(querySheet),
    tapP(rs => {
      const count = rs.length;
      log.info(`Fetched a total of ${count} quer${count > 1 ? "ies" : "y"}.`);
      if (tokens != null) cache.update("sheets.tokens", merge(tokens));
    }),
    rs => env.concatQueries(rs, envelope),
  ],
    queries,
  );
};

queriesPlugin.desc = "Select the FOI requests to scrape and turn them into queries";
queriesPlugin.argv = {};

const fetchPlugin = async (envelope, {log}) => {
  const queries = env.queriesByType(fetchPluginQuerySource, envelope);

  log.info(`Scraping ${queries.length} FOI requests.`);

  const data = await flowP([
    flatmapP(parseFoi),
    collectP(correspondence => {
      const text = dots.correspondence(correspondence);
      return {
        title: correspondence.title,
        description: correspondence.description,
        href: correspondence.href,
        href_text: text,
        search_batch: ["foi"],
        _sc_id_fields: ["href"],
      };
    }),
  ], queries);

  return env.concatData(data, envelope);
};

fetchPlugin.desc = "Scrape FOI requests from whatdotheyknow.com.";
fetchPlugin.argv = {};

module.exports.plugins = {
  whatdotheyknow_queries: queriesPlugin,
  whatdotheyknow_fetch: fetchPlugin,
};
