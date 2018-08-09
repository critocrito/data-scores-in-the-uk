#!/bin/sh
DATE=$(date +%Y-%m-%d)
IFS=$','
SEARCH_TERMS="./materials/searchterms.csv"

for i in $(csvcut -c search_term $SEARCH_TERMS | sed "1 d" | tr '\n' ',')
do
  echo $i
  $(npm bin)/sugarcube -c pipelines/search-duckduckgo.json \
            -Q ddg_search:'"'"$i"'" site:gov.uk' \
            -Q tika_location_field:href \
            -Q workflow_merge:'{"search_batch":["government website"],"search_category":["'"$i"'"]}' \
            $@ | tee -a ./logs/search-ddg.log

  # WAIT_TIME=$(( ( RANDOM % 300)  + 120 ))
  # echo "Sleeping for $WAIT_TIME seconds."
  # sleep $WAIT_TIME
done
