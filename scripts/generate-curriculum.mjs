import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_PATH = path.join(ROOT, 'apps', 'web', 'src', 'data', 'curriculum.json');
const CANONICAL_SOURCE_FILENAME = 'QVANTA_Full_Curriculum_Explained.html';
const EXPECTED_COUNTS = { modules: 527, parts: 39 };
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);
const KNOWN_ELEMENTS = new Set([
  'a',
  'b',
  'body',
  'br',
  'code',
  'details',
  'div',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'head',
  'header',
  'html',
  'li',
  'meta',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'span',
  'style',
  'summary',
  'title',
  'ul',
]);

class HtmlNode {
  constructor(type, tagName = '', attributes = {}) {
    this.type = type;
    this.tagName = tagName;
    this.attributes = attributes;
    this.children = [];
  }
}

function decodeHtmlEntities(value) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]+);/gi, (entity, reference) => {
    const lower = reference.toLowerCase();
    if (lower === 'amp') return '&';
    if (lower === 'lt') return '<';
    if (lower === 'gt') return '>';
    if (lower === 'quot') return '"';
    if (lower === 'apos') return "'";
    if (lower === 'nbsp') return '\u00a0';

    const codePoint = lower.startsWith('#x')
      ? Number.parseInt(lower.slice(2), 16)
      : lower.startsWith('#')
        ? Number.parseInt(lower.slice(1), 10)
        : Number.NaN;

    if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
      return entity;
    }

    try {
      return String.fromCodePoint(codePoint);
    } catch {
      return entity;
    }
  });
}

function findTagEnd(html, start) {
  let quote = null;
  for (let index = start + 1; index < html.length; index += 1) {
    const character = html[index];
    if (quote !== null) {
      if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return index;
    }
  }
  return -1;
}

function looksLikeHtmlTagStart(html, start) {
  const remainder = html.slice(start);
  if (/^<!--[\s\S]*?-->/u.test(remainder) || /^<![A-Z]/u.test(remainder) || /^<\?/u.test(remainder)) {
    return true;
  }

  const closing = remainder.match(/^<\s*\/\s*([A-Za-z][\w:-]*)\s*>/u);
  if (closing) return KNOWN_ELEMENTS.has(closing[1].toLowerCase());

  const opening = remainder.match(/^<\s*([A-Za-z][\w:-]*)(?=\s|\/?>)/u);
  return opening ? KNOWN_ELEMENTS.has(opening[1].toLowerCase()) : false;
}

