require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

// Enhanced Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST']
}));
app.use(express.json({ limit: '10kb' })); // Body size limit

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api/', limiter);

// Configuration Validation
const requiredEnvVars = ['MONGODB_URI'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ ${envVar} is not defined in your .env file`);
    process.exit(1);
  }
}

// Enhanced MongoDB Connection
const connectDB = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10
    });
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
};

// Improved User Response Schema
const userResponseSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      message: props => `${props.value} is not a valid email address!`
    }
  },
  message: { 
    type: String, 
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters'] 
  },
  actionType: { 
    type: String, 
    enum: {
      values: ['waitlist', 'founder', 'demo', 'contact'],
      message: 'Invalid action type'
    },
    required: [true, 'Action type is required']
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: { expires: '365d' } // Auto-delete after 1 year
  },
  ipAddress: {
    type: String,
    required: false
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Model
const UserResponse = mongoose.model('UserResponse', userResponseSchema);

// Enhanced API Endpoint
app.post('/api/submit-response', async (req, res) => {
  try {
    const { email, message, actionType } = req.body;
    const ipAddress = req.ip;

    // Create and save response
    const newResponse = await UserResponse.create({ 
      email, 
      message: message?.trim(), 
      actionType,
      ipAddress
    });

    res.status(201).json({ 
      success: true, 
      message: 'Thank you for your submission!',
      data: {
        id: newResponse._id,
        createdAt: newResponse.createdAt
      }
    });
    
  } catch (error) {
    console.error('❌ Error saving response:', error);

    // Mongoose validation error
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(el => el.message);
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed',
        details: errors 
      });
    }

    // Duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({ 
        success: false, 
        error: 'This email is already registered' 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      reference: error.reference || undefined
    });
  }
});

// Enhanced Health Check
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const status = dbStatus === 1 ? 'healthy' : 'degraded';
  
  res.status(dbStatus === 1 ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    db: {
      status: dbStatus === 1 ? 'connected' : 'disconnected',
      ping: dbStatus
    },
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Resource not found' });
});

// Improved Error Handling
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled Error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    requestId: req.id || undefined
  });
});

// Server Startup
const startServer = async () => {
  await connectDB();
  
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🛡️ CORS allowed origins: ${process.env.ALLOWED_ORIGINS || 'All'}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('🛑 Received shutdown signal');
    server.close(async () => {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

startServer();