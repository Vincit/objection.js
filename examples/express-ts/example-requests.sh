#!/bin/sh


##############
### Insert ###
##############


# Create some persons.
curl -H "Content-Type: application/json" -d '{"firstName":"Jennifer", "lastName":"Lawrence", "age":24}' http://localhost:8641/persons
curl -H "Content-Type: application/json" -d '{"firstName":"Bradley", "lastName":"Cooper", "age":40}' http://localhost:8641/persons
curl -H "Content-Type: application/json" -d '{"firstName":"Sylvester", "lastName":"Stallone", "age":68}' http://localhost:8641/persons

# Relations can be sent along with the people.
curl -H "Content-Type: application/json" -d '{"firstName":"Matt", "lastName":"Damon", "age":42, "parent": {"firstName": "Kent", "lastName": "Damon", "age": 70}}' http://localhost:8641/persons

# Add a child for Sylvester.
curl -H "Content-Type: application/json" -d '{"firstName":"Sage", "lastName":"Stallone", "age":36}' http://localhost:8641/persons/3/children

# Add some pets for Jennifer.
curl -H "Content-Type: application/json" -d '{"name":"Fluffy", "species":"dog"}' http://localhost:8641/persons/1/pets
curl -H "Content-Type: application/json" -d '{"name":"Scrappy", "species":"dog"}' http://localhost:8641/persons/1/pets
curl -H "Content-Type: application/json" -d '{"name":"Kitty", "species":"cat"}' http://localhost:8641/persons/1/pets

# Add a pet for Sage.
curl -H "Content-Type: application/json" -d '{"name":"Coco", "species":"dog"}' http://localhost:8641/persons/4/pets

# Add some movies for Jennifer.
curl -H "Content-Type: application/json" -d '{"name":"Silver Linings Playbook"}' http://localhost:8641/persons/1/movies
curl -H "Content-Type: application/json" -d '{"name":"The Hunger Games"}' http://localhost:8641/persons/1/movies

# Add Bradley to the Silver Linings Playbook movie.
curl -H "Content-Type: application/json" -d '{"id":2}' http://localhost:8641/movies/1/actors

# Add a movie for Sage.
curl -H "Content-Type: application/json" -d '{"name":"Rocky V"}' http://localhost:8641/persons/4/movies


##############
### Update ###
##############


# Give an address for Jennifer and make her a year older.
curl -X PATCH -H "Content-Type: application/json" -d '{"address":{"street":"Somestreet 10", "city":"Tampere"}, "age":25}' http://localhost:8641/persons/1


###########
### Get ###
###########


# Get all persons.
curl http://localhost:8641/persons

# Filter with age.
curl "http://localhost:8641/persons?minAge=30&maxAge=50"

# Get Jennifer's dogs.
curl "http://localhost:8641/persons/1/pets?species=dog"

# Get Silver Linings Playbook movie's actors.
curl "http://localhost:8641/movies/1/actors"

# Fetch Sylvester eagerly with relations. The eager expression is "[pets, children.[movies, pets]]" url encoded.
curl "http://localhost:8641/persons?minAge=60&eager=%5Bpets,children.%5Bmovies,pets%5D%5D"


########################
### Failing requests ###
########################


# Validation error (no firstName)
curl -H "Content-Type: application/json" -d '{"lastName":"Lawrence", "age":24}' http://localhost:8641/persons

# Validation error (no name)
curl -H "Content-Type: application/json" -d '{"species":"dog"}' http://localhost:8641/persons/1/pets

# 404
curl -H "Content-Type: application/json" -d '{"name":"Rex","species":"dog"}' http://localhost:8641/persons/9999/pets


##############
### Delete ###
##############


# Delete Bradley.
curl -X DELETE http://localhost:8641/persons/2
