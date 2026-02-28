# Character Generator Base Templates

The files in this directory define the shared defaults that every Stick 'Em Up! character generator can lean on.  Instead of copy/pasting magic numbers for sprite sizes, anchor points, or walk-cycle tuning, generators can import the base template and optionally override values for a specific genre.

```js
const { createGenreTemplate } = require("../templates/base_character_template.cjs");
const westernConfig = createGenreTemplate({
  animation: {
    bobAmplitudeRange: [0.55, 1.15],
  },
});
```

Using `createGenreTemplate` keeps generators consistent while still allowing stylistic tweaks.  New genres only need to override the handful of differences they care about, and all other defaults come along for free.
