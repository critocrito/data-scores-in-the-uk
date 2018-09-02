#!/bin/sh
DATE=$(date +%Y-%m-%d)
IFS=$'\n'
set -f
SEARCH_TERMS="./queries/media-queries.txt"

doit() {
  "$(npm bin)"/sugarcube -c pipelines/search-duckduckgo.json \
              -Q ddg_search:"$1" \
              -Q tika_location_field:href \
              -Q workflow_merge:'{"search_batch":["media website"]}' \
              -d

}
export -f doit

echo "Starting media website queries"

# parallel -a $SEARCH_TERMS -l 1 -j 1 -k doit | tee -a
# ./logs/ddg-media-"$DATE".log
for i in $(cat < "$SEARCH_TERMS");
do
  doit "$i" | tee -a ./logs/ddg-media-"$DATE".log
done
