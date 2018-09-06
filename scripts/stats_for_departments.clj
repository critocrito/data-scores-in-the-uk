#!/usr/bin/env boot

(set-env! :source-paths #{"src"}
          :dependencies '[[org.clojure/data.csv "0.1.4"]
                          [http-kit "2.2.0"]
                          [cheshire "5.8.0"]])

(require '[clojure.string :refer (join)]
         '[scores.stats :as stats]
         '[scores.csv :as csv])


(defn -main
  [& args]
  (let [host "localhost"
        port 9200
        file "stats/departments.csv"
        columns [:name :count :companies :systems]
        counts (stats/count-docs-for-departments host port)]
    (->> counts
         (map #(merge % {:companies (join ";" (:companies %))
                         :systems (join ";" (:systems %))}))
         (sort-by :count)
         reverse
         (csv/write-csv file columns))))
