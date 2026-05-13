require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const result = await mongoose.connection.collection('conversacionwhatsapps').deleteMany({});
    console.log(`Borradas ${result.deletedCount} conversaciones`);
    process.exit(0);
});
