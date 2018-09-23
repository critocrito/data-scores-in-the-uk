#!/usr/bin/env boot

(set-env! :source-paths #{"src"}
          :resource-paths #{"src"}
          :dependencies '[[org.clojure/clojure "1.8.0"]
                          [org.clojure/data.csv "0.1.4"]])

(require  '[scores.csv :as csv])

(defn filter-for-departments
  "Filter the gov-uk domain name list to exclude councils."
  [coll]
  (let [r #"(?i) council$"]
    (filter #(->> %
                  :Owner
                  (re-find r)
                  not)
            coll)))

(defn -main
  [& args]
  (let [input "./queries/gov-uk-domain-names.csv"
        output "./queries/gov-uk-domain-names-filtered.csv"]
    (->> input
         csv/read-csv
         filter-for-departments
         (csv/write-csv output [(keyword "Domain Name") :Owner]))))
