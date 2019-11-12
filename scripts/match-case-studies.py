#!/usr/bin/env python
from elasticsearch import Elasticsearch
import spacy
import json
from normality import collapse_spaces
from fingerprints import clean_entity_name
from os import path, listdir
from os.path import isfile, join
from slugify import slugify

es = Elasticsearch(["localhost:9200"])
nlp = spacy.load("xx_ent_wiki_sm")
nlp.max_length = 10000000
mypath = "materials/foi-requests/txt"

foi_requests = [f for f in listdir(mypath) if isfile(join(mypath, f))]

tags_to_ignore = [
    "Re",
    "Support",
    "Page 2",
    # "VAT",
    "Page 1 of 3 Duplicate",
    "Duplicate Page 3",
    "If",
    "PDF",
    "It",
    "Individual",
    "I",
    "I've",
    "I’ve",
    "You",
    "You've",
    "You’ve",
    "You're",
    "Their",
    "Someone",
    "Your",
    "To: Enquiries",
    "mailto:[FOI",
    "Any contracts relating to the system",
    "Any promototional material",
    "s",
    "isn't",
    "Yes",
    "Don't",
    "barrcrai@ie.ibm.com",
    "Total Points Coverage Starts Coverage Ends Months Unit SVP Price Unit Price Extended Amount",
    "Total Points & SVP Amount",
    "Notebook Concurrent User Annual SW Subscription & Support Renewal 12 Months",
    "Passport Advantage Customer Information IBM Renewal Contact Information",
    "Dear Data Justice Lab",
    "Dear Data Justice Lab Reference Number: GM/0259 Thank",
    "Dear Ms Redden Freedom of Information Act 2000",
    "Dear Ms Redden Thank",
    "Dear Sir",
    "Dear To",
    "Any",
    "Any briefing notes",
    "Any contracts relating to the systems",
    "Any data visualization",
    "Any information on safeguarding measures related to the systems",
    "Any promotional material",
    "Any questions or comments please",
    "Any questions or comments please contact",
    "Any reports or summaries related",
    "Any training manuals or materials",
    "http://ico.org.uk/concerns",
    "https://healthiermanchester.org/mcrec",
    "https://www.blpd.gov.uk/foi/foi.aspx",
    "https://www.durham.police.uk/About-Us/Freedom-of-information/General/Pages/FOI-Request.aspx If",
    "https://www.manchesterfire.gov.uk",
    "https://www.nesta.org.uk/blog/rise-and-r",
    "https://www.whatdotheyknow.com",
    "http://tna.europarchive.org/20091005114006/http://networks.nhs.uk/uploads/06/12/c",
    "http://www.datajusticelab.org",
    "http://www.kent.gov.uk/about-the-council/information-and-data/access-to-information",
    "http://www.ukauthority.com/news/7707/the-uprn-in-kents-public-health-drive",
    ".v This",
    "Question 1",
    "Question 1 4",
    "Question 1a",
    "Question 1: Durham Constabulary",
    "Question 1: Is HART",
    "Question 2: Who",
    "Question 3",
    "Question 4",
    "Question 5",
    "Question 5a",
    "Question 5: Durham Constabulary",
    "Question 6: Does",
    "Question 7: Has",
    "Questions 4",
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

for file in foi_requests:
    orig_file_name = path.splitext(file)[0]
    location = join("materials/foi-requests", orig_file_name)
    case_study = path.basename(path.splitext(file)[0])
    case_study = slugify(case_study)
    text = read_case_study(join(mypath, file))
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
        "query": {"term": {"location.keyword": location}},
        "size": 1,
        "_source": []
    }
    res = es.search("data-scores", body=query)
    document_id = res["hits"]["hits"][0]["_id"]

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

        for id in documents:
            if id == document_id:
                continue
            if entity not in matches:
                matches[entity] = []
            matches[entity].append(id)
            matches[entity] = list(set(matches[entity]))

    output[case_study] = matches

print(json.dumps(output))
