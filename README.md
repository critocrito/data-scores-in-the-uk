# Data Scores in the UK

## Synopsis

[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

As part of [our](https://datajusticelab.org/) project ‘Data Scores as
Governance’ we have developed a tool to map and investigate the uses of data
analytics and algorithms in public services in the UK. Little is still known
about the implementation of data-driven systems and algorithmic processes in
public services and how citizens are increasingly ‘scored’ based on the
collection and combination of data.

## Contents

- [Installation](#installation)
- [Data Processes](#data-processes)
- [Scripts](#scripts)
- [Bits and Pieces](#bits-and-pieces)

## Installation

### Requirements

- [Clojure](https://clojure.org)
- [NodeJS](https://nodejs.org/)
- Linux/Unix

With NodeJS installed:

```
npm install
```

## Data Processes

### `bin/import-ddg-scrapes.sh`

Import the current list of DDG search results.

### `bin/search-ddg.sh`

### `bin/search-media-ddg.sh`

## Scripts

### `scripts/update_companies.clj`

### `scripts/update_systems.clj`

### `scripts/update_authorities.clj`

### `scripts/update_departments.clj`

### `scripts/update_blacklisted.clj`

### `scripts/generate-media-sites-queries.js`

### `scripts/stats_for_departments.clj`

### `scripts/stats_for_authorities.clj`

### `scripts/stats.js`

### `scripts/clean_gov_uk_domain_names.clj`

### `scripts/british_newspapers.clj`

### `scripts/reindex_data.clj`

## Bits and Pieces

I used Libreoffice to remove line breaks in the original `rawresults.csv` and
exported the file again in `materials/ddg-scraoes.csv`. Then I did more
cleaning using the following command:

    cat ddg-scrapes.csv | grep -v "^NO" | grep -v "Noresults" | cut -d, -f2- | sed -En "s/_(.*)-(.*)_100taps.json/\1 \2/p" | (echo "search_category,title,description,href" && cat) > ddg-scrapes-clean.csv
