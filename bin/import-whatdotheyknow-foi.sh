#!/bin/bash
DATE=$(date +%Y-%m-%d)

doit() {
  "$(npm bin)"/sugarcube -c pipelines/whatdotheyknow.json \
              -Q workflow_merge:'{"search_batch":["foi"]}' \
              -d

}

echo "Importing FOI requests."

doit | tee -a ./logs/whatdotheyknow-foi-request-"$DATE".log
