(ns scores.stats)

(require '[clojure.string :refer (join)]
         '[scores.http :as http]
         '[scores.csv :as csv])

(def department-counts-query {:_source ["departments"]
                              :size 1000
                              :query
                              {:nested
                               {:path "departments"
                                :query
                                {:exists {:field "departments"}}}}})


(defn count-docs-for-departments
  "Generate document count stats per department."
  [url]
  (let [resp (http/make-http-call {:method :get
                                   :url (str url "/_search")
                                   :headers {"Content-Type" "application/json"}
                                   :body (http/map->json-str department-counts-query)})
        xform (comp (map :_source) (map :departments) (mapcat identity))
        departments (transduce xform conj (get-in resp [:hits :hits]))]
    (reduce
     (fn [memo department]
       (let [name (:name department)
             count (or (get-in memo [name :count]) 0)
             companies (or (get-in memo [name :companies]) [])
             systems (or (get-in memo [name :systems]) [])]
         (merge memo {name {:name name
                            :count (inc count)
                            :companies (vec (set (concat companies (:companies department))))
                            :systems (vec (set (concat systems (:systems department))))}})))
     {}
     departments)))

(defn departments-stats
  [url file]
  (let [columns [:name :count :companies :systems]]
    (->> url
         count-docs-for-departments
         vals
         (map #(merge % {:companies (join ";" (:companies %)) :systems (join ";" (:systems %))}))
         (sort-by :count)
         reverse
         (csv/write-csv file columns))))
