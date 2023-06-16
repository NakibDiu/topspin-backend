const express = require("express");
const cors = require("cors");
const app = express();
const port = 5000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Top is spinning");
});

const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASS;

const uri = `mongodb+srv://${dbUser}:${dbPass}@cluster0.g4f1thy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();

    const classCollection = client.db("campDB").collection("classes");
    const usersCollection = client.db("campDB").collection("users");
    const selectedClassCollection = client
      .db("campDB")
      .collection("selectedClass");
    const paymentCollection = client.db("campDB").collection("payment");

    //classes api
    app.get("/classes", async (req, res) => {
      const cursor = await classCollection.find().toArray();
      res.send(cursor);
    });

    app.get("/classes/:email", async (req, res) => {
      const email = req.params.email;
      if (!email) {
        return res.send([]);
      }
      const query = { instructorEmail: email };
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/classes/class/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classCollection.findOne(query);
      res.send(result);
    });

    app.post("/classes", async (req, res) => {
      const newClass = req.body;
      const result = await classCollection.insertOne(newClass);
      res.send(result);
    });

    app.put("/classes/:id", async (req, res) => {
      const id = req.params.id;
      const updatedClass = req.body;
      const updateDoc = {
        $set: {
          name: updatedClass.name,
          image: updatedClass.image,
          instructorName: updatedClass.instructorName,
          instructorEmail: updatedClass.instructorEmail,
          availableSeats: updatedClass.availableSeats,
          price: updatedClass.price,
        },
      };
      const filter = { _id: new ObjectId(id) };

      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/classes/status/:id", async (req, res) => {
      const id = req.params.id;
      const updatedStatus = req.body.status;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: updatedStatus,
        },
      };

      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // users api
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exists" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // checking is admin
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });
    // checking is instructor
    app.get("/users/instructor/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === "instructor" };
      res.send(result);
    });

    // selected class api

    app.get("/selected", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.send([]);
      }
      const query = { email: email };
      const result = await selectedClassCollection.find(query).toArray();

      res.send(result);
    });

    app.post("/selected", async (req, res) => {
      const selectedClass = req.body;
      const query = { classId: selectedClass.classId };
      const existingClass = await selectedClassCollection.findOne(query);

      if (existingClass) {
        return res.send({ message: "class already added" });
      }
      const result = await selectedClassCollection.insertOne(selectedClass);
      res.send(result);
    });

    app.delete("/selected/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedClassCollection.deleteOne(query);
      res.send(result);
    });

    // payment apis

 
    app.get("/payments", async (req, res) => {
        const email = req.query.email;

        const query = {email: email}; 

        const result = await paymentCollection.find(query).toArray();
        res.send(result);
    })

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);

      const selectedQuery = { _id: new ObjectId(payment.selectedClassId) };
      const enrolledQuery = { _id: new ObjectId(payment.classId) };


      const deleteResult = await selectedClassCollection.deleteOne(selectedQuery);
      const enrolledClass = await classCollection.findOne(enrolledQuery);
      const updateDoc = {
        $set: {
          name: enrolledClass.name,
          image: enrolledClass.image,
          instructorName: enrolledClass.instructorName,
          instructorEmail: enrolledClass.instructorEmail,
          availableSeats: enrolledClass.availableSeats - 1,
          price: enrolledClass.price,
          numOfStudents: enrolledClass.numOfStudents + 1,
        },
      };
      const updateResult = await classCollection.updateOne(enrolledQuery, updateDoc)
      

      res.send({ insertResult, deleteResult, updateResult });
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Top spin is listening on port ${port}`);
});
