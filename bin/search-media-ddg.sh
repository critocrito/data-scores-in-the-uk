#!/bin/bash
DATE=$(date +%Y-%m-%d)
IFS=$'\n'
set -f
SEARCH_TERMS="./queries/search-terms.txt"
MEDIA_SITES=$1
counter=0

doit() {
  "$(npm bin)"/sugarcube -c pipelines/search-duckduckgo.json \
              -q "$1" \
              -Q tika_location_field:href \
              -d
}
export -f doit

echo "Starting media website queries"

for i in $(cat < "$SEARCH_TERMS")
do
  for j in $(cat < "$MEDIA_SITES")
  do
    if [[ $((counter % 20)) -eq 0 ]]; then
      echo "Processed $counter queries"
    fi

    echo "$i,,$j" | jq --slurp \
                       --raw-input \
                       --arg q "'" \
                       'split("\n")[:-1] |
                         map(split(",,") |
                         [{
                           search_batch: ["media website"],
                           search_category: [.[0]]
                          }, {
                           type: "ddg_search",
                           term: "\($q)\(.[0])\($q) site:\(.[1])"
                          }]
                         ) |
                         flatten' > q.json

    doit "q.json" | tee -a ./logs/ddg-media-"$DATE".log

    rm q.json

    WAIT_TIME=$(( ( RANDOM % 300)  + 120 ))
    echo "Sleeping for $WAIT_TIME seconds."
    sleep $WAIT_TIME
    counter=$((counter+1))
  done
done
