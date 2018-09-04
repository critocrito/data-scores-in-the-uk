(ns scores.csv
  (:require [clojure.data.csv :as csv]
            [clojure.java.io :as io]))

(defn csv-data->maps
  "Convert csv data to a collection of maps."
  [csv-data]
  (map zipmap
       (->> (first csv-data)
            (map keyword)
            repeat)
       (rest csv-data)))

(defn maps->csv-data
  "Convert a collection of maps to csv."
  [columns coll]
  (mapv #(mapv % columns) coll))

(defn read-csv
  "Read csv data from a file and convert it to a collection of maps."
  [path]
  (with-open [reader (io/reader path)]
    (doall
     (csv-data->maps (csv/read-csv reader)))))

(defn write-csv
  "Convert a collection of maps to csv with columns and writes it to a file."
  [path columns coll]
  (let [headers (map name columns)
        rows (maps->csv-data columns coll)]
    (with-open [file (io/writer path)]
      (csv/write-csv file (cons headers rows)))))
