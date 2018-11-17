#!/usr/bin/env boot

(set-env! :source-paths #{"src"}
          :dependencies '[[org.clojure/clojure "1.8.0"]
                          [http-kit "2.2.0"]
                          [cheshire "5.8.0"]
                          [com.cemerick/url "0.1.1"]])

(require '[cemerick.url :refer (url)]
         '[scores.elastic :as elastic]
         '[scores.http :as http])

(def elastic-url "http://localhost:9200/data-scores")

(defn -main
  [& args]
  (let [auxiliary-websites (elastic/auxiliary-websites elastic-url)]
    (doall (map (fn [document]
                  (let [{:keys [_id _source]} document
                        {:keys [href]} _source
                        host (:host (url href))
                        batch (cond
                                (re-matches #".*nhs.uk$" host) ".nhs.uk"
                                (re-matches #".*police.uk$" host) ".police.uk"
                                (re-matches #".*mod.uk$" host) ".mod.uk"
                                (re-matches #".*sch.uk$" host) ".sch.uk"
                                :else "unknown")]
                    (when (= batch "unknown") (println (str "Unknown URL: " href)))

                    (->> {:doc {:search_batch [batch]}}
                         http/map->json-str
                         (#(assoc {:method :post
                                   :url (str elastic-url "/units/" _id "/_update")
                                   :headers {"Content-Type" "application/json"}}
                                  :body %))
                         http/make-http-call)))
                auxiliary-websites))))
