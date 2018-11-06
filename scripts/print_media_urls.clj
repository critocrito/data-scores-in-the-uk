#!/usr/bin/env boot

(set-env! :source-paths #{"src"}
          :dependencies '[[org.clojure/clojure "1.8.0"]
                          [org.clojure/data.csv "0.1.4"]
                          [http-kit "2.2.0"]
                          [cheshire "5.8.0"]])

(require '[clojure.string :as string]
         '[scores.elastic :as elastic]
         '[scores.stats :as stats]
         '[scores.csv :as csv])

(def elastic-url "http://localhost:9200")
(def elastic-index "data-scores")

(defn -main
  [& args]
  (let [columns [:href :search_category]
        results (elastic/media-urls elastic-url elastic-index elastic/media-list-query)]
    (->> results
         (csv/print-csv columns))))
