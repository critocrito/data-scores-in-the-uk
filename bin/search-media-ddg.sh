#!/bin/bash
DATE=$(date +%Y-%m-%d)
IFS=$'\n'
set -f
SEARCH_TERMS="./queries/media-queries.txt"
counter=0

doit() {
  "$(npm bin)"/sugarcube -c pipelines/search-duckduckgo.json \
              -Q ddg_search:"$1" \
              -Q tika_location_field:href \
              -Q workflow_merge:'{"search_batch":["media website"]}' \
              -d

}
export -f doit

echo "Starting media website queries"

for i in $(cat < "$SEARCH_TERMS");
do
  if [[ $((counter % 20)) -eq 0 ]]; then
    echo "Processed $counter queries"
  fi

  doit "$i" | tee -a ./logs/ddg-media-"$DATE".log
  counter=$((counter+1))
done
