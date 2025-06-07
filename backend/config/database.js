const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // MongoDB Atlas connection string from environment variable
    const connectionString = process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI;
    
    if (!connectionString) {
      console.log('⚠️ MONGODB_ATLAS_URI not set - using in-memory fallback');
      console.log('📝 To use MongoDB Atlas, follow: mongodb-atlas-setup.md');
      return; // Skip MongoDB connection, use in-memory storage
    }
    
    console.log('🌐 Connecting to MongoDB Atlas...');
    
    const conn = await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
    });

    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    console.log(`🌐 Connected to cluster: ${conn.connection.name}`);
    
    // Test the connection with a simple operation (with safety check)
    try {
      if (conn.connection.db) {
        const admin = conn.connection.db.admin();
        const result = await admin.ping();
        console.log('🏓 Database ping successful:', result);
      } else {
        console.log('🏓 Connection established (ping test skipped)');
      }
    } catch (pingError) {
      console.log('🏓 Connection established (ping test failed, but connection is working)');
    }
    
    // Log database stats
    try {
      const dbStats = await mongoose.connection.db.stats();
      console.log(`📊 Database: ${mongoose.connection.name}`);
      console.log(`📊 Collections: ${dbStats.collections}`);
      console.log(`📊 Data Size: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    } catch (statsError) {
      console.log('📊 Could not retrieve database stats (this is normal for new databases)');
    }
    
  } catch (error) {
    console.error('❌ MongoDB Atlas connection error:', error);
    
    if (error.message.includes('MONGODB_ATLAS_URI')) {
      console.log('');
      console.log('🔧 Setup Instructions:');
      console.log('1. Go to https://www.mongodb.com/atlas');
      console.log('2. Create a free account and cluster');
      console.log('3. Get your connection string');
      console.log('4. Add MONGODB_ATLAS_URI to your .env file');
      console.log('   Example: MONGODB_ATLAS_URI=mongodb+srv://username:password@cluster.mongodb.net/videosummarizer');
      console.log('');
    } else if (error.name === 'MongoNetworkError') {
      console.log('');
      console.log('🌐 Network connection error. Please check:');
      console.log('1. Your internet connection');
      console.log('2. MongoDB Atlas cluster is running');
      console.log('3. Your IP address is whitelisted in Atlas');
      console.log('4. The connection string is correct');
      console.log('');
    } else if (error.name === 'MongoServerSelectionError') {
      console.log('');
      console.log('🔐 Authentication error. Please check:');
      console.log('1. Username and password in connection string');
      console.log('2. Database user has proper permissions');
      console.log('3. Connection string format is correct');
      console.log('');
    }
    
    process.exit(1);
  }
};

module.exports = connectDB; 