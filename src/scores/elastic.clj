(ns scores.elastic
  (:require [scores.http :as http]))

(def document-sources
  ["departments"])

(def documents-with-departments-query
  {:_source document-sources
   :size 1000
   :query
   {:nested
    {:path "departments"
     :query
     {:exists {:field "departments"}}}}})

(defn documents-with-departments
  "Fetch all documents mentioning a department."
  [host port]
  (let [url (format "http://%s:%s/_search" host port)
        response (http/make-http-call {:method :get
                                       :url url
                                       :headers {"Content-Type" "application/json"}
                                       :body (http/map->json-str documents-with-departments-query)})]
    (get-in response [:hits :hits])))
