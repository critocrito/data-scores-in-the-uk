#!/usr/bin/env boot

(set-env! :source-paths #{"src"}
          :dependencies '[[org.clojure/clojure "1.8.0"]
                          [org.clojure/data.csv "0.1.4"]
                          [http-kit "2.2.0"]
                          [cheshire "5.8.0"]])

(require '[clojure.string :as string]
         '[scores.stats :as stats]
         '[scores.csv :as csv])

(def elastic-url "http://localhost:9200/data-scores")

(defn -main
  [& args]
  (let [columns [:name :count :companies :systems]
        counts (stats/count-by-nested-field elastic-url :authorities)]
    (->> counts
         (map #(merge % {:companies (string/join ";" (:companies %))
                         :systems (string/join ";" (:systems %))}))
         (sort-by :count)
         reverse
         (csv/print-csv columns))))
