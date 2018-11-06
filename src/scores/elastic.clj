(ns scores.elastic
  (:require [clojure.string :as string]
            [scores.core :as core]
            [scores.http :as http]))

(def tags
  "Names of attributes that tag documents."
  [:companies :systems :authorities :departments])

(def sources
  "Fields of documents that should be retrieved."
  (vec (concat [:title :description :href] tags)))

(def base-query
  {:_source sources
   :size 3000})

(def media-list-query
  {:_source [:href :search_category]
   :size 1000
   :sort [:_doc]
   :query {:match {:search_batch "media website"}}})

(def tagged-media-list-query
  {:_source [:href :search_category]
   :size 1000
   :query
   {:bool
    {:must [{:match {:search_batch "media website"}}
            {:bool {:should [{:exists {:field "companies"}}
                             {:exists {:field "systems"}}
                             {:nested {:path "departments"
                                       :query {:bool {:must [{:exists {:field "departments"}}]}}}}
                             {:nested {:path "authorities"
                                       :query {:bool {:must [{:exists {:field "authorities"}}]}}}}]}}]}}
   :sort [:_doc]})

(defn exists-query
  "Query documents that contain a field."
  [& rest]
  (let [simple-query (fn [field] {:exists {:field field}})
        nested-query
        (fn [field] {:nested {:path field :query {:exists {:field field}}}})]
    (merge base-query
           {:query {:bool {:must (vec (for [field rest]
                                        (if (or (= (keyword field) :authorities)
                                                (= (keyword field) :departments))
                                          (nested-query field)
                                          (simple-query field))))}}})))

(defn mentions-query
  "Match one or more tags in all documents."
  [& rest]
  (merge base-query
         {:query
          {:bool
           {:must
            (vec (for [tag rest]
                   {:multi_match
                    {:query tag
                     :type "phrase"
                     :fields ["title" "description" "href_text"]}}))
            :must_not {:term {:blacklisted true}}}}}))

(defn ids-query
  "Query documents by one or more ids."
  [ids]
  (let [values (vec (if (sequential? ids) ids [ids]))]
    (merge base-query {:query {:ids {:values values}}})))

(defn stats-query
  "Query stats of mentions."
  [type]
  {:size 0
   :aggs
   {(keyword type)
    {:terms
     {:size 100
      :field (string/join [(name type) ".keyword"])}}}})

(defn by-ids
  "Fetch documents by ids."
  [elastic-url ids]
  (let [query (ids-query ids)]
    (->> query
         http/map->json-str
         (#(assoc {:method :get
                   :url (str elastic-url "/_search")
                   :headers {"Content-Type" "application/json"}}
                  :body %))
         http/make-http-call
         (#(get-in % [:hits :hits])))))

(defn by-exists
  "Fetch documents where sttributes exist."
  [elastic-url & fields]
  (let [query (apply exists-query fields)]
    (->> query
         http/map->json-str
         (#(assoc {:method :get
                   :url (str elastic-url "/_search")
                   :headers {"Content-Type" "application/json"}}
                  :body %))
         http/make-http-call
         (#(get-in % [:hits :hits])))))

(defn zip-by-mentions
  "Match mentions."
  [elastic-url mentions]
  (->> mentions
       (map (fn [mention]
              (let [query (if (sequential? mention)
                            (apply mentions-query mention)
                            (mentions-query mention))]
                {:method :post
                 :url (str elastic-url "/_search")
                 :headers {"Content-Type" "application/json"}
                 :body (http/map->json-str query)})))
       (http/chunk-and-call 20)
       (map vector mentions)
       (map (fn [[mention response]] [mention (get-in response [:hits :hits])]))
       (filter (fn [[_ hits]] (> (count hits) 0)))))

(defn update-documents
  "Update documents."
  [elastic-url docs]
  (->> docs
       (map #(identity {:method :post
                        :url (str elastic-url "/units/" (:id %) "/_update")
                        :headers {"Content-Type" "application/json"}
                        :body (http/map->json-str {:doc (:doc %)})}))
       (http/chunk-and-call 20)))

(defn update-mentions
  "Update a document with a mention."
  [elastic-url type [mention sources]]
  (let [ids (map :_id sources)
        hits (by-ids elastic-url ids)
        docs (map (fn [hit]
                    (let [{:keys [_id _source]} hit
                          mentions (or ((keyword type) _source) [])
                          tags (core/concat-uniq mentions mention)
                          doc (merge _source {(keyword type) tags})]
                      {:id _id :doc doc}))
                  hits)]
    (println (string/join ["Updating " (count docs) " documents for: " mention]))
    (update-documents elastic-url docs)))

(defn update-nested-document
  "Update a document with a mention for a nested field."
  [elastic-url nested-field type [[name mention] sources] & [extra]]
  (let [static-fields (or extra {})
        ids (map :_id sources)
        hits (by-ids elastic-url ids)
        docs (map (fn [result]
                    (let [{:keys [_id _source]} result
                          entries (or ((keyword nested-field) _source) [])
                          base-entry (merge {:name name :companies [] :systems []} static-fields)
                          entry (merge base-entry {(keyword type) [mention]})
                          doc {(keyword nested-field) (core/concat-nested-uniq entries entry)}]
                      {:id _id :doc doc}))
                  hits)]
    (println (string/join ["Updating " (count docs) " documents for: " name "/" mention]))
    (update-documents elastic-url docs)))

(defn scrolled-request
  [elastic-url result scroll-id]
  (let [query {:scroll "1m" :scroll_id scroll-id}
        [id hits] (->> query
                       http/map->json-str
                       (#(assoc {:method :post
                                 :url (str elastic-url "/_search/scroll")
                                 :headers {"Content-Type" "application/json"}}
                                :body %))
                       http/make-http-call
                       ((fn [resp] [(get-in resp [:_scroll_id]) (get-in resp [:hits :hits])])))]

    (if (not-empty hits)
      (recur elastic-url (conj result hits) id)
      (vec (flatten result)))))

(defn mention-stats
  "Fetch stats for a type of mention."
  [elastic-url type]
  (let [query (stats-query type)]
    (->> query
         http/map->json-str
         (#(assoc {:method :get
                   :url (str elastic-url "/_search")
                   :headers {"Content-Type" "application/json"}}
                  :body %))
         http/make-http-call
         (#(get-in % [:aggregations (keyword type) :buckets])))))

(defn media-urls
  "List all urls and search batches from media websites."
  [elastic-url index initial-query]
  (let [[id hits] (->> initial-query
                       http/map->json-str
                       (#(assoc {:method :post
                                 :url (str elastic-url "/" index "/_search")
                                 :query-params {:scroll "1m"}
                                 :headers {"Content-Type" "application/json"}}
                                :body %))
                       http/make-http-call
                       ((fn [resp] [(get-in resp [:_scroll_id]) (get-in resp [:hits :hits])])))
        results (scrolled-request elastic-url hits id)]
    (map :_source results)))
