#!/bin/bash

npm run versionup:patch

npm run build

npm run package

npm run release:npm

npm run upgrade:all

npm run build