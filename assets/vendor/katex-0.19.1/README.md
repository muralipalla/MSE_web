# KaTeX 0.19.1

Unmodified browser distribution files from the official npm package:

- Package: <https://registry.npmjs.org/katex/0.19.1>
- Archive: <https://registry.npmjs.org/katex/-/katex-0.19.1.tgz>
- Upstream: <https://github.com/KaTeX/KaTeX/tree/v0.19.1>
- Archive integrity: `sha512-jG8uKntjSEcm2EpQOh0XturpPuuC9r3Sq5HLHdsFdWZT27E672SF19QEi+of0/YeOy15lDgRhKvr5614uRrEfA==`

The archive's SHA-512 integrity was verified before these files were copied.
The `katex.min.js`, `katex.min.css`, and all 60 referenced TTF, WOFF, and WOFF2
font files are included, so equations require no third-party CDN connection.
Browsers download only the font files they need.

The JavaScript and CSS are under the MIT License in `LICENSE`.
The fonts' embedded metadata identifies the SIL Open Font License 1.1, retained
in `OFL.txt`. Per-font copyright and Reserved Font Name statements are reproduced
from the original metadata in `FONT-NOTICES.txt`. The fonts are unmodified.
The official OFL text was obtained from
<https://openfontlicense.org/documents/OFL.txt>.

The site's `js/math-render.js` renders authored `data-tex` expressions to HTML
and accessible MathML. Each element retains readable HTML as its fallback if
JavaScript is unavailable or an expression cannot be parsed.
