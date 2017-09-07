# anx-codemod

A collection of [jscodeshift] scripts.

## Setup & Run

- `npm install -g jscodeshift`
- `git clone git@github.com:jondlm/anx-codemod.git`
- Run `npm install` or [`yarn`](yarn) in the anx-codemod directory
- `jscodeshift -t <codemod-script> <path>`
- Use the `--extensions js,jsx ` option if you use JSX, `-d` for a dry-run,
  `-p` to print the output for comparison

## Included Scripts

### `anx-react-path-imports`

Updates all ES6 module imports from `anx-react` into path imports.

From

```
import {
  DataTablePanel,
  lucid,
  volatile,
} from 'anx-react';

const { Button } = lucid;
const { Bert } = volatile;
```

To

```
import DataTablePanel from 'anx-react/DataTablePanel';
import Button from 'anx-react/lucid/Button';
import Bert from 'anx-react/volatile/Bert';
```

### `lucid-path-imports`

Updates all ES6 module imports from `lucid-ui` into path imports.

```
import { Button } from 'lucid-ui';
```

To

```
import Button from 'lucid-ui/Button';
```

[jscodeshift]: https://github.com/facebook/jscodeshift
[yarn]: https://yarnpkg.com/en/
