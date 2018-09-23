#!/usr/bin/env boot

(set-env! :source-paths #{"src"}
          :dependencies '[[http-kit "2.2.0"]
                          [cheshire "5.8.0"]])

(require '[clojure.string :as string]
         '[scores.core :as core]
         '[scores.elastic :as elastic]
         '[scores.http :as http])

(def elastic-url "http://localhost:9200/data-scores")

(def companies (core/read-txt "./queries/companies.txt"))
(def systems (core/read-txt "./queries/systems.txt"))
(def authorities (core/read-txt "./queries/authorities.txt"))
(def coordinates (http/json-str->map (slurp "./queries/coordinates.json")))

(def authorities-companies (core/permutations authorities companies))
(def authorities-systems (core/permutations authorities systems))

(defn -main
  [& args]
  (let [mentions-companies (elastic/zip-by-mentions elastic-url authorities-companies)
        mentions-systems (elastic/zip-by-mentions elastic-url authorities-systems)]
    (doall (map (fn [[[name mention] docs]]
                  (let [coordinate ((keyword name) coordinates)]
                    (when-not coordinate
                      (println (string/join ["Missing coordinates for " name]))
                      (System/exit 0))
                    (elastic/update-nested-document elastic-url
                                                    :authorities
                                                    :companies
                                                    [[name mention] docs]
                                                    {:location coordinate})))
                mentions-companies))
    (doall (map (fn [[[name mention] docs]]
                  (let [coordinate ((keyword name) coordinates)]
                    (when-not coordinate
                      (println (string/join ["Missing coordinates for " name]))
                      (System/exit 0))
                    (elastic/update-nested-document elastic-url
                                                    :authorities
                                                    :systems
                                                    [[name mention] docs]
                                                    {:location coordinate})))
                mentions-systems))))
