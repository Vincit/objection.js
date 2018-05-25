# Relation subqueries

Let's say you have a `Tweet` model and a `Like` model. `Tweet` has a `HasManyRelation` named `likes` to `Like` table. Now let's assume you'd like to fetch a list of `Tweet`s and get the number of likes for each of them without fetching the actual `Like` rows. This cannot be easily achieved using `eager` because of the way the queries are optimized (you can read more [here](/api/query-builder.html#eager)). You can leverage SQL's subqueries and the [relatedQuery](/api/model.html#static-relatedquery) helper:

```js
const tweets = await Tweet
  .query()
  .select(
    'Tweet.*',
    Tweet.relatedQuery('likes').count().as('numberOfLikes')
  );

console.log(tweets[4].numberOfLikes);
```

The generated SQL is something like this:

```sql
select "Tweet".*, (
  select count(*)
  from "Like"
  where "Like"."tweetId" = "Tweet"."id"
) as "numberOfLikes"
from "Tweet"
```

Naturally you can add as many subquery selects as you like. For example you could also get the count of retweets in the same query. [relatedQuery](#relatedquery) method works with all relations and not just `HasManyRelation`.

Another common use case for subqueries is selecting `Tweet`s that have one or more likes. That could also be achieved using joins, but it's often simpler to use a subquery. There should be no performance difference between the two methods on modern database engines.

```js
const tweets = await Tweet
  .query()
  .whereExists(Tweet.relatedQuery('likes'))
```

The generated SQL is something like this:

```sql
select "Tweet".*
from "Tweet"
where exists (
  select "Like".*
  from "Like"
  where "Like"."tweetId" = "Tweet"."id"
)
```

You can even use the common `select 1` optimization if you want (I'm fairly sure it's useless nowadays though):

```js
const tweets = await Tweet
  .query()
  .whereExists(Tweet.relatedQuery('likes').select(1))
```

The generated SQL is something like this:

```sql
select "Tweet".*
from "Tweet"
where exists (
  select 1
  from "Like"
  where "Like"."tweetId" = "Tweet"."id"
)
```
