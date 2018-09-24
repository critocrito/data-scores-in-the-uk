#!/bin/bash
DATE=$(date +%Y-%m-%d)
IFS=$'\n'
set -f

doit() {
  "$(npm bin)"/sugarcube -c pipelines/import-files.json \
              -Q ddg_search:"$1" \
              -Q glob_pattern:materials/foi-requests/* \
              -Q workflow_merge:'{"search_batch":["foi"]}' \
              -d

}
export -f doit

echo "Importing FOI requests."

doit | tee -a ./logs/foi-request-files-"$DATE".log
