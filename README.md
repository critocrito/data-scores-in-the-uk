# Data Scores in the UK

## Synopsis

[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

As part of [our](https://datajusticelab.org/) project ‘Data Scores as
Governance’ we have developed a tool to map and investigate the uses of data
analytics and algorithms in public services in the UK. Little is still known
about the implementation of data-driven systems and algorithmic processes in
public services and how citizens are increasingly ‘scored’ based on the
collection and combination of data.

This repository handles all aspects of the data collection and analysis.

## Contents

- [Installation](#installation)
- [Data Processes](#data-processes)
- [Scripts](#scripts)
- [Bits and Pieces](#bits-and-pieces)

## Installation

### Requirements

- [NodeJS](https://nodejs.org/)
- [Clojure](https://clojure.org) and [Boot](https://github.com/boot-clj/boot)
- [Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)

All development happened on Linux and the code should work well on MacOS as
well. Windows support was never tested.

### Installation

See [installation instructions for `boot`](https://github.com/boot-clj/boot#install) and [the download section of `nodejs`](https://nodejs.org/en/download/) to install the required tools. With NodeJS installed type the following to install all dependencies:

```
npm install
```

## Data Processes

The [Sugarcube](https://gitlab.com/sugarcube/sugarcube) tool set is used for all data acquisition processes. Those processes can be repeated at any time.

### `bin/import-ddg-scrapes.sh`

The initial data scrape from DuckDuckGo was done outside of this repository, but still using Sugarcube. This script imports extracts the contents of the search results of the initial data set and imports it into the database. The imported data can be found in [`materials/ddg-scrapes-clean.csv`](materials/ddg-scrapes-clean.csv).

### `bin/search-ddg-gov.sh`

Scrape DuckDuckGo for search results on government websites (`site:.gov.uk`) based on the initial set of [search queries](queries/search-terms.txt).

### `bin/search-ddg-auxiliary.sh`

Scrape DuckDuckGo for search results for auxiliary websites based on the initial set of [search queries](queries/search-terms.txt). The list of auxiliary domains is maintained in [`queries/aux-sites.txt`](queries/aux-sites.txt).

### `bin/import-foi-requests.sh`

Import the contents of the FOI requests into the database. The requests themselves are found in [`materials/foi-requests`](materials/foi-requests).

### `bin/search-media-ddg.sh`

## Scripts

Post processing of data is done using a the following collection of scripts. They are idempotent and can be rerun at any time.

### `scripts/update_companies.clj`

Tag all documents in the data base mentioning any company that is defined in [`queries/companies.txt`](queries/companies.txt).

### `scripts/update_systems.clj`

Tag all documents in the data base mentioning any system that is defined in [`queries/systems.txt`](queries/systems.txt).

### `scripts/update_authorities.clj`

Tag all documents in the data base mentioning any authority name in combination with any company or system. The lists of data are defined in [`queries/authorities.txt`](queries/authorities.txt),  [`queries/companies.txt`](queries/companies.txt) and [`queries/systems.txt`](queries/systems.txt). This script also matches authority locations that are managed in [`queries/coordinates.json`]. If any location is missing, the script will halt. Add to the list of known coordinates to continue.

### `scripts/update_departments.clj`

Tag all documents in the data base mentioning any department name in combination with any company or system. The lists of data are defined in [`queries/departments.txt`](queries/departments.txt),  [`queries/companies.txt`](queries/companies.txt) and [`queries/systems.txt`](queries/systems.txt).

### `scripts/update_blacklisted.clj`

Flag a set of documents as blacklisted. They will be excluded from any further analysis or by the [`data-scores-map`](https://github.com/critocrito/data-scores-map) application. The list of blacklisted ID's is collected in [`queries/blacklist.txt`].

### `scripts/generate-media-sites-queries.js`

### `scripts/stats_for_departments.clj`

Generate statistics about the occurrences of departments in the existing data set. It will print a sorted CSV data set to the screen.

### `scripts/stats_for_authorities.clj`

Generate statistics about the occurrences of authorities in the existing data set. It will print a sorted CSV data set to the screen.

### `scripts/stats.js`

### `scripts/clean_gov_uk_domain_names.clj`

### `scripts/british_newspapers.clj`

This script scrapes a list of all news media from [https://www.britishpapers.co.uk/](https://www.britishpapers.co.uk/). The resulting newspaper domains are printed to the screen. Use the script like this:

```
./scripts/british_newspapers.clj | tee ./queries/british-papers-domains.txt
```

### `scripts/reindex_data.clj`

This script is a helper to create a new local index and reindex an existing data set. This was helpful during development to be able to experiment on a data set. Run the script like this:

```
./scripts/reindex_data.clj http://localhost:9200/data-scores-04 http://localhost:9200/data-scores-05
```

## Bits and Pieces

I used Libreoffice to remove line breaks in the original `rawresults.csv` and
exported the file again in `materials/ddg-scraoes.csv`. Then I did more
cleaning using the following command:

    cat ddg-scrapes.csv | grep -v "^NO" | grep -v "Noresults" | cut -d, -f2- | sed -En "s/_(.*)-(.*)_100taps.json/\1 \2/p" | (echo "search_category,title,description,href" && cat) > ddg-scrapes-clean.csv
