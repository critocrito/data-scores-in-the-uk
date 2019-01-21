(ns scores.core
  (:require [clojure.string :as string]))

(defn permutations
  "Take two collections and create permutations of all elements."
  [v1 v2]
  (vec (mapcat (fn [e] (map #(vector e %) v2)) v1)))

(defn read-txt
  "Read a txt file and return a vector with one element for every line."
  [file]
  (string/split (slurp file) #"\n"))

(defn concat-uniq
  "Concatenate a unique element to a list."
  [list elem]
  (->> elem
       (conj list)
       set
       vec))

(defn concat-nested-uniq
  "Concatenate a unique element to a list for a nested field."
  [entries entry]
  (let [elem (first (filter #(= (:name entry) (:name %)) entries))]
    (if elem
      (let [{:keys [name companies systems] :or {:companies [] :systems []}} elem
            new-elem (merge elem
                            {:companies (reduce concat-uniq companies (:companies entry))
                             :systems (reduce concat-uniq systems (:systems entry))})]
        (->> entries
             (filter #(not= name (:name %)))
             (concat [new-elem])
             vec))
      (concat entries [entry]))))
