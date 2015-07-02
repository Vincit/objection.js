#!/bin/sh

npm install
npm install knex -g
knex migrate:latest
