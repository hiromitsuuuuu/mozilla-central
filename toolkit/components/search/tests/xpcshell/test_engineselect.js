/* Any copyright is dedicated to the Public Domain.
 *    http://creativecommons.org/publicdomain/zero/1.0/ */

/*
 * Test that currentEngine and defaultEngine properties can be set and yield the
 * proper events and behavior (search results)
 */

"use strict";

const Ci = Components.interfaces;

Components.utils.import("resource://testing-common/httpd.js");

let waitForEngines = {
  "Test search engine": 1,
  "A second test engine": 1
};

function search_observer(aSubject, aTopic, aData) {
  let engine = aSubject.QueryInterface(Ci.nsISearchEngine);
  do_print("Observer: " + aData + " for " + engine.name);

  if (aData != "engine-added") {
    return;
  }

  // If the engine is defined in `waitForEngines`, remove it from the list
  if (waitForEngines[engine.name]) {
    delete waitForEngines[engine.name];
  } else {
    // This engine is not one we're waiting for, so bail out early.
    return;
  }

  // Only continue when both engines have been loaded.
  if (Object.keys(waitForEngines).length)
    return;

  let search = Services.search;

  let engine1 = search.getEngineByName("Test search engine");
  let engine2 = search.getEngineByName("A second test engine");

  search.defaultEngine = engine1;
  do_check_eq(search.defaultEngine.name, "Test search engine");
  do_check_eq(search.defaultEngine.searchForm, "http://www.google.com/");
  
  // Tests search defaultEngine when it changes
  search.defaultEngine = engine2
  do_check_eq(search.defaultEngine.name, "A second test engine");
  do_check_eq(search.defaultEngine.searchForm, "https://duckduckgo.com");

  // Test search defaultEngine again when we change back
  search.defaultEngine = engine1;
  do_check_eq(search.defaultEngine.name, "Test search engine");
  do_check_eq(search.defaultEngine.searchForm, "http://www.google.com/");

  // Test search defaultEngine when the current default is hidden
  search.moveEngine(engine2, 0)
  engine1.hidden = true;
  do_check_eq(search.defaultEngine.name, "A second test engine");
  do_check_eq(search.defaultEngine.searchForm, "https://duckduckgo.com");
  
  // Test search defaultEngine when it is set to a hidden engine
  search.defaultEngine = engine1;
  do_check_eq(search.defaultEngine.name, "A second test engine");
  do_check_eq(search.defaultEngine.searchForm, "https://duckduckgo.com");

  do_test_finished();
}

function run_test() {
  removeMetadata();
  updateAppInfo();

  let httpServer = new HttpServer();
  httpServer.start(4444);
  httpServer.registerDirectory("/", do_get_cwd());

  do_register_cleanup(function cleanup() {
    httpServer.stop(function() {});
    Services.obs.removeObserver(search_observer, "browser-search-engine-modified");
  });

  do_test_pending();

  Services.obs.addObserver(search_observer, "browser-search-engine-modified", false);

  Services.search.addEngine("http://localhost:4444/data/engine.xml",
                            Ci.nsISearchEngine.DATA_XML,
                            null, false);
  Services.search.addEngine("http://localhost:4444/data/engine2.xml",
                            Ci.nsISearchEngine.DATA_XML,
                            null, false);
}
