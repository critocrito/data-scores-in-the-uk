#!/bin/bash
DATE=$(date +%Y-%m-%d)
IFS=$'\n'
set -f
SEARCH_TERMS="./queries/search-terms.txt"
AUX_SITES="./queries/aux-sites.txt"
counter=0

doit() {
  "$(npm bin)"/sugarcube -c pipelines/search-duckduckgo.json \
              -Q ddg_search:'"'"$1"'" site:"'"$2"'"' \
              -Q tika_location_field:href \
              -Q workflow_merge:'{"search_batch":["auxiliary website"],"search_category":["'"$1"'"]}' \
              -d
}
export -f doit

echo "Starting auxiliary website queries"

for i in $(cat < "$SEARCH_TERMS")
do
  for j in $(cat < "$AUX_SITES")
  do
    if [[ $((counter % 20)) -eq 0 ]]; then
      echo "Processed $counter queries"
    fi

    doit "$i" "$j" | tee -a ./logs/ddg-auxiliary-"$DATE".log

    WAIT_TIME=$(( ( RANDOM % 300)  + 120 ))
    echo "Sleeping for $WAIT_TIME seconds."
    sleep $WAIT_TIME
    counter=$((counter+1))
  done
done
