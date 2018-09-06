#!/usr/bin/env boot

(set-env! :source-paths #{"src"}
          :dependencies '[[org.clojure/data.csv "0.1.4"]
                          [http-kit "2.2.0"]
                          [cheshire "5.8.0"]])

(require '[clojure.string :as string]
         '[scores.csv :as csv]
         '[scores.http :as http]
         '[scores.core :as core])

(def elastic-url "http://localhost:9200/data-scores-dept")

(def companies (core/read-txt "./queries/companies.txt"))
(def systems (core/read-txt "./queries/systems.txt"))
(def departments
  (filter #(not (string/blank? %))
          (distinct (mapv :Owner (csv/read-csv "./queries/gov-uk-domain-names-filtered.csv")))))

(def departments-companies (core/permutations departments companies))
(def departments-systems (core/permutations departments systems))

(defn match-query
  [department mention]
  {:_source {:includes [:departments]}
   :query
   {:bool
    {:must
     [
      {:multi_match {:query department :type "phrase" :fields ["title" "description" "href_text"]}}
      {:multi_match {:query mention :type "phrase" :fields ["title" "description" "href_text"]}}]}}})


(defn ids-query
  [ids]
  {:_source {:includes [:departments]}
   :query
   {:ids
    {:values (vec ids)}}})

(defn find-matches
  "Match a department and a mention for all permutations."
  [mentions]
  (->> mentions
       (map (fn [[department key]]
              {:method :post
               :url (str elastic-url "/_search")
               :headers {"Content-Type" "application/json"}
               :body (http/map->json-str (match-query department key))}))
       (http/chunk-and-call 20)
       (map vector mentions)
       (map (fn [[mention response]] [mention (get-in response [:hits :hits])]))
       (filter (fn [[_ hits]] (> (count hits) 0)))))

(defn concat-dept
  [current new]
  (let [elem (first (filter #(= (:name new) (:name %)) current))]
    (if elem
      (let [{:keys [companies systems]} elem
            new-elem (merge new {:companies (vec (set (concat companies (:companies new))))
                                 :systems (vec (set (concat systems (:systems new))))})]
        (->> current
             (filter #(not= (:name new) (:name %)))
             (concat [new-elem])
             vec))
      (concat current [new]))))

(defn update-document
  "Update a document with a mention for a department and company/system."
  [type [[department mention] results]]
  (let [ids (map :_id results)
        current-results
        (get-in (http/make-http-call {:method :get
                                      :url (str elastic-url "/_search")
                                      :headers {"Content-Type" "application/json"}
                                      :body (http/map->json-str (ids-query ids))})
                [:hits :hits])
        docs
        (map (fn [result]
               (let [{:keys [_id _source]} result
                     {:keys [departments] :or {departments []}} _source
                     new-entry (merge {:name department :companies [] :systems []}
                                      {(keyword type) [mention]})
                     doc {:departments (concat-dept departments new-entry)}]
                 {:id _id :doc doc}))
             current-results)
        queries
        (map #(identity {:method :post
                         :url (str elastic-url "/units/" (:id %) "/_update")
                         :headers {"Content-Type" "application/json"}
                         :body (http/map->json-str {:doc (:doc %)})})
             docs)]
    (doall (http/chunk-and-call 20 queries))))

(defn -main
  [& args]
  (let [mentions-companies (find-matches departments-companies)
        mentions-systems (find-matches departments-systems)]
    (doall (map #(update-document "companies" %) mentions-companies))
    (doall (map #(update-document "systems" %) mentions-systems))))
