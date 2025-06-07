# MongoDB Atlas Setup Instructions

## 🌐 Step 1: Create MongoDB Atlas Account

1. Go to: https://www.mongodb.com/atlas
2. Click "Try Free"
3. Create account (Google/GitHub signup works)
4. Choose "Free" tier (M0 Sandbox)

## 🔧 Step 2: Create Database Cluster

1. Choose cloud provider: **AWS** (recommended)
2. Region: Choose closest to you
3. Cluster Name: `Cluster0` (default is fine)
4. Click **"Create Cluster"** (takes 3-5 minutes)

## 🔐 Step 3: Create Database User

1. Go to **Database Access** (left sidebar)
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Username: `videosummarizer` 
5. Password: `Generate a secure password` (save it!)
6. Database User Privileges: **"Read and write to any database"**
7. Click **"Add User"**

## 🌍 Step 4: Whitelist IP Address

1. Go to **Network Access** (left sidebar)
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - *For development only - restrict in production*
4. Click **"Confirm"**

## 🔗 Step 5: Get Connection String

1. Go to **Database** (left sidebar)
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Driver: **Node.js**
5. Version: **4.1 or later**
6. Copy the connection string:

```
mongodb+srv://videosummarizer:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

## ⚙️ Step 6: Update Your .env File

Create/update your `.env` file in the backend folder:

```
# MongoDB Atlas Configuration
MONGODB_ATLAS_URI=mongodb+srv://videosummarizer:YOUR_ACTUAL_PASSWORD@cluster0.xxxxx.mongodb.net/videosummarizer?retryWrites=true&w=majority

# Other API Keys (your existing ones)
COHERE_API_KEY=your_cohere_api_key_here
YOUTUBE_API_KEY=your_youtube_api_key_here
ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
PORT=3001
```

**Important:** 
- Replace `YOUR_ACTUAL_PASSWORD` with the password you created in Step 3
- Replace `cluster0.xxxxx.mongodb.net` with your actual cluster URL
- Add `/videosummarizer` before the `?` to specify the database name

## ✅ Step 7: Test Connection

After updating your .env file, restart your backend:

```bash
npm start
```

You should see:
```
🌐 Connecting to MongoDB Atlas...
✅ MongoDB Atlas Connected: cluster0-shard-00-02.xxxxx.mongodb.net
🌐 Connected to cluster: videosummarizer
🏓 Database ping successful: { ok: 1 }
```

## 🎯 What This Gives You

✅ **Cloud database** - accessible from anywhere  
✅ **Automatic backups** - Atlas handles this  
✅ **Free tier** - 512MB storage, perfect for development  
✅ **No installation** - no local MongoDB needed  
✅ **Scalable** - can upgrade when you need more  

Your authentication system will now store users in the cloud! 