#!/usr/bin/env python
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk
import spacy
from normality import collapse_spaces
from fingerprints import clean_entity_name

es = Elasticsearch(["localhost:9200"])
nlp = spacy.load("xx_ent_wiki_sm")
nlp.max_length = 10000000

query = {
    "query": {
        "match_all": {}
    },
    "size": 7000,
    "_source": False
}

def clean_name(text):
    text = clean_entity_name(text)
    text = collapse_spaces(text)
    return text

res = es.search("data-scores", body=query)
total_documents = res["hits"]["total"]
results = res["hits"]["hits"]

def fetch_document(id):
    query = {
        "query": {
            "term": {
                "_id": id
            }
        },
        "_source": ["description", "href_text"]
    }
    res = es.search("data-scores", body=query)
    doc = res["hits"]["hits"][0]["_source"]
    text = doc["href_text"] if "href_text" in doc else ""
    desc = doc["description"] if "description" in doc else ""
    return {"description": desc, "text": text}

def fetch_tags(tags):
    ret = {}
    query = {
        "query": {
            "terms": {
                "entity": tags
            }
        }
    }
    res = es.search("data-scores-entities", body=query)
    if res["hits"]["total"] > 0:
        for hit in res["hits"]["hits"]:
            id = hit["_id"]
            entity = hit["_source"]["entity"]
            label = hit["_source"]["label"]
            documents = hit["_source"]["documents"]
            hit[entity] = {
                "id": id,
                "entity": entity,
                "label": label,
                "documents": documents
            }
    return ret

counter = 0

for hit in results:
    id = hit["_id"]
    document = fetch_document(id)
    tags = set()
    labels = {}
    doc = nlp(document["text"])
    for ent in doc.ents:
        ent_text = clean_name(ent.text)
        ent_label = ent.label_
        if ent_text == "":
            continue
        tags.add(ent_text)
        labels[ent_text] = ent_label
    doc = nlp(document["description"])
    for ent in doc.ents:
        ent_text = clean_name(ent.text)
        ent_label = ent.label_
        if ent_text == "":
            continue
        tags.add(ent_text)
        labels[ent_text] = ent_label

    documents_by_tag = fetch_tags(list(tags))
    bulk_data = []
    for tag in tags:
        if tag in documents_by_tag:
            documents_by_tag[tag]["documents"].append(id)
            bulk_data.append({
                "_id": documents_by_tag[tag]["documents"]["id"],
                "_op_type": "update",
                "_type": "_doc",
                "_index": "data-scores-entities",
                "_source": {
                    "entity": tag,
                    "label": labels[tag],
                    "documents": list(set(documents_by_tag[tag]["documents"]))
                }
            })
        else:
            bulk_data.append({
                "_type": "_doc",
                "_index": "data-scores-entities",
                "_source": {
                    "entity": tag,
                    "label": labels[tag],
                    "documents": [id]
                }
            })

    bulk(es, bulk_data)

    counter += 1
    print("Processed {} out of {} documents".format(counter, total_documents))
