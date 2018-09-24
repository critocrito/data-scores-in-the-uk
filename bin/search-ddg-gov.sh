#!/bin/sh
DATE=$(date +%Y-%m-%d)
IFS=$'\n'
set -f
SEARCH_TERMS="./queries/search-terms.txt"
counter=0

doit() {
  "$(npm bin)"/sugarcube -c pipelines/search-duckduckgo.json \
              -Q ddg_search:'"'"$1"'" site:gov.uk' \
              -Q tika_location_field:href \
              -Q workflow_merge:'{"search_batch":["government website"],"search_category":["'"$1"'"]}' \
              -d

}

export -f doit

echo "Starting government website queries"

for i in $(cat < "$SEARCH_TERMS")
do
  if [[ $((counter % 20)) -eq 0 ]]; then
    echo "Processed $counter queries"
  fi

  doit "$i" | tee -a ./logs/ddg-gov-"$DATE".log

  WAIT_TIME=$(( ( RANDOM % 300)  + 120 ))
  echo "Sleeping for $WAIT_TIME seconds."
  sleep $WAIT_TIME
  counter=$((counter+1))
done
