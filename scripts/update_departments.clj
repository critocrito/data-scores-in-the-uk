#!/usr/bin/env boot

(set-env! :source-paths #{"src"}
          :dependencies '[[org.clojure/clojure "1.8.0"]
                          [org.clojure/data.csv "0.1.4"]
                          [http-kit "2.2.0"]
                          [cheshire "5.8.0"]])

(require '[clojure.string :as string]
         '[scores.elastic :as elastic]
         '[scores.core :as core]
         '[scores.csv :as csv])

(def elastic-url "http://localhost:9200/data-scores")

(def companies (core/read-txt "./queries/companies.txt"))
(def systems (core/read-txt "./queries/systems.txt"))
(def departments (map :Name (csv/read-csv "./queries/public-bodies.csv")))

(def departments-companies (core/permutations departments companies))
(def departments-systems (core/permutations departments systems))

(defn -main
  [& args]
  (let [mentions-companies (elastic/zip-by-mentions elastic-url departments-companies)
        mentions-systems (elastic/zip-by-mentions elastic-url departments-systems)]
    (doall (map #(elastic/update-nested-document elastic-url :departments :companies %)
                mentions-companies))
    (doall (map #(elastic/update-nested-document elastic-url :departments :systems %)
                mentions-systems))))
