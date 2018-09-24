#!/usr/bin/env boot

(set-env! :source-paths #{"src"}
          :dependencies '[[org.clojure/clojure "1.8.0"]
                          [org.clojure/data.csv "0.1.4"]
                          [http-kit "2.2.0"]
                          [cheshire "5.8.0"]])

(require '[scores.elastic :as elastic]
         '[scores.csv :as csv])

(def elastic-url "http://localhost:9200/data-scores")

(defn -main
  [& args]
  (let [columns [:name :count]
        counts (elastic/mention-stats elastic-url :systems)]
    (->> counts
         (map (fn [row] (merge (assoc {} :count (:doc_count row))
                              (assoc {} :name (:key row)))))
         (sort-by :count)
         reverse
         (csv/print-csv columns))))
