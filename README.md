# Data Scores in the UK

## Requirements

- [NodeJS](https://nodejs.org/)
- [csvkit](https://csvkit.readthedocs.io/en/1.0.3/index.html)
- Linux/Unix

## Installation

With NodeJS installed:

```
npm install
```

## Data Processes

### `bin/import-ddg-scrapes.sh`

Import the current list of DDG search results.

### `bin/query-data.sh`

This script is quite big, and I will break it into smaller pieces soon. It:

- Queries the current list of keywords  and city names, and places them as CSV
  files into `./data`. The  files are named `queries-keywords-<TODAY>.csv` and
  `queries-cities-<TODAY>.csv` where `<TODAY>` is a timestamp in the format of
  `YYYY-mm-dd`.
- Searches the Elasticsearch database for every keyword and updates the
  correct spreadsheets.
- Searches the Elasticsearch database for every keyword AND every city name
  and updates the correct spreadsheet.

## Bits and Pieces

I used Libreoffice to remove line breaks in the original `rawresults.csv` and
exported the file again in `materials/ddg-scraoes.csv`. Then I did more
cleaning using the following command:

    cat ddg-scrapes.csv | grep -v "^NO" | grep -v "Noresults" | cut -d, -f2- | sed -En "s/_(.*)-(.*)_100taps.json/\1 \2/p" | (echo "search_category,title,description,href" && cat) > ddg-scrapes-clean.csv
