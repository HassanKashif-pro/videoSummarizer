const mongoose = require('mongoose');
require('dotenv').config();

async function testAtlasConnection() {
  try {
    const connectionString = process.env.MONGODB_ATLAS_URI;
    
    if (!connectionString) {
      console.log('❌ MONGODB_ATLAS_URI not found in .env file');
      console.log('📝 Please add your Atlas connection string to .env file');
      console.log('💡 See mongodb-atlas-setup.md for instructions');
      return;
    }
    
    console.log('🔄 Testing MongoDB Atlas connection...');
    console.log('🌐 Connecting to:', connectionString.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    const conn = await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log('✅ MongoDB Atlas Connected Successfully!');
    console.log('🌐 Host:', conn.connection.host);
    console.log('📊 Database:', conn.connection.name);
    
    // Test creating a simple document
    const testSchema = new mongoose.Schema({ test: String, createdAt: Date });
    const TestModel = mongoose.model('Test', testSchema);
    
    const testDoc = new TestModel({ 
      test: 'Atlas Connection Test', 
      createdAt: new Date() 
    });
    
    await testDoc.save();
    console.log('✅ Test document created successfully');
    
    // Clean up test document
    await TestModel.deleteOne({ _id: testDoc._id });
    console.log('🧹 Test document cleaned up');
    
    console.log('');
    console.log('🎉 MongoDB Atlas is ready for your Video Summarizer app!');
    console.log('🚀 You can now start your backend with: npm start');
    
  } catch (error) {
    console.error('❌ MongoDB Atlas connection failed:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.log('');
      console.log('🔧 Possible issues:');
      console.log('1. Check your internet connection');
      console.log('2. Verify the connection string in .env file');
      console.log('3. Make sure your IP is whitelisted in Atlas');
      console.log('4. Check username/password in connection string');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB Atlas');
  }
}

// Run the test
testAtlasConnection(); 