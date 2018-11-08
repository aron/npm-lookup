const Mustache = require('mustache');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../templates');

// Build map of template name => html (mustache) content.
const TEMPLATES = ['base', 'header', 'index', 'package'].reduce((map, filename) => {
  map[filename] = fs.readFileSync(path.join(ROOT_DIR, `${filename}.mustache`)).toString('utf-8');
  return map;
}, {});

// Pre-parse all templates.
Object.values(TEMPLATES).forEach(t => Mustache.parse(t));

/**
 * Renders the index mustache template.
 *   package: The root package to render.
 *   query: The current search query.
 *   isPkgNotFound: True if the package does not exist.
 * 
 * The opts.contentOnly flag can be provided to only render the page content
 * and omit the rest of the page. This is useful for returning new content
 * to the browser via ajax.
 */
exports.renderIndex = async function renderIndex(params, opts) {
  const {contentOnly=false} = opts;
  const rendered = contentOnly ?
      Mustache.render(TEMPLATES.index, params, {package: TEMPLATES.package}) :
      renderBase(TEMPLATES.index, params);
  return rendered;
};

/** Renders the base template with content partial provided. */
function renderBase(contentTemplate, params) {
  return Mustache.render(TEMPLATES.base, params, {
    head: TEMPLATES.head,
    header: TEMPLATES.header,
    content: contentTemplate,
    package: TEMPLATES.package,
  });
}