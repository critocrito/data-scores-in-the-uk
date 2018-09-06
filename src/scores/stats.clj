(ns scores.stats)

(require '[clojure.string :refer (join)]
         '[scores.elastic :as elastic]
         '[scores.csv :as csv])

(defn count-docs-for-departments
  "Generate document count stats per department."
  [host port]
  (let [docs (elastic/documents-with-departments host port)
        xform (comp (map :_source) (map :departments) (mapcat identity))
        departments (transduce xform conj docs)]
    (->> departments
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
          {})
         vals)))
