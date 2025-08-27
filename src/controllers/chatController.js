const logger = require('../utils/logger');
const Campaign = require('../models/Campaign');
const Charity = require('../models/Charity');
const User = require('../models/User');

// In-memory storage for chat rooms (since messages are not persisted)
const chatRooms = new Map();
const activeSockets = new Map(); // Map socket.id -> { userId, userName, userRole, roomId }

/**
 * Get active chat room for a charity
 * @param {string} charityId 
 * @returns {Object} Room data
 */
const getChatRoom = (charityId) => {
  if (!chatRooms.has(charityId)) {
    chatRooms.set(charityId, {
      charityId,
      participants: new Set(),
      messages: [],
      createdAt: new Date()
    });
  }
  return chatRooms.get(charityId);
};

/**
 * Get campaign chat room for a specific campaign
 * @param {string} campaignId 
 * @returns {Object} Room data
 */
const getCampaignChatRoom = (campaignId) => {
  const roomId = `campaign_${campaignId}`;
  if (!chatRooms.has(roomId)) {
    chatRooms.set(roomId, {
      campaignId,
      roomId,
      participants: new Set(),
      messages: [],
      createdAt: new Date()
    });
  }
  return chatRooms.get(roomId);
};

/**
 * Join charity chat room
 */
const joinCharityChat = async (req, res) => {
  try {
    const { charityId } = req.params;
    const userId = req.user.user_id;

    logger.info(`User ${userId} attempting to join charity chat ${charityId}`);

    // Verify charity exists
    const charity = await Charity.findByPk(charityId, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['user_id', 'full_name', 'role']
      }]
    });

    if (!charity) {
      logger.warn(`Charity ${charityId} not found`);
      return res.status(404).json({
        status: 'error',
        message: 'Charity not found'
      });
    }

    logger.info(`Charity found: ${charity.name}`);

    // Get or create chat room
    const room = getChatRoom(charityId);

    res.json({
      status: 'success',
      data: {
        roomId: charityId,
        charity: {
          charity_id: charity.charity_id,
          name: charity.name,
          logo_url: charity.logo_url
        },
        participantCount: room.participants.size,
        canChat: true
      }
    });

  } catch (error) {
    logger.error('Error joining charity chat:', error);

    // Provide more specific error messages
    let errorMessage = 'Internal server error';
    if (error.name === 'SequelizeDatabaseError') {
      errorMessage = 'Database connection error';
    } else if (error.name === 'SequelizeValidationError') {
      errorMessage = 'Invalid charity data';
    }

    res.status(500).json({
      status: 'error',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Join campaign chat room
 */
const joinCampaignChat = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user.user_id;

    logger.info(`User ${userId} attempting to join campaign chat ${campaignId}`);

    // Verify campaign exists and get charity info
    const campaign = await Campaign.findByPk(campaignId, {
      include: [{
        model: Charity,
        as: 'charity',
        attributes: ['charity_id', 'name', 'logo_url'],
        include: [{
          model: User,
          as: 'user',
          attributes: ['user_id', 'full_name', 'role']
        }]
      }]
    });

    if (!campaign) {
      logger.warn(`Campaign ${campaignId} not found`);
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found'
      });
    }

    logger.info(`Campaign found: ${campaign.title}`);

    // Get or create campaign chat room
    const room = getCampaignChatRoom(campaignId);

    res.json({
      status: 'success',
      data: {
        roomId: `campaign_${campaignId}`,
        campaign: {
          campaign_id: campaign.campaign_id,
          title: campaign.title,
          charity: campaign.charity
        },
        participantCount: room.participants.size,
        canChat: true
      }
    });

  } catch (error) {
    logger.error('Error joining campaign chat:', error);

    // Provide more specific error messages
    let errorMessage = 'Internal server error';
    if (error.name === 'SequelizeDatabaseError') {
      errorMessage = 'Database connection error';
    } else if (error.name === 'SequelizeValidationError') {
      errorMessage = 'Invalid campaign data';
    }

    res.status(500).json({
      status: 'error',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get active chat rooms for admin
 */
const getActiveChatRooms = async (req, res) => {
  try {
    // Only admin can access this
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    const activeRooms = [];

    for (const [roomId, room] of chatRooms.entries()) {
      if (room.participants.size > 0) {
        activeRooms.push({
          roomId,
          type: roomId.startsWith('campaign_') ? 'campaign' : 'charity',
          participantCount: room.participants.size,
          lastActivity: room.messages.length > 0 ?
            room.messages[room.messages.length - 1].timestamp : room.createdAt
        });
      }
    }

    res.json({
      status: 'success',
      data: {
        activeRooms,
        totalRooms: activeRooms.length
      }
    });

  } catch (error) {
    logger.error('Error getting active chat rooms:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

/**
 * Socket.IO event handlers
 */
const handleSocketConnection = (io, socket) => {
  logger.info(`New socket connection: ${socket.id}`);

  // Join room event
  socket.on('join-room', async ({ roomId, userId, userToken }) => {
    try {
      // Verify user token and get user info
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(userToken, process.env.JWT_SECRET);

      const user = await User.findByPk(decoded.user_id);
      if (!user) {
        socket.emit('error', { message: 'Invalid user' });
        return;
      }

      // Store socket info with roomId - THIS WAS THE KEY FIX
      activeSockets.set(socket.id, {
        userId: user.user_id,
        userName: user.full_name,
        userRole: user.role,
        roomId: roomId // FIXED: Set the roomId here
      });

      // Join socket room
      socket.join(roomId);

      logger.info(`Socket ${socket.id} joined room ${roomId} for user ${user.full_name}`);

      // Update room participants
      let room;
      if (roomId.startsWith('campaign_')) {
        const campaignId = roomId.replace('campaign_', '');
        room = getCampaignChatRoom(campaignId);
      } else {
        room = getChatRoom(roomId);
      }

      room.participants.add(socket.id);

      // Notify room about new participant
      socket.to(roomId).emit('user-joined', {
        userId: user.user_id,
        userName: user.full_name,
        participantCount: room.participants.size
      });

      // Send current participant count to user
      socket.emit('room-joined', {
        roomId,
        participantCount: room.participants.size
      });

      logger.info(`User ${user.full_name} joined room ${roomId}`);

    } catch (error) {
      logger.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Send message event - FIXED the authorization logic
  socket.on('send-message', ({ roomId, message, messageType = 'text' }) => {
    try {
      const socketInfo = activeSockets.get(socket.id);
      logger.info(`Send message attempt - Socket: ${socket.id}, Room: ${roomId}, SocketInfo:`, socketInfo);

      if (!socketInfo) {
        logger.warn(`Socket ${socket.id} not authenticated`);
        socket.emit('error', { message: 'Socket not authenticated' });
        return;
      }

      // FIXED: Check if user is authorized for this room
      if (socketInfo.roomId !== roomId) {
        logger.warn(`Room authorization failed - Socket room: ${socketInfo.roomId}, Requested room: ${roomId}`);
        socket.emit('error', { message: 'Not authorized for this room' });
        return;
      }

      // Validate message content
      if (!message || message.trim() === '') {
        socket.emit('error', { message: 'Message cannot be empty' });
        return;
      }

      // Create message object
      const messageData = {
        id: Date.now() + Math.random(),
        userId: socketInfo.userId,
        userName: socketInfo.userName,
        userRole: socketInfo.userRole,
        message: message.trim(),
        messageType,
        timestamp: new Date(),
        roomId
      };

      // Get room and add message
      let room;
      if (roomId.startsWith('campaign_')) {
        const campaignId = roomId.replace('campaign_', '');
        room = getCampaignChatRoom(campaignId);
      } else {
        room = getChatRoom(roomId);
      }

      room.messages.push(messageData);

      // Keep only last 100 messages per room
      if (room.messages.length > 100) {
        room.messages = room.messages.slice(-100);
      }

      // Broadcast message to all participants in room
      io.to(roomId).emit('new-message', messageData);

      logger.info(`Message sent in room ${roomId} by ${socketInfo.userName}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);

    } catch (error) {
      logger.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Typing indicator
  socket.on('typing-start', ({ roomId }) => {
    const socketInfo = activeSockets.get(socket.id);
    if (socketInfo && socketInfo.roomId === roomId) {
      socket.to(roomId).emit('user-typing', {
        userId: socketInfo.userId,
        userName: socketInfo.userName
      });
    }
  });

  socket.on('typing-stop', ({ roomId }) => {
    const socketInfo = activeSockets.get(socket.id);
    if (socketInfo && socketInfo.roomId === roomId) {
      socket.to(roomId).emit('user-stop-typing', {
        userId: socketInfo.userId
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const socketInfo = activeSockets.get(socket.id);
    if (socketInfo) {
      const { roomId, userName } = socketInfo;

      // Remove from room participants if roomId exists
      if (roomId) {
        let room;
        if (roomId.startsWith('campaign_')) {
          const campaignId = roomId.replace('campaign_', '');
          room = getCampaignChatRoom(campaignId);
        } else {
          room = getChatRoom(roomId);
        }

        room.participants.delete(socket.id);

        // Clean up empty rooms
        if (room.participants.size === 0) {
          chatRooms.delete(roomId);
          logger.info(`Cleaned up empty room: ${roomId}`);
        } else {
          // Notify room about user leaving
          socket.to(roomId).emit('user-left', {
            userName,
            participantCount: room.participants.size
          });
        }
      }

      // Remove socket info
      activeSockets.delete(socket.id);

      logger.info(`User ${userName} disconnected from room ${roomId}`);
    }

    logger.info(`Socket disconnected: ${socket.id}`);
  });
};

// REST API functions for chat messages
const sendMessage = async (req, res) => {
  try {
    const { roomId, message, messageType = 'text' } = req.body;
    const userId = req.user.user_id;

    if (!roomId || !message) {
      return res.status(400).json({
        status: 'error',
        message: 'Room ID and message are required'
      });
    }

    // Get user info
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Create message object
    const messageData = {
      id: Date.now() + Math.random(),
      userId: user.user_id,
      userName: user.full_name,
      userRole: user.role,
      message: message.trim(),
      messageType,
      timestamp: new Date(),
      roomId
    };

    // Get room and add message
    let room;
    if (roomId.startsWith('campaign_')) {
      const campaignId = roomId.replace('campaign_', '');
      room = getCampaignChatRoom(campaignId);
    } else {
      room = getChatRoom(roomId);
    }

    room.messages.push(messageData);

    // Keep only last 100 messages per room
    if (room.messages.length > 100) {
      room.messages = room.messages.slice(-100);
    }

    // Broadcast message to all participants in room via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('new-message', messageData);
    }

    res.json({
      status: 'success',
      data: messageData
    });

  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

const getChatMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.user_id;

    if (!roomId) {
      return res.status(400).json({
        status: 'error',
        message: 'Room ID is required'
      });
    }

    // Get room messages
    let room;
    if (roomId.startsWith('campaign_')) {
      const campaignId = roomId.replace('campaign_', '');
      room = getCampaignChatRoom(campaignId);
    } else {
      room = getChatRoom(roomId);
    }

    // Paginate messages
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const messages = room.messages.slice(startIndex, endIndex);

    res.json({
      status: 'success',
      data: messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: room.messages.length,
        pages: Math.ceil(room.messages.length / limit)
      }
    });

  } catch (error) {
    logger.error('Error getting chat messages:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  joinCharityChat,
  joinCampaignChat,
  getActiveChatRooms,
  handleSocketConnection,
  getChatRoom,
  getCampaignChatRoom,
  sendMessage,
  getChatMessages
};