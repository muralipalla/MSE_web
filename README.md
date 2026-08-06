# MSE Learning Lab

A deliberately simple, modular Materials Science and Engineering website.
It uses ordinary HTML, CSS, and a tiny amount of JavaScript. There is no
framework, package installation, or build command.

## Structure

    MSE_web/
    |-- index.html                 Home page with five sections
    |-- css/style.css              Shared colours and layout
    |-- js/main.js                 Small optional browser helpers
    |-- assets/images/             Images used by pages
    |-- teaching/                  Independent teaching pages
    |-- visualizations/            Independent 2D and 3D pages
    |-- simulations/               Independent simulation pages
    |-- quizzes/                   Independent quiz pages
    |-- python/                    Python and Bokeh source programs
    |-- README.md                  This guide

The first example teaching page is:

    teaching/introduction.html

## Add a teaching page

1. Copy teaching/introduction.html.
2. Rename the copy, for example teaching/crystal-structures.html.
3. Change its title and content.
4. Add an ordinary link to it in index.html.

The same pattern applies to visualizations, simulations, and quizzes. A small
activity can be one HTML file. A complex activity can have its own folder with
an index.html, style.css, and app.js.

## Python and Bokeh

Keep editable Python source under python/. If Bokeh can generate a standalone
HTML document, place that exported document under simulations/ and link to it
from index.html. GitHub Pages cannot run a live Python server, so demonstrations
that require Python callbacks need separate application hosting.

## Preview locally

From this directory, run:

    py -m http.server 8000

Then open:

    http://localhost:8000/

## Publish with GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` packages the static folders
and publishes them with GitHub Pages. Each push to `main` updates the public
website automatically.
