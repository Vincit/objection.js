#!/bin/bash

docker exec -d objection_postgres psql -U postgres -c "CREATE USER objection SUPERUSER"
docker exec -d objection_postgres psql -U postgres -c "CREATE DATABASE objection_test"

docker exec -d objection_mysql mysql -u root -e "CREATE USER objection"
docker exec -d objection_mysql mysql -u root -e "GRANT ALL PRIVILEGES ON *.* TO objection"
docker exec -d objection_mysql mysql -u root -e "CREATE DATABASE objection_test"