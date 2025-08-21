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

    // Verify charity exists
    const charity = await Charity.findByPk(charityId, {
      include: [{
        model: User,
        attributes: ['user_id', 'full_name', 'role']
      }]
    });

    if (!charity) {
      return res.status(404).json({
        status: 'error',
        message: 'Charity not found'
      });
    }

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
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
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

    // Verify campaign exists and get charity info
    const campaign = await Campaign.findByPk(campaignId, {
      include: [{
        model: Charity,
        attributes: ['charity_id', 'name', 'logo_url'],
        include: [{
          model: User,
          attributes: ['user_id', 'full_name', 'role']
        }]
      }]
    });

    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found'
      });
    }

    // Get or create campaign chat room
    const room = getCampaignChatRoom(campaignId);

    res.json({
      status: 'success',
      data: {
        roomId: `campaign_${campaignId}`,
        campaign: {
          campaign_id: campaign.campaign_id,
          title: campaign.title,
          charity: campaign.Charity
        },
        participantCount: room.participants.size,
        canChat: true
      }
    });

  } catch (error) {
    logger.error('Error joining campaign chat:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
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

      // Store socket info
      activeSockets.set(socket.id, {
        userId: user.user_id,
        userName: user.full_name,
        userRole: user.role,
        roomId
      });

      // Join socket room
      socket.join(roomId);

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

  // Send message event
  socket.on('send-message', ({ roomId, message, messageType = 'text' }) => {
    try {
      const socketInfo = activeSockets.get(socket.id);
      if (!socketInfo || socketInfo.roomId !== roomId) {
        socket.emit('error', { message: 'Not authorized for this room' });
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

      logger.info(`Message sent in room ${roomId} by ${socketInfo.userName}`);

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

      // Remove from room participants
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

      // Remove socket info
      activeSockets.delete(socket.id);

      logger.info(`User ${userName} disconnected from room ${roomId}`);
    }

    logger.info(`Socket disconnected: ${socket.id}`);
  });
};

module.exports = {
  joinCharityChat,
  joinCampaignChat,
  getActiveChatRooms,
  handleSocketConnection,
  getChatRoom,
  getCampaignChatRoom
};
