#!/bin/bash

NODE_OPTIONS=--openssl-legacy-provider npm run docs:build
rm -rf ../objection-doc/*
mv doc/.vuepress/dist/* ../objection-doc/
cd ../objection-doc
git add -A
git commit -m "update docs"
git push origin gh-pages:gh-pages