# Sharp Test

This web based tool was created so I can visualize what images **resized** with sharp will look in sections of content like bootstrap cards and elements with CSS `background:cover`.

[![Edit sharp-test](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/github/lcherone/sharp-test/tree/master/?fontsize=14)

[![screencast](http://i.imgur.com/swQxdfW.png)](https://youtu.be/TIi_hQjnRAE)

## Install

Bog standard, git clone, npm install and run.

## Docker

```
services:
  sharp-test:
    volumes:
      - ./my_images/:/src/images
    ports:
      - 3000:3000
```
