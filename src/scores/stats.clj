(ns scores.stats)

(require '[scores.elastic :as elastic])

(defn count-by-nested-field
  "Generate document count stats per department."
  [elastic-url field]
  (let [docs (elastic/by-exists elastic-url (keyword field))
        xform (comp (map :_source) (map (keyword field)) (mapcat identity))
        results (transduce xform conj docs)]
    (->> results
         (reduce
          (fn [memo result]
            (let [name (:name result)
                  count (or (get-in memo [name :count]) 0)
                  companies (or (get-in memo [name :companies]) [])
                  systems (or (get-in memo [name :systems]) [])]
              (merge memo
                     {name
                      {:name name
                       :count (inc count)
                       :companies (vec (set (concat companies (:companies result))))
                       :systems (vec (set (concat systems (:systems result))))}})))
          {})
         vals)))
