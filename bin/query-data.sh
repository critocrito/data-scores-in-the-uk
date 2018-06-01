#!/bin/bash

QUERIES_SPREADSHEET="1z01emU2GR1HbuuYT8VnFqfYftSebTvtkpVtQiFCDky8"
KEYWORDS_SPREADSHEET="1OJtBHn10cdw0Vq0wxAEnsmtZPRhT1nsdBq-qElwj7eM"
CITIES_SPREADSHEET="1KgkNPfNiVfxBm8lkVfU2OPyJtrGsQesYrY8t8xzilQU"
COUNCILS_SPREADSHEET="1-HJwxemYly7M5S3lOG3S-8KRNPjmzJVhxHlSjZ5JVZo"
DATE=$(date +%Y-%m-%d)
DATA_DIR=./data
CONCURRENCY=5
IFS=$','

$(npm bin)/sugarcube -c configs/secrets.json \
          -p sheets_import,csv_export \
          --google.sheet Cities \
          --google.spreadsheet_id $QUERIES_SPREADSHEET \
          --google.sheet_fields term \
          --google.sheet_fields county \
          --google.sheet_fields country \
          --google.id_fields term \
          --google.id_fields county \
          --google.id_fields country \
          --csv.filename $DATA_DIR/queries-cities-${DATE}.csv $@

$(npm bin)/sugarcube -c configs/secrets.json \
          -p sheets_import,csv_export \
          --google.sheet Keywords \
          --google.spreadsheet_id $QUERIES_SPREADSHEET \
          --google.sheet_fields term \
          --google.id_fields term \
          --csv.filename $DATA_DIR/queries-keywords-${DATE}.csv $@

for i in $(csvcut -c term $DATA_DIR/queries-keywords-${DATE}.csv | sed "1 d" | tr '\n' ',')
do
  echo
  echo "Searching for keyword: ${i}"
  echo
  $(npm bin)/sugarcube -c configs/elasticsearch-staging.json \
            -Q elastic_query:'{"query": {"match_phrase": {"href_text": "'"$i"'"}}}' \
            -Q workflow_merge:'{"keyword": "'"$i"'"}' \
            -p elastic_import,workflow_merge,csv_export,sheets_export \
            --google.spreadsheet_id $KEYWORDS_SPREADSHEET \
            --google.sheet $i \
            --google.sheet_fields _sc_source \
            --google.sheet_fields description \
            --google.sheet_fields href \
            --google.sheet_fields keyword \
            --google.skip_empty \
            --csv.skip_empty \
            --csv.filename $DATA_DIR/results-$i-${DATE}.csv \
            $@
done

# $1 == keyword, $2 == city, $3 == county, $4 == country, $5 == $@
keyword_by_city(){
  echo
  echo "Searching for city/keyword: ${2}/${1}"
  echo
  $(npm bin)/sugarcube -c configs/elasticsearch-staging.json \
            -Q elastic_query:'{"query": {"bool": {"must": [{"match_phrase": {"href_text": "'"$1"'"}},{"match_phrase": {"href_text": "'"$2"'"}}]}}}' \
            -Q workflow_merge:'{"city":"'"$2"'","county":"'"$3"'","country":"'"$4"'","keyword":"'"$1"'"}' \
            -p elastic_import,workflow_merge,csv_export,sheets_append \
            --csv.skip_empty \
            --csv.filename $DATA_DIR/results-$2-$3-$1-${DATE}.csv \
            --google.spreadsheet_id $CITIES_SPREADSHEET \
            --google.sheet "$2 ($3)" \
            --google.sheet_fields _sc_source \
            --google.sheet_fields description \
            --google.sheet_fields href \
            --google.sheet_fields keyword \
            --google.sheet_fields city \
            --google.sheet_fields county \
            --google.sheet_fields country \
            --google.skip_empty \
            $5
}

# $1 == keyword, $2 == council, $3 == $@
keyword_by_council(){
  echo
  echo "Searching for council/keyword: ${2}/${1}"
  echo
  $(npm bin)/sugarcube -c configs/elasticsearch-staging.json \
            -Q elastic_query:'{"query": {"bool": {"must": [{"match_phrase": {"href_text": "'"$1"'"}},{"match_phrase": {"href_text": "'"$2"'"}}]}}}' \
            -Q workflow_merge:'{"council":"'"$2"'","keyword":"'"$1"'"}' \
            -p elastic_import,workflow_merge,csv_export,sheets_append \
            --csv.skip_empty \
            --csv.filename $DATA_DIR/results-$2-$1-${DATE}.csv \
            --google.spreadsheet_id $COUNCILS_SPREADSHEET \
            --google.sheet "$2" \
            --google.sheet_fields _sc_source \
            --google.sheet_fields description \
            --google.sheet_fields href \
            --google.sheet_fields keyword \
            --google.sheet_fields council \
            --google.skip_empty \
            $3
}

(
  for keyword in $(csvcut -c term $DATA_DIR/queries-keywords-${DATE}.csv | sed "1 d" | tr '\n' ',')
  do
    while read -r city county country; do
      ((i=i%CONCURRENCY)); ((i++==0)) && wait
      keyword_by_city "$keyword" "$city" "$county" "$country" "$@" &
    done < <(csvcut -c term,county,country $DATA_DIR/queries-cities-${DATE}.csv | sed "1 d")
  done
)

(
  for keyword in $(csvcut -c term $DATA_DIR/queries-keywords-${DATE}.csv | sed "1 d" | tr '\n' ',')
  do
    while read -r council; do
      ((i=i%CONCURRENCY)); ((i++==0)) && wait
      keyword_by_council "$keyword" "$council" "$@" &
    done < <(csvcut -c name $DATA_DIR/local-authorities.csv | sed "1 d")
  done
)
