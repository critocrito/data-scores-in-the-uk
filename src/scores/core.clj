(ns scores.core
  (:require [clojure.string :as string]))

(defn permutations
  "Take two collections and create permutations of all elements."
  [v1 v2]
  (vec (mapcat (fn [e] (map #(vector e %) v2)) v1)))

(defn read-txt
  "Read a txt file and return a vector with one line for every element."
  [file]
  (string/split (slurp file) #"\n"))
