(set-env! :source-paths #{"src"}
          :resource-paths #{"src"}
          :dependencies '[[org.clojure/data.csv "0.1.4"]
                          [enlive "1.1.6"]
                          [http-kit "2.2.0"]
                          [com.cemerick/url "0.1.1"]])

(deftask cider "CIDER profile"
  []
  (require 'boot.repl)
  (swap! @(resolve 'boot.repl/*default-dependencies*)
         concat '[[org.clojure/tools.nrepl "0.2.13"]
                  [cider/cider-nrepl "0.18.0"]])
  (swap! @(resolve 'boot.repl/*default-middleware*)
         concat '[cider.nrepl/cider-middleware])
  identity)
