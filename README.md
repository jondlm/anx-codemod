# anx-codemod

A collection of [jscodeshift] scripts.

## Setup & Run

- `npm install -g jscodeshift`
- `git clone git@github.com:reactjs/react-codemod.git`
- Run `npm install` or [`yarn`](yarn) in the react-codemod directory
- `jscodeshift -t <codemod-script> <path>`
- Use the `-d` option for a dry-run and use `-p` to print the output for
  comparison

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
import Button from 'anx-react/lucid/DataTablePanel';
import Bert from 'anx-react/volatile/Bert';
```

### `lucid-path-imports`

Updates all ES6 module imports from `lucid-ui` into path imports.

```
import { Button } from 'lucid';
```

To

```
import Button from 'lucid-ui/DataTablePanel';
```

[jscodeshift]: https://github.com/facebook/jscodeshift
[yarn]: https://yarnpkg.com/en/
