require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dns = require('dns');
const mongoose = require('mongoose');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// MongoDB connection setup
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/urlshortener', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// URL Schema for storing original and short URL
const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true }
});

const Url = mongoose.model('Url', urlSchema);

// Serve the homepage
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Hello endpoint for testing
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// POST route for URL shortening
app.post('/api/shorturl', function(req, res) {
  const originalUrl = req.body.url;
  
  // Validate the URL format
  const regex = /^(ftp|http|https):\/\/[^ "]+$/;
  if (!regex.test(originalUrl)) {
    return res.json({ error: 'invalid URL' });
  }

  // Extract the hostname to ensure it's a valid domain (DNS lookup)
  const host = new URL(originalUrl).hostname;

  // Use DNS lookup to verify if the domain exists
  dns.lookup(host, function(err) {
    if (err) {
      return res.json({ error: 'invalid URL' });
    }

    // Check if the URL already exists in the database
    Url.findOne({ original_url: originalUrl }, function(err, existingUrl) {
      if (err) return res.json({ error: 'internal server error' });

      if (existingUrl) {
        // If the URL exists, return the existing short_url
        return res.json({
          original_url: originalUrl,
          short_url: existingUrl.short_url
        });
      }

      // If the URL does not exist, create a new entry
      Url.countDocuments({}, function(err, count) {
        if (err) return res.json({ error: 'internal server error' });

        const newUrl = new Url({
          original_url: originalUrl,
          short_url: count + 1
        });

        // Save the new URL to the database
        newUrl.save(function(err) {
          if (err) return res.json({ error: 'internal server error' });

          res.json({
            original_url: originalUrl,
            short_url: count + 1
          });
        });
      });
    });
  });
});

// Redirect to the original URL when a short URL is accessed
app.get('/api/shorturl/:shorturl', function(req, res) {
  const shortUrl = req.params.shorturl;

  Url.findOne({ short_url: shortUrl }, function(err, data) {
    if (err || !data) {
      return res.json({ error: 'No short URL found for the given input' });
    }

    res.redirect(data.original_url); // Redirect to the original URL
  });
});

// Start the server
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
