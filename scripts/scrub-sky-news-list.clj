#!/usr/bin/env boot

(set-env! :source-paths #{"src"}
          :dependencies '[[org.clojure/clojure "1.8.0"]
                          [org.clojure/data.csv "0.1.4"]
                          [http-kit "2.2.0"]
                          [cheshire "5.8.0"]])

(require '[clojure.string :as string]
         '[scores.core :as core]
         '[scores.http :as http]
         '[scores.csv :as csv])

(def sky-news-list
  (map
   #(select-keys % [:name :link :systems :notes :extract])
   (csv/read-csv "./queries/sky-news-list.csv")))
(def coordinates (http/json-str->map (slurp "./queries/coordinates.json")))

(defn -main
  [& args]
  (doall (let [rows (map (fn [{:keys [name] :as entry}]
                           (let [coordinate ((keyword name) coordinates)]
                             (when-not coordinate
                               (println (string/join ["Missing coordinates for " name]))
                               (System/exit 0))
                             (merge entry {:location coordinate})))
                         sky-news-list)]
           (println (http/map->json-str rows)))))
