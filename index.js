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

// Connect to MongoDB (you need to set up MongoDB and replace the URI)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/urlshortener', { useNewUrlParser: true, useUnifiedTopology: true });

// URL Schema for storing original and short URL
const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true }
});

const Url = mongoose.model('Url', urlSchema);

// Static files
app.use('/public', express.static(`${process.cwd()}/public`));

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
  
  // Validate the URL
  const regex = /^(ftp|http|https):\/\/[^ "]+$/;
  if (!regex.test(originalUrl)) {
    return res.json({ error: 'invalid URL' });
  }

  // Extract the hostname
  const host = new URL(originalUrl).hostname;

  // Use DNS lookup to verify the domain
  dns.lookup(host, function(err) {
    if (err) {
      return res.json({ error: 'invalid URL' });
    }

    // Create a new URL entry with a unique short URL
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

// Redirect to the original URL when a short URL is accessed
app.get('/api/shorturl/:shorturl', function(req, res) {
  const shortUrl = req.params.shorturl;

  Url.findOne({ short_url: shortUrl }, function(err, data) {
    if (err || !data) {
      return res.json({ error: 'No short URL found for the given input' });
    }

    res.redirect(data.original_url);
  });
});

// Start the server
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
