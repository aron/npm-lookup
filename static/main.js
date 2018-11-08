/* eslint-env browser */

// Core "pjax" functionality for the site, handles loading the search
// submissions via AJAX and avoiding a full page reload.
(function () {
  var main = document.querySelector("[role=main]");

  // Delegate submit events for the search form...
  document.body.addEventListener("submit", function (evt) {
    if (evt.target.matches("[data-search-form]")) {
      handleFormSubmit(evt);
    }
  });

  // Intercepts the search form submission and sends it via AJAX and replacing
  // the document content with the response.
  function handleFormSubmit(evt) {
    evt.preventDefault();
    main.innerHTML = "";

    var form = evt.target;
    var button = form.querySelector("button");
    var initialButtonContent = button.innerHTML;
    var query = `pkg=${encodeURIComponent(form.elements.pkg.value)}`;

    // Append query string to action
    var url = form.action + (form.action.indexOf("?") >= 0 ? "&" : "?") + query;

    var xhr = new XMLHttpRequest();
    xhr.open(form.method || "GET", url);
    xhr.setRequestHeader("XMLHTTPRequest", "true");
    xhr.responseType = "text";

    xhr.addEventListener("load", function () {
      form.querySelector("button").innerHTML = initialButtonContent;
      main.innerHTML = xhr.response;
    });

    xhr.addEventListener("error", function () {
      form.querySelector("button").innerHTML = initialButtonContent;
      // FIXME: Lazy, error handling, just try submitting the form again.
      form.submit();
    });
    xhr.send();

    button.textContent = "Searching…";

    history.pushState({}, "", "?" + query);
  }
})();
