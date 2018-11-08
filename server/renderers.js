import mustache from "mustache";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = join(__dirname, "../templates");

// Build map of template name => html (mustache) content.
const TEMPLATES = ["base", "header", "index", "package"].reduce(
  (map, filename) => {
    map[filename] = readFileSync(
      join(ROOT_DIR, `${filename}.mustache`)
    ).toString("utf-8");
    return map;
  },
  {}
);

// Pre-parse all templates.
Object.values(TEMPLATES).forEach((t) => mustache.parse(t));

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
export async function renderIndex(params, opts) {
  const { contentOnly = false } = opts;
  const rendered = contentOnly
    ? mustache.render(TEMPLATES.index, params, { package: TEMPLATES.package })
    : renderBase(TEMPLATES.index, params);
  return rendered;
}

/** Renders the base template with content partial provided. */
function renderBase(contentTemplate, params) {
  return mustache.render(TEMPLATES.base, params, {
    head: TEMPLATES.head,
    header: TEMPLATES.header,
    content: contentTemplate,
    package: TEMPLATES.package,
  });
}
