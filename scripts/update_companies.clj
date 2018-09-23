#!/usr/bin/env boot

(set-env! :source-paths #{"src"}
          :dependencies '[[http-kit "2.2.0"]
                          [cheshire "5.8.0"]
                          [com.cemerick/url "0.1.1"]])

(require '[scores.core :as core]
         '[scores.elastic :as elastic])

(def elastic-url "http://localhost:9200/data-scores")

(def companies (core/read-txt "./queries/companies.txt"))

(defn -main
  [& args]
  (->> companies
       (elastic/zip-by-mentions elastic-url)
       ((fn [results] (doall (map #(elastic/update-mentions elastic-url :companies %) results))))))
