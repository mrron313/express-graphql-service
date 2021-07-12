const express = require('express')
const { graphqlHTTP } = require('express-graphql')
const graphql = require('graphql')
var cors = require('cors')

const { Client } = require('pg')
const client = new Client({
  host: "localhost",
  user: "postgres",
  password: "postgres",
  database: "nodegraphql"
})
client.connect()

var Test = new graphql.GraphQLObjectType({
    name: 'Test',
    fields: () => ({
      id: { type: graphql.GraphQLInt },
      name: { type: graphql.GraphQLString },
    })
})
    
Test._typeConfig = {
    sqlTable: 'test',
    uniqueKey: 'id'
}

const QueryRoot = new graphql.GraphQLObjectType({
    name: 'Query',
    fields: () => ({
      hello: {
        type: graphql.GraphQLString,
        resolve: () => "Hello world!"
      },
      getTestByID: {
        type: Test,
        args: { id: { type: graphql.GraphQLNonNull(graphql.GraphQLInt) } },
        resolve: (parent, args, sql) => {
            return client.query(`select * from test where id=${args.id}`).then(res => res.rows[0]).catch(err => console.log(err));
        }
      },      
      getTests: {
        type: new graphql.GraphQLList(Test),
        resolve: (parent, args, sql) => {
            return client.query(`select * from test order by id asc`).then(res => res.rows).catch(err => console.log(err));
        }
      },
    })
});

const MutationRoot = new graphql.GraphQLObjectType({
    name: 'Mutation',
    fields: () => ({
        createTest: {
            type: Test,
            args: {
                name: { type: graphql.GraphQLNonNull(graphql.GraphQLString) },
            },
            resolve: async (parent, args, context, resolveInfo) => {
                try {
                    return client.query("INSERT INTO test (name) VALUES ($1) RETURNING *", [args.name]).then(res => res.rows[0]);
                } catch (err) {
                    throw new Error("Failed to insert new test")
                }
            }
        },
        updateTest: {
            type: Test,
            args: {
                id: { type: graphql.GraphQLNonNull(graphql.GraphQLInt) } ,
                name: { type: graphql.GraphQLNonNull(graphql.GraphQLString) },
            },
            resolve: async (parent, args, context, resolveInfo) => {
                try {
                    return client.query("Update test set name=$1 where id=$2 RETURNING *", [args.name, args.id]).then(res => res.rows[0]);
                } catch (err) {
                    throw new Error("Failed to update test")
                }
            }
        },
        deleteTest: {
            type: graphql.GraphQLString,
            args: {
                id: { type: graphql.GraphQLNonNull(graphql.GraphQLInt) } ,
            },
            resolve: async (parent, args, context, resolveInfo) => {
                try {
                    return client.query("delete from test where id=$1 RETURNING *", [args.id]).then(res => 'Deleted');
                } catch (err) {
                    throw new Error("Failed to update test")
                }
            }
        }
    })
  })

const schema = new graphql.GraphQLSchema({ query: QueryRoot, mutation: MutationRoot });

const app = express();

const corsOptions = {
    origin: "http://localhost:3000",
    credentials: true
};
app.use(cors(corsOptions));


app.use('/api', graphqlHTTP({
  schema: schema,
  graphiql: true,
}));

app.listen(4000, function () {
    console.log('CORS-enabled web server listening on port 4000')
})