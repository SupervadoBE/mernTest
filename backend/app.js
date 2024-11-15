const express = require('express')
const app = express()
const cors = require('cors');
require('dotenv').config()
const port = 3000


app.use(cors());
app.use(express.json())

var Iyzipay = require('iyzipay')

var iyzipay = new Iyzipay({
  apiKey: process.env.SP_API,
  secretKey: process.env.SP_KEY,
  uri: process.env.SP_URL
})

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
      const { name, description, price, availableSeats, videoLink } = updateClass
      const filter = {_id: new ObjectId(id)};
      // Set the upsert option to insert a document if no documents match the filter
      const options = { upsert: true };
      const updateDoc = {
        $set:{
          name: name,
          description: description,
          price: price,
          availableSeats: parseInt(availableSeats),
          videoLink: videoLink,
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
        email: email
      };
      const projection = {classId: 1};
      const result = await cartCollections.findOne(query, {projection: projection})
      res.send(result);
    })

    // cart info by user email
    app.get('/cart/:email', async (req, res) =>{
      const email = req.params.email;
      const query = {email: email};
      const projection = { classId: 1 };
      const carts = await cartCollections.find(query, {projection: projection}).toArray();
      const classIds = carts.map((cart) => new ObjectId(cart.classId));
      const query2 = {_id: {$in: classIds}};
      const result = await classesCollections.find(query2).toArray();
      res.send(result);
    })

    // delete cart item
    app.delete('/delete-cart-item/:id', async (req, res) =>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await cartCollections.deleteOne(query);
        res.send(result);
    })

    // * Peyment Routes -----
    app.post('/create-payment-intent', async (req, res) =>{
      const request = {
        locale: Iyzipay.LOCALE.TR,
        conversationId: req.body.conversationId,
        price: req.body.price,
        paidPrice: req.body.paidPrice,
        currency: Iyzipay.CURRENCY.TRY,
        installment: req.body.installment,
        basketId: req.body.basketId,
        paymentChannel: Iyzipay.PAYMENT_CHANNEL.WEB,
        paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
        paymentCard: {
            cardHolderName: req.body.paymentCard.cardHolderName,
            cardNumber: req.body.paymentCard.cardNumber,
            expireMonth: req.body.paymentCard.expireMonth,
            expireYear: req.body.paymentCard.expireYear,
            cvc: req.body.paymentCard.cvc,
            registerCard: req.body.paymentCard.registerCard
        },
        buyer: {
            id: req.body.buyer.id,
            name: req.body.buyer.name,
            surname: req.body.buyer.surname,
            gsmNumber: req.body.buyer.gsmNumber,
            email: req.body.buyer.email,
            identityNumber: req.body.buyer.identityNumber,
            lastLoginDate: req.body.buyer.lastLoginDate,
            registrationDate: req.body.buyer.registrationDate,
            registrationAddress: req.body.buyer.registrationAddress,
            ip: req.body.buyer.ip,
            city: req.body.buyer.city,
            country: req.body.buyer.country,
            zipCode: req.body.buyer.zipCode
        },
        shippingAddress: {
            contactName: req.body.shippingAddress.contactName,
            city: req.body.shippingAddress.city,
            country: req.body.shippingAddress.country,
            address: req.body.shippingAddress.address,
            zipCode: req.body.shippingAddress.zipCode
        },
        billingAddress: {
            contactName: req.body.billingAddress.contactName,
            city: req.body.billingAddress.city,
            country: req.body.billingAddress.country,
            address: req.body.billingAddress.address,
            zipCode: req.body.billingAddress.zipcode
        },
        basketItems: [
            {
                id: req.body.basketItems[0].id,
                name: req.body.basketItems[0].name,
                category1: req.body.basketItems[0].category1,
                category2: req.body.basketItems[0].category2,
                itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
                price: req.body.basketItems[0].price
            },
            {
                id: req.body.basketItems[1].id,
                name: req.body.basketItems[1].name,
                category1: req.body.basketItems[1].category1,
                category2: req.body.basketItems[1].category2,
                itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
                price: req.body.basketItems[1].price
            },
            {
                id: req.body.basketItems[2].id,
                name: req.body.basketItems[2].name,
                category1: req.body.basketItems[2].category1,
                category2: req.body.basketItems[2].category2,
                itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
                price: req.body.basketItems[2].price
            }
        ]
      };


      const seewhat = iyzipay.payment.create(request, function(err, result){
        console.log(err, result);
        res.send(result)
      })
    })

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