const express = require('express')
const app = express()
const cors = require('cors');
require('dotenv').config()
const port = 3000


app.use(cors());
app.use(express.json())

// --------- MongoDB Connection Start --------------

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@yoga-master.50uxhvc.mongodb.net/?retryWrites=true&w=majority`;

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

    // Create a database and collections
    const database = client.db("yoga-master");
    const usersCollections = database.collection("users");
    const classesCollections = database.collection("classes");
    const cartCollections = database.collection("cart");
    const paymentCollections = database.collection("payments");
    const enrolledCollections = database.collection("enrolled");
    const appliedCollections = database.collection("applied");
    // const ordersCollections = database.collection("ordes")

    // * classes routes here
    app.post('/new-class', async (req, res) => {
      const newClass = req.body;
      // newClass.availableSeats = parseInt(newClass.availableSeats);
      const result = await classesCollections.insertOne(newClass);
      res.send(result);
    })

    app.get('/classes', async (req, res) => {
      const query = { status: 'approved' };
      const result = await classesCollections.find(query).toArray();
      res.send(result)
    })

    // get classes by instructor email address
    app.get('/classes/:email', async (req, res) => {
      const email = req.params.email;
      const query = {instructorEmail: email}
      const result = await classesCollections.find(query).toArray();
      res.send(result);
    })

    // mangage classes
    app.get('/classes-manage', async (req, res) =>{
      const result = await classesCollections.find().toArray();
      res.send(result);
    })

    // update classes status and reason // ! we have 2 method for update, one of 'put' is update JSON Document one of 'patch' is update spesific Field
    app.patch('/change-status/:id', async (req, res) =>{
      const id = req.params.id;
      const status = req.body.status;
      const reason = req.body.reason;
      const filter = {_id: new ObjectId(id) };
      // Set the upsert option to insert a document if no documents match the filter
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          status: status,
          reason: reason,
        },
      };
      const result = await classesCollections.updateOne(filter, updateDoc, options);
      res.send(result);
    })

    // get approved classes
    app.get('/approved-classes', async (req, res) =>{
      const query = { status : "approved" };
      const result = await classesCollections.find(query).toArray();
      res.send(result)
    })

    // get single class details
    app.get('/class/:id', async (req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await classesCollections.findOne(query);
      res.send(result);
    })

    //  update class details (all data)
    app.put('/update-class/:id', async (req, res) =>{
      const id = req.params.id;
      const updateClass = req.body;
      const filter = {_id: new ObjectId(id)};
      // Set the upsert option to insert a document if no documents match the filter
      const options = { upsert: true };
      const updateDoc = {
        $set:{
          name: updateClass.name,
          description: updateClass.description,
          price: updateClass.price,
          availableSeats: parseInt(updateClass.availableSeats),
          videoLink: updateClass.videoLink,
          status: 'pending'
        }
      };
      const result = await classesCollections.updateOne(filter, updateDoc, options);
      res.send(result);
    })

    // * Cart Routers -----
    app.post('/add-to-card', async (req, res) =>{
      const newCartItem = req.body;
      const result = await cartCollections.insertOne(newCartItem);
      res.send(result);
    })

    // get cart item by id
    app.get('/cart-item/:id', async (req, res) =>{
      const id = req.params.id;
      const email = req.body.email;
      const query = {
        classId: id,
        userMail: email
      };
      const projection = {classId: 1};
      const result = await cartCollections.findOne(query, {projection: projection})
      res.send(result);
    })

    // cart info by user email
    app.get('/cart/:email', async (req, res) =>{
      const email = req.params.email;
      const query = {userMail: email};
      const projection = { classId: 1 };
      const carts = await cartCollections.find(query, {projection: projection});
      const classId = carts.map((cart) => new ObjectId(cart.classId));
      const query2 = {_id: {$in: classId}};
      const result = await classesCollections.find(query2).toArray();
      res.send(result);
    })

    // delete cart item
    app.delete('/delete-cart-item/:id', async (req, res) =>{
        const id = req.params.id;
        const query = {classId: id};
        const result = await cartCollections.deleteOne(query);
        res.send(result);
    })

    // * Peyment Routes -----

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

//---------------- MongoDB Connection End Here ---------------

app.get('/', (req, res) =>{
    res.send('Hello World!')
})

app.listen(port, ()=>{
    console.log(`Example app listening on port ${port}`)
})