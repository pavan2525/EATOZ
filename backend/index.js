const express = require ("express");
const dotEnv = require('dotenv');
const mongoose = require('mongoose');

const vendorRoutes = require('./routes/vendorRoutes');

const app = express()

const PORT = 4000;

dotEnv.config();
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected successfully!"))
    .catch((error) => console.log(error));

app.use(express.json());
app.use('/auth', vendorRoutes);

app.listen(PORT, () => {
    console.log(`server started and running at ${PORT}`);
});

app.use('/home', (req, res)=>{
    res.send("<h1> Welcome to Eatoz")
})