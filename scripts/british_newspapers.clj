#!/usr/bin/env boot

(set-env! :dependencies '[[org.clojure/clojure "1.8.0"]
                          [enlive "1.1.6"]
                          [http-kit "2.2.0"]
                          [com.cemerick/url "0.1.1"]])

(require '[net.cgrand.enlive-html :as html]
         '[org.httpkit.client :as http]
         '[cemerick.url :refer (url)]
         '[clojure.string :as str])

(def front-page "https://www.britishpapers.co.uk")

(defn pmapcat [f batches]
  (->> batches
       (pmap f)
       (apply concat)
       doall))

(defn fetch
  [url]
  (html/html-snippet
   (:body @(http/get url))))

(defn links-by-area
  [dom]
  (mapcat #(html/attr-values % :href) (html/select dom [:#mycategoryorder-9 :li :a])))

(defn next-posts
  [dom]
  (mapcat #(html/attr-values % :href) (html/select dom [[:a (html/attr= :rel "next")]])))

(def newspaper-categories (comp links-by-area fetch))

(def fetch-next-entry (comp next-posts fetch))

(defn collect-pages
  [url]
  (let [[next-entry] (fetch-next-entry url)]
    (if (empty? next-entry)
      [url]
      (concat [url] (collect-pages next-entry)))))

(defn newspaper-details
  [url]
  (let [dom (fetch url)]
    (filter
     #(not (= "#container" %))
     (mapcat #(html/attr-values % :href) (html/select dom [:span :> :a])))))

(defn extract-website
  [url]
  (let [page (fetch url)]
    (first (map
            #(html/attr-values % :href)
            (html/select page [:#address :ul :li :> :a])))))

(defn prettify-url
  [u]
  (->
   u
   url
   (:host)
   (str/replace #"^www\." "")))

(defn -main
  [& args]
  (let [urls (->>
              front-page
              (newspaper-categories)
              (pmapcat collect-pages)
              (pmapcat newspaper-details)
              (pmapcat extract-website))]
    (doall (map println (->> urls
                             (filter #(not (= "itemprop=" %)))
                             (map prettify-url)
                             (distinct)
                             (sort))))))
