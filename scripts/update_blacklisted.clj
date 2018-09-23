#!/usr/bin/env boot

(set-env! :source-paths #{"src"}
          :dependencies '[[http-kit "2.2.0"]
                          [cheshire "5.8.0"]])

(require '[scores.core :as core]
         '[scores.elastic :as elastic])

(def elastic-url "http://localhost:9200/data-scores")

(def blacklisted (core/read-txt "./queries/blacklist.txt"))

(defn -main
  [& args]
  (->> blacklisted
       (elastic/by-ids elastic-url)
       (map #(assoc {} :id (:_id %)))
       (map #(merge % {:doc {:blacklisted true}}))
       (elastic/update-documents elastic-url)))
