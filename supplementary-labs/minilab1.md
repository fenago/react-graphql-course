# Mini-Lab:  Getting Started with GraphQL

Here’s what you’re doing in this mini-lab:

1. You define a query called AllFilms. The query will fetch the desired films along with information about them.
2. You specify that you want all the films available.
3. For each film within your collection, what attributes and values do you want to get? This is how you define the scope of data to fetch for an individual film.
4. You want the ID, director, episode ID, title, and release date for each film.
5. For an individual film, you also want to fetch the first ten characters associated with it.
6. For each character, you specify what information to retrieve.
7. You want the ID, name, birth year, eye color, and hair color of each character.
8. You also want the homeworld for the character.
9. And, for that homeworld, you need its name.


START HERE:

Go [Here](http://https://graphql.org/swapi-graphql/ "Here") to Launch the GraphiQL Interface:

https://graphql.org/swapi-graphql/

Please add the following Query:

`
query AllFilms {

  allFilms {

    films {

      id
      director
      episodeID
      title
      releaseDate
      

      characterConnection(first: 10) {

        characters {

          id
          name
          birthYear
          eyeColor
          hairColor
          

          homeworld {

            name
          }
        }
      }
    }
  }
}
`

As you can see, it looks a bit Swift-y or JSON-y. Feel free to experiment with the GraphQL playground for SWAPI. Add or remove things in the query, run it, and check out the results.

Try these queries:

[![Query Starter](https://i.stack.imgur.com/yurqO.png "Query Starter")](httphttps://i.stack.imgur.com/yurqO.png:// "Query Starter")

Query for Planet Residents to Star Wars film "A New Hope"

[![](https://i.stack.imgur.com/bbCAW.png)](httphttps://i.stack.imgur.com/bbCAW.png://)

Notice how the root query film() takes in the id parameter of the film "A New Hope" and the projection from GQL returns the title, planets connected to the film, and then resident names of the planets. 
