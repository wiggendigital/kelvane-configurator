# Kelvane 01 configurator

Build a steel bottle in 3D: choose the size, colour, lid and boot, add an engraving,
and watch the bottle and the price follow.

Live: https://wiggendigital.github.io/kelvane-configurator/

Kelvane is a fictional product. The configurator is a sample project, designed and
built by Wiggen Digital with three.js.

- The bottle is modelled in code. There are no 3D files or images to download.
- The scene only draws while something is moving.
- Every option, the price and the shareable link work without WebGL; a flat drawing of
  the bottle follows the choices where 3D is unavailable.
- `config.js` holds the catalogue and the price sums, apart from the page, and is
  covered by unit tests.

The product page for the same bottle: https://wiggendigital.github.io/kelvane/
