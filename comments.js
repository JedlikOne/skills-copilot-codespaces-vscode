// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const { randomBytes } = require('crypto');

// Create web server
const app = express();
// Middleware
app.use(bodyParser.json());
app.use(cors());

// In memory database
const commentsByPostId = {};

// Get all comments for a post
app.get('/posts/:id/comments', (req, res) => {
  // Return all comments for a post
  res.send(commentsByPostId[req.params.id] || []);
});

// Create a new comment for a post
app.post('/posts/:id/comments', async (req, res) => {
  // Generate a random id for the comment
  const commentId = randomBytes(4).toString('hex');
  // Get the comment data from the request body
  const { content } = req.body;
  // Get the comments for the post
  const comments = commentsByPostId[req.params.id] || [];
  // Add the new comment to the comments array
  comments.push({ id: commentId, content, status: 'pending' });
  // Update the comments for the post
  commentsByPostId[req.params.id] = comments;
  // Emit an event to the event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: 'pending'
    }
  });
  // Return the new comment
  res.status(201).send(comments);
});

// Handle events from the event bus
app.post('/events', async (req, res) => {
  // Get the event type and data
  const { type, data } = req.body;
  // If the event type is CommentModerated
  if (type === 'CommentModerated') {
    // Get the comment for the post
    const { id, postId, status, content } = data;
    const comments = commentsByPostId[postId];
    // Find the comment in the comments array
    const comment = comments.find(comment => {
      return comment.id === id;
    });
    // Update the comment status
    comment.status = status;
    // Emit an event to the event bus
    await axios.post