function parseAttributes(rawAttributes) {
  const attributes = {};
  const attributePattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;

  while ((match = attributePattern.exec(rawAttributes)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    attributes[name] = decodeHtmlEntities(value);
  }

  return attributes;
}

function parseHtml(html) {
  const root = new HtmlNode('element', '#document');
  const stack = [root];
  let index = 0;

  while (index < html.length) {
    const nextTag = html.indexOf('<', index);
    if (nextTag === -1) {
      stack[stack.length - 1].children.push(html.slice(index));
      break;
    }

    if (nextTag > index) {
      stack[stack.length - 1].children.push(html.slice(index, nextTag));
      index = nextTag;
    }

    if (html.startsWith('<!--', index)) {
      const commentEnd = html.indexOf('-->', index + 4);
      index = commentEnd === -1 ? html.length : commentEnd + 3;
      continue;
    }

    if (!looksLikeHtmlTagStart(html, index)) {
      // A less-than sign in ordinary curriculum text can be followed by
      // quantum notation (for example, <psi|). Only recognize known HTML
      // elements so the following real closing tag remains parseable.
      stack[stack.length - 1].children.push('<');
      index += 1;
      continue;
    }

    const tagEnd = findTagEnd(html, index);
    if (tagEnd === -1) {
      throw new Error(`Unterminated HTML tag at character ${index}`);
    }

    const token = html.slice(index + 1, tagEnd);
    if (token.startsWith('!') || token.startsWith('?')) {
      index = tagEnd + 1;
      continue;
    }

    const closingMatch = token.match(/^\s*\/\s*([A-Za-z][\w:-]*)\s*$/);
    if (closingMatch) {
      const tagName = closingMatch[1].toLowerCase();
      let stackIndex = stack.length - 1;
      while (stackIndex > 0 && stack[stackIndex].tagName !== tagName) stackIndex -= 1;
      if (stackIndex === 0) {
        throw new Error(`Unexpected closing tag </${tagName}> at character ${index}`);
      }
      stack.length = stackIndex;
      index = tagEnd + 1;
      continue;
    }

    const openingMatch = token.match(/^\s*([A-Za-z][\w:-]*)([\s\S]*?)\/?\s*$/);
    if (!openingMatch) {
      // The source uses raw mathematical notation such as <0|0> in paragraph
      // text. If a less-than sign is not followed by an HTML tag name, keep it
      // as visible text and continue scanning instead of treating it as markup.
      stack[stack.length - 1].children.push('<');
      index += 1;
      continue;
    }

    const tagName = openingMatch[1].toLowerCase();
    if (!KNOWN_ELEMENTS.has(tagName)) {
      // Mathematical notation in the curriculum contains text such as
      // <psi| and <phi|psi>. These look tag-like but are not HTML elements.
      stack[stack.length - 1].children.push(`<${token}>`);
      index = tagEnd + 1;
      continue;
    }
    const rawAttributes = openingMatch[2].replace(/\/\s*$/, '');
    const node = new HtmlNode('element', tagName, parseAttributes(rawAttributes));
    stack[stack.length - 1].children.push(node);

    const selfClosing = /\/\s*$/.test(openingMatch[2]) || VOID_ELEMENTS.has(tagName);
    if (!selfClosing) stack.push(node);
    index = tagEnd + 1;
  }

  if (stack.length !== 1) {
    throw new Error(`Unclosed HTML element <${stack[stack.length - 1].tagName}>`);
  }

  return root;
}

function childElements(node) {
  return node.children.filter((child) => child instanceof HtmlNode && child.type === 'element');
}

function findAll(node, predicate, matches = []) {
  for (const child of childElements(node)) {
    if (predicate(child)) matches.push(child);
    findAll(child, predicate, matches);
  }
  return matches;
}

function findFirst(node, predicate) {
  for (const child of childElements(node)) {
    if (predicate(child)) return child;
    const match = findFirst(child, predicate);
    if (match) return match;
  }
  return null;
}

function hasClass(node, className) {
  return (node.attributes.class ?? '').split(/\s+/u).includes(className);
}

function rawTextContent(node) {
  let value = '';
  for (const child of node.children) {
    if (child instanceof HtmlNode) {
      value += child.tagName === 'br' ? '\n' : rawTextContent(child);
    } else {
      value += child;
    }
  }

  return value;
}

function textContent(node, preserveWhitespace = false) {
  const value = decodeHtmlEntities(rawTextContent(node)).replace(/\r\n?/gu, '\n');
  return preserveWhitespace ? value : value.replace(/\s+/gu, ' ').trim();
}

function parsePartLabel(label) {
  const match = label.match(/^Part\s+(\d+)\s*-\s*(.+)$/u);
  if (!match) throw new Error(`Invalid part label: ${JSON.stringify(label)}`);
  return { number: Number.parseInt(match[1], 10), title: match[2].trim() };
}

function parseParts(root) {
  const details = findAll(root, (node) => node.tagName === 'details');
  return details.map((detail) => {
    const summary = childElements(detail).find((child) => child.tagName === 'summary');
    if (!summary) throw new Error('Part navigation entry is missing its summary');
    return parsePartLabel(textContent(summary));
  });
}

function parseClaimedCounts(root) {
  const contentsHeading = findFirst(
    root,
    (node) => node.tagName === 'h2' && textContent(node).startsWith('Contents'),
  );
  if (!contentsHeading) throw new Error('Could not find the curriculum contents heading');

  const match = textContent(contentsHeading).match(/\((\d+)\s+parts?,\s*(\d+)\s+modules?\)/iu);
  if (!match) throw new Error(`Could not parse claimed counts from ${textContent(contentsHeading)}`);
  return { parts: Number.parseInt(match[1], 10), modules: Number.parseInt(match[2], 10) };
}

function parseBlock(node) {
  if (node.tagName === 'p') {
    return { type: 'paragraph', text: textContent(node) };
  }

  if (node.tagName === 'ul' || node.tagName === 'ol') {
    return {
      type: 'list',
      ordered: node.tagName === 'ol',
      items: childElements(node)
        .filter((child) => child.tagName === 'li')
        .map((item) => textContent(item)),
    };
  }

  if (node.tagName === 'pre') {
    return { type: 'pre', text: textContent(node, true) };
  }

  if (node.tagName === 'code') {
    return { type: 'code', text: textContent(node, true) };
  }

  throw new Error(`Unsupported module content element <${node.tagName}>`);
}

function parseModule(node, part) {
  const heading = childElements(node).find((child) => child.tagName === 'h3');
  if (!heading) throw new Error('Module section is missing its h3 title');

  const moduleMatch = (node.attributes.id ?? '').match(/^m(\d+)$/u);
  if (!moduleMatch) throw new Error(`Module section has an invalid id: ${node.attributes.id ?? '(none)'}`);

  const meta = childElements(node).find((child) => child.tagName === 'div' && hasClass(child, 'meta'));
  if (!meta) throw new Error(`Module ${moduleMatch[1]} is missing metadata`);

  const levelNode = findFirst(meta, (child) => hasClass(child, 'lvl'));
  const prerequisiteNode = findFirst(meta, (child) => hasClass(child, 'pre'));
  if (!levelNode || !prerequisiteNode) {
    throw new Error(`Module ${moduleMatch[1]} is missing level or prerequisite metadata`);
  }

  const sections = [];
  let currentSection = null;
  let checkpoint = null;

  for (const child of childElements(node)) {
    if (child === heading || child === meta) continue;

    if (child.tagName === 'h4') {
      currentSection = { heading: textContent(child), content: [] };
      sections.push(currentSection);
      continue;
    }

    if (child.tagName === 'div' && hasClass(child, 'chk')) {
      checkpoint = textContent(child);
      continue;
    }

    if (!currentSection) {
      throw new Error(`Module ${moduleMatch[1]} has content before its first h4 heading`);
    }
    currentSection.content.push(parseBlock(child));
  }

  const title = textContent(heading).replace(/^Module\s+\d+\s*[—-]\s*/u, '').trim();
  if (!title) throw new Error(`Module ${moduleMatch[1]} has an empty title`);

  const module = {
    id: Number.parseInt(moduleMatch[1], 10),
    title,
    partNumber: part.number,
    partTitle: part.title,
    level: textContent(levelNode),
    prerequisite: textContent(prerequisiteNode),
    sections,
  };
  if (checkpoint !== null) module.checkpoint = checkpoint;
  return module;
}

function buildCurriculum(html, filename) {
  const root = parseHtml(html);
  const titleNode = findFirst(root, (node) => node.tagName === 'title');
  if (!titleNode) throw new Error('Source HTML is missing its title element');

  const parts = parseParts(root);
  const claimedCounts = parseClaimedCounts(root);
  const partByNumber = new Map(parts.map((part) => [part.number, part]));
  const wrap = findFirst(root, (node) => node.tagName === 'div' && hasClass(node, 'wrap'));
  if (!wrap) throw new Error('Source HTML is missing the curriculum wrapper');

  const modules = [];
  let currentPart = partByNumber.get(0);
  if (!currentPart) throw new Error('Part 0 is missing from the source navigation');

  for (const child of childElements(wrap)) {
    if (child.tagName === 'h2' && hasClass(child, 'part-h')) {
      currentPart = parsePartLabel(textContent(child));
      if (!partByNumber.has(currentPart.number)) {
        throw new Error(`Part ${currentPart.number} appears in content but not navigation`);
      }
      continue;
    }

    if (child.tagName === 'section' && hasClass(child, 'mod')) {
      modules.push(parseModule(child, currentPart));
    }
  }

  const partRecords = parts.map((part) => ({
    number: part.number,
    title: part.title,
    moduleIds: modules.filter((module) => module.partNumber === part.number).map((module) => module.id),
  }));

  return {
    source: {
      filename: CANONICAL_SOURCE_FILENAME,
      title: textContent(titleNode),
      claimedCounts,
    },
    parts: partRecords,
    modules,
  };
}

function validateCurriculum(data) {
  const failures = [];
  const addFailure = (condition, message) => {
    if (!condition) failures.push(message);
  };

  addFailure(data && typeof data === 'object', 'generated curriculum must be an object');
  if (!data || typeof data !== 'object') throw new Error(failures.join('\n'));

  const modules = Array.isArray(data.modules) ? data.modules : [];
  const parts = Array.isArray(data.parts) ? data.parts : [];
  addFailure(modules.length === EXPECTED_COUNTS.modules, `expected ${EXPECTED_COUNTS.modules} modules, found ${modules.length}`);
  addFailure(parts.length === EXPECTED_COUNTS.parts, `expected ${EXPECTED_COUNTS.parts} parts, found ${parts.length}`);
  addFailure(data.source?.claimedCounts?.modules === EXPECTED_COUNTS.modules, 'source claimed module count must be 527');
  addFailure(data.source?.claimedCounts?.parts === EXPECTED_COUNTS.parts, 'source claimed part count must be 39');
  addFailure(typeof data.source?.filename === 'string' && data.source.filename.length > 0, 'source filename is required');
  addFailure(typeof data.source?.title === 'string' && data.source.title.length > 0, 'source title is required');

  modules.forEach((module, index) => {
    addFailure(module.id === index, `module ids must be sequential: expected ${index}, found ${module.id}`);
    addFailure(typeof module.title === 'string' && module.title.trim().length > 0, `module ${index} has an empty title`);
    addFailure(typeof module.partNumber === 'number', `module ${index} is missing a numeric part number`);
    addFailure(typeof module.partTitle === 'string' && module.partTitle.trim().length > 0, `module ${index} has an empty part title`);
    addFailure(typeof module.level === 'string' && module.level.trim().length > 0, `module ${index} has an empty level`);
    addFailure(typeof module.prerequisite === 'string' && module.prerequisite.trim().length > 0, `module ${index} has an empty prerequisite`);
    addFailure(Array.isArray(module.sections) && module.sections.length > 0, `module ${index} has no sections`);
    addFailure(
      module.checkpoint === undefined || (typeof module.checkpoint === 'string' && module.checkpoint.trim().length > 0),
      `module ${index} has an empty checkpoint`,
    );
  });

  const moduleIds = new Set(modules.map((module) => module.id));
  parts.forEach((part, index) => {
    addFailure(part.number === index, `part numbers must be sequential: expected ${index}, found ${part.number}`);
    addFailure(typeof part.title === 'string' && part.title.trim().length > 0, `part ${index} has an empty title`);
    addFailure(Array.isArray(part.moduleIds), `part ${index} is missing module ids`);
    for (const moduleId of part.moduleIds ?? []) {
      addFailure(moduleIds.has(moduleId), `part ${index} references unknown module ${moduleId}`);
    }
  });

  const groupedIds = parts.flatMap((part) => part.moduleIds ?? []);
  addFailure(new Set(groupedIds).size === modules.length, 'parts must contain each module id exactly once');
  addFailure(groupedIds.length === modules.length, 'parts must account for every module');

  if (failures.length > 0) {
    throw new Error(`Curriculum verification failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
  }
}

function parseArguments(argv) {
  const options = { verify: false, source: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--verify') {
      options.verify = true;
    } else if (argument === '--source') {
      options.source = argv[index + 1];
      index += 1;
    } else if (argument.startsWith('--source=')) {
      options.source = argument.slice('--source='.length);
    } else if (!argument.startsWith('-') && options.source === null) {
      options.source = argument;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

function main() {
  const options = parseArguments(process.argv.slice(2));

  if (options.verify) {
    if (options.source !== null) throw new Error('--verify does not accept a source path');
    const generated = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
    validateCurriculum(generated);
    console.log(`Curriculum verification passed: ${generated.modules.length} modules, ${generated.parts.length} parts.`);
    return;
  }

  if (!options.source) {
    throw new Error('Usage: node scripts/generate-curriculum.mjs --source <curriculum.html>');
  }

  const sourcePath = path.resolve(options.source);
  const html = fs.readFileSync(sourcePath, 'utf8');
  const generated = buildCurriculum(html, path.basename(sourcePath));
  validateCurriculum(generated);
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(generated)}\n`, 'utf8');
  console.log(`Generated ${generated.modules.length} modules and ${generated.parts.length} parts at ${path.relative(ROOT, OUTPUT_PATH)}.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
