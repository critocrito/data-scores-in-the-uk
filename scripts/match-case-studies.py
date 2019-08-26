#!/usr/bin/env python
from elasticsearch import Elasticsearch
import spacy
import json
from normality import collapse_spaces
from fingerprints import clean_entity_name
from os import path

es = Elasticsearch(["localhost:9200"])
nlp = spacy.load("xx_ent_wiki_sm")
nlp.max_length = 10000000

case_studies = [
    "case-studies/avon_and_somerset.txt",
    "case-studies/bristol.txt",
    "case-studies/camden.txt",
    "case-studies/hackney.txt",
    "case-studies/kent.txt",
    "case-studies/manchester.txt",
    "case-studies/mosaic.txt"
]

tags_to_ignore = [
    "",
    "s",
    "B",
    "Council",
    "It",
    "Individual",
    "I",
    "I've",
    "I’ve",
    "You",
    "You've",
    "You’ve",
    "Their",
    "Someone",
    "Access",
    "Importantly",
    "Performance",
    "Uses",
    "One",
    "Two",
    "Adult",
    "UK",
    "London",
    "Currently",
    "Safe",
    "Jan"
]

def clean_name(text):
    text = clean_entity_name(text)
    text = collapse_spaces(text)
    return text

def read_case_study(path):
    f = open(path)
    txt = f.read()
    f.close()
    return txt

output = {}

for file in case_studies:
    case_study = path.basename(path.splitext(file)[0])
    text = read_case_study(file)
    tags = set()
    doc = nlp(text)
    for ent in doc.ents:
        ent_text = clean_name(ent.text)
        if ent_text in tags_to_ignore:
            continue
        if ent_text == "s Fund":
            ent_text = "Fund"
        tags.add(ent_text)
    query = {
        "query": {
            "terms": {
                "entity.keyword": list(tags)
            }
        },
        "size": 1000
    }
    res = es.search("data-scores-entities", body=query)
    results = res["hits"]["hits"]

    matches = {}
    for hit in results:
        doc = hit["_source"]
        entity = doc["entity"]
        documents = doc["documents"]

        if entity not in matches:
            matches[entity] = []

        for id in documents:
            matches[entity].append(id)
            matches[entity] = list(set(matches[entity]))

    output[case_study] = matches

print(json.dumps(output))
