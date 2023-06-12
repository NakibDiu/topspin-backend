const express = require("express");
const app = express();
const port = 5000;
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');

app.get("/", (req, res) => {
  res.send("Top is spinning");
});

const dbUser = process.env.DB_USER
const dbPass = process.env.DB_PASS

const uri = `mongodb+srv://${dbUser}:${dbPass}@cluster0.g4f1thy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const classCollection = client.db("campDB").collection("classes"); 


    app.get("/classes", async (req, res) => {
        const cursor = await classCollection.find().toArray();
        res.send(cursor);
    })


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log(`Top spin is listening on port ${port}`);
});
