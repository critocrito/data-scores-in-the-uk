#!/bin/sh
DATE=$(date +%Y-%m-%d)
SEARCH_TERMS="./queries/search-terms.txt"
counter=0

doit() {
  "$(npm bin)"/sugarcube -c pipelines/search-duckduckgo.json \
              -Q tika_location_field:href \
              -q "$1" \
              -d
}

echo "Starting government website queries"

while IFS='\n' read -r i
do
  if [ $((counter % 20)) -eq 0 ]; then
    echo "Processed $counter queries"
  fi

  echo "$i,,gov.uk" | jq --slurp \
                         --raw-input \
                         --arg q "'" \
                         'split("\n")[:-1] |
                         map(split(",,") |
                         [{type: "workflow_merge",
                          term: {
                            search_batch: ["government"],
                            search_category: [.[0]]
                           }}, {
                           type: "ddg_search",
                           term: "\($q)\(.[0])\($q) site:\(.[1])"
                          }]
                         ) |
                         flatten' > q.json

  doit "q.json" | tee -a ./logs/ddg-gov-"$DATE".log

  WAIT_TIME=$(( ( RANDOM % 300)  + 120 ))
  echo "Sleeping for $WAIT_TIME seconds."
  sleep $WAIT_TIME
  counter=$((counter+1))
done < "$SEARCH_TERMS"
