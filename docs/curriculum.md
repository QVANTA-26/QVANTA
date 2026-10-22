# Canonical curriculum data

The canonical curriculum source is the attached `QVANTA_Full_Curriculum_Explained.html` document. It declares 39 parts and 527 modules. The source is parsed as HTML by the dependency-free generator at [`scripts/generate-curriculum.mjs`](../scripts/generate-curriculum.mjs).

The checked-in generated output is [`apps/web/src/data/curriculum.json`](../apps/web/src/data/curriculum.json). It contains source metadata, the 39 part records, and all 527 module records, including each module's title, part, level, prerequisite, ordered headings and content blocks, preformatted text, and checkpoint. HTML entities are decoded during generation. The web application reads repository data; it does not need the attachment at runtime.

## Regenerate

Provide the canonical HTML file as the source path:

```bash
node scripts/generate-curriculum.mjs --source /path/to/QVANTA_Full_Curriculum_Explained.html
```

The command rewrites `apps/web/src/data/curriculum.json` and validates the claimed counts, sequential module/part IDs, non-empty titles, and complete part membership before writing. The root test also runs the generated-data verification without needing the source attachment:

```bash
npm test
```

Curriculum content is source-backed. If the canonical HTML changes, regenerate the checked-in JSON and review the resulting data change together with the source document.

## Tutor handoff

The module detail view stores the selected module's source text in the tutor handoff. The web tutor sends the title and a bounded (12,000-character maximum) context snapshot to `POST /tutor/chat`; the API validates that payload and uses it as reference material for both the connected Claude path and the offline canned-reply path. The source context is not treated as executable instructions.
