#!/usr/bin/env boot

(set-env! :source-paths #{"src"}
          :dependencies '[[http-kit "2.2.0"]
                          [cheshire "5.8.0"]
                          [com.cemerick/url "0.1.1"]])

(require '[clojure.string :as string]
         '[cheshire.core :refer [parse-string]]
         '[cemerick.url :refer [url]]
         '[scores.http :as http])

(def mappings-file "./configs/mappings.json")

(defn -main
  [& [from to]]
  (let [from-url (url from)
        to-url (url to)
        to-host (string/join ":" [(:host to-url) (:port to-url)])
        from-host (string/join ":" [(:host from-url) (:port from-url)])
        from-index (string/replace (:path from-url) #"(^/|/$)" "")
        to-index (string/replace (:path to-url) #"(^/|/$)" "")
        mappings (slurp mappings-file)
        mappings-request {:method :put
                          :url to
                          :headers {"Content-Type" "application/json"}
                          :body mappings}
        reindex-request {:method :post
                         :url (string/join ["http://" (string/join [to-host "/_reindex"])])
                         :headers {"Content-Type" "application/json"}
                         :body (http/map->json-str
                                {:source
                                 {:remote
                                  {:host (string/join ["http://" from-host])
                                   :socket_timeout "1m"
                                   :connect_timeout "30s"}
                                  :size 100
                                  :index from-index}
                                 :dest
                                 {:index to-index}})}]
    (http/make-http-call mappings-request)
    (http/make-http-call reindex-request)))
