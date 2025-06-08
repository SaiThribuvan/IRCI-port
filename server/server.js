require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit process with failure
  }
};

// User Response Schema
const userResponseSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  message: { 
    type: String, 
    maxlength: 500 
  },
  actionType: { 
    type: String, 
    enum: ['waitlist', 'founder', 'demo', 'contact'], 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  ipAddress: {
    type: String,
    required: false
  }
});

// Indexes
userResponseSchema.index({ email: 1 }, { unique: true });
userResponseSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 }); // Optional: Auto-delete after 1 year

const UserResponse = mongoose.model('UserResponse', userResponseSchema);

// API Endpoints
app.post('/api/submit-response', async (req, res) => {
  try {
    const { email, message, actionType } = req.body;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Validate actionType
    if (!['waitlist', 'founder', 'demo', 'contact'].includes(actionType)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid action type' 
      });
    }

    // Create new response
    const newResponse = new UserResponse({
      email,
      message: message || '',
      actionType,
      ipAddress
    });

    await newResponse.save();
    
    res.status(201).json({ 
      success: true,
      message: 'Thank you for your submission!' 
    });
    
  } catch (error) {
    console.error('Error saving response:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        error: error.message 
      });
    }
    
    if (error.code === 11000) {
      return res.status(409).json({ 
        success: false,
        error: 'This email is already registered' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false,
    error: 'Internal server error' 
  });
});

// Start Server
const startServer = async () => {
  await connectDB();
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});