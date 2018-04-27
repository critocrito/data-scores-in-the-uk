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

## Scripts

### `scripts/city-geolocations.js`

This script gets all city/county names from the [UK Data Scores - Results
Cities
spreadsheet](https://docs.google.com/spreadsheets/d/1KgkNPfNiVfxBm8lkVfU2OPyJtrGsQesYrY8t8xzilQU/edit#gid=1629766150)
and looks up the geolocation for each city. It generates a new CSV and JSON
file in `./data/cities-geolocated.{csv,json}`. The biggest junk of geo
locations was taken from [cities of the world in
Json](https://github.com/lutangar/cities.json) which is based on the [GeoNames
Gazetteer](http://download.geonames.org/export/dump/).

```sh
curl -O https://raw.githubusercontent.com/lutangar/cities.json/master/cities.json
```

The relevant part of cities in Great Britain is located in
`./data/gb-cities.json`. Missing or ambiguous city names were manually
complemented with data from Wikipedia.
