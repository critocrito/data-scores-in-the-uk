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

const coordinates = JSON.parse(fs.readFileSync("./queries/coordinates.json"));
const blacklist = fs
  .readFileSync("./queries/blacklist.txt")
  .toString()
  .split("\n")
  .filter(x => x !== "");

const keywords = async (target) => {
  const data = await readFile(target);
  return data.toString().split("\n").filter(x => x !== "");
};

const searchKeyword = (keywords) =>
  Elastic.Do(function* ({query}) {
    const q = {
      query: {
        bool: {
          must_not: [{
            ids: {
              values: blacklist
            }
          }],
          must: keywords.map(k => ({
            "multi_match": {
              "query": k,
              "type": "phrase_prefix",
              "fields": ["title", "description", "href_text"]
            }
          }))
        }
        
      },
      "_source": "$sc_id_hash"
    };
    
    const units = yield query(index, q, 2000);

    console.log(`Fetched ${units.length} units for ${keywords.join(", ")}.`);

    return units.map(u => u._sc_id_hash);
  }, {host: elasticHost, port: elasticPort});

const searchAuthorityKeyword = async (keywordType, authority, keywords) => {
  const client = new elastic.Client({host: `${elasticHost}:${elasticPort}`, log: "warning"})

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
      documents: {
        filters: {
          filters: keywords.reduce(
            (memo, keyword) => Object.assign(memo, {[keyword]: {
              bool: {
                must: [{
                  "multi_match": {
                    "query": keyword,
                    "type": "phrase_prefix",
                    "fields": ["title", "description", "href_text"]
                  }
                }, {
                  "multi_match": {
                    "query": authority,
                    "type": "phrase_prefix",
                    "fields": ["title", "description", "href_text"]
                  }
                }]
              }
            }
          }), {})
        }
      }
    }
  };

  const {aggregations} = await client.search({
    index,
    body: q,
    size: 0,
  });

  return Object.keys(aggregations.documents.buckets).reduce((memo, keyword) => {
    if (aggregations.documents.buckets[keyword].doc_count > 0) return memo.concat(keyword);
    return memo;
  }, []);
};

const updateKeyword = async (field, ids, keyword) => {
  if (ids.length === 0) return;
  
  await Elastic.Do(function* ({queryByIds, bulk}) {
    const units = yield queryByIds(index, ids);

    const toIndex = units.map(u => {
      const keywords = field in u ?
        Array.from(new Set(u[field]).add(keyword)) :
        [keyword];

      return Object.assign({}, u, {[field]: keywords});
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
  }, {host: elasticHost, port: elasticPort});
}

const updateAuthorityKeyword = async (keywordType, ids, authority, keyword) => {
  if (ids.length === 0) return;

  const field = "authorities";
  const coordinate = coordinates[authority] ? {location: coordinates[authority]} : {};

  console.log(`Updating ${ids.length} documents for ${authority}/${keyword}`);

  await Elastic.Do(function* ({queryByIds, bulk}) {
    const units = yield queryByIds(index, ids);

    const toIndex = units.map(u => {
      let authorities;

      if (!coordinate.location)
        console.log(`##### Missing coordinates for ${authority}. #####`);

      if(u[field]) {
        const authorityIndex = u[field].findIndex(
          ({name}) => name === authority
        );
        
        if (authorityIndex === -1) {
          authorities = u[field].concat(Object.assign(
            {},
            coordinate,
            {
              name: authority,
              [keywordType]: [keyword]
            }
          ))
        } else {
          const newAuthority = Object.assign(
            {},
            u[field][authorityIndex],
            coordinate,
            {[keywordType]: Array.from(
              new Set(u[field][authorityIndex][keywordType] || []).add(keyword)
            )}
          );
          authorities = u[field]
            .slice(0, authorityIndex)
            .concat(newAuthority)
            .concat(u[field].slice(authorityIndex + 1));
        }
      } else {
        authorities = [Object.assign(
          {},
          coordinate,
          {
            name: authority,
            [keywordType]: [keyword]
          }
        )];
      }      

      return Object.assign({}, u, {authorities});
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
  }, {host: elasticHost, port: elasticPort});
}

const upsertKeyword = field =>
  async (keyword) => {
    const [ids] = await searchKeyword([keyword]);
    await updateKeyword(field, ids, keyword);
  }

const upsertAuthorities = (keywordType) =>
  async (authority, keywords) => {
    const validKeywords = await searchAuthorityKeyword(keywordType, authority, keywords);

    console.log(`Found ${validKeywords.length} valid keywords for ${authority}.`);

    return collectP(flowP([
      async keyword => {
        const [ids] = await searchKeyword([authority, keyword]);
        await updateAuthorityKeyword(keywordType, ids, authority, keyword);
      },
      delayP(250),
    ]), validKeywords);
  }

const updateCompanies = collectP(upsertKeyword("companies"));
const updateSystems = collectP(upsertKeyword("systems"));
const updateCompaniesAuthorities = async (authorities, keywords) => {
  const f = upsertAuthorities("companies");
  const xs = await collectP(flowP([
    authority => f(authority, keywords),
    delayP(250)
  ]), authorities);
};
const updateSystemsAuthorities = async (authorities, keywords) => {
  const f = upsertAuthorities("systems");
  const xs = await collectP(flowP([
    authority => f(authority, keywords),
    delayP(250)
  ]), authorities);
};

(async () => {
  const companies = await keywords("./queries/companies.txt");
  const systems = await keywords("./queries/systems.txt");
  const authorities = await keywords("./queries/authorities.txt");

  // Ensure that companies and systems are updated first, the councils update
  // depends on it.
  console.log(`Updating ${companies.length} company keywords.`);
  await updateCompanies(companies.map(s => s.toLowerCase().trim()));

  console.log(`Updating ${systems.length} system keywords.`);
  await updateSystems(systems.map(s => s.toLowerCase().trim()));

  console.log(`Updating ${authorities.length} authority keywords for companies.`);
  await updateCompaniesAuthorities(
    authorities.map(s => s.trim()),
    companies.map(s => s.toLowerCase().trim())
  );
  console.log(`Updating ${authorities.length} authority keywords for systems.`);
  await updateSystemsAuthorities(
    authorities.map(s => s.trim()),
    systems.map(s => s.toLowerCase().trim())
  );

  process.exit(0);
})();
