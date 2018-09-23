#!/usr/bin/env boot

(set-env! :source-paths #{"src"}
          :dependencies '[[org.clojure/clojure "1.8.0"]
                          [http-kit "2.2.0"]
                          [cheshire "5.8.0"]
                          [com.cemerick/url "0.1.1"]])

(require '[scores.core :as core]
         '[scores.elastic :as elastic])

(def elastic-url "http://localhost:9200/data-scores")

(def systems (core/read-txt "./queries/systems.txt"))

(defn -main
  [& args]
  (->> systems
       (elastic/zip-by-mentions elastic-url)
       ((fn [results] (doall (map #(elastic/update-mentions elastic-url :systems %) results))))))